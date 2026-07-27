from .models import UserInterest


def update_interest(user, topic, points):

    obj, _ = UserInterest.objects.get_or_create(
        user=user,
        topic=topic,
    )

    obj.score += points

    if obj.score < 0:
        obj.score = 0

    obj.save()