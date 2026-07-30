from backend.services.normalization import (
    normalize_string,
    normalize_role,
    normalize_currency,
    normalize_item,
    ROLE_ALIASES,
)
from backend.models.extraction import ExtractedItem
from backend.models.procurement import ProcurementCategory


def test_normalize_string():
    assert normalize_string("  HELLO WORLD  ") == "hello world"
    assert normalize_string("O'Reilly") == "oreilly"
    # punctuation removed
    assert normalize_string("C# Developer!") == "c developer"


def test_normalize_currency():
    assert normalize_currency("$") == "USD"
    assert normalize_currency("eur") == "EUR"
    assert normalize_currency("₹") == "INR"
    assert normalize_currency("GBP ") == "GBP"


def test_normalize_item_role():
    item = ExtractedItem(
        category=ProcurementCategory.RESOURCE, role_name="dot net developer"
    )
    item = normalize_item(item)
    assert item.normalized_description == "dotnetdeveloper"


def test_normalize_item_currency():
    item = ExtractedItem(category=ProcurementCategory.SOFTWARE, currency="$")
    item = normalize_item(item)
    assert item.currency == "USD"
