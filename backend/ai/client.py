import os
import requests

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

API_URL = "https://api.openai.com/v1/chat/completions"

HEADERS = {
    "Authorization": f"Bearer {OPENAI_API_KEY}",
    "Content-Type": "application/json",
}


def openai_chat(
    prompt,
    system="You are an AI assistant.",
    model="gpt-4.1-mini",
    temperature=0.2,
):
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": system,
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        "temperature": temperature,
    }

    try:

        r = requests.post(
            API_URL,
            headers=HEADERS,
            json=payload,
            timeout=30,
        )

        r.raise_for_status()

        return r.json()["choices"][0]["message"]["content"]

    except Exception as e:

        print("OPENAI ERROR:", e)

        return None