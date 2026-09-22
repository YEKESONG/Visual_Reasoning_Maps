import re

from bs4 import BeautifulSoup, NavigableString

from backend.app.models import Document, Sentence

ABBREVIATIONS = set(
    "m. mme. mlle. dr. prof. mr. mrs. ms. st. jr. sr. fig. figs. eq. eqs. sec. secs. tab. "
    "tabs. ch. chap. vol. no. nos. pp. p. cf. e.g. i.e. viz. al. etc. vs. approx. resp. ref. "
    "refs. ibid. ca. n.b. ex. éd. trad. coll. art.".split()
)
BULLETS = "•◦▪▫‣∙"


def split_spans(text: str) -> list[tuple[int, int]]:
    spans = []
    start = 0

    def add(left: int, right: int) -> None:
        while left < right and (text[left].isspace() or text[left] in BULLETS):
            left += 1
        if left < right:
            spans.append((left, right))

    for match in re.finditer(r"[.!?。！？]+[»”\"\']*(?=\s+|$|[\u4e00-\u9fff])", text):
        before = text[: match.end()].split()[-1].lower()
        following = text[match.end() :].lstrip()[:1]
        if (
            before in ABBREVIATIONS
            or re.search(r"\b[A-Z]\.$", text[: match.end()])
            # A lowercase continuation or a spaced ellipsis (". . .") does not end a sentence.
            or following.islower()
            or following in (".", ",", ";")
        ):
            continue
        add(start, match.end())
        start = match.end()
    if text[start:].strip():
        add(start, len(text.rstrip()))
    return spans


def merge_lines(boxes: list[tuple]) -> list[tuple]:
    lines: list[list[float]] = []
    for box in boxes:
        if lines and abs(lines[-1][1] - box[1]) < 2 and box[0] >= lines[-1][0]:
            lines[-1][2] = max(lines[-1][2], box[2])
            lines[-1][3] = max(lines[-1][3], box[3])
        else:
            lines.append(list(box))
    return [tuple(line) for line in lines]


def anchor_document(doc: Document, html: str | None = None) -> tuple[Document, str | None]:
    soup = BeautifulSoup(html, "html.parser") if html else None
    doc.sentences = []
    for paragraph in doc.paragraphs:
        spans = split_spans(paragraph.text)
        for index, (start, end) in enumerate(spans):
            sid = f"{paragraph.id}s{index + 1}"
            selected = [w for w in paragraph.words if w.start < end and w.end > start]
            # A sentence continued across a page break is located on the page where it starts.
            page = (selected[0].page or paragraph.page) if selected else paragraph.page
            boxes = merge_lines([w.bbox for w in selected if (w.page or paragraph.page) == page])
            doc.sentences.append(
                Sentence(
                    id=sid,
                    text=paragraph.text[start:end],
                    section_id=paragraph.section_id,
                    order=len(doc.sentences),
                    page=page,
                    bbox=boxes,
                    dom_id=sid if soup else None,
                    paragraph_id=paragraph.id,
                )
            )
        if soup and paragraph.dom_id:
            node = soup.find(id=paragraph.dom_id)
            if node is None:
                continue
            offset = 0
            assigned: set[str] = set()
            for child in list(node.descendants):
                if not isinstance(child, NavigableString):
                    continue
                original = str(child)
                base, offset = offset, offset + len(original)
                pieces = []
                position = 0
                for index, (start, end) in enumerate(spans):
                    left, right = max(0, start - base), min(len(original), end - base)
                    if left >= right:
                        continue
                    sid = f"{paragraph.id}s{index + 1}"
                    math = child.find_parent("math")
                    if math:
                        math["data-sentence"] = sid
                        if sid not in assigned:
                            math["id"] = sid
                            assigned.add(sid)
                        continue
                    if left > position:
                        pieces.append(NavigableString(original[position:left]))
                    span = soup.new_tag("span", attrs={"data-sentence": sid})
                    if sid not in assigned:
                        span["id"] = sid
                        assigned.add(sid)
                    span.string = original[left:right]
                    pieces.append(span)
                    position = right
                if pieces:
                    if position < len(original):
                        pieces.append(NavigableString(original[position:]))
                    for piece in pieces:
                        child.insert_before(piece)
                    child.extract()
    return doc, str(soup) if soup else None
