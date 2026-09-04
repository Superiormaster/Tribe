import json

from ai.client import openai_chat


def extract_topics(text):

    if not text:
        return []

    prompt = f"""
Extract up to five important topics from this social media post.

Rules:
- Return short topics.
- Use lowercase.
- Avoid generic words like "post", "people", "social media".
- Prefer specific subjects, entities, sports, entertainment,
  technology, politics, lifestyle, etc.
- Return ONLY JSON.

{{
    "topics": []
}}

Text:

\"\"\"
{text[:5000]}
\"\"\"
"""

    result = openai_chat(
        prompt,
        system=(
            "You extract useful topic labels from "
            "social media posts."
        ),
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

        return list(
            dict.fromkeys(
                topic.strip().lower()
                for topic in topics
                if isinstance(topic, str)
                and topic.strip()
            )
        )[:5]

    except Exception:
        return []