# Benchmark Templates

This folder contains the three Excel templates you can populate with your firm's historical procurement data.

| File | What it holds | Where it plugs in |
|---|---|---|
| `resource_benchmarks_template.xlsx` | Monthly cost per role × experience level | Services / Managed Services analysis (resource cost benchmarking) |
| `software_benchmarks_template.xlsx` | Historical software SKU / license procurements | License/SKU procurement analysis (pricing benchmark) |
| `hardware_benchmarks_template.xlsx` | Historical hardware procurements | Hardware Product analysis (pricing benchmark) |

## How to use

1. **Open the file in Excel** (or Google Sheets / LibreOffice)
2. **Overwrite the sample rows** with your real historical data. Keep the header row intact and don't rename columns.
3. **Save the file** (keep as `.xlsx`)
4. **In the Procura app** → Sidebar → **Benchmarks** → select the matching tab → click **Upload Excel** and pick the file
5. Existing rows in the database with the same identity get updated; new rows are added

## Column reference

### `resource_benchmarks_template.xlsx`
| Column | Required | Description |
|---|---|---|
| `role` | ✅ | Role name (e.g. "SAP Consultant"). Case-insensitive fuzzy match at analysis time. |
| `junior` | | Monthly cost in USD |
| `mid` | | Monthly cost in USD |
| `senior` | | Monthly cost in USD |
| `source` | | Label shown in reports (e.g. "internal-2025", "Gartner-2024") |
| `notes` | | Free text |

### `software_benchmarks_template.xlsx`
| Column | Description |
|---|---|
| `oem` | Publisher (Microsoft, Adobe, SAP, Oracle…) |
| `product_name` | Product (e.g. "Microsoft 365 E3") |
| `sku` | SKU or catalog number |
| `license_type` | Subscription / Perpetual / SaaS / Term License / Consumption-based |
| `license_metric` | Per Named User / Per Device / Per Core / Per FUE / etc. |
| `currency` | ISO code |
| `quantity` | Units purchased |
| `total_price` | Total contract value in the currency above |
| `unit_price` | Per-unit price (optional — computed as total ÷ quantity if omitted) |
| `contract_duration` | In months |
| `source` | Label |
| `date` | ISO date or `YYYY-MM` |
| `notes` | Free text |

### `hardware_benchmarks_template.xlsx`
| Column | Description |
|---|---|
| `oem` | Dell / HPE / Cisco / Lenovo… |
| `product` | Product family |
| `model_number` | Model |
| `part_number` | Part number |
| `configuration` | Free-text specs |
| `quantity` | Units |
| `unit_price` | Per-unit price |
| `warranty` | e.g. "3Y NBD" |
| `currency` | ISO code |
| `source`, `date`, `notes` | As above |

## Notes

- Files are **starter templates**. Sample rows are for illustration — delete them before your first real upload.
- The app also lets you download identical templates on-demand from each Benchmarks tab. Both routes produce the same file.
- On re-upload, rows are **added**, not replaced. Delete unwanted rows from the UI or MongoDB directly.
