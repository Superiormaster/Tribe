from django.template.loader import render_to_string
from django.conf import settings
from users.email import send_brevo_email

def send_verification_email(email, verification_link):
    context = {
        "verification_link": verification_link,
        "logo_url": settings.LOGO_URL,
        "unsubscribe_url": settings.UNSUBSCRIBE_URL,
    }

    html = render_to_string("emails/verify.html", context)
    text = render_to_string("emails/verify.txt", context)

    send_brevo_email(
        to_email=email,
        subject="Verify your Tribe Email",
        html_content=html,
        text_content=text,
    )

def send_reset_email(email, reset_link):
    context = {
        "reset_link": reset_link,
        "logo_url": settings.LOGO_URL,
        "unsubscribe_url": settings.UNSUBSCRIBE_URL,
    }

    html = render_to_string("emails/reset_password.html", context)
    text = render_to_string("emails/reset_password.txt", context)

    send_brevo_email(
        to_email=email,
        subject="Reset Your Tribe Password",
        html_content=html,
        text_content=text,
    )

def send_welcome_email(email):
    context = {
        "logo_url": settings.LOGO_URL,
        "unsubscribe_url": settings.UNSUBSCRIBE_URL,
    }

    html = render_to_string("emails/welcome.html", context)
    text = render_to_string("emails/welcome.txt", context)

    send_brevo_email(
        to_email=email,
        subject="Welcome to Tribe",
        html_content=html,
        text_content=text,
    )

def send_contact_reply_email(
    email,
    name,
    subject,
    reply_message,
):

    context = {
        "name": name,
        "subject": subject,
        "reply_message": reply_message,
        "logo_url": settings.LOGO_URL,
        "unsubscribe_url": settings.UNSUBSCRIBE_URL,
    }


    html = render_to_string(
        "emails/contact_reply.html",
        context
    )


    text = render_to_string(
        "emails/contact_reply.txt",
        context
    )


    send_brevo_email(
        to_email=email,
        subject=f"Re: {subject}",
        html_content=html,
        text_content=text,
    )

def send_login_alert_email(
    email,
    device,
    location,
    ip_address,
    login_time,
    reset_password_link,
):
    context = {
        "device": device,
        "location": location,
        "ip_address": ip_address,
        "login_time": login_time,
        "reset_password_link": reset_password_link,
        "logo_url": settings.LOGO_URL,
        "unsubscribe_url": settings.UNSUBSCRIBE_URL,
    }

    html = render_to_string("emails/login_alert.html", context)
    text = render_to_string("emails/login_alert.txt", context)

    send_brevo_email(
        to_email=email,
        subject="New Login to Your Tribe Account",
        html_content=html,
        text_content=text,
    )

def send_password_changed_email(email, reset_password_link):
    context = {
        "reset_password_link": reset_password_link,
        "logo_url": settings.LOGO_URL,
        "unsubscribe_url": settings.UNSUBSCRIBE_URL,
    }

    html = render_to_string("emails/password_changed.html", context)
    text = render_to_string("emails/password_changed.txt", context)

    send_brevo_email(
        to_email=email,
        subject="Your Tribe Password Was Changed",
        html_content=html,
        text_content=text,
    )
