export function uploadChunkXHR(
  url: string,
  chunk: Blob,
  signal?: AbortSignal,
  onProgress?: (
    loaded: number
  ) => void,
): Promise<string> {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const xhr =
        new XMLHttpRequest();

      let settled = false;
      let cancelledBySignal = false;

      const cleanup = () => {

        signal?.removeEventListener(
          "abort",
          handleAbort
        );

        xhr.upload.onprogress =
          null;

        xhr.onload =
          null;

        xhr.onerror =
          null;

        xhr.onabort =
          null;
      };

      const resolveOnce = (
        etag: string
      ) => {

        if (settled) {
          return;
        }

        settled = true;

        cleanup();

        resolve(
          etag
        );
      };

      const rejectOnce = (
        error: Error
      ) => {

        if (settled) {
          return;
        }

        settled = true;

        cleanup();

        reject(
          error
        );
      };

      const handleAbort = () => {

        if (settled) {
          return;
        }

        cancelledBySignal = true;

        xhr.abort();

        rejectOnce(
          new DOMException(
            "Upload cancelled.",
            "AbortError"
          )
        );
      };

      if (signal?.aborted) {

        rejectOnce(
          new DOMException(
            "Upload cancelled.",
            "AbortError"
          )
        );

        return;
      }

      try {

        xhr.open(
          "PUT",
          url,
          true
        );

      } catch (error) {

        rejectOnce(
          error instanceof Error
            ? error
            : new Error(
                "Failed to initialize chunk upload."
              )
        );

        return;
      }

      if (signal) {

        signal.addEventListener(
          "abort",
          handleAbort,
          {
            once: true,
          }
        );

      }

      xhr.upload.onprogress = (
        event
      ) => {

        if (
          settled ||
          !event.lengthComputable
        ) {
          return;
        }

        onProgress?.(
          event.loaded
        );
      };

      xhr.onload = () => {

        if (settled) {
          return;
        }
  
        console.log("[R2 UPLOAD] Response", {
          status: xhr.status,
          statusText: xhr.statusText,
          etag: xhr.getResponseHeader("ETag"),
        });

        if (
          xhr.status >= 200 &&
          xhr.status < 300
        ) {

          const rawEtag =
            xhr.getResponseHeader(
              "ETag"
            );

          if (!rawEtag) {

            rejectOnce(
              new Error(
                "R2 did not return an ETag for the uploaded chunk."
              )
            );

            return;
          }

          const etag =
            rawEtag.replace(
              /^"|"$/g,
              ""
            );

          onProgress?.(
            chunk.size
          );

          resolveOnce(
            etag
          );

          return;
        }

        rejectOnce(
          new Error(
            `Part upload failed: ${xhr.status} ${xhr.statusText}`
          )
        );
      };

      xhr.onerror = () => {

        if (settled) {
          return;
        }

        if (cancelledBySignal) {
          return;
        }

        rejectOnce(
          new Error(
            "Network error during part upload."
          )
        );
      };

      xhr.onabort = () => {

        if (settled) {
          return;
        }

        if (cancelledBySignal) {
          return;
        }

        rejectOnce(
          new Error(
            "Chunk upload was unexpectedly aborted."
          )
        );
      };

      try {

        console.log("[R2 UPLOAD] Sending part", {
          partSize: chunk.size,
          url,
        });

        xhr.setRequestHeader(
          "Content-Type",
          chunk.type || "application/octet-stream"
        );

        xhr.send(
          chunk
        );

      } catch (error) {

        rejectOnce(
          error instanceof Error
            ? error
            : new Error(
                "Failed to send upload chunk."
              )
        );
      }
    }
  );
}