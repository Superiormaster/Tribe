// utils/mediaUpload/compressedVideoStore.ts

const DB_NAME = "tribe-media-upload";
const DB_VERSION = 1;
const STORE_NAME = "compressed-videos";

type StoredCompressedVideo = {
  key: string;
  file: File;
  originalName: string;
  originalSize: number;
  originalLastModified: number;
  targetQuality: "720p" | "1080p";
  createdAt: number;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(
        new Error(
          "IndexedDB is only available in the browser."
        )
      );
      return;
    }

    const request = indexedDB.open(
      DB_NAME,
      DB_VERSION
    );

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(
          STORE_NAME,
          {
            keyPath: "key",
          }
        );
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(
        request.error ||
          new Error("Failed to open IndexedDB.")
      );
    };
  });
}

export function getCompressedVideoKey(
  file: File,
  targetQuality: "720p" | "1080p"
) {
  return [
    file.name,
    file.size,
    file.lastModified,
    file.type,
    targetQuality,
  ].join("::");
}

export async function saveCompressedVideo(
  key: string,
  compressedFile: File,
  originalFile: File,
  targetQuality: "720p" | "1080p"
): Promise<void> {

  const db = await openDB();

  const record: StoredCompressedVideo = {
    key,

    file: compressedFile,

    originalName:
      originalFile.name,

    originalSize:
      originalFile.size,

    originalLastModified:
      originalFile.lastModified,

    targetQuality,

    createdAt: Date.now(),
  };

  await new Promise<void>(
    (resolve, reject) => {

      const transaction =
        db.transaction(
          STORE_NAME,
          "readwrite"
        );

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      store.put(record);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(
          transaction.error ||
            new Error(
              "Failed to save compressed video."
            )
        );
      };
    }
  );

  db.close();
}

export async function getCompressedVideo(
  key: string
): Promise<File | null> {

  const db = await openDB();

  const record =
    await new Promise<
      StoredCompressedVideo | undefined
    >(
      (resolve, reject) => {

        const transaction =
          db.transaction(
            STORE_NAME,
            "readonly"
          );

        const store =
          transaction.objectStore(
            STORE_NAME
          );

        const request =
          store.get(key);

        request.onsuccess = () => {
          resolve(
            request.result
          );
        };

        request.onerror = () => {
          reject(
            request.error ||
              new Error(
                "Failed to retrieve compressed video."
              )
          );
        };
      }
    );

  db.close();

  if (!record?.file) {
    return null;
  }

  return record.file;
}

export async function deleteCompressedVideo(
  key: string
): Promise<void> {

  const db = await openDB();

  await new Promise<void>(
    (resolve, reject) => {

      const transaction =
        db.transaction(
          STORE_NAME,
          "readwrite"
        );

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      store.delete(key);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(
          transaction.error ||
            new Error(
              "Failed to delete compressed video."
            )
        );
      };
    }
  );

  db.close();
}

export async function cleanupOldCompressedVideos(
  maxAgeMs =
    24 * 60 * 60 * 1000
): Promise<void> {

  const db = await openDB();

  const cutoff =
    Date.now() - maxAgeMs;

  await new Promise<void>(
    (resolve, reject) => {

      const transaction =
        db.transaction(
          STORE_NAME,
          "readwrite"
        );

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      const request =
        store.openCursor();

      request.onsuccess = () => {

        const cursor =
          request.result;

        if (!cursor) {
          return;
        }

        const record =
          cursor.value as StoredCompressedVideo;

        if (
          record.createdAt < cutoff
        ) {
          cursor.delete();
        }

        cursor.continue();
      };

      request.onerror = () => {
        reject(
          request.error ||
            new Error(
              "Failed to clean compressed videos."
            )
        );
      };

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(
          transaction.error ||
            new Error(
              "Failed to clean compressed videos."
            )
        );
      };
    }
  );

  db.close();
}