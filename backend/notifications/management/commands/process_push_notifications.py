from django.core.management.base import BaseCommand

from notifications.tasks import (
    process_scheduled_push_notifications,
)


class Command(BaseCommand):

    def handle(self, *args, **kwargs):

        process_scheduled_push_notifications.delay()