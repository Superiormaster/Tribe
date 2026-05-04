# users/email.py
from .brevo_email import client
from sib_api_v3_sdk.models import SendSmtpEmail

def send_brevo_email(to_email, subject, html_content, text_content=None):
    email = SendSmtpEmail(
        to=[{"email": to_email}],
        sender={"email": "ejeziepaschal@gmail.com", "name": "Tribe"},
        subject=subject,
        html_content=html_content,
        text_content=text_content or "Please check the email content."
    )
    try:
        response = client.send_transac_email(email)
        print("Email sent:", response)
    except Exception as e:
        print("Brevo email error:", e)