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

    const media =
      isVideo
        ? document.createElement("video")
        : document.createElement("audio");

    const objectUrl =
      URL.createObjectURL(file);

    let finished = false;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);

      media.removeAttribute("src");

      media.load();

      media.onloadedmetadata = null;
      media.onerror = null;
    };

    const fail = () => {
      if (finished) return;

      finished = true;

      cleanup();

      reject(
        new Error(
          `Unable to read ${
            isVideo
              ? "video"
              : "audio"
          } duration`
        )
      );
    };

    media.preload = "metadata";

    media.onloadedmetadata = () => {
      if (finished) return;

      const rawDuration =
        media.duration;

      if (
        !Number.isFinite(
          rawDuration
        ) ||
        rawDuration <= 0
      ) {
        finished = true;

        cleanup();

        reject(
          new Error(
            `${
              isVideo
                ? "Video"
                : "Audio"
            } duration is unavailable`
          )
        );

        return;
      }

      const duration =
        Math.floor(rawDuration);

      finished = true;

      cleanup();

      console.log(
        `⏱️ [MEDIA DURATION] ${
          isVideo
            ? "VIDEO"
            : "AUDIO"
        }`,
        {
          name: file.name,
          type: file.type,
          rawDuration,
          duration,
        }
      );

      resolve(duration);
    };

    media.onerror = fail;

    media.src = objectUrl;

    media.load();
  });
};