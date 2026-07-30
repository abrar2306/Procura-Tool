import io
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def extract_text_from_file(filename: str, filepath: str) -> str:
    name = filename.lower()
    try:
        if name.endswith(".pdf"):
            import pdfplumber

            text = []
            with pdfplumber.open(filepath) as pdf:
                for page in pdf.pages:
                    t = page.extract_text() or ""
                    text.append(t)
            return "\n".join(text)
        elif name.endswith(".docx"):
            from docx import Document as DocxDocument

            doc = DocxDocument(filepath)
            paras = [p.text for p in doc.paragraphs]
            for tbl in doc.tables:
                for row in tbl.rows:
                    paras.append(" | ".join(c.text for c in row.cells))
            return "\n".join(paras)
        elif name.endswith(".xlsx"):
            from openpyxl import load_workbook

            wb = load_workbook(filepath, data_only=True)
            lines = []
            for ws in wb.worksheets:
                lines.append(f"=== Sheet: {ws.title} ===")
                for row in ws.iter_rows(values_only=True):
                    row_txt = " | ".join("" if v is None else str(v) for v in row)
                    if row_txt.strip():
                        lines.append(row_txt)
            return "\n".join(lines)
        elif name.endswith(".txt") or name.endswith(".csv"):
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
    except Exception as e:
        logger.error(f"Extraction failed for {filename}: {e}")
    return ""
