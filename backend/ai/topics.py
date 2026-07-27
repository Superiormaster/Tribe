import json

from .client import openai_chat


def extract_topics(text):

    prompt = f"""
Extract up to five important topics from this post.

Return ONLY JSON.

{{
    "topics":[]
}}

Text:

\"\"\"
{text}
\"\"\"
"""

    result = openai_chat(
        prompt,
        system="You extract topics from social media posts.",
        model="gpt-4.1-mini",
    )

    if not result:
        return []

    try:

        start = result.find("{")
        end = result.rfind("}") + 1

        data = json.loads(
            result[start:end]
        )

        topics = data.get(
            "topics",
            [],
        )

        return [
            t.lower().strip()
            for t in topics
            if t
        ][:5]

    except Exception as e:

        print(e)

        print(result)

        return []