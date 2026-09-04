from users.utils import redis_client


VIEW_TTL = 60 * 30


def record_post_view(
    user_id,
    post_id,
):
    key = (
        f"recommendation:view:"
        f"{user_id}:{post_id}"
    )

    redis_client.setex(
        key,
        VIEW_TTL,
        "1",
    )