import re
from pathlib import Path
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from backend.app.models import Document, Paragraph, Section

ALLOWED = {"arxiv.org", "www.arxiv.org", "export.arxiv.org"}
ASSETS = ALLOWED | {"static.arxiv.org", "ar5iv.labs.arxiv.org"}


def arxiv_id(url: str) -> str:
    parsed = urlparse(url)
    match = re.fullmatch(r"/(?:html|abs|pdf)/(\d{4}\.\d{4,5}(?:v\d+)?)(?:\.pdf)?/?", parsed.path)
    if (
        parsed.scheme != "https"
        or parsed.hostname not in ALLOWED
        or parsed.port not in (None, 443)
        or parsed.username
        or not match
    ):
        raise ValueError("Utilisez un lien HTTPS arxiv.org/html/… valide.")
    return match[1]


async def fetch(client: httpx.AsyncClient, url: str, limit: int = 30 * 1024 * 1024) -> bytes:
    for _ in range(5):
        parsed = urlparse(url)
        if (
            parsed.scheme != "https"
            or parsed.hostname not in ASSETS
            or parsed.port not in (None, 443)
            or parsed.username
        ):
            raise ValueError("Redirection externe interdite.")
        async with client.stream("GET", url) as response:
            if response.is_redirect:
                url = urljoin(url, response.headers["location"])
                continue
            response.raise_for_status()
            output = bytearray()
            async for part in response.aiter_bytes():
                output.extend(part)
                if len(output) > limit:
                    raise ValueError("Document distant trop volumineux.")
            return bytes(output)
    raise ValueError("Trop de redirections arXiv.")


def parse_html(content: str, doc_id: str, url: str) -> tuple[Document, str]:
    soup = BeautifulSoup(content, "html.parser")
    article = soup.select_one("article")
    if not article:
        raise ValueError("HTML arXiv indisponible.")
    for el in soup.select("script, iframe, object, embed, form, base"):
        el.decompose()
    for el in soup.find_all(True):
        for key in list(el.attrs):
            if key.startswith("on") or key in ("srcdoc", "srcset"):
                del el[key]
    title = soup.select_one("h1")
    doc = Document(
        id=doc_id,
        title=title.get_text(" ", strip=True) if title else "Article arXiv",
        kind="html",
        source_url=url,
    )
    doc.sections = [Section(id="sec1", title="Document")]
    section = "sec1"
    for el in article.select("h2, h3, p, .ltx_equation"):
        if el.name in ("h2", "h3"):
            section = f"sec{len(doc.sections) + 1}"
            doc.sections.append(Section(id=section, title=el.get_text(" ", strip=True)))
            continue
        if el.find_parent("p"):
            continue
        text = el.get_text("", strip=False)
        if not text.strip():
            continue
        key = f"p{len(doc.paragraphs) + 1}"
        el["id"] = "vrm-" + key
        latex = [m.get("alttext", "") for m in el.select("math[alttext]")]
        doc.paragraphs.append(
            Paragraph(id=key, text=text, section_id=section, dom_id="vrm-" + key, latex=latex)
        )
    if not doc.paragraphs:
        raise ValueError("HTML sans texte exploitable.")
    return doc, str(soup)


async def cached_css(client: httpx.AsyncClient, url: str, depth: int = 0) -> str:
    """Inline publisher styles, including arXiv's cascade-layer imports."""
    content = (await fetch(client, url, 4 * 1024 * 1024)).decode("utf8")
    pattern = re.compile(
        r"@import\s+(?:url\(\s*['\"]?([^'\"\s)]+)['\"]?\s*\)|['\"]([^'\"]+)['\"])\s*([^;]*);", re.I
    )
    output = []
    start = 0
    for match in list(pattern.finditer(content))[:20]:
        output.append(content[start : match.start()])
        nested = ""
        if depth < 3:
            try:
                nested = await cached_css(client, urljoin(url, match[1] or match[2]), depth + 1)
            except (httpx.HTTPError, ValueError, UnicodeError):
                pass
        qualifiers = match[3].strip()
        layer = re.match(r"layer\(([-\w.]+)\)", qualifiers)
        if layer:
            nested = "@layer " + layer[1] + " {" + nested + "}"
            qualifiers = qualifiers[layer.end() :].strip()
        if qualifiers:
            nested = "@media " + qualifiers + " {" + nested + "}"
        output.append(nested)
        start = match.end()
    output.append(content[start:])
    content = "".join(output)
    # Drop remote fonts/backgrounds; leave type and document geometry rules intact.
    return re.sub(r"@import[^;]*;|url\([^)]*\)", "", content)


async def acquire(url: str, directory: Path, doc_id: str) -> tuple[Document, bytes]:
    paper_id = arxiv_id(url)
    html_url = f"https://arxiv.org/html/{paper_id}"
    async with httpx.AsyncClient(
        timeout=45, headers={"User-Agent": "VisualReasoningMaps/0.1 (local research prototype)"}
    ) as client:
        try:
            body = await fetch(client, html_url)
            doc, clean = parse_html(body.decode("utf8"), doc_id, html_url)
        except (httpx.HTTPError, ValueError, UnicodeError):
            body = await fetch(client, f"https://arxiv.org/pdf/{paper_id}")
            if not body.startswith(b"%PDF"):
                raise ValueError("Aucun HTML ni PDF exploitable sur arXiv.") from None
            (directory / "source.pdf").write_bytes(body)
            from backend.app.ingest.pdf_pymupdf import parse_pdf

            doc = parse_pdf(directory / "source.pdf", doc_id)
            doc.source_url = f"https://arxiv.org/pdf/{paper_id}"
            return doc, body
        soup = BeautifulSoup(clean, "html.parser")
        assets = directory / "assets"
        assets.mkdir(exist_ok=True)
        for index, el in enumerate(soup.select('link[rel="stylesheet"], img[src]')):
            attr = "href" if el.name == "link" else "src"
            remote = urljoin(html_url, el.get(attr, ""))
            suffix = ".css" if attr == "href" else Path(urlparse(remote).path).suffix
            if suffix.lower() not in (".css", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"):
                el.decompose()
                continue
            name = f"{index}{suffix}"
            try:
                content = (
                    (await cached_css(client, remote)).encode()
                    if suffix == ".css"
                    else await fetch(client, remote, 4 * 1024 * 1024)
                )
                (assets / name).write_bytes(content)
                el[attr] = f"/api/docs/{doc_id}/assets/{name}"
            except (httpx.HTTPError, ValueError, UnicodeError):
                el.decompose()
                doc.warnings.append("Une ressource arXiv n’a pas pu être mise en cache.")
        (directory / "source.html").write_text(str(soup))
        return doc, body
