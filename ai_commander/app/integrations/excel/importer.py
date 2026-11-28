from io import BytesIO
import pandas as pd
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crm.entity_resolution import resolve_or_create_customer
from app.models.orchestration import IntegrationLog

REQUIRED_CUSTOMER_COLUMNS = {"name", "channel", "contact"}


async def import_customers_excel(db: AsyncSession, content: bytes, *, default_sector: str = "unknown") -> dict[str, int]:
    """Validate Excel schema via Pandas/OpenPyXL and resolve customers into canonical IDs."""
    try:
        df = pd.read_excel(BytesIO(content), engine="openpyxl")
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid Excel file: {exc}") from exc

    normalized_cols = {str(col).strip().lower(): col for col in df.columns}
    missing = REQUIRED_CUSTOMER_COLUMNS - set(normalized_cols.keys())
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required Excel columns: {sorted(missing)}",
        )

    created = 0
    matched = 0
    skipped = 0

    for _, row in df.iterrows():
        name = str(row[normalized_cols["name"]] or "").strip()
        channel = str(row[normalized_cols["channel"]] or "").strip().lower()
        contact = str(row[normalized_cols["contact"]] or "").strip()
        sector_col = normalized_cols.get("sector")
        sector = str(row[sector_col]).strip().lower() if sector_col and pd.notna(row[sector_col]) else default_sector

        if not name or not channel or not contact or contact.lower() == "nan":
            skipped += 1
            continue

        _, is_new = await resolve_or_create_customer(
            db,
            channel=channel,
            contact_value=contact,
            name=name,
            sector=sector,
        )
        if is_new:
            created += 1
        else:
            matched += 1

    db.add(
        IntegrationLog(
            integration="excel",
            direction="inbound",
            status="success",
            details={"created": created, "matched": matched, "skipped": skipped},
        )
    )
    await db.commit()
    return {"created": created, "matched": matched, "skipped": skipped}

