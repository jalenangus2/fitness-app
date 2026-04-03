"""Walmart Product Search API integration with OAuth2 token caching."""
import time
import uuid
import base64
import httpx
from fastapi import HTTPException
from ..config import get_settings

_token_cache: dict = {"access_token": None, "expires_at": 0.0}


async def _get_token() -> str:
    settings = get_settings()
    if not settings.WALMART_CLIENT_ID or not settings.WALMART_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Walmart API credentials not configured")

    now = time.time()
    if _token_cache["access_token"] and now < _token_cache["expires_at"] - 60:
        return _token_cache["access_token"]

    credentials = f"{settings.WALMART_CLIENT_ID}:{settings.WALMART_CLIENT_SECRET}"
    encoded = base64.b64encode(credentials.encode()).decode()

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://marketplace.walmartapis.com/v3/token",
            headers={
                "Authorization": f"Basic {encoded}",
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
                "WM_QOS.CORRELATION_ID": str(uuid.uuid4()),
            },
            data={"grant_type": "client_credentials"},
            timeout=10.0,
        )

        if response.status_code != 200:
            raise HTTPException(status_code=503, detail=f"Walmart auth failed: {response.text}")

        token_data = response.json()
        access_token = token_data["access_token"]
        expires_in = token_data.get("expires_in", 900)

        _token_cache["access_token"] = access_token
        _token_cache["expires_at"] = now + expires_in

        return access_token


async def search_products(query: str, limit: int = 10) -> list[dict]:
    settings = get_settings()
    if not settings.WALMART_CLIENT_ID:
        raise HTTPException(
            status_code=503,
            detail="Walmart API not configured. Add WALMART_CLIENT_ID and WALMART_CLIENT_SECRET to .env",
        )

    token = await _get_token()

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.WALMART_API_BASE_URL}/search",
            headers={
                "Authorization": f"Bearer {token}",
                "WM_SEC.ACCESS_TOKEN": token,
                "WM_CONSUMER.ID": settings.WALMART_CLIENT_ID,
                "WM_QOS.CORRELATION_ID": str(uuid.uuid4()),
                "Accept": "application/json",
            },
            params={"query": query, "numItems": limit, "format": "json"},
            timeout=15.0,
        )

        if response.status_code != 200:
            raise HTTPException(status_code=503, detail=f"Walmart search failed: {response.status_code}")

        data = response.json()
        items = data.get("items", [])

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
