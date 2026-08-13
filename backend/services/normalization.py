import re
from typing import Dict, Any, Optional
from backend.models.extraction import ExtractedItem
from backend.services.product_name_formatter import format_product_name

ROLE_ALIASES = {
    "dotnet developer": [
        ".net developer",
        "dot net developer",
        "c# developer",
        "asp.net developer",
        "c# engineer",
    ],
    "software engineer": ["sw engineer", "swe", "software dev", "developer"],
    "project manager": ["pm", "project mgr"],
}


def normalize_string(s: Optional[str]) -> Optional[str]:
    if not s:
        return None
    # lowercase, strip, remove extra whitespaces
    s = re.sub(r"\s+", " ", s.strip().lower())
    # remove punctuation that might cause mismatches
    s = re.sub(r"[^\w\s]", "", s)
    return s


def normalize_role(role: Optional[str]) -> Optional[str]:
    if not role:
        return None
    norm = normalize_string(role)
    if not norm:
        return role

    for canonical, aliases in ROLE_ALIASES.items():
        if norm == canonical or norm in [normalize_string(a) for a in aliases]:
            # e.g., dotnetdeveloper, but wait the requirement says "dotnet developer"
            return canonical.replace(" ", "")

    # Just a basic fallback to see if we match anything
    for canonical, aliases in ROLE_ALIASES.items():
        if norm == canonical or norm in [normalize_string(a) for a in aliases]:
            return canonical

    return norm.replace(" ", "") if norm else role


def normalize_currency(currency: Optional[str]) -> Optional[str]:
    if not currency:
        return None
    c = currency.strip().upper()
    # Handle common symbols
    if c == "$" or c == "US$":
        return "USD"
    if c == "€":
        return "EUR"
    if c == "£":
        return "GBP"
    if c == "₹" or c == "RS" or c == "INR":
        return "INR"
    return c


def normalize_item(item: ExtractedItem) -> ExtractedItem:
    # For hardware, use industry-standard casing formatter on the description
    if item.category and str(item.category).upper() == "HARDWARE":
        if item.normalized_description:
            item.normalized_description = format_product_name(item.normalized_description)
        elif item.raw_description:
            item.normalized_description = format_product_name(item.raw_description)
    elif not item.normalized_description and item.raw_description:
        # For non-hardware: simple strip as fallback
        item.normalized_description = item.raw_description.strip()

    if item.role_name:
        # Example requirement: Canonical result: "dotnet developer"
        norm_role = normalize_string(item.role_name)
        for canonical, aliases in ROLE_ALIASES.items():
            if norm_role == canonical or norm_role in [
                normalize_string(a) for a in aliases
            ]:
                item.normalized_description = canonical.replace(" ", "")
                break
        else:
            item.normalized_description = (
                norm_role.replace(" ", "") if norm_role else item.normalized_description
            )

    if item.currency:
        item.currency = normalize_currency(item.currency)

    if item.manufacturer:
        item.manufacturer = normalize_string(item.manufacturer)

    return item
