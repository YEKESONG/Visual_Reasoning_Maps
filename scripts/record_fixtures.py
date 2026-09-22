"""Explicit paid smoke/recording command. Outputs stay in ignored data/."""

import argparse
import asyncio
from pathlib import Path

from backend.app.anchoring.sentences import anchor_document
from backend.app.config import settings
from backend.app.extraction.pipeline import sections_payload
from backend.app.ingest.pdf_pymupdf import parse_pdf
from backend.app.llm.client import LLMClient
from backend.app.models import Graph
from backend.app.storage.files import Store, digest


async def main() -> None:
    parser = argparse.ArgumentParser(
        description="Record one real skeleton call; requires a configured key."
    )
    parser.add_argument("pdf", type=Path)
    args = parser.parse_args()
    key = digest(args.pdf.read_bytes())
    doc, _ = anchor_document(parse_pdf(args.pdf, key))
    store = Store(settings.data_dir)
    model = LLMClient(settings, store, key)
    result = await model.generate(
        "skeleton",
        {"title": doc.title, "sections": sections_payload(doc, settings.max_input_chars)},
        Graph,
    )
    store.write(key, "recorded_skeleton.json", result.model_dump(mode="json"))
    cost = "unknown" if model.cost_usd is None else f"{model.cost_usd:.6f}"
    print(
        f"Recorded in data/{key}/recorded_skeleton.json; tokens={model.total_tokens}; estimate_usd={cost}"
    )


if __name__ == "__main__":
    asyncio.run(main())
