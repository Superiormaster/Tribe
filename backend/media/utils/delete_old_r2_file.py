from urllib.parse import urlparse


def delete_old_r2_file(url: str):

    if not url:
        return

    try:

        parsed = urlparse(url)

        public_base = R2_PUBLIC_URL.rstrip("/")

        if not url.startswith(public_base):
            # Old Cloudinary/external URL.
            return

        object_key = parsed.path.lstrip("/")

        if object_key:
            delete_object(object_key)

    except Exception as exc:

        print(
            "Failed to delete old R2 profile media:",
            exc
        )