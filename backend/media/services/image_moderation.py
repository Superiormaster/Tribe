def moderate_image(image_url):
    response = requests.post(
        MODERATION_URL,
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": "omni-moderation-latest",
            "input": [
                {
                    "type": "image_url",
                    "image_url": {
                        "url": image_url
                    }
                }
            ],
        },
        timeout=30,
    )

    response.raise_for_status()

    return response.json()["results"][0]