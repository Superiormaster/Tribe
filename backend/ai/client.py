import os
import requests

API_URL = "https://api.openai.com/v1/chat/completions"


def openai_chat(
    prompt,
    system="You are an AI assistant.",
    model="gpt-4.1-mini",
    temperature=0.2,
):
    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key:
        print(
            "OPENAI ERROR: OPENAI_API_KEY is missing",
            flush=True,
        )
        return None

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

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
        response = requests.post(
            API_URL,
            headers=headers,
            json=payload,
            timeout=30,
        )

        response.raise_for_status()

        return response.json()["choices"][0]["message"]["content"]

    except requests.HTTPError as exc:
        print(
            "OPENAI HTTP ERROR:",
            response.status_code,
            response.text[:1000],
            flush=True,
        )
        return None

    except Exception as exc:
        print(
            "OPENAI ERROR:",
            repr(exc),
            flush=True,
        )
        return None