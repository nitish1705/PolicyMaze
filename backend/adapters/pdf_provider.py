from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import pymupdf4llm
import pymupdf


@dataclass(frozen=True)
class ParsedDocument:
    filename: str
    page_count: int
    markdown_text: str


def parse_pdf(file_path: str | Path) -> ParsedDocument:
    path = Path(file_path)
    doc = pymupdf.open(str(path))
    page_count = len(doc)
    doc.close()

    md_text = pymupdf4llm.to_markdown(str(path))

    return ParsedDocument(
        filename=path.name,
        page_count=page_count,
        markdown_text=md_text,
    )
