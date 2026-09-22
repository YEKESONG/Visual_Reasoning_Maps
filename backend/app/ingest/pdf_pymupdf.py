from pathlib import Path

import pymupdf

from backend.app.models import Document, Paragraph, Section, Word


def parse_pdf(path: Path, doc_id: str) -> Document:
    with pymupdf.open(path) as pdf:
        if pdf.is_encrypted:
            raise ValueError("PDF protégé. Exportez une copie sans mot de passe.")
        if len(pdf) > 400:
            raise ValueError("PDF trop long : limite de 400 pages.")
        doc = Document(id=doc_id, title=pdf.metadata.get("title") or path.stem, kind="pdf")
        doc.sections = [Section(id="sec1", title="Document")]
        section = "sec1"
        for page_index, page in enumerate(pdf):
            doc.pages.append((page.rect.width, page.rect.height))
            blocks: dict[int, list] = {}
            for word in page.get_text("words", sort=True):
                blocks.setdefault(word[5], []).append(word)
            for words in blocks.values():
                text = " ".join(w[4] for w in words)
                if not text.strip():
                    continue
                if len(text) < 100 and (
                    text[:1].isdigit()
                    or text.lower() in ("abstract", "résumé", "conclusion", "introduction")
                ):
                    section = f"sec{len(doc.sections) + 1}"
                    doc.sections.append(Section(id=section, title=text))
                paragraph = Paragraph(
                    id=f"p{len(doc.paragraphs) + 1}",
                    text=text,
                    section_id=section,
                    page=page_index + 1,
                )
                offset = 0
                for w in words:
                    # Page rotation maps unrotated PyMuPDF coordinates to displayed top-left points.
                    rect = pymupdf.Rect(w[:4]) * page.rotation_matrix
                    paragraph.words.append(
                        Word(text=w[4], start=offset, end=offset + len(w[4]), bbox=tuple(rect))
                    )
                    offset += len(w[4]) + 1
                doc.paragraphs.append(paragraph)
        if sum(len(p.text) for p in doc.paragraphs) < 80:
            raise ValueError(
                "Texte insuffisant. Ce PDF peut être scanné : appliquez une reconnaissance OCR puis réessayez."
            )
        doc.warnings.append(
            "PDF : ordre de lecture et formules extraits heuristiquement ; pas de reconstruction LaTeX fiable."
        )
        return doc
