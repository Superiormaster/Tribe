# utils/location.py
import requests
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)

IP_LOCATION_CACHE_TTL = 60 * 60 * 24  # 1 day

def get_location(ip: str):
    """
    Returns (latitude, longitude) for a given IP address.
    Uses cache to reduce API calls and falls back to multiple services.
    """
    if not ip or ip.startswith("127.") or ip.startswith("192.") or ip.startswith("10."):
        # Local/private IPs can't be geolocated
        return None, None

    # Check cache first
    cached = cache.get(f"ip_loc:{ip}")
    if cached:
        return cached

    services = [
        f"https://ipapi.co/{ip}/json/",
        f"https://ipinfo.io/{ip}/json",
        f"https://geolocation-db.com/json/{ip}&position=true",
    ]

    for url in services:
        try:
            r = requests.get(url, timeout=3)
            if r.status_code != 200:
                continue
            data = r.json()
            lat, lon = None, None
            # ipapi.co
            if "latitude" in data and "longitude" in data:
                lat, lon = data["latitude"], data["longitude"]
            # ipinfo.io
            elif "loc" in data:
                lat_str, lon_str = data["loc"].split(",")
                lat, lon = float(lat_str), float(lon_str)
            # geolocation-db
            elif "latitude" in data and "longitude" in data:
                lat, lon = data["latitude"], data["longitude"]

            if lat is not None and lon is not None:
                cache.set(f"ip_loc:{ip}", (lat, lon), IP_LOCATION_CACHE_TTL)
                return float(lat), float(lon)

        except Exception as e:
            logger.warning(f"Location fetch failed for IP {ip} from {url}: {e}")
            continue

    return None, None