# Weekly P&L Report Generator

Automated weekly Profit & Loss Excel report for Shopify eCommerce stores.
Generates a Hebrew RTL Excel workbook with settings, per-order P&L, and weekly summary.

## Quick Start

```bash
cd weekly-pnl
pip install -r requirements.txt

# Run for last completed week (Mon–Sun)
python -m src.run_weekly_pnl --last-completed-week

# Run for a specific week
python -m src.run_weekly_pnl --week-start 2026-02-16 --week-end 2026-02-22
```

## Shopify Credentials

Set environment variables:
```bash
export SHOPIFY_SHOP_DOMAIN="your-store.myshopify.com"
export SHOPIFY_ACCESS_TOKEN="shpat_..."
```

If credentials are missing, the tool generates a **demo report with mock data**.

## Marketing Spend CSV

Place your marketing spend file at `./inputs/marketing_spend.csv`:

```csv
week_start,week_end,spend_usd
2026-02-16,2026-02-22,350.00
2026-02-23,2026-03-01,310.00
```

- `week_start`: Monday (YYYY-MM-DD)
- `week_end`: Sunday (YYYY-MM-DD)
- `spend_usd`: Total marketing spend for the week in USD

If the target week is missing from the CSV, marketing cost = $0 and a warning is shown.

## Output

Reports are saved to `./output/`:
```
pnl_week_2026-02-16_to_2026-02-22.xlsx
```

Logs are saved to `./output/logs/`.

## Excel Structure (Hebrew)

| Tab | Hebrew Name | Content |
|-----|------------|---------|
| 1 | הגדרות | Settings (VAT rate, fees, shipping costs) |
| 2 | הזמנות | Per-order P&L with all Hebrew column headers |
| 3 | סיכום שבועי | Weekly summary totals + data quality warnings |

## Configurable Settings

Edit `src/settings.py` to change:
- `VAT_RATE` (default: 18%)
- `EXTERNAL_PROCESSING_FEE_PERCENT` (default: 1.4%)
- `SHIPPING_COSTS` (pickup: $5.70, home: $10.20)
- `MARKETING_ALLOCATION` ("proportional" or "equal")
- Shipping type detection keywords

## Scheduling

### Windows Task Scheduler (Weekly, Sunday 08:00)
1. Open Task Scheduler → Create Basic Task
2. Trigger: Weekly, Sunday, 08:00
3. Action: Start a Program
   - Program: `python`
   - Arguments: `-m src.run_weekly_pnl --last-completed-week`
   - Start in: `C:\Users\amith\ads-dashboard\weekly-pnl`

### Linux/Mac Cron
```bash
# Every Sunday at 08:00
0 8 * * 0 cd /path/to/weekly-pnl && python -m src.run_weekly_pnl --last-completed-week >> ./output/logs/cron.log 2>&1
```

## Accounting Logic

```
RevenueBase = (Subtotal - Discounts) + ShippingRevenue
NetSalesExVAT = RevenueBase - VAT
ProcessingFees = NetSalesExVAT * 1.4%
MarketingAllocated = proportional by NetSalesExVAT (default)
ShippingCost = $5.70 (pickup) / $10.20 (home delivery)
COGS = sum(unit_cost × quantity) from Shopify InventoryItem
NetProfit = NetSalesExVAT - ProcessingFees - Marketing - ShippingCost - COGS
```
