from bs4 import BeautifulSoup

from backend.app.anchoring.sentences import anchor_document, split_spans
from backend.app.ingest.arxiv_html import parse_html
from backend.app.ingest.pdf_pymupdf import parse_pdf
from backend.tests.test_ingest import make_pdf


def test_french_english_abbreviations():
    text = "Dr. Martin mesure 3.14 unités. Il conclut. A second test!"
    assert [text[a:b] for a, b in split_spans(text)] == [
        "Dr. Martin mesure 3.14 unités.",
        "Il conclut.",
        "A second test!",
    ]


def test_inline_markup_preserved():
    doc, html = parse_html(
        "<article><p>Une <em>preuve</em>. Puis une conclusion.</p></article>", "test", ""
    )
    doc, html = anchor_document(doc, html)
    soup = BeautifulSoup(html, "html.parser")
    assert [s.id for s in doc.sentences] == ["p1s1", "p1s2"]
    assert soup.em.get_text() == "preuve"
    assert soup.find(id="p1s2")
    assert soup.article.get_text() == "Une preuve. Puis une conclusion."


def test_rotated_pdf_coordinates(tmp_path):
    path = tmp_path / "r.pdf"
    make_pdf(path, 90)
    doc, _ = anchor_document(parse_pdf(path, "rotated"))
    assert doc.pages[0] == (842, 595)
    assert all(
        0 <= box[0] < box[2] <= 842 and 0 <= box[1] < box[3] <= 595
        for s in doc.sentences
        for box in s.bbox
    )
    assert all(s.id.startswith(s.paragraph_id + "s") for s in doc.sentences)
