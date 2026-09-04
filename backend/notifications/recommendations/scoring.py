INTERACTION_WEIGHTS = {
    "view": 0.2,
    "like": 3,
    "comment": 5,
    "share": 10,
    "repost": 10,
    "bookmark": 8,
    "star": 10,
    "join_community": 8,
}


def interaction_weight(action):
    return INTERACTION_WEIGHTS.get(
        action,
        0,
    )