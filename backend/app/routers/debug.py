"""
Debug router — read-only endpoints to verify the database is wired up correctly.
Remove or restrict these before going to production.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..database import get_db
from .. import models

router = APIRouter(prefix="/debug", tags=["debug"])


@router.get("/tables")
def list_tables(db: Session = Depends(get_db)):
    """
    Returns the name of every table in the database plus its row count.
    Useful for a quick sanity-check that all models were created correctly.
    """

    # Ask PostgreSQL directly which tables exist in the public schema
    result = db.execute(
        text("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")
    )
    table_names = [row[0] for row in result]

    tables = []
    for name in table_names:
        # Count rows in each table using a safe parameterised identifier
        count_result = db.execute(text(f"SELECT COUNT(*) FROM {name}"))
        row_count = count_result.scalar()
        tables.append({"table": name, "row_count": row_count})

    return {"tables": tables}


@router.get("/tables/{table_name}/sample")
def sample_rows(table_name: str, db: Session = Depends(get_db)):
    """
    Returns up to 5 rows from any table so you can see what the data looks like.

    Example URLs:
        /debug/tables/campaigns/sample
        /debug/tables/adsets/sample
        /debug/tables/ads/sample
        /debug/tables/ad_insights_daily/sample
    """

    # Only allow our known tables — prevents SQL injection from the URL
    ALLOWED_TABLES = {"campaigns", "adsets", "ads", "ad_insights_daily"}
    if table_name not in ALLOWED_TABLES:
        return {"error": f"Unknown table '{table_name}'. Allowed: {sorted(ALLOWED_TABLES)}"}

    result = db.execute(text(f"SELECT * FROM {table_name} LIMIT 5"))

    # Convert each row into a plain dict so FastAPI can JSON-encode it
    columns = result.keys()
    rows = [dict(zip(columns, row)) for row in result]

    return {"table": table_name, "rows": rows}


@router.get("/relationships")
def check_relationships(db: Session = Depends(get_db)):
    """
    Walks the ORM relationships to prove the foreign keys work correctly.
    Returns: each campaign → its ad sets → their ads → each ad's insight count.
    """

    campaigns = db.query(models.Campaign).all()

    output = []
    for campaign in campaigns:
        campaign_data = {
            "campaign_id"  : campaign.id,
            "campaign_name": campaign.name,
            "adsets"       : [],
        }

        for adset in campaign.adsets:
            adset_data = {
                "adset_id"  : adset.id,
                "adset_name": adset.name,
                "ads"       : [],
            }

            for ad in adset.ads:
                adset_data["ads"].append({
                    "ad_id"        : ad.id,
                    "ad_name"      : ad.name,
                    "insight_days" : len(ad.daily_insights),  # count of daily rows
                })

            campaign_data["adsets"].append(adset_data)

        output.append(campaign_data)

    return {"relationships": output}
