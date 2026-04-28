"""Fetch daily weather forecast from Open-Meteo (no API key required)."""
import httpx

_BASE_URL = "https://api.open-meteo.com/v1/forecast"

# Greensboro, NC defaults
DEFAULT_LAT = 36.0726
DEFAULT_LON = -79.7922

_WMO_CODES: dict[int, str] = {
    0: "Clear Sky",
    1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
    45: "Foggy", 48: "Icy Fog",
    51: "Light Drizzle", 53: "Drizzle", 55: "Heavy Drizzle",
    61: "Light Rain", 63: "Rain", 65: "Heavy Rain",
    71: "Light Snow", 73: "Snow", 75: "Heavy Snow",
    77: "Snow Grains",
    80: "Rain Showers", 81: "Heavy Showers", 82: "Violent Showers",
    85: "Snow Showers", 86: "Heavy Snow Showers",
    95: "Thunderstorm", 96: "Thunderstorm w/ Hail", 99: "Severe Thunderstorm",
}


async def get_daily_weather(lat: float = DEFAULT_LAT, lon: float = DEFAULT_LON) -> dict:
    params = {
        "latitude": lat,
        "longitude": lon,
        "current_weather": "true",
        "daily": "temperature_2m_max,temperature_2m_min,weathercode",
        "temperature_unit": "fahrenheit",
        "timezone": "America/New_York",
        "forecast_days": 1,
    }
    async with httpx.AsyncClient(timeout=8.0) as client:
        resp = await client.get(_BASE_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    current = data["current_weather"]
    daily = data["daily"]
    code = int(daily["weathercode"][0])

    return {
        "current_temp_f": round(float(current["temperature"]), 1),
        "temp_high_f": round(float(daily["temperature_2m_max"][0]), 1),
        "temp_low_f": round(float(daily["temperature_2m_min"][0]), 1),
        "weather_code": code,
        "condition": _WMO_CODES.get(code, "Unknown"),
        "location": "Greensboro, NC",
    }
