# users/brevo_email.py
import os
from django.conf import settings
from sib_api_v3_sdk import Configuration, ApiClient, TransactionalEmailsApi

configuration = Configuration()
configuration.api_key["api-key"] = settings.BREVO_API_KEY

client = TransactionalEmailsApi(ApiClient(configuration))