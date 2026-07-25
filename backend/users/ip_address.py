# utils/location.py
import requests
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)

IP_LOCATION_CACHE_TTL = 60 * 60 * 24  # 1 day


def get_location(ip: str):
    """
    Returns:
        (latitude, longitude, city, country)
    """

    if (
        not ip
        or ip.startswith("127.")
        or ip.startswith("192.")
        or ip.startswith("10.")
    ):
        return None, None, None, None

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

            lat = lon = city = country = None

            # ipapi.co
            if "latitude" in data:
                lat = data.get("latitude")
                lon = data.get("longitude")
                city = data.get("city")
                country = data.get("country_name")

            # ipinfo.io
            elif "loc" in data:
                lat_str, lon_str = data["loc"].split(",")
                lat = float(lat_str)
                lon = float(lon_str)
                city = data.get("city")
                country = data.get("country")

            # geolocation-db
            elif "latitude" in data:
                lat = data.get("latitude")
                lon = data.get("longitude")
                city = data.get("city")
                country = data.get("country_name")

            if lat is not None and lon is not None:
                result = (
                    float(lat),
                    float(lon),
                    city,
                    country,
                )

                cache.set(
                    f"ip_loc:{ip}",
                    result,
                    IP_LOCATION_CACHE_TTL,
                )

                return result

        except Exception as e:
            logger.warning(
                f"Location fetch failed for {ip}: {e}"
            )

    return None, None, None, None