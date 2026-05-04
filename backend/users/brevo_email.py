# users/brevo_email.py
import os
from dotenv import load_dotenv
from sib_api_v3_sdk import Configuration, ApiClient, TransactionalEmailsApi

load_dotenv()  # only once

BREVO_API_KEY = os.environ.get("BREVO_API_KEY")

configuration = Configuration()
configuration.api_key['api-key'] = BREVO_API_KEY

client = TransactionalEmailsApi(ApiClient(configuration))