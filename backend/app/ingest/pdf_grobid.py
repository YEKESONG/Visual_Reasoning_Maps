import httpx
from lxml import etree

from backend.app.models import Document, Section


async def enrich_grobid(pdf: bytes, doc: Document, base_url: str) -> Document:
    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            base_url.rstrip("/") + "/api/processFulltextDocument",
            files={"input": ("source.pdf", pdf, "application/pdf")},
        )
        response.raise_for_status()
    root = etree.fromstring(
        response.content, parser=etree.XMLParser(resolve_entities=False, no_network=True)
    )
    ns = {"t": "http://www.tei-c.org/ns/1.0"}
    titles = root.xpath("//t:titleStmt/t:title/text()", namespaces=ns)
    if titles:
        doc.title = titles[0]
    # Preserve word geometry; match TEI headings to the positional PDF paragraphs.
    for i, head in enumerate(root.xpath("//t:body//t:head", namespaces=ns)):
        title = "".join(head.itertext()).strip()
        key = f"grobid{i + 1}"
        matches = [p for p in doc.paragraphs if title.casefold() in p.text.casefold()]
        if matches:
            doc.sections.append(Section(id=key, title=title))
            start = doc.paragraphs.index(matches[0])
            for paragraph in doc.paragraphs[start:]:
                paragraph.section_id = key
    return doc
