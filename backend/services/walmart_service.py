"""Walmart Affiliate Product API — RSA signature-based authentication."""
import base64
import time
import uuid
import httpx
from fastapi import HTTPException
from cryptography.hazmat.primitives.serialization import load_pem_private_key
from cryptography.hazmat.primitives.serialization.ssh import load_ssh_private_key
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes
from ..config import get_settings


def _load_private_key_pem(settings) -> bytes:
    """Return raw key bytes from file (preferred) or WALMART_CLIENT_SECRET env var."""
    if settings.WALMART_PRIVATE_KEY_PATH:
        try:
            with open(settings.WALMART_PRIVATE_KEY_PATH, "rb") as f:
                return f.read()
        except OSError as e:
            raise HTTPException(status_code=503, detail=f"Cannot read Walmart private key file: {e}")
    if settings.WALMART_CLIENT_SECRET:
        return settings.WALMART_CLIENT_SECRET.encode()
    raise HTTPException(status_code=503, detail="Walmart private key not configured. Set WALMART_PRIVATE_KEY_PATH in .env")


def _auth_headers(consumer_id: str, private_key_pem: bytes, key_version: str = "1") -> dict:
    """Build Walmart affiliate auth headers by signing with the RSA private key."""
    timestamp_ms = str(int(time.time() * 1000))
    string_to_sign = f"{consumer_id}\n{timestamp_ms}\n{key_version}\n"

    key_bytes = private_key_pem
    try:
        private_key = load_ssh_private_key(key_bytes, password=None)
    except TypeError:
        private_key = load_pem_private_key(key_bytes, password=None)
    signature = private_key.sign(string_to_sign.encode(), padding.PKCS1v15(), hashes.SHA256())

    return {
        "WM_CONSUMER.ID": consumer_id,
        "WM_CONSUMER.INTIMESTAMP": timestamp_ms,
        "WM_SEC.AUTH_SIGNATURE": base64.b64encode(signature).decode(),
        "WM_SEC.KEY_VERSION": key_version,
        "WM_QOS.CORRELATION_ID": str(uuid.uuid4()),
        "Accept": "application/json",
    }


def _check_configured(settings) -> None:
    if not settings.WALMART_CLIENT_ID or not settings.WALMART_CLIENT_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Walmart API not configured. Add WALMART_CLIENT_ID and WALMART_CLIENT_SECRET to .env",
        )


async def search_products(query: str, limit: int = 10) -> list[dict]:
    settings = get_settings()
    _check_configured(settings)

    try:
        pem = _load_private_key_pem(settings)
        headers = _auth_headers(settings.WALMART_CLIENT_ID, pem)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Walmart key error: {e}")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.WALMART_API_BASE_URL}/search",
            headers=headers,
            params={"query": query, "numItems": limit, "format": "json"},
            timeout=15.0,
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=503,
            detail=f"Walmart search failed ({response.status_code}): {response.text[:300]}",
        )

    items = response.json().get("items", [])
    return [
        {
            "item_id": str(item.get("itemId", "")),
            "name": item.get("name", ""),
            "sale_price": item.get("salePrice", item.get("msrp", 0)),
            "thumbnail_image": item.get("thumbnailImage", ""),
            "product_url": item.get("productUrl", ""),
            "customer_rating": item.get("customerRating", ""),
        }
        for item in items
    ]
