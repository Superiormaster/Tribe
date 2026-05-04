# tasks.py in your app
from celery import shared_task
from django.core.management import call_command

@shared_task
def update_user_locations_task():
    call_command('update_user_locations')