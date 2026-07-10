from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = "Create the initial Super Admin"

    def handle(self, *args, **kwargs):
        email = "ejeziepaschal@gmail.com"

        if User.objects.filter(email=email).exists():
            self.stdout.write(
                self.style.WARNING(
                    "Super Admin already exists."
                )
            )
            return

        user = User.objects.create_user(
            email=email,
            username="Superior Master",
            password="Chidera@2006"
        )

        user.role = "superadmin"
        user.is_staff = True
        user.is_superuser = True
        user.email_verified = True
        user.save()

        self.stdout.write(
            self.style.SUCCESS(
                "Super Admin created successfully."
            )
        )