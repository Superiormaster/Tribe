from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser


@database_sync_to_async
def get_user(token):
    from django.contrib.auth import get_user_model
    from rest_framework_simplejwt.tokens import AccessToken

    User = get_user_model()

    try:
        access = AccessToken(token)

        user_id = access["user_id"]

        return User.objects.get(id=user_id)

    except Exception:
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):

    async def __call__(self, scope, receive, send):

        scope["user"] = AnonymousUser()
        query_string = scope["query_string"].decode()
        print("QUERY STRING:", query_string)

        params = parse_qs(query_string)

        token = params.get("token")
        print("TOKEN:", token)

        if token:
            scope["user"] = await get_user(token[0])
        print("USER:", scope.get("user"))

        return await super().__call__(
            scope,
            receive,
            send
        )