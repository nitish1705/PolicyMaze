from __future__ import annotations

from typing import Protocol, runtime_checkable

from backend.adapters.pdf_provider import ParsedDocument, parse_pdf
from backend.domain.result import Err, Ok, Result


@runtime_checkable
class PolicySourceProvider(Protocol):
    def name(self) -> str: ...
    def supported_formats(self) -> list[str]: ...
    def extract_text(self, file_path: str) -> Result[ParsedDocument, str]: ...


class PdfPolicyProvider:
    def name(self) -> str:
        return "pdf-pymupdf4llm"

    def supported_formats(self) -> list[str]:
        return ["pdf"]

    def extract_text(self, file_path: str) -> Result[ParsedDocument, str]:
        try:
            doc = parse_pdf(file_path)
            return Ok(doc)
        except Exception as exc:
            return Err(f"PDF parse failed: {exc}")
