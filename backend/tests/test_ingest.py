import pymupdf
import pytest

from backend.app.ingest.arxiv_html import arxiv_id, parse_html
from backend.app.ingest.pdf_pymupdf import parse_pdf


def make_pdf(path, rotation=0):
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text(
        (72, 72),
        "Introduction\nA measured observation supports the premise.\nThe experiment gives evidence for a limited conclusion.",
    )
    page.set_rotation(rotation)
    doc.save(path)


def test_pdf_geometry(tmp_path):
    path = tmp_path / "test.pdf"
    make_pdf(path)
    doc = parse_pdf(path, "test")
    assert doc.paragraphs[0].words[0].bbox[0] == 72
    assert doc.paragraphs[0].page == 1
    assert doc.pages[0][0] == 595


def test_html_math_and_inline():
    doc, html = parse_html(
        '<article><h1>Titre</h1><h2>Résultats</h2><p>Une <em>preuve</em>. <math alttext="x=2"><mi>x</mi></math></p></article>',
        "test",
        "https://arxiv.org/html/2404.16130",
    )
    assert doc.paragraphs[0].latex == ["x=2"]
    assert "<em>preuve</em>" in html
    assert doc.sections[-1].title == "Résultats"


@pytest.mark.parametrize(
    "url",
    [
        "http://arxiv.org/html/2404.16130",
        "https://localhost/html/2404.16130",
        "https://arxiv.org.evil.com/html/2404.16130",
        "https://arxiv.org:8080/html/2404.16130",
    ],
)
def test_url_restriction(url):
    with pytest.raises(ValueError):
        arxiv_id(url)


async def test_html_unavailable_falls_back_to_positioned_pdf(tmp_path, monkeypatch):
    import httpx

    from backend.app.ingest import arxiv_html

    pdf = tmp_path / "fixture.pdf"
    make_pdf(pdf)
    urls = []

    async def fake_fetch(client, url, limit=0):
        urls.append(url)
        if "/html/" in url:
            raise httpx.HTTPStatusError(
                "unavailable", request=httpx.Request("GET", url), response=httpx.Response(404)
            )
        return pdf.read_bytes()

    monkeypatch.setattr(arxiv_html, "fetch", fake_fetch)
    doc, body = await arxiv_html.acquire("https://arxiv.org/abs/2404.16130", tmp_path, "fallback")
    assert doc.kind == "pdf" and doc.paragraphs[0].words
    assert urls == ["https://arxiv.org/html/2404.16130", "https://arxiv.org/pdf/2404.16130"]
    assert body == (tmp_path / "source.pdf").read_bytes()


async def test_external_redirect_is_not_followed():
    import httpx

    from backend.app.ingest.arxiv_html import fetch

    calls = []

    def handler(request):
        calls.append(str(request.url))
        return httpx.Response(302, headers={"location": "http://127.0.0.1/private"})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(ValueError, match="Redirection"):
            await fetch(client, "https://arxiv.org/html/2404.16130")
    assert len(calls) == 1


async def test_arxiv_relative_images_and_layered_styles(tmp_path, monkeypatch):
    from backend.app.ingest import arxiv_html

    responses = {
        "https://arxiv.org/html/2404.16130": b'<html><head><link rel="stylesheet" href="/main.css"></head><body><article><h1>Title</h1><p>Text.</p><img src="2404.16130v2/fig.png"></article></body></html>',
        "https://arxiv.org/main.css": b'@import "/base.css" layer(article); @layer article; body{margin:20px}',
        "https://arxiv.org/base.css": b"p{line-height:1.5} @font-face{src:url(https://fonts.example/font.woff)}",
        "https://arxiv.org/html/2404.16130v2/fig.png": b"PNG fixture",
    }

    async def fake_fetch(client, url, limit=0):
        return responses[url]

    monkeypatch.setattr(arxiv_html, "fetch", fake_fetch)
    doc, _ = await arxiv_html.acquire("https://arxiv.org/html/2404.16130", tmp_path, "fixture")
    assert not doc.warnings
    css = (tmp_path / "assets/0.css").read_text()
    assert "@layer article {p{line-height:1.5}" in css
    assert "fonts.example" not in css
    assert (tmp_path / "assets/1.png").read_bytes() == b"PNG fixture"
    assert "/api/docs/fixture/assets/1.png" in (tmp_path / "source.html").read_text()
