import { uploadDebug } from "@/utils/mediaUpload/uploadDebug";

export function uploadChunkXHR(
  url: string,
  chunk: Blob,
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

      const xhr =
        new XMLHttpRequest();
  
      void uploadDebug({
        event: "XHR_CREATED",
        part_number: partNumber,
        data: {
          chunk_size: chunk.size,
          chunk_type: chunk.type,
        },
      });

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
  
        void uploadDebug({
          event: "XHR_OPEN",
          part_number: partNumber,
          data: {
            method: "PUT",
            url_host: (() => {
              try {
                return new URL(url).host;
              } catch {
                return "invalid-url";
              }
            })(),
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
            xhr.getResponseHeader("ETag");
  
          console.log("[R2 UPLOAD] Response", {
            status: xhr.status,
            statusText: xhr.statusText,
            etag: rawEtag,
          });
  
          void uploadDebug({
            event: "R2_RESPONSE",
            part_number: partNumber,
            data: {
              status: xhr.status,
              status_text: xhr.statusText,
              has_etag: Boolean(rawEtag),
              response_url_host: (() => {
                try {
                  return new URL(url).host;
                } catch {
                  return "invalid-url";
                }
              })(),
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
      
        void uploadDebug({
          event: "R2_NETWORK_ERROR",
          level: "error",
          part_number: partNumber,
          data: {
            status: xhr.status,
            ready_state: xhr.readyState,
            response_url_host: (() => {
              try {
                return new URL(url).host;
              } catch {
                return "invalid-url";
              }
            })(),
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
  
        if (cancelledBySignal) {
          return;
        }
  
        void uploadDebug({
          event: "R2_UNEXPECTED_ABORT",
          level: "error",
          part_number: partNumber,
          data: {
            status: xhr.status,
            ready_state: xhr.readyState,
          },
        });
      
        rejectOnce(
          new Error(
            "Chunk upload was unexpectedly aborted."
          )
        );
      };

      try {

        console.log("[R2 UPLOAD] Sending part", {
          partSize: chunk.size,
          partNumber,
        });

        void uploadDebug({
          event: "R2_SEND",
          part_number: partNumber,
          data: {
            part_size: chunk.size,
            content_type:
              chunk.type ||
              "application/octet-stream",
          },
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