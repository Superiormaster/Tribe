import { uploadDebug } from "@/utils/mediaUpload/uploadDebug";

export function uploadChunkXHR(
  url: string,
  chunkUri: string,
  signal?: AbortSignal,
  onProgress?: (
    loaded: number
  ) => void,
  partNumber?: number,
  attempt?: number,
): Promise<string> {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      let settled = false;
      let cancelledBySignal = false;

      const xhr =
        new XMLHttpRequest();

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

      const createAbortError = () => {

        const error =
          new Error(
            "Upload cancelled."
          );

        error.name =
          "AbortError";

        return error;
      };

      const handleAbort = () => {

        if (settled) {
          return;
        }

        cancelledBySignal = true;

        try {
          xhr.abort();
        } catch {
          // Ignore abort failures.
        }

        rejectOnce(
          createAbortError()
        );
      };

      void uploadDebug({
        event:
          "XHR_CREATED",

        part_number:
          partNumber,

        data: {
          chunk_uri:
            chunkUri,

          attempt,
        },
      });

      if (!chunkUri) {

        rejectOnce(
          new Error(
            "No chunk URI provided."
          )
        );

        return;
      }

      if (
        signal?.aborted
      ) {

        rejectOnce(
          createAbortError()
        );

        return;
      }

      try {

        xhr.open(
          "PUT",
          url,
          true
        );

        void uploadDebug({
          event:
            "XHR_OPEN",

          part_number:
            partNumber,

          data: {
            method:
              "PUT",

            url_host:
              getUrlHost(url),

            attempt,
          },
        });

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

      signal?.addEventListener(
        "abort",
        handleAbort,
        {
          once: true,
        }
      );

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

        console.log(
          "[R2 UPLOAD] Response",
          {
            status:
              xhr.status,

            statusText:
              xhr.statusText,

            etag:
              xhr.getResponseHeader(
                "ETag"
              ),
          }
        );

        if (
          xhr.status >= 200 &&
          xhr.status < 300
        ) {

          const rawEtag =
            xhr.getResponseHeader(
              "ETag"
            );

          void uploadDebug({
            event:
              "R2_RESPONSE",

            part_number:
              partNumber,

            data: {
              status:
                xhr.status,

              status_text:
                xhr.statusText,

              has_etag:
                Boolean(
                  rawEtag
                ),

              response_url_host:
                getUrlHost(url),

              attempt,
            },
          });

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
            Number.MAX_SAFE_INTEGER
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

        if (
          cancelledBySignal
        ) {
          return;
        }

        void uploadDebug({
          event:
            "R2_NETWORK_ERROR",

          level:
            "error",

          part_number:
            partNumber,

          data: {
            status:
              xhr.status,

            ready_state:
              xhr.readyState,

            response_url_host:
              getUrlHost(url),

            attempt,
          },
        });

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

        if (
          cancelledBySignal
        ) {
          return;
        }

        void uploadDebug({
          event:
            "R2_UNEXPECTED_ABORT",

          level:
            "error",

          part_number:
            partNumber,

          data: {
            status:
              xhr.status,

            ready_state:
              xhr.readyState,

            attempt,
          },
        });

        rejectOnce(
          new Error(
            "Chunk upload was unexpectedly aborted."
          )
        );
      };

      try {

        console.log(
          "[R2 UPLOAD] Sending part",
          {
            chunkUri,
            partNumber,
            attempt,
          }
        );

        void uploadDebug({
          event:
            "R2_SEND",

          part_number:
            partNumber,

          data: {
            content_type:
              "application/octet-stream",

            attempt,
          },
        });

        xhr.setRequestHeader(
          "Content-Type",
          "application/octet-stream"
        );

        /*
         * Native React Native XMLHttpRequest
         * understands the file:// URI.
         */
        xhr.send(
          {
            uri:
              chunkUri,

            type:
              "application/octet-stream",
          } as any
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

function getUrlHost(
  url: string
): string {

  try {

    return new URL(
      url
    ).host;

  } catch {

    return "invalid-url";
  }
}