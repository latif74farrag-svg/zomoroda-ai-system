import hashlib
import hmac
import json
import base64
import time
from dataclasses import dataclass
from fastapi import Header, HTTPException, status

from app.core.config import get_settings


@dataclass(frozen=True)
class Actor:
    """Authenticated human user acting on the system."""

    user_id: str
    role: str
    permissions: frozenset[str]


ROLE_PERMISSIONS: dict[str, frozenset[str]] = {
    "admin": frozenset({
        "agents:read", "agents:run",
        "tasks:read", "tasks:create", "tasks:approve",
        "approvals:read",
        "dashboard:read", "reports:read", "imports:write", "integrations:read",
    }),
    "operations": frozenset({
        "agents:read",
        "tasks:read", "tasks:create", "tasks:approve",
        "approvals:read",
        "dashboard:read", "reports:read", "imports:write", "integrations:read",
    }),
    "support": frozenset({"agents:read", "tasks:read", "tasks:create", "dashboard:read"}),
    "viewer": frozenset({"agents:read", "tasks:read", "approvals:read", "dashboard:read", "reports:read"}),
}


def create_session_token(user_id: str, role: str, ttl_seconds: int = 28800) -> str:
    """Create a signed HMAC session token for API authentication."""
    settings = get_settings()
    payload = {"sub": user_id, "role": role, "exp": int(time.time()) + ttl_seconds}
    encoded = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).decode()
    sig = hmac.new(settings.secret_key.encode(), encoded.encode(), hashlib.sha256).hexdigest()
    return f"{encoded}.{sig}"


def verify_session_token(token: str) -> Actor:
    """Verify an HMAC session token and resolve role permissions."""
    settings = get_settings()
    try:
        encoded, sig = token.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed session token") from exc

    expected = hmac.new(settings.secret_key.encode(), encoded.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session signature")

    payload = json.loads(base64.urlsafe_b64decode(encoded.encode()).decode())
    if int(payload.get("exp", 0)) < int(time.time()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")

    role = payload.get("role", "viewer")
    perms = ROLE_PERMISSIONS.get(role, frozenset())
    return Actor(user_id=str(payload["sub"]), role=role, permissions=perms)


async def get_current_actor(authorization: str | None = Header(default=None)) -> Actor:
    """FastAPI dependency extracting and validating the Bearer token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Bearer token")
    return verify_session_token(authorization.removeprefix("Bearer ").strip())

