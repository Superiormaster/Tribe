# ai/recommendation.py (pseudo)
def recommend_posts(user, posts):
    def score(post):
        engagement = post.likes.count() * 2 + post.comments.count() * 3
        freshness = 1 / (1 + (now() - post.created_at).days)
        community_boost = 5 if post.community in user.communities.all() else 0

        return engagement + community_boost + freshness

    return sorted(posts, key=score, reverse=True)