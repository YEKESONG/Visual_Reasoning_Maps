"""Rebuild deterministic, editorial demos from a public-domain excerpt."""

import html
import json
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import PageBreak, SimpleDocTemplate, Spacer
from reportlab.platypus import Paragraph as PDFParagraph

from backend.app.anchoring.sentences import anchor_document
from backend.app.config import ROOT
from backend.app.ingest.arxiv_html import parse_html
from backend.app.ingest.pdf_pymupdf import parse_pdf
from backend.app.models import Flow, Generation, Link, Metadata, Step, Suggestion, TermCard
from backend.app.storage.files import Store
from backend.app.validation.checks import patterns

URL = "https://www.gutenberg.org/ebooks/59"
TITLE = "Descartes · Discours de la méthode, première partie"
PARAGRAPHS = json.loads((ROOT / "examples/descartes-excerpt.json").read_text())


def create_pdf(path: Path) -> None:
    title = ParagraphStyle(
        "title",
        fontName="Times-Roman",
        fontSize=25,
        leading=29,
        textColor=colors.HexColor("#202d32"),
        spaceAfter=12,
    )
    note = ParagraphStyle(
        "note",
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#536b61"),
        spaceAfter=18,
    )
    body = ParagraphStyle(
        "body", fontName="Times-Roman", fontSize=11, leading=16, alignment=TA_JUSTIFY, spaceAfter=18
    )
    story = [
        PDFParagraph("Discourse on the Method", title),
        PDFParagraph(
            "René Descartes · Part I (excerpt)<br/>English translation by John Veitch", note
        ),
    ]
    for index, p in enumerate(PARAGRAPHS):
        if index == 3:
            story.extend(
                [PageBreak(), PDFParagraph("Reflection and the reader’s judgement", title)]
            )
        story.append(PDFParagraph(html.escape(p), body))
    story += [
        Spacer(1, 14),
        PDFParagraph(
            "Source: Project Gutenberg, eBook 59. Public-domain text.<br/>This is a new typesetting for the Visual Reasoning Maps demonstration, not a facsimile of the 1637 edition.",
            note,
        ),
    ]

    def footer(canvas, document):
        canvas.setTitle(TITLE)
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#536b61"))
        canvas.drawString(55, 30, "Visual Reasoning Maps · Editorial demonstration")
        canvas.drawRightString(540, 30, str(document.page))

    SimpleDocTemplate(
        str(path), pagesize=(595, 842), leftMargin=55, rightMargin=55, topMargin=50, bottomMargin=55
    ).build(story, onFirstPage=footer, onLaterPages=footer)


def main() -> None:
    store = Store(ROOT / "examples")
    for kind in ("html", "pdf"):
        key = "demo-descartes-" + kind
        directory = store.directory(key)
        directory.mkdir(exist_ok=True)
        if kind == "html":
            content = (
                '<html lang="en"><head><meta charset="UTF-8"><style>body{background:#fffdf8;color:#202d32}article{font-family:Georgia,serif;line-height:1.65;max-width:700px;margin:30px auto}h1{font-size:30px;font-weight:400}p{margin-bottom:24px}aside{font-family:system-ui;font-size:12px;color:#536b61;margin:20px 0}</style></head><body><article><h1>Discourse on the Method</h1><aside>René Descartes · Part I · Translation by John Veitch</aside>'
                + "".join("<p>" + html.escape(p) + "</p>" for p in PARAGRAPHS)
                + "<aside>Public-domain text. New demonstration typesetting. Source: Project Gutenberg, eBook 59.</aside></article></body></html>"
            )
            doc, content = parse_html(content, key, URL)
            doc, content = anchor_document(doc, content)
            (directory / "source.html").write_text(content)
        else:
            create_pdf(directory / "source.pdf")
            doc, _ = anchor_document(parse_pdf(directory / "source.pdf", key))
        doc.title = TITLE + (" · HTML" if kind == "html" else " · PDF")
        doc.source_url = URL
        doc.warnings = [
            "Extrait du domaine public, remis en page pour cet exemple. Carte préparée à la main ; aucun modèle n’a été évalué dessus."
        ]

        def find(text):
            return next(s for s in doc.sentences if text.casefold() in s.text.casefold())

        entries = [
            (
                "reason",
                "premise",
                "Le bon sens est également partagé",
                "Descartes pose que la capacité de bien juger est la même chez tous ; les opinions divergent parce que chacun conduit sa pensée autrement.",
                "power of judging aright",
                None,
            ),
            (
                "method",
                "claim",
                "Encore faut-il bien s’en servir",
                "Un esprit vigoureux ne suffit pas : ce qui compte est la manière de l’appliquer.",
                "For to be possessed",
                None,
            ),
            (
                "experience",
                "evidence",
                "Les progrès qu’il doit à sa méthode",
                "Descartes dit avoir tiré de sa méthode des progrès constants. C’est son propre témoignage, pas une mesure indépendante.",
                "I will not hesitate",
                None,
            ),
            (
                "doubt",
                "objection",
                "Il peut se tromper sur lui-même",
                "Il admet qu’il prend peut-être du cuivre et du verre pour de l’or et des diamants, c’est-à-dire qu’il surestime ses résultats.",
                "After all, it is possible",
                None,
            ),
            (
                "describe",
                "claim",
                "Raconter son chemin plutôt qu’enseigner",
                "Il choisit de décrire, comme dans un tableau, la façon dont il a conduit sa raison, plutôt que d’imposer une méthode.",
                "But I shall endeavor",
                None,
            ),
            (
                "judge",
                "conclusion",
                "Chacun pourra en juger",
                "Ainsi exposé, son parcours peut être jugé par chaque lecteur, et les avis reçus deviennent pour lui un moyen de s’instruire.",
                "each one may also be able",
                None,
            ),
            (
                "personal",
                "claim",
                "Un récit, pas une leçon",
                "Son but n’est pas d’enseigner la méthode que chacun doit suivre, mais de montrer comment il a conduit la sienne.",
                "My present design",
                "describe",
            ),
            (
                "criticism",
                "premise",
                "Qui donne des préceptes s’expose",
                "Celui qui prescrit aux autres se juge plus habile qu’eux et mérite d’être blâmé à la moindre erreur.",
                "They who set themselves",
                "describe",
            ),
        ]
        steps = []
        for sid, typ, label, summary, needle, parent in entries:
            sentence = find(needle)
            steps.append(
                Step(
                    id=sid,
                    type=typ,
                    label=label,
                    summary=summary,
                    anchors=[sentence.id],
                    quote=sentence.text[max(0, sentence.text.casefold().find(needle.casefold())) :][
                        :200
                    ].rsplit(" ", 1)[0]
                    if len(sentence.text) > 200
                    else sentence.text,
                    confidence=0.75,
                    status="partial",
                    first_position=sentence.order,
                    parent=parent,
                )
            )
        by = {s.id: s for s in steps}
        links = []
        for index, (src, dst, typ) in enumerate(
            [
                ("reason", "method", "support"),
                ("experience", "method", "support"),
                ("method", "describe", "support"),
                ("experience", "describe", "support"),
                ("doubt", "describe", "refine"),
                ("describe", "judge", "support"),
                ("doubt", "experience", "contradict"),
                ("personal", "criticism", "refine"),
            ]
        ):
            links.append(
                Link(
                    id=f"rel{index + 1}",
                    src=src,
                    dst=dst,
                    type=typ,
                    anchors=list(dict.fromkeys(by[src].anchors + by[dst].anchors)),
                    confidence=0.7,
                    status="partial",
                )
            )
        flow = Flow(
            steps=steps,
            links=links,
            terms=[
                TermCard(
                    term="Méthode",
                    definition="Ici, la manière dont l’auteur dit avoir conduit sa pensée, présentée à partir de sa propre expérience.",
                    anchors=by["experience"].anchors,
                    step_ids=["method", "experience"],
                )
            ],
            genre="philosophy",
            thesis="Descartes expose sa méthode comme un parcours personnel que chaque lecteur est libre de juger.",
            metadata=Metadata(
                id=key,
                title=doc.title,
                kind=kind,
                source_url=URL,
                created_at="2026-09-22T12:00:00Z",
                demo=True,
            ),
            generation=Generation(
                model="editorial-demo (no API call)", timestamp="2026-09-22T12:00:00Z"
            ),
        )
        flow.patterns = patterns(flow)
        suggestion = Suggestion(
            target_type="step",
            target_id="experience",
            category="support",
            severity="info",
            message="Distinguez le progrès que l’auteur s’attribue d’une mesure indépendante de l’efficacité de la méthode.",
            anchors=by["experience"].anchors,
            source="rule",
        )
        store.write(key, "parsed.json", doc.model_dump(mode="json"))
        store.write(key, "flow.json", flow.model_dump(mode="json"))
        store.write(key, "suggestions.json", [suggestion.model_dump(mode="json")])
        store.write(
            key,
            "validation_report.json",
            {
                "demo": True,
                "method": "Editorial mapping; exact quotes mechanically matched. No model semantic validation.",
                "needs_review": True,
            },
        )
        print(
            f"{key}: {len(doc.sentences)} sentences, {len(steps)} steps, {len(doc.pages)} PDF pages"
        )


if __name__ == "__main__":
    main()
