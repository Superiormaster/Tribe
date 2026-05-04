from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from users.ip_address import get_location

User = get_user_model()

class Command(BaseCommand):
    help = "Update locations for users with missing coordinates"

    def handle(self, *args, **options):
        users = User.objects.filter(latitude__isnull=True, longitude__isnull=True)
        updated_count = 0

        for user in users:
            ip = getattr(user, 'last_login_ip', None)
            if not ip:
                continue

            lat, lon = get_location(ip)
            if lat is None or lon is None:
                continue  # skip invalid results

            user.latitude = lat
            user.longitude = lon
            user.save(update_fields=["latitude", "longitude"])
            self.stdout.write(f"Updated {user.username}: {lat}, {lon}")
            updated_count += 1

        self.stdout.write(self.style.SUCCESS(f"Finished updating {updated_count} users."))