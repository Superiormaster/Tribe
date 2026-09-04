export function restoreFiles(files: any[] = []) {
  return files.map((f) => {
    if (f instanceof File) {
      if (!(f as any).preview) {
        (f as any).preview =
          URL.createObjectURL(f);
      }
  
      if (!(f as any).mediaType) {
        (f as any).mediaType =
          f.type.startsWith("video/")
            ? "video"
            : f.type.startsWith("image/")
              ? "image"
              : f.type.startsWith("audio/")
                ? "audio"
                : undefined;
      }

      return f;
    }
  
    console.log(
      "[restoreFiles input]",
      files
    );

    const blob =
      f?.blob instanceof Blob
        ? f.blob
        : null;

    if (!blob) {
      return f;
    }

    const type =
      f.type ||
      blob.type ||
      "application/octet-stream";

    const file = new File(
      [blob],
      f.name || "file",
      {
        type,

        lastModified:
          f.lastModified ??
          Date.now(),
      }
    );

    (file as any).preview =
      URL.createObjectURL(file);

    (file as any).media_url =
      f.media_url ?? null;

    (file as any).thumbnail =
      f.thumbnail ?? null;

    (file as any).duration =
      f.duration ?? null;
  
    (file as any).mediaType =
      type.startsWith("video/")
        ? "video"
        : type.startsWith("image/")
          ? "image"
          : type.startsWith("audio/")
            ? "audio"
            : undefined;

    console.log(
      "[restoreFiles output]",
      {
        name: file.name,
        type: file.type,
        preview:
          (file as any).preview,
        thumbnail:
          (file as any).thumbnail,
        duration:
          (file as any).duration,
        media_url:
          (file as any).media_url,
      }
    );
  
    return file;
  });
}