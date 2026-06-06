"""
PDF text extraction using pdfplumber (primary) with pymupdf fallback.
Includes text cleaning and section detection.
"""

import re
import io
from typing import Optional
from loguru import logger

try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False

try:
    import fitz  # pymupdf
    FITZ_AVAILABLE = True
except ImportError:
    FITZ_AVAILABLE = False


def extract_text_from_bytes(pdf_bytes: bytes) -> str:
    """
    Extract raw text from PDF bytes.
    Tries pdfplumber first, falls back to pymupdf.
    """
    text = ""

    if PDFPLUMBER_AVAILABLE:
        try:
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text() or ""
                    text += page_text + "\n"
            if text.strip():
                return clean_text(text)
        except Exception as e:
            logger.warning(f"pdfplumber failed: {e}. Trying pymupdf...")

    if FITZ_AVAILABLE:
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            for page in doc:
                text += page.get_text() + "\n"
            doc.close()
            if text.strip():
                return clean_text(text)
        except Exception as e:
            logger.error(f"pymupdf also failed: {e}")

    raise ValueError("Could not extract text from PDF — unsupported or corrupted file")


def clean_text(text: str) -> str:
    """Clean and normalize extracted PDF text."""
    # Remove excessive whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r" {2,}", " ", text)
    # Remove non-printable characters
    text = re.sub(r"[^\x20-\x7E\n]", " ", text)
    return text.strip()


def detect_sections(text: str) -> dict:
    """
    Detect common resume sections using heuristic pattern matching.
    Returns dict of section_name -> content.
    """
    section_patterns = {
        "contact": r"(?i)(contact|email|phone|address|linkedin)",
        "summary": r"(?i)(summary|objective|profile|about me)",
        "experience": r"(?i)(experience|work history|employment|career)",
        "education": r"(?i)(education|academic|degree|university|college)",
        "skills": r"(?i)(skills|technologies|competencies|expertise)",
        "certifications": r"(?i)(certifications|certificates|credentials|licenses)",
        "projects": r"(?i)(projects|portfolio|achievements)",
    }

    sections = {}
    lines = text.split("\n")

    current_section = "header"
    current_content = []

    for line in lines:
        detected = None
        for section, pattern in section_patterns.items():
            if re.search(pattern, line) and len(line.strip()) < 60:
                detected = section
                break

        if detected:
            if current_content:
                sections[current_section] = "\n".join(current_content).strip()
            current_section = detected
            current_content = []
        else:
            current_content.append(line)

    if current_content:
        sections[current_section] = "\n".join(current_content).strip()

    return sections


def extract_emails(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", text)


def extract_phones(text: str) -> list[str]:
    return re.findall(r"(?:\+\d{1,3}[-\s]?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}", text)


def extract_years_of_experience(text: str) -> Optional[int]:
    """Heuristically estimate years of experience from resume text."""
    patterns = [
        r"(\d+)\+?\s*years?\s*(?:of\s*)?experience",
        r"experience\s*(?:of\s*)?(\d+)\+?\s*years?",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return int(match.group(1))

    # Fallback: count distinct years mentioned (very rough)
    years = re.findall(r"\b(20\d{2})\b", text)
    if len(years) >= 2:
        years_int = sorted(set(int(y) for y in years))
        return years_int[-1] - years_int[0]
    return None
