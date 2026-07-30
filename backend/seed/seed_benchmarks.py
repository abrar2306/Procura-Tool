import os
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime, timezone

load_dotenv()


def get_supabase() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Skipping DB insert.")
        return None
    return create_client(url, key)


SOFTWARE_MOCKS = [
    {
        "canonical_name": "Microsoft 365 E3",
        "aliases": [
            "M365 E3",
            "O365 E3",
            "Office 365 E3",
            "Microsoft 365 Enterprise E3",
        ],
        "attributes": {"publisher": "Microsoft", "license_metric": "User/Month"},
        "currency": "USD",
        "unit": "MONTH",
        "benchmark_low": 30.0,
        "benchmark_median": 33.0,
        "benchmark_high": 36.0,
        "region": "Global",
        "source_name": "MVP_MOCK_DATA",
        "confidence": 95,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
]

# Generate additional mock software
for i in range(1, 20):
    SOFTWARE_MOCKS.append(
        {
            "canonical_name": f"Mock Software {i}",
            "aliases": [f"MockSoft {i}"],
            "attributes": {"publisher": f"Publisher {i}"},
            "currency": "USD",
            "unit": "MONTH",
            "benchmark_low": 10.0 + i,
            "benchmark_median": 12.0 + i,
            "benchmark_high": 15.0 + i,
            "region": "Global",
            "source_name": "MVP_MOCK_DATA",
            "confidence": 80,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )

HARDWARE_MOCKS = [
    {
        "canonical_name": "Dell Latitude 5450",
        "aliases": ["Latitude 5450", "Dell 5450"],
        "attributes": {
            "manufacturer": "Dell",
            "cpu": "Core i5",
            "ram": "16GB",
            "storage": "512GB SSD",
        },
        "currency": "USD",
        "unit": "EACH",
        "benchmark_low": 1100.0,
        "benchmark_median": 1250.0,
        "benchmark_high": 1400.0,
        "region": "Global",
        "source_name": "MVP_MOCK_DATA",
        "confidence": 90,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
]

# Generate additional mock hardware
for i in range(1, 20):
    HARDWARE_MOCKS.append(
        {
            "canonical_name": f"Mock Laptop {i}",
            "aliases": [f"MockLap {i}"],
            "attributes": {"manufacturer": f"Maker {i}"},
            "currency": "USD",
            "unit": "EACH",
            "benchmark_low": 800.0 + i * 10,
            "benchmark_median": 900.0 + i * 10,
            "benchmark_high": 1000.0 + i * 10,
            "region": "Global",
            "source_name": "MVP_MOCK_DATA",
            "confidence": 85,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )

RESOURCE_MOCKS = [
    {
        "canonical_name": ".NET Developer",
        "aliases": [
            "dot net developer",
            "c# developer",
            "asp.net developer",
            "C# Engineer",
        ],
        "attributes": {
            "experience_band": "4-6 years",
            "location": "Pune",
            "level": "Mid-Senior",
        },
        "currency": "INR",
        "unit": "MONTH",
        "benchmark_low": 120000.0,
        "benchmark_median": 140000.0,
        "benchmark_high": 160000.0,
        "region": "India",
        "source_name": "MVP_MOCK_DATA",
        "confidence": 95,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
]

# Generate additional mock resources
for i in range(1, 20):
    RESOURCE_MOCKS.append(
        {
            "canonical_name": f"Mock Role {i}",
            "aliases": [f"RoleAlias {i}"],
            "attributes": {"experience_band": "2-4 years", "location": "Remote"},
            "currency": "USD",
            "unit": "MONTH",
            "benchmark_low": 4000.0 + i * 100,
            "benchmark_median": 5000.0 + i * 100,
            "benchmark_high": 6000.0 + i * 100,
            "region": "Global",
            "source_name": "MVP_MOCK_DATA",
            "confidence": 80,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )


def seed():
    supabase = get_supabase()
    if not supabase:
        print(
            "Mock data generated but not inserted into Supabase (missing credentials)."
        )
        return

    print("Seeding software pricing...")
    for chunk in [
        SOFTWARE_MOCKS[i : i + 10] for i in range(0, len(SOFTWARE_MOCKS), 10)
    ]:
        supabase.table("software_pricing").insert(chunk).execute()

    print("Seeding hardware pricing...")
    for chunk in [
        HARDWARE_MOCKS[i : i + 10] for i in range(0, len(HARDWARE_MOCKS), 10)
    ]:
        supabase.table("hardware_pricing").insert(chunk).execute()

    print("Seeding resource pricing...")
    for chunk in [
        RESOURCE_MOCKS[i : i + 10] for i in range(0, len(RESOURCE_MOCKS), 10)
    ]:
        supabase.table("resource_pricing").insert(chunk).execute()

    print("Seeding complete.")


if __name__ == "__main__":
    seed()
