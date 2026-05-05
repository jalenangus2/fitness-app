"""Walmart product search via ScrapeHero API."""
import httpx
from fastapi import HTTPException
from ..config import get_settings


async def search_products(query: str, limit: int = 10) -> list[dict]:
    settings = get_settings()
    if not settings.SCRAPEHERO_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Walmart search not configured. Add SCRAPEHERO_API_KEY to environment variables.",
        )

    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://get.scrapehero.com/api/walmart/search/",
            params={"x-api-key": settings.SCRAPEHERO_API_KEY, "input": query},
            timeout=20.0,
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=503,
            detail=f"Walmart search failed ({response.status_code}): {response.text[:300]}",
        )

    results = response.json().get("data", {}).get("search_results", [])
    return [
        {
            "item_id": str(item.get("item_id", "")),
            "name": item.get("name", ""),
            "sale_price": float(item["price"]) if item.get("price") else None,
            "thumbnail_image": item.get("image_url", ""),
            "product_url": item.get("product_url", ""),
            "customer_rating": str(item["rating"]) if item.get("rating") else None,
        }
        for item in results[:limit]
    ]
