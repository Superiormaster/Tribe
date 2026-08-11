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

      /*
       * =====================================================
       * ABORT
       * =====================================================
       *
       * This is a deliberate cancellation.
       *
       * It must NOT be treated as a network failure
       * and must NOT trigger a retry.
       */

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

      /*
       * =====================================================
       * CHECK SIGNAL BEFORE STARTING
       * =====================================================
       */

      if (signal?.aborted) {

        rejectOnce(
          new DOMException(
            "Upload cancelled.",
            "AbortError"
          )
        );

        return;
      }

      /*
       * =====================================================
       * OPEN REQUEST
       * =====================================================
       */

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

      /*
       * =====================================================
       * ABORT LISTENER
       * =====================================================
       */

      if (signal) {

        signal.addEventListener(
          "abort",
          handleAbort,
          {
            once: true,
          }
        );

      }

      /*
       * =====================================================
       * PROGRESS
       * =====================================================
       */

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

      /*
       * =====================================================
       * SUCCESS / HTTP RESPONSE
       * =====================================================
       */

      xhr.onload = () => {

        if (settled) {
          return;
        }

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

          /*
           * R2 normally returns:
           *
           * "abc123..."
           *
           * We store:
           *
           * abc123...
           */

          const etag =
            rawEtag.replace(
              /^"|"$/g,
              ""
            );

          /*
           * Make sure progress reaches
           * the exact chunk size.
           */

          onProgress?.(
            chunk.size
          );

          resolveOnce(
            etag
          );

          return;
        }

        /*
         * HTTP errors are normal errors.
         *
         * uploadPart.ts will decide whether
         * this should be retried.
         */

        rejectOnce(
          new Error(
            `Part upload failed: ${xhr.status} ${xhr.statusText}`
          )
        );
      };

      /*
       * =====================================================
       * NETWORK ERROR
       * =====================================================
       *
       * IMPORTANT:
       *
       * Do NOT convert this into AbortError.
       *
       * uploadPart.ts needs to know this was
       * a network failure so it can retry.
       */

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

      /*
       * =====================================================
       * XHR ABORT
       * =====================================================
       */

      xhr.onabort = () => {

        if (settled) {
          return;
        }

        /*
         * If our AbortController caused this,
         * handleAbort() has already rejected it.
         */

        if (cancelledBySignal) {
          return;
        }

        /*
         * An unexpected XHR abort is still an
         * upload failure, not necessarily a user
         * cancellation.
         */

        rejectOnce(
          new Error(
            "Chunk upload was unexpectedly aborted."
          )
        );
      };

      /*
       * =====================================================
       * SEND
       * =====================================================
       */

      try {

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