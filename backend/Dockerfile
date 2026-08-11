# ============================================================
# BUILD STAGE
# ============================================================

FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        pkg-config \
        libwebp-dev \
        libjpeg62-turbo-dev \
        zlib1g-dev \
        libpng-dev \
        libtiff-dev \
        libopenjp2-7-dev \
        libfreetype6-dev \
        liblcms2-dev \
        libharfbuzz-dev \
        libfribidi-dev \
        libxcb1-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN python -m pip install \
        --upgrade pip setuptools wheel

RUN python -m pip install \
        --prefix=/install \
        -r requirements.txt


# ============================================================
# RUNTIME STAGE
# ============================================================

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libwebp7 \
        libjpeg62-turbo \
        zlib1g \
        libpng16-16 \
        libtiff6 \
        libopenjp2-7 \
        libfreetype6 \
        liblcms2-2 \
        libharfbuzz0b \
        libfribidi0 \
        libxcb1 \
        ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install /usr/local

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "daphne -b 0.0.0.0 -p ${PORT:-8000} backend.asgi:application"]