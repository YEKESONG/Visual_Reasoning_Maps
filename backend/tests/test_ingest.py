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


def make_paper(path):
    """Two-column paper with running header, equation, booktabs table, references, appendix."""
    doc = pymupdf.open()
    body = dict(fontsize=10, fontname="tiro")

    def lines(page, x, y, texts):
        for text in texts:
            page.insert_text((x, y), text, **body)
            y += 12

    for number in (1, 2, 3):
        page = doc.new_page(width=612, height=792)
        page.insert_text((72, 30), "Preprint under review", fontsize=9, fontname="helv")
        page.insert_text((300, 770), str(number), **body)
    p1, p2, p3 = doc[0], doc[1], doc[2]
    p1.insert_text((170, 70), "Reading Order in Two Columns", fontsize=16, fontname="tibo")
    p1.insert_text((250, 90), "Ada Lovelace", fontsize=12, fontname="tibo")
    p1.insert_text((72, 130), "Abstract", fontsize=10, fontname="tibo")
    lines(
        p1,
        72,
        145,
        [
            "We study reading order on pages with two",
            "columns. The parser keeps con-",
            "trol of hyphenated words and long-",
            "horizon compounds.",
        ],
    )
    p1.insert_text((72, 215), "1 Introduction", fontsize=12, fontname="tibo")
    lines(p1, 72, 232, ["The left column ends in the middle of a", "sentence that"])
    lines(p1, 320, 130, ["continues in the right column. A long-horizon", "plan needs control."])
    p1.insert_text((320, 175), "2 Method", fontsize=12, fontname="tibo")
    lines(p1, 320, 192, ["The method has three parts, and the first part", "is described here."])
    p1.insert_text((360, 232), "a = b + c", **body)
    p1.insert_text((520, 232), "(1)", **body)
    p1.insert_text((320, 262), "Table 1: Scores of the two models.", fontsize=9, fontname="tiro")
    for y in (270, 284, 310):
        p1.draw_line((320, y), (540, y))
    p1.insert_text((330, 280), "Model Score", **body)
    p1.insert_text((330, 298), "Ours 0.9", **body)
    lines(p1, 320, 340, ["The last sentence of the page runs on to the", "next page and"])
    lines(p2, 72, 72, ["ends at the top of the second page.", "Results support the claim."])
    p2.insert_text((72, 120), "References", fontsize=12, fontname="tibo")
    p2.insert_text((72, 137), "[1] A. Author. A cited paper. 2020.", **body)
    p3.insert_text((72, 72), "A Appendix Details", fontsize=12, fontname="tibo")
    p3.insert_text((72, 89), "The appendix text is kept.", **body)
    doc.set_metadata({})
    doc.save(path)


def test_two_column_paper_layout(tmp_path):
    path = tmp_path / "paper.pdf"
    make_paper(path)
    doc = parse_pdf(path, "paper")
    titles = {s.id: s.title for s in doc.sections}
    text = [p.text for p in doc.paragraphs]
    assert doc.title == "Reading Order in Two Columns"
    # Font size and weight mark headings; the author line and references are left out.
    assert [s.title for s in doc.sections] == [
        "Abstract",
        "1 Introduction",
        "2 Method",
        "A Appendix Details",
    ]
    # Left column before right column, and a sentence split by the column break is rejoined.
    assert text[1] == (
        "The left column ends in the middle of a sentence that continues in the right column."
        " A long-horizon plan needs control."
    )
    # Typesetting hyphens are removed, real compounds keep theirs.
    assert "keeps control of hyphenated words and long-horizon compounds." in text[0]
    joined = " ".join(text)
    for noise in ("Preprint", "a = b + c", "(1)", "Model Score", "Ours 0.9", "A cited paper"):
        assert noise not in joined
    # The caption stays, after the body text of its section.
    assert [titles[p.section_id] for p in doc.paragraphs[-2:]] == ["2 Method", "A Appendix Details"]
    assert text[-2] == "Table 1: Scores of the two models."


def test_sentence_continued_on_next_page(tmp_path):
    from backend.app.anchoring.sentences import anchor_document

    path = tmp_path / "paper.pdf"
    make_paper(path)
    doc, _ = anchor_document(parse_pdf(path, "paper"))
    paragraph = next(p for p in doc.paragraphs if p.text.startswith("The last sentence"))
    assert paragraph.page == 1
    assert {w.page for w in paragraph.words} == {None, 2}
    first, second = [s for s in doc.sentences if s.paragraph_id == paragraph.id]
    assert first.text.endswith("ends at the top of the second page.")
    # A sentence is shown on the page where it starts; boxes from the next page are not mixed in.
    assert first.page == 1 and all(box[1] > 300 for box in first.bbox)
    assert second.page == 2
