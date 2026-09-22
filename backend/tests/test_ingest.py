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
