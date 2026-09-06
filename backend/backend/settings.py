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

LANGUAGE_CODE = "en-us"

TIME_ZONE = "Africa/Lagos"
CELERY_TIMEZONE = "Africa/Lagos"

USE_I18N = True
USE_TZ = True

# -----------------------------
# Environment & Paths
# -----------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

REDIS_URL = os.getenv("REDIS_URL")

SECRET_KEY = os.getenv("SECRET_KEY")
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
NODE_URL = os.getenv("NODE_URL")

FRONTEND_URLS = os.getenv(
    "FRONTEND_URL",
    "http://localhost:3000"
).split(",")

# Primary frontend URL (used for emails)
FRONTEND_URL = FRONTEND_URLS[0]

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
CORS_ALLOWED_ORIGINS = FRONTEND_URLS + [
    "http://127.0.0.1:3000","http://localhost:3000",
]
CORS_ALLOW_HEADERS = [
    "authorization",
    "content-type",
    "x-device-fingerprint",
]
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL

CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 300
CELERY_TASK_SOFT_TIME_LIMIT = 240
CELERY_ACCEPT_CONTENT = [
    "json",
]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_ENABLE_UTC = True
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_ACKS_LATE = True
CELERY_TASK_REJECT_ON_WORKER_LOST = True
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_BEAT_SCHEDULE = {

    # ==============================
    # SPORTS
    # ==============================

    "sports-upcoming-fixtures": {
        "task": "sports.tasks.sync_upcoming_matches",
        "schedule": 60 * 60 * 12,
    },

    "sports-today": {
        "task": "sports.tasks.sync_today_matches",
        "schedule": 60 * 60 * 2,
    },

    "sports-results": {
        "task": "sports.tasks.sync_recent_results",
        "schedule": 60 * 60 * 6,
    },

    "sports-live-cleanup": {
        "task": "sports.tasks.cleanup_stale_live_matches",
        "schedule": 60 * 10,
    },


    # ==============================
    # USERS
    # ==============================

    "update-user-locations-daily": {
        "task": "backend.tasks.update_user_locations_task",
        "schedule": crontab(
            hour=2,
            minute=0,
        ),
    },
}

SPORTS_PROVIDER = os.getenv(
    "SPORTS_PROVIDER",
    "api-football",
)

API_FOOTBALL_KEY = os.getenv(
    "API_FOOTBALL_KEY",
)

API_FOOTBALL_BASE_URL = os.getenv(
    "API_FOOTBALL_BASE_URL",
    "https://v3.football.api-sports.io",
)

SPORTS_PROVIDER_TIMEOUT = int(
    os.getenv(
        "SPORTS_PROVIDER_TIMEOUT",
        "10",
    )
)

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=365),

    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,

    "AUTH_HEADER_TYPES": ("Bearer",),
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
    'post',
    'notifications.apps.NotificationsConfig',
    'rest_framework.authtoken',
    'users',
    'search',
    'admin_panel',
    'feedback',
    'media.apps.MediaConfig',
    'dashboard',
    'sports',
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
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=60,
            conn_health_checks=True,
        )
    }
else:
    DATABASES = {
      "default": {
          "ENGINE": "django.db.backends.sqlite3",
          "NAME": BASE_DIR / "db.sqlite3",
          "OPTIONS": {
              "timeout": 30,
          },
      }
    }

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
# Static files
# -----------------------------
STATIC_URL = 'static/'

LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY"),
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET"),
LIVEKIT_URL = "wss://your-project.livekit.cloud"

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

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