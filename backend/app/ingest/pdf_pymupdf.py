import re
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

import pymupdf

from backend.app.models import Document, Paragraph, Section, Word

# Math fonts carry display equations and sub/superscripts. CMR and CMBX also set LaTeX prose.
MATH_FONT = re.compile(
    r"^(CM(MI|SY|EX|BSY|MIB)\d|MSBM|MSAM|EUFM|EUSM|EUEX|rsfs|txmi|txsy|txex|NewTXB?MI|"
    r"STIX\w*Math|LatinModernMath|CambriaMath|XITSMath|Asana|MTSY|MTMI|Symbol)",
    re.I,
)
BOLD_FONT = re.compile(r"bold|black|heavy|semibold|demi|CMBX|-Bd", re.I)
FRONT_MATTER_END = re.compile(
    r"^(abstract|résumé|resume|zusammenfassung|摘要|introduction|keywords)\b|^(1|I)\.?\s+\S", re.I
)
REFERENCES = re.compile(
    r"^((\d+|[IVX]+)\.?\s+)?(references|bibliography|références|bibliographie|literatur|"
    r"works cited|参考文献)$",
    re.I,
)
UNCITED = re.compile(r"^((\d+|[IVX]+)\.?\s+)?(acknowledge?ments?|remerciements|致谢)$", re.I)
APPENDIX = re.compile(r"^(appendix|appendices|annexe|supplementary|附录)\b|^[A-Z](\.\d+)*\s+\S")
CAPTION = re.compile(
    r"^(figure|fig\.|table|tab\.|algorithm|listing|tableau|图|表)\s*[\dIVX]+[a-z]?\s*[:.：]", re.I
)
EQUATION_TAG = re.compile(r"^\(\d+[a-z]?\)$")
PSEUDOCODE = re.compile(r"^(\d+:\s|(require|ensure|input|output):)", re.I)
MATH_SIGN = re.compile(r"[=≤≥∈∉∑∏∫←→⇒≈∝±×∥≜]")
WORD = re.compile(r"[^\W\d_]{2,}")
TERMINAL = tuple(".!?:;。！？：；")


@dataclass(eq=False)
class Line:
    page: int
    block: int
    text: str
    words: list[tuple[float, float, float, float, str]]
    bbox: tuple[float, float, float, float]
    spans: list[dict]
    size: float
    bold: bool
    starts_bold: bool


@dataclass(eq=False)
class Block:
    page: int
    lines: list[Line]
    heading: bool = False

    @property
    def bbox(self) -> tuple[float, float, float, float]:
        return (
            min(line.bbox[0] for line in self.lines),
            min(line.bbox[1] for line in self.lines),
            max(line.bbox[2] for line in self.lines),
            max(line.bbox[3] for line in self.lines),
        )

    @property
    def text(self) -> str:
        return " ".join(line.text for line in self.lines).strip()


@dataclass
class Layout:
    body: float
    lines: list[Line] = field(default_factory=list)


def font_name(span: dict) -> str:
    return re.sub(r"^[A-Z]{6}\+", "", span["font"])


def is_bold(span: dict) -> bool:
    return bool(span["flags"] & 16) or bool(BOLD_FONT.search(font_name(span)))


def read_lines(page: pymupdf.Page, number: int) -> list[Line]:
    textpage = page.get_textpage(
        flags=pymupdf.TEXTFLAGS_DICT
        & ~pymupdf.TEXT_PRESERVE_LIGATURES
        & ~pymupdf.TEXT_PRESERVE_IMAGES
    )
    words: dict[tuple[int, int], list] = {}
    for w in page.get_text("words", textpage=textpage):
        words.setdefault((w[5], w[6]), []).append(w)
    directions: Counter = Counter()
    raw = []
    for block in page.get_text("dict", textpage=textpage)["blocks"]:
        if block["type"] != 0:
            continue
        for index, line in enumerate(block["lines"]):
            spans = [s for s in line["spans"] if s["text"].strip()]
            if spans:
                direction = (round(line["dir"][0]), round(line["dir"][1]))
                directions[direction] += sum(len(s["text"]) for s in spans)
                raw.append((block["number"], index, line, spans, direction))
    main = directions.most_common(1)[0][0] if directions else (1, 0)
    lines = []
    for block_number, index, line, spans, direction in raw:
        items = words.get((block_number, index), [])
        # Margin stamps such as the rotated arXiv identifier are not part of the text.
        if direction == main and items:
            lines.append(
                Line(
                    page=number,
                    block=block_number,
                    text=" ".join(w[4] for w in items),
                    words=[(*w[:4], w[4]) for w in items],
                    bbox=tuple(line["bbox"]),
                    spans=spans,
                    size=max(s["size"] for s in spans),
                    bold=all(is_bold(s) for s in spans),
                    starts_bold=is_bold(spans[0]),
                )
            )
    return lines


def figure_regions(page: pymupdf.Page) -> list[pymupdf.Rect]:
    """Charts, images, and booktabs tables or ruled algorithms (two or more matching rules)."""
    area = abs(page.rect)
    height = max(page.rect.height, page.rect.width)
    regions = []
    rules: list[tuple[float, float, float]] = []
    try:
        drawings = page.get_drawings()
        clusters = page.cluster_drawings(drawings=drawings)
    except Exception:
        drawings, clusters = [], []
    for rect in clusters:
        if rect.width > 20 and rect.height > 20 and abs(rect) < 0.6 * area:
            regions.append(rect)
    for drawing in drawings:
        for item in drawing["items"]:
            if item[0] == "l" and abs(item[1].y - item[2].y) < 1:
                x0, x1 = sorted((item[1].x, item[2].x))
                rules.append((x0, x1, item[1].y))
            elif item[0] == "re" and item[1].height < 1.6:
                rules.append((item[1].x0, item[1].x1, item[1].y0))
    groups: list[list[tuple[float, float, float]]] = []
    for rule in sorted(r for r in rules if r[1] - r[0] > 50):
        group = next(
            (g for g in groups if abs(g[0][0] - rule[0]) < 4 and abs(g[0][1] - rule[1]) < 4), None
        )
        if group is None:
            groups.append([rule])
        else:
            group.append(rule)
    for group in groups:
        top, bottom = min(r[2] for r in group), max(r[2] for r in group)
        if len(group) >= 2 and 15 < bottom - top < 0.6 * height:
            regions.append(pymupdf.Rect(group[0][0] - 2, top - 2, group[0][1] + 2, bottom + 2))
    for info in page.get_image_info():
        rect = pymupdf.Rect(info["bbox"])
        if abs(rect) > 400:
            regions.append(rect)
    return regions


def inside(bbox: tuple, regions: list[pymupdf.Rect]) -> bool:
    rect = pymupdf.Rect(bbox)
    size = abs(rect) or 1
    return any(abs(rect & region) / size > 0.6 for region in regions)


def body_lines(pdf: pymupdf.Document) -> Layout:
    """Keep prose lines; drop equations, chart labels, margins and running headers."""
    per_page = [read_lines(page, number + 1) for number, page in enumerate(pdf)]
    sizes: Counter = Counter()
    for line in (line for lines in per_page for line in lines):
        for span in line.spans:
            if not MATH_FONT.search(font_name(span)):
                sizes[round(span["size"], 1)] += len(span["text"].strip())
    layout = Layout(body=sizes.most_common(1)[0][0] if sizes else 10.0)
    running: Counter = Counter()
    for page, lines in zip(pdf, per_page):
        height = page.rect.height if page.rotation % 180 == 0 else page.rect.width
        margin_texts = {
            line.text
            for line in lines
            if line.bbox[3] < 0.1 * height or line.bbox[1] > 0.9 * height
        }
        running.update(margin_texts)
    for page, lines in zip(pdf, per_page):
        regions = figure_regions(page)
        height = page.rect.height if page.rotation % 180 == 0 else page.rect.width
        for line in lines:
            total = sum(len(s["text"].strip()) for s in line.spans) or 1
            prose = [
                s
                for s in line.spans
                if not MATH_FONT.search(font_name(s)) and s["size"] >= 0.78 * layout.body
            ]
            share = sum(len(s["text"].strip()) for s in prose) / total
            letters = any(c.isalpha() for s in prose for c in s["text"])
            in_margin = line.bbox[3] < 0.05 * height or line.bbox[1] > 0.95 * height
            text = line.text.strip()
            if (
                share < 0.5
                or not letters
                or EQUATION_TAG.match(text)
                or PSEUDOCODE.match(text)
                or (MATH_SIGN.search(text) and len(WORD.findall(text)) < 3)
                or (in_margin and len(text) < 100)
                or (running[line.text] >= 3 and len(pdf) >= 3)
                or inside(line.bbox, regions)
            ):
                continue
            layout.lines.append(line)
    return layout


def is_heading(line: Line, following: Line | None, body: float) -> bool:
    text = line.text.strip()
    first = next((c for c in text if c.isalpha()), "")
    if (
        not text
        or len(text) > 120
        or len(text.split()) > 16
        or text.endswith((".", ",", ";"))
        or not (first.isupper() or not first.isascii() or text[0].isdigit())
    ):
        return False
    if line.size >= body * 1.08:
        return True
    # A bold opening that continues on a mixed line is a run-in paragraph title.
    run_in = (
        following is not None
        and following.block == line.block
        and following.starts_bold
        and not following.bold
    )
    return line.bold and line.size >= body * 0.97 and len(text) > 1 and not run_in


def order_blocks(blocks: list[Block]) -> list[Block]:
    """Read single- and two-column pages top to bottom, left column before right column."""
    if not blocks:
        return blocks
    left = min(b.bbox[0] for b in blocks)
    right = max(b.bbox[2] for b in blocks)
    middle = (left + right) / 2
    margin = 0.08 * (right - left)
    spanning = [b for b in blocks if b.bbox[0] < middle - margin and b.bbox[2] > middle + margin]
    columns = [b for b in blocks if b not in spanning]
    if not any(b.bbox[0] >= middle - margin for b in columns):
        return sorted(blocks, key=lambda b: (b.bbox[1], b.bbox[0]))
    ordered: list[Block] = []
    top = float("-inf")
    for separator in [*sorted(spanning, key=lambda b: b.bbox[1]), None]:
        bottom = separator.bbox[1] if separator else float("inf")
        band = [b for b in columns if top <= (b.bbox[1] + b.bbox[3]) / 2 < bottom]
        ordered += sorted(band, key=lambda b: (b.bbox[0] >= middle - margin, b.bbox[1], b.bbox[0]))
        if separator:
            ordered.append(separator)
            top = separator.bbox[3]
    return ordered


def ends_sentence(text: str) -> bool:
    return text.rstrip().rstrip("\"'”’»)]").endswith(TERMINAL)


def normalized(word: str) -> str:
    return re.sub(r"[^\w-]", "", word).casefold()


def join_lines(
    lines: list[Line], matrices: list[pymupdf.Matrix], plain: set[str], hyphenated: set[str]
) -> tuple[str, list[Word]]:
    """Join lines into paragraph text, undoing end-of-line hyphenation but keeping word boxes."""
    text = ""
    words: list[Word] = []
    glue = ""
    for number, line in enumerate(lines):
        matrix = matrices[line.page - 1]
        page = line.page if line.page != lines[0].page else None
        following = lines[number + 1].words if number + 1 < len(lines) else []
        for index, (x0, y0, x1, y1, value) in enumerate(line.words):
            value = value.replace("­", "")
            join_next = False
            if index == len(line.words) - 1 and following and len(value) > 2 and value[-1] in "-‐":
                head, tail = value[:-1], following[0][4]
                if head[-1:].isalpha() and tail[:1].islower():
                    join_next = True
                    # Keep real compounds ("long-horizon"), drop typesetting hyphens ("con-trol").
                    if (
                        normalized(head + tail) in plain
                        or normalized(value + tail) not in hyphenated
                    ):
                        value = head
            text += glue
            box = tuple(pymupdf.Rect(x0, y0, x1, y1) * matrix)
            words.append(
                Word(text=value, start=len(text), end=len(text) + len(value), bbox=box, page=page)
            )
            text += value
            glue = "" if join_next else " "
    return text, words


def parse_pdf(path: Path, doc_id: str) -> Document:
    with pymupdf.open(path) as pdf:
        if pdf.is_encrypted:
            raise ValueError("PDF protégé. Exportez une copie sans mot de passe.")
        if len(pdf) > 400:
            raise ValueError("PDF trop long : limite de 400 pages.")
        layout = body_lines(pdf)
        body = layout.body
        position = {id(line): i for i, line in enumerate(layout.lines)}

        # Cut PyMuPDF blocks at headings and first-line indents, then order columns.
        elements: list[Block] = []
        for number in range(1, len(pdf) + 1):
            lines = [line for line in layout.lines if line.page == number]
            blocks: list[Block] = []
            for index, line in enumerate(lines):
                following = lines[index + 1] if index + 1 < len(lines) else None
                current = blocks[-1] if blocks else None
                if is_heading(line, following, body):
                    blocks.append(Block(number, [line], heading=True))
                elif (
                    current is None
                    or current.heading
                    or current.lines[-1].block != line.block
                    or (
                        ends_sentence(current.lines[-1].text) and line.bbox[0] > current.bbox[0] + 4
                    )
                ):
                    blocks.append(Block(number, [line]))
                else:
                    current.lines.append(line)
            for block in order_blocks(blocks):
                previous = elements[-1] if elements else None
                if (
                    block.heading
                    and previous is not None
                    and previous.heading
                    and previous.page == block.page
                    and abs(previous.lines[0].size - block.lines[0].size) < 0.6
                    and block.bbox[1] - previous.bbox[3] < block.lines[0].size * 1.3
                ):
                    # Split or wrapped headings such as "A" + "Model Architecture".
                    previous.lines.extend(block.lines)
                else:
                    elements.append(block)

        front_end = next(
            (
                position[id(b.lines[0])]
                for b in elements
                if b.heading and b.page == 1 and FRONT_MATTER_END.search(b.text)
            ),
            None,
        )
        doc = Document(id=doc_id, title=pdf.metadata.get("title") or path.stem, kind="pdf")
        doc.pages = [(page.rect.width, page.rect.height) for page in pdf]
        doc.sections = [Section(id="sec1", title="Document")]
        section = "sec1"
        skipping = False
        title_lines: list[Line] = []
        paragraphs: list[tuple[str, list[Line]]] = []
        captions: list[tuple[str, list[Line]]] = []
        for block in elements:
            first = block.lines[0]
            if front_end is not None and position[id(first)] < front_end:
                # Title, authors and affiliations precede the abstract on the first page.
                if first.size >= body * 1.08:
                    title_lines.extend(block.lines)
                    continue
                if len(block.text.split()) < 8:
                    continue
            if block.heading:
                if REFERENCES.search(block.text) or UNCITED.search(block.text):
                    skipping = True
                elif not skipping or APPENDIX.search(block.text):
                    skipping = False
                    # Figure and table captions close their section instead of splitting sentences.
                    paragraphs += captions
                    captions = []
                    section = f"sec{len(doc.sections) + 1}"
                    doc.sections.append(Section(id=section, title=block.text))
                continue
            if skipping:
                continue
            if CAPTION.match(block.text):
                captions.append((section, list(block.lines)))
                continue
            previous = paragraphs[-1] if paragraphs else None
            if (
                previous is not None
                and previous[0] == section
                and block.page - previous[1][-1].page in (0, 1)
                and not ends_sentence(previous[1][-1].text)
                and first.text[:1].islower()
            ):
                # A sentence continued in the next column, on the next page or after an equation.
                previous[1].extend(block.lines)
            else:
                paragraphs.append((section, list(block.lines)))
        paragraphs += captions

        texts = [w[4] for line in layout.lines for w in line.words]
        plain = {normalized(w) for w in texts if not w.endswith("-")}
        hyphenated = {normalized(w) for w in texts if "-" in w.strip("-")}
        matrices = [page.rotation_matrix for page in pdf]
        for section_id, lines in paragraphs:
            text, words = join_lines(lines, matrices, plain, hyphenated)
            doc.paragraphs.append(
                Paragraph(
                    id=f"p{len(doc.paragraphs) + 1}",
                    text=text,
                    section_id=section_id,
                    page=lines[0].page,
                    words=words,
                )
            )
        used = {p.section_id for p in doc.paragraphs}
        doc.sections = [s for s in doc.sections if s.id in used]
        metadata_title = (pdf.metadata.get("title") or "").strip()
        if title_lines and (not metadata_title or metadata_title.lower().startswith("microsoft")):
            largest = max(line.size for line in title_lines)
            doc.title = " ".join(x.text for x in title_lines if abs(x.size - largest) < 0.5)
        if sum(len(p.text) for p in doc.paragraphs) < 80:
            raise ValueError(
                "Texte insuffisant. Ce PDF peut être scanné : appliquez une reconnaissance OCR puis réessayez."
            )
        doc.warnings.append(
            "PDF : l’ordre de lecture et les formules sont reconstitués par heuristique ; les équations ne sont pas converties en LaTeX."
        )
        return doc
