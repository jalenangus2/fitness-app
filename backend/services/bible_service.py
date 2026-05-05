"""Fetch a daily rotating Bible verse from the API.Bible service."""
import re
import httpx
from datetime import date
from ..config import get_settings

BIBLE_ID = "65eec8e0b60e656b-01"

DAILY_VERSES = [
    "JHN.3.16", "PSA.23.1", "PHP.4.13", "ROM.8.28", "JER.29.11",
    "ISA.40.31", "PRO.3.5", "MAT.6.33", "PSA.46.10", "ROM.12.2",
    "HEB.11.1", "GAL.5.22", "EPH.2.8", "2TI.1.7", "JOS.1.9",
    "PRO.22.6", "PSA.119.105", "1CO.13.4", "MAT.5.16", "ROM.5.8",
    "ISA.41.10", "PSA.34.8", "PHP.1.6", "JAM.1.5", "MAT.11.28",
    "PSA.91.1", "ROM.15.13", "GAL.2.20", "PRO.16.3", "1JN.4.19",
    "PSA.27.1",
]

_verse_cache: dict = {}


async def get_daily_verse() -> dict:
    today = date.today().isoformat()
    if _verse_cache.get("date") == today:
        return _verse_cache["verse"]

    settings = get_settings()
    if not settings.BIBLE_API_KEY:
        return {"reference": "John 3:16", "text": "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.", "fallback": True}

    verse_id = DAILY_VERSES[date.today().timetuple().tm_yday % len(DAILY_VERSES)]
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://api.bible/v1/bibles/{BIBLE_ID}/verses/{verse_id}",
                headers={"api-key": settings.BIBLE_API_KEY},
                params={"content-type": "text", "include-verse-numbers": "false"},
                timeout=10.0,
            )
        data = resp.json().get("data", {})
        text = re.sub(r"\s+", " ", data.get("content", "")).strip()
        reference = data.get("reference", verse_id)
        verse = {"reference": reference, "text": text, "fallback": False}
    except Exception:
        verse = {"reference": "Philippians 4:13", "text": "I can do all things through Christ who strengthens me.", "fallback": True}

    _verse_cache["date"] = today
    _verse_cache["verse"] = verse
    return verse
