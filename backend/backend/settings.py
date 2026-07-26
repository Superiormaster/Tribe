"""
Django settings for backend project.
Updated to support multi-account JWT login (PWA & mobile-ready)
"""

from pathlib import Path
import os
from datetime import timedelta
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
import cloudinary
from celery.schedules import crontab
from dotenv import load_dotenv

# -----------------------------
# Environment & Paths
# -----------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

REDIS_URL = os.getenv("REDIS_URL")

SECRET_KEY = os.getenv("SECRET_KEY")
BREVO_API_KEY = os.getenv("BREVO_API_KEY")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
LOGO_URL = f"{FRONTEND_URL}/tribe2.png"
UNSUBSCRIBE_URL = f"{FRONTEND_URL}/unsubscribe"

DEBUG = os.getenv("DEBUG", "True").lower() == "true"
IS_DEV = DEBUG

# -----------------------------
# Hosts & CORS
# -----------------------------
ALLOWED_HOSTS = os.getenv(
    "ALLOWED_HOSTS",
    "127.0.0.1,localhost"
).split(",")
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = os.getenv(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000"
).split(",")
CORS_ALLOW_HEADERS = [
    "authorization",
    "content-type",
    "x-device-fingerprint",
]
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=10),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

# -----------------------------
# Installed Apps
# -----------------------------
INSTALLED_APPS = [
    # Django
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'rest_framework',
    'corsheaders',
    'channels',
    'cloudinary',
    'cloudinary_storage',
    'django_extensions',

    # Local apps
    'chats',
    'communities',
    'wallets',
    'ai_app',
    'post',
    'notifications.apps.NotificationsConfig',
    'rest_framework.authtoken',
    'users',
    'search',
    'admin_panel',
    'feedback',
]

# -----------------------------
# Middleware
# -----------------------------
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.urls'

# -----------------------------
# Templates
# -----------------------------
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# -----------------------------
# WSGI / ASGI
# -----------------------------
WSGI_APPLICATION = 'backend.wsgi.application'
ASGI_APPLICATION = 'backend.asgi.application'

# -----------------------------
# Custom User Model
# -----------------------------
AUTH_USER_MODEL = 'users.User'

# -----------------------------
# Database
# -----------------------------
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    import dj_database_url

    DATABASES = {
        "default": dj_database_url.parse(DATABASE_URL)
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# -----------------------------
# Cloudinary (Media Storage)
# -----------------------------
DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
CLOUDINARY_STORAGE = {
    "CLOUD_NAME": os.getenv("CLOUDINARY_CLOUD_NAME"),
    "API_KEY": os.getenv("CLOUDINARY_API_KEY"),
    "API_SECRET": os.getenv("CLOUDINARY_API_SECRET"),
    "FOLDER": "Tribe",
    "SECURE": True,
}
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

# -----------------------------
# Password Validation
# -----------------------------
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# -----------------------------
# Internationalization
# -----------------------------
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
CELERY_TIMEZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# -----------------------------
# Static files
# -----------------------------
STATIC_URL = 'static/'

LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY"),
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET"),
LIVEKIT_URL = "wss://your-project.livekit.cloud"

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CELERY_BEAT_SCHEDULE = {
    'update-user-locations-daily': {
        'task': 'backend.tasks.update_user_locations_task',
        'schedule': crontab(hour=2, minute=0),  # runs daily at 2 AM
    },
}

# -----------------------------
# Channels (Redis)
# -----------------------------
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [REDIS_URL],
        },
    },
}

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
    }
}

# -----------------------------
# DRF & JWT
# -----------------------------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.TokenAuthentication",
    ),
}
AUTHENTICATION_BACKENDS = [
    "users.authentication.EmailBackend",
]

# -----------------------------
# Sentry
# -----------------------------
SENTRY_DSN = os.getenv("SENTRY_DSN", "")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()],
        traces_sample_rate=1.0,
        send_default_pii=True,
    )