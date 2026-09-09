export const getVideoDuration = (
  file: File
): Promise<number> => {
  return new Promise((resolve, reject) => {
    const isVideo =
      file.type.startsWith("video/");

    const isAudio =
      file.type.startsWith("audio/");

    if (!isVideo && !isAudio) {
      resolve(0);
      return;
    }

    const media = isVideo
      ? document.createElement("video")
      : document.createElement("audio");

    const objectUrl =
      URL.createObjectURL(file);

    let finished = false;

    const cleanup = () => {
      clearTimeout(timeout);

      media.onloadedmetadata = null;
      media.ondurationchange = null;
      media.onerror = null;

      media.removeAttribute("src");
      media.load();

      URL.revokeObjectURL(objectUrl);
    };

    const succeed = (
      rawDuration: number
    ) => {
      if (finished) return;

      if (
        !Number.isFinite(rawDuration) ||
        rawDuration <= 0
      ) {
        return;
      }

      finished = true;

      const duration = Math.max(
        1,
        Math.round(rawDuration)
      );

      console.log(
        "✅ [MEDIA DURATION] Detected",
        {
          name: file.name,
          type: file.type,
          duration,
        }
      );

      cleanup();
      resolve(duration);
    };

    const fail = (
      error?: unknown
    ) => {
      if (finished) return;

      finished = true;

      cleanup();

      reject(
        error instanceof Error
          ? error
          : new Error(
              `Unable to determine ${
                isVideo
                  ? "video"
                  : "audio"
              } duration`
            )
      );
    };

    const timeout = window.setTimeout(() => {
      console.warn(
        "⚠️ [MEDIA DURATION] Timeout",
        {
          name: file.name,
          type: file.type,
        }
      );

      fail(
        new Error(
          "Media duration detection timed out"
        )
      );
    }, 5000);

    media.preload = "metadata";

    media.onloadedmetadata = () => {
      console.log(
        "📐 [MEDIA DURATION] loadedmetadata",
        {
          name: file.name,
          duration: media.duration,
        }
      );

      succeed(media.duration);
    };

    media.ondurationchange = () => {
      console.log(
        "📐 [MEDIA DURATION] durationchange",
        {
          name: file.name,
          duration: media.duration,
        }
      );

      succeed(media.duration);
    };

    media.onerror = () => {
      console.error(
        "❌ [MEDIA DURATION] Media error",
        {
          name: file.name,
          type: file.type,
          error: media.error,
        }
      );

      fail(
        new Error(
          "Browser could not read media metadata"
        )
      );
    };

    media.src = objectUrl;
    media.load();
  });
};