# Community_feed/weights.py

DEFAULT_WEIGHTS = {
    "like": 2.0,
    "comment": 3.0,
    "view": 0.2,
    "star": 6.0,
    "interest": 5.0,
    "recent": 2.0,
    "popular": 3.0,
    "repost": 2.5,
    "seen_penalty": -2.5,
    "random": 0.3,
}

def get_user_weights(user):
    """
    Later: replace with Redis / ML model per user
    """
    return DEFAULT_WEIGHTS