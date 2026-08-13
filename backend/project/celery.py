import os

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "backend.settings",
)

from celery import Celery
from django.conf import settings


app = Celery("project")

app.config_from_object(
    "django.conf:settings",
    namespace="CELERY",
)

app.autodiscover_tasks(
    lambda: settings.INSTALLED_APPS
)

print(
    "CELERY_BROKER_URL:",
    (
        settings.CELERY_BROKER_URL[:20] + "..."
        if settings.CELERY_BROKER_URL
        else None
    )
)

print("=== CELERY CONFIG ===")
print("CELERY_BROKER_URL:", settings.CELERY_BROKER_URL)
print("CELERY_RESULT_BACKEND:", settings.CELERY_RESULT_BACKEND)