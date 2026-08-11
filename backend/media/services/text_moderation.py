# moderation/openai_moderation.py

import os
import requests


OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]

MODERATION_URL = "https://api.openai.com/v1/moderations"


def moderate_text(text: str):
    response = requests.post(
        MODERATION_URL,
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": "omni-moderation-latest",
            "input": text,
        },
        timeout=30,
    )

    response.raise_for_status()

    result = response.json()

    return result["results"][0]