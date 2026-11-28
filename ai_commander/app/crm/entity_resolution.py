import re
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import Customer, CustomerContact


def normalize_contact(channel: str, value: str) -> str:
    """Normalize phone numbers and emails into a canonical lookup key."""
    raw = value.strip()
    if channel == "email":
        return raw.lower()
    if channel == "whatsapp":
        digits = re.sub(r"\D+", "", raw)
        if digits.startswith("00"):
            digits = digits[2:]
        if digits.startswith("01") and len(digits) == 11:
            digits = f"20{digits[1:]}"
        return digits
    return raw.lower()


async def resolve_or_create_customer(
    db: AsyncSession,
    *,
    channel: str,
    contact_value: str,
    name: str,
    sector: str = "unknown",
) -> tuple[Customer, bool]:
    """Match an existing canonical customer by normalized contact before creating a new record."""
    normalized = normalize_contact(channel, contact_value)
    if not normalized:
        raise ValueError("Contact value cannot be empty after normalization")

    existing_contact = (
        await db.execute(
            select(CustomerContact).where(
                CustomerContact.channel == channel,
                CustomerContact.normalized_value == normalized,
            )
        )
    ).scalar_one_or_none()

    if existing_contact:
        customer = (await db.execute(select(Customer).where(Customer.id == existing_contact.customer_id))).scalar_one()
        return customer, False

    customer = Customer(canonical_name=name.strip() or normalized, sector=sector)
    db.add(customer)
    await db.flush()
    db.add(
        CustomerContact(
            customer_id=customer.id,
            channel=channel,
            normalized_value=normalized,
            is_primary=True,
        )
    )
    await db.flush()
    return customer, True

