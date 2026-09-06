import {
  getDB,
  OUTBOX_STORE,
  MESSAGE_STORE,
  type ChatType,
} from "@/lib/db";

import { restoreFiles } from "@/utils/chat/restoreFiles";
import type {
  Message,
} from "@/utils/chat/messageContract";
import {
  getPendingMessages,
  updateMessage,
} from "@/lib/messageDB";
import {
  reconnectSocket,
} from "@/lib/socket";
import {
  classifyMessageError,
} from "@/utils/chat/messageSendError";

import {
  hasSendableCommunityContent,
} from "@/utils/chat/isRenderableMessage";

import {
  getCommunityPendingMessages,
  updateCommunityMessage,
} from "@/lib/communityMessageDB";

import {
  sendMessageThroughQueue,
} from "@/utils/chat/sendMessageThroughQueue";

import {
  sendCommunityMessageThroughQueue,
} from "@/utils/communityChatPage/sendCommunityMessageThroughQueue";

import type { Socket } from "socket.io-client";

type OutboxStatus =
  | "pending"
  | "processing"
  | "failed";

type OutboxItem = {
  client_id: string;
  ownerId: number;
  chat_id: number;
  chat_type: ChatType;
  status: OutboxStatus;
  attempts: number;
  next_attempt_at: number;
  created_at: number;
  processing_at?: number | null;
  last_error?: string | null;
  client_sequence?: number;
};

const PROCESSING_TIMEOUT = 30_000;

type ProcessorOptions = {
  ownerId: number;
  privateSocket?: Socket | null;
  communitySocket?: Socket | null;
  setMessages?: any;
  setCommunityMessages?: any;
  isOnline?: boolean;
};

export function getRetryDelay(
  retryCount: number
) {
  return Math.min(
    30_000,
    2_000 *
      Math.pow(
        2,
        retryCount
      )
  );
}

const isBlobUrl = (value: unknown): boolean =>
  typeof value === "string" &&
  value.startsWith("blob:");

const describeFile = (file: any) => ({
  name: file?.name,
  type: file?.type,
  size: file?.size,
  constructor:
    file?.constructor?.name,
  isFile:
    typeof File !== "undefined" &&
    file instanceof File,
  isBlob:
    typeof Blob !== "undefined" &&
    file instanceof Blob,
  hasArrayBuffer:
    typeof file?.arrayBuffer === "function",
  hasStream:
    typeof file?.stream === "function",
});

let processorPromise:
  Promise<void> | null = null;

let processing = false;

export async function flushOutbox(
  options: ProcessorOptions
): Promise<void> {

  if (processorPromise) {
    return processorPromise;
  }

  processorPromise =
    runOutboxProcessor(options);

  try {
    await processorPromise;
  } finally {
    processorPromise = null;
  }
}

async function runOutboxProcessor(
  options: ProcessorOptions
) {
  if (processing) {
    return;
  }

  processing = true;

  try {
    console.log(
      "🚀 OUTBOX PROCESSOR START"
    );

    const {
      ownerId,
      isOnline,
    } = options;

    if (
      isOnline === false ||
      (
        typeof navigator !== "undefined" &&
        !navigator.onLine
      )
    ) {
      console.log(
        "📴 OUTBOX: device offline"
      );

      return;
    }

    const db =
      await getDB();

    if (!db) {
      console.warn(
        "⚠️ OUTBOX: IndexedDB unavailable"
      );

      return;
    }

    await recoverStaleProcessingItems(
      ownerId
    );

    await reconcileOutbox(
      ownerId
    );

    await processOutboxItems(
      options
    );

  } catch (error) {

    console.error(
      "🔥 OUTBOX PROCESSOR ERROR",
      error
    );

  } finally {

    processing = false;

    console.log(
      "🏁 OUTBOX PROCESSOR END"
    );
  }
}

async function processSingleMessage(
  item: OutboxItem,
  options: ProcessorOptions
): Promise<boolean> {

  const {
    ownerId,
    privateSocket,
    communitySocket,
    setMessages,
    setCommunityMessages,
  } = options;

  const chatType =
    item.chat_type;

  const update =
    chatType === "community"
      ? updateCommunityMessage
      : updateMessage;

  const socket =
    chatType === "community"
      ? communitySocket
      : privateSocket;

  let activeSocket =
    socket;
  
  if (!activeSocket?.connected) {
    if (
      typeof navigator !== "undefined" &&
      !navigator.onLine
    ) {
      console.log(
        "📴 OUTBOX: network offline"
      );
  
      return false;
    }
  
    try {
      console.log(
        "🔌 OUTBOX: socket disconnected — reconnecting..."
      );
  
      activeSocket =
        await reconnectSocket();
  
      console.log(
        "✅ OUTBOX: socket reconnected:",
        activeSocket.id
      );
    } catch (error) {
      console.warn(
        "⏸️ OUTBOX: socket reconnect failed",
        error
      );
  
      return false;
    }
  }

  const messages =
    chatType === "community"
      ? await getCommunityPendingMessages(
          ownerId
        )
      : await getPendingMessages(
          ownerId
        );

  const message =
    messages.find(
      message =>
        message.client_id ===
        item.client_id
    );

  if (!message) {
    console.log(
      "🗑️ Message no longer exists:",
      item.client_id
    );

    await removeFromOutbox(
      item.client_id
    );

    return true;
  }

  const clientId =
    item.client_id;

  console.log(
    "📤 OUTBOX PROCESSING",
    {
      clientId,
      chatType,
    }
  );

  try {

    await markProcessing(
      clientId
    );

    const hasFiles =
      Array.isArray(message.files) &&
      message.files.length > 0;
    
    await update(
      clientId,
      ownerId,
      {
        status: hasFiles
          ? "uploading"
          : "sending",
      }
    );

    const finalMessage =
      await prepareMediaMessage(
        message,
        ownerId,
        chatType,
        setMessages,
        setCommunityMessages
      );

    console.log(
      "🔥 FINAL MESSAGE BEFORE SOCKET",
      {
        client_id: finalMessage.client_id,
        files: finalMessage.files,
        media_url: finalMessage.media_url,
        media_asset_ids:
          finalMessage.media_asset_ids,
        media_status:
          finalMessage.media_status,
      }
    );

    if (
      Array.isArray(finalMessage.files) &&
      finalMessage.files.length > 0
    ) {
      const hasBlobUrl =
        Array.isArray(finalMessage.media_url) &&
        finalMessage.media_url.some(
          (url: string) =>
            typeof url === "string" &&
            url.startsWith("blob:")
        );
    
      if (hasBlobUrl) {
        throw new Error(
          "Media upload incomplete: blob URL still present."
        );
      }
    
      if (
        !Array.isArray(
          finalMessage.media_asset_ids
        ) ||
        finalMessage.media_asset_ids.length === 0
      ) {
        throw new Error(
          "Media upload incomplete: media_asset_ids missing."
        );
      }
    }

    await update(
      clientId,
      ownerId,
      finalMessage
    );

    console.log(
      "📨 OUTBOX SEND:",
      clientId
    );
    
    const mediaUrls =
      Array.isArray(finalMessage.media_url)
        ? finalMessage.media_url
        : [];
    
    const assetIds =
      Array.isArray(finalMessage.media_asset_ids)
        ? finalMessage.media_asset_ids
        : [];
    
    const hasBlob =
      mediaUrls.some(
        (url: unknown) =>
          typeof url === "string" &&
          url.startsWith("blob:")
      );
    
    if (hasBlob) {
      throw new Error(
        "❌ REFUSING TO SEND: blob URL still present"
      );
    }
    
    if (
      finalMessage.files?.length &&
      assetIds.length !== mediaUrls.length
    ) {
      throw new Error(
        `❌ REFUSING TO SEND: media asset count (${assetIds.length}) does not match media URL count (${mediaUrls.length})`
      );
    }

    const result =
      (
        chatType === "community"
          ? await sendCommunityMessageThroughQueue(
              activeSocket,
              finalMessage,
              ownerId,
              setCommunityMessages
            )
          : await sendMessageThroughQueue(
              activeSocket,
              finalMessage,
              ownerId,
              setMessages
            )
      ) as {
        ok?: boolean;
        [key: string]: any;
      };

    if (
      !result ||
      result.ok === false
    ) {
      const failure =
        classifyMessageError(
          null,
          result
        );
    
      console.warn(
        "[OUTBOX] SEND FAILED",
        {
          client_id: clientId,
          type: failure.type,
          retryable: failure.retryable,
          message: failure.message,
        }
      );
    
      if (!failure.retryable) {
        await update(
          clientId,
          ownerId,
          {
            status: "failed",
            error_type: failure.type,
            error_message: failure.message,
            retryable: false,
          }
        );
    
        await removeFromOutbox(
          clientId
        );
    
        setMessages?.((prev: any[]) =>
          prev.map((m: any) =>
            m.client_id === clientId
              ? {
                  ...m,
                  status: "failed",
                  error_type: failure.type,
                  error_message: failure.message,
                  retryable: false,
                }
              : m
          )
        );
    
        setCommunityMessages?.((prev: any[]) =>
          prev.map((m: any) =>
            m.client_id === clientId
              ? {
                  ...m,
                  status: "failed",
                  error_type: failure.type,
                  error_message: failure.message,
                  retryable: false,
                }
              : m
          )
        );
    
        return true;
      }
    
      throw new Error(
        failure.message
      );
    }

    await update(
      clientId,
      ownerId,
      {
        status: "sent",
      }
    );

    await removeFromOutbox(
      clientId
    );

    console.log(
      "✅ OUTBOX SENT + REMOVED:",
      clientId
    );

    return true;

  } catch (error: any) {

    console.error(
      "❌ OUTBOX MESSAGE FAILED:",
      clientId,
      error
    );
  
    const failure =
      classifyMessageError(error);
  
    console.warn(
      "[OUTBOX] CLASSIFIED FAILURE",
      {
        client_id: clientId,
        type: failure.type,
        retryable: failure.retryable,
        message: failure.message,
      }
    );
  
    if (!failure.retryable) {
  
      await update(
        clientId,
        ownerId,
        {
          status: "failed",
          error_type:
            failure.type,
          error_message:
            failure.message,
          retryable: false,
        }
      );
  
      await removeFromOutbox(
        clientId
      );
  
      setMessages?.((prev: any[]) =>
        prev.map((m: any) =>
          m.client_id === clientId
            ? {
                ...m,
                status: "failed",
                error_type:
                  failure.type,
                error_message:
                  failure.message,
                retryable: false,
              }
            : m
        )
      );
  
      setCommunityMessages?.((prev: any[]) =>
        prev.map((m: any) =>
          m.client_id === clientId
            ? {
                ...m,
                status: "failed",
                error_type:
                  failure.type,
                error_message:
                  failure.message,
                retryable: false,
              }
            : m
        )
      );
  
      return true;
    }
  
    const db =
      await getDB();
  
    const item =
      await db?.get(
        OUTBOX_STORE,
        clientId
      );
  
    const retryCount =
      item?.attempts ?? 0;
  
    const delay =
      getRetryDelay(
        retryCount
      );
  
    await markPending(
      clientId,
      failure.message
    );
  
    await update(
      clientId,
      ownerId,
      {
        status: "pending",
  
        error_type:
          failure.type,
  
        error_message:
          failure.message,
  
        retryable: true,
  
        retry_count:
          retryCount,
  
        last_retry_at:
          Date.now(),
  
        next_retry_at:
          Date.now() + delay,
      }
    );
  
    return false;
  }
}

async function prepareMediaMessage(
  message: any,
  ownerId: number,
  chatType: ChatType,
  setMessages?: any,
  setCommunityMessages?: any
) {
  const files =
    Array.isArray(message.files)
      ? message.files
      : [];

  console.log(
    "🔎 [MEDIA PREPARE] START",
    {
      client_id: message.client_id,

      filesCount: files.length,

      files: files.map(
        (file: any) =>
          describeFile(file)
      ),

      media_url:
        message.media_url,

      blobUrls:
        Array.isArray(message.media_url)
          ? message.media_url.filter(
              isBlobUrl
            )
          : [],

      media_asset_ids:
        message.media_asset_ids,

      media_status:
        message.media_status,
    }
  );

  if (!files.length) {
    console.log(
      "ℹ️ [MEDIA PREPARE] No files"
    );

    return message;
  }

  const hasBlobUrls =
    Array.isArray(message.media_url) &&
    message.media_url.some(
      isBlobUrl
    );

  const hasPermanentMedia =
    Array.isArray(message.media_url) &&
    message.media_url.length > 0 &&
    message.media_url.every(
      (url: unknown) =>
        typeof url === "string" &&
        !url.startsWith("blob:")
    );

  console.log(
    "🔎 [MEDIA PREPARE] MEDIA STATE",
    {
      hasFiles:
        files.length > 0,

      hasBlobUrls,

      hasPermanentMedia,

      media_url:
        message.media_url,

      media_asset_ids:
        message.media_asset_ids,
    }
  );

  const needsUpload =
    files.length > 0 &&
    !hasPermanentMedia;

  if (!needsUpload) {
    console.log(
      "✅ [MEDIA PREPARE] Upload not needed"
    );

    return message;
  }

  let restoredFiles: any[] = [];

  try {
    restoredFiles =
      restoreFiles(files);

    console.log(
      "♻️ [MEDIA PREPARE] RESTORED FILES",
      {
        count:
          restoredFiles.length,

        files:
          restoredFiles.map(
            (file: any) =>
              describeFile(file)
          ),
      }
    );
  } catch (error) {
    console.error(
      "❌ [MEDIA PREPARE] restoreFiles FAILED",
      error
    );

    throw error;
  }

  if (!restoredFiles.length) {
    throw new Error(
      "Media upload cannot start: message contains files but restoreFiles() returned no files."
    );
  }

  const uploadableFiles =
    restoredFiles.filter(
      (file: any) =>
        typeof File !== "undefined" &&
        file instanceof File
    );

  console.log(
    "🔎 [MEDIA PREPARE] UPLOADABLE FILES",
    {
      restoredCount:
        restoredFiles.length,

      uploadableCount:
        uploadableFiles.length,

      restored:
        restoredFiles.map(
          (file: any) =>
            describeFile(file)
        ),

      uploadable:
        uploadableFiles.map(
          (file: any) =>
            describeFile(file)
        ),
    }
  );

  if (
    uploadableFiles.length !==
    restoredFiles.length
  ) {
    throw new Error(
      `Media upload cannot start: ${restoredFiles.length} restored file(s), but only ${uploadableFiles.length} are valid File objects.`
    );
  }

  console.log(
    "📤 OUTBOX MEDIA UPLOAD STARTING",
    {
      client_id:
        message.client_id,

      fileCount:
        uploadableFiles.length,

      files:
        uploadableFiles.map(
          (file: any) =>
            describeFile(file)
        ),
    }
  );

  const update =
    chatType === "community"
      ? updateCommunityMessage
      : updateMessage;

  await update(
    message.client_id,
    ownerId,
    {
      status: "sending",
      media_status: "uploading",
      upload_progress: 0,
    }
  );

  const setState =
    chatType === "community"
      ? setCommunityMessages
      : setMessages;

  if (setState) {
    setState(
      (prev: any[]) =>
        prev.map(
          (item: any) =>
            item.client_id ===
            message.client_id
              ? {
                  ...item,
                  status:
                    "sending",
                  media_status:
                    "uploading",
                  upload_progress:
                    0,
                }
              : item
        )
    );
  }

  const controller =
    new AbortController();

  try {
    const {
      uploadMediaFiles,
    } = await import(
      "@/utils/chat/mediaUpload"
    );

    console.log(
      "🚀 [MEDIA PREPARE] CALLING uploadMediaFiles",
      {
        client_id:
          message.client_id,

        count:
          uploadableFiles.length,
      }
    );

    const uploaded =
      await uploadMediaFiles(
        uploadableFiles,
        {
          networkStatus:
            "good",

          connectionType:
            "unknown",

          signal:
            controller.signal,

          onProgress:
            (
              percent: number
            ) => {
              console.log(
                "📊 [MEDIA PREPARE] UPLOAD PROGRESS",
                {
                  client_id:
                    message.client_id,
                  percent,
                }
              );

              if (setState) {
                setState(
                  (prev: any[]) =>
                    prev.map(
                      (item: any) =>
                        item.client_id ===
                        message.client_id
                          ? {
                              ...item,
                              upload_progress:
                                percent,
                            }
                          : item
                    )
                );
              }

              void update(
                message.client_id,
                ownerId,
                {
                  media_status:
                    "uploading",

                  upload_progress:
                    percent,
                }
              );
            },
        }
      );

    console.log(
      "📦 [MEDIA PREPARE] UPLOAD RESULT",
      {
        client_id:
          message.client_id,

        uploaded,

        media_url:
          uploaded.media_url,

        media_asset_ids:
          uploaded.media_asset_ids,

        thumbnails:
          uploaded.thumbnail,

        blobUrls:
          Array.isArray(
            uploaded.media_url
          )
            ? uploaded.media_url.filter(
                isBlobUrl
              )
            : [],
      }
    );

    if (
      !Array.isArray(
        uploaded.media_url
      )
    ) {
      throw new Error(
        "Media upload returned invalid media_url."
      );
    }

    if (
      uploaded.media_url.some(
        isBlobUrl
      )
    ) {
      throw new Error(
        "Media uploader returned a blob URL instead of a permanent uploaded URL."
      );
    }

    if (
      !Array.isArray(
        uploaded.media_asset_ids
      ) ||
      uploaded.media_asset_ids.length !==
        uploaded.media_url.length
    ) {
      throw new Error(
        `Media upload returned mismatched assets: ${uploaded.media_asset_ids?.length ?? 0} asset IDs for ${uploaded.media_url.length} URLs.`
      );
    }

    const mediaPatch = {
      media_type:
        uploaded.media_type,

      media_url:
        uploaded.media_url,

      thumbnail:
        uploaded.thumbnail,

      media_asset_ids:
        uploaded.media_asset_ids,

      duration: message.duration ?? [],
      media_status:
        "uploaded",

      upload_progress:
        100,

      files:
        message.files,
    };

    console.log(
      "💾 [MEDIA PREPARE] SAVING UPLOADED MEDIA",
      {
        client_id:
          message.client_id,

        mediaPatch,

        hasBlob:
          mediaPatch.media_url.some(
            isBlobUrl
          ),
      }
    );

    await update(
      message.client_id,
      ownerId,
      mediaPatch
    );

    const finalMessage = {
      ...message,
      ...mediaPatch,
    };

    console.log(
      "✅ [MEDIA PREPARE] FINAL MEDIA MESSAGE",
      {
        client_id:
          finalMessage.client_id,

        media_url:
          finalMessage.media_url,

        media_asset_ids:
          finalMessage.media_asset_ids,

        media_status:
          finalMessage.media_status,

        hasBlob:
          Array.isArray(
            finalMessage.media_url
          ) &&
          finalMessage.media_url.some(
            isBlobUrl
          ),
      }
    );

    return finalMessage;

  } catch (error) {
    console.error(
      "❌ [MEDIA PREPARE] UPLOAD FAILED",
      {
        client_id:
          message.client_id,

        error,

        originalFiles:
          files.map(
            (file: any) =>
              describeFile(file)
          ),

        restoredFiles:
          restoredFiles.map(
            (file: any) =>
              describeFile(file)
          ),
      }
    );

    await update(
      message.client_id,
      ownerId,
      {
        status: "pending",
      }
    );

    throw error;
  }
}

export async function enqueueMessage(
  message: {
    client_id: string;
    ownerId: number;
    chat_id: number;
    chat_type: ChatType;
    client_sequence?: number;
  }
) {

  const db =
    await getDB();

  if (!db) {
    return;
  }

  const existing =
    await db.get(
      OUTBOX_STORE,
      message.client_id
    );

  if (existing) {

    if (
      existing.status ===
      "processing"
    ) {

      await db.put(
        OUTBOX_STORE,
        {
          ...existing,
          status:
            "pending",
          next_attempt_at:
            Date.now(),
        }
      );
    }

    return;
  }

  const item: OutboxItem = {
    client_id:
      message.client_id,
  
    ownerId:
      message.ownerId,
  
    chat_id:
      message.chat_id,
  
    chat_type:
      message.chat_type,
  
    status:
      "pending",
  
    attempts:
      0,
  
    client_sequence:
      message.client_sequence,
  
    next_attempt_at:
      Date.now(),
  
    created_at:
      Date.now(),
  
    last_error:
      null,
  };
  
  await db.put(
    OUTBOX_STORE,
    item
  );

  console.log(
    "📥 OUTBOX ENQUEUED",
    message.client_id
  );
}

async function markProcessing(
  clientId: string
) {

  const db =
    await getDB();

  if (!db) return;

  const item =
    await db.get(
      OUTBOX_STORE,
      clientId
    );

  if (!item) {
    return;
  }

  await db.put(
    OUTBOX_STORE,
    {
      ...item,
      status:
        "processing",
      processing_at: Date.now(),
      attempts:
        (item.attempts || 0) + 1,
      next_attempt_at:
        Date.now(),
    }
  );
}

async function markPending(
  clientId: string,
  error?: string
) {

  const db =
    await getDB();

  if (!db) return;

  const item =
    await db.get(
      OUTBOX_STORE,
      clientId
    );

  if (!item) {
    return;
  }

  const attempts =
    item.attempts || 0;

  const delay =
    getRetryDelay(
      attempts
    );

  await db.put(
    OUTBOX_STORE,
    {
      ...item,
      status:
        "pending",
      processing_at: null,
      next_attempt_at:
        Date.now() +
        delay,

      last_error:
        error ??
        null,
    }
  );
}

async function removeFromOutbox(
  clientId: string
) {

  const db =
    await getDB();

  if (!db) return;

  await db.delete(
    OUTBOX_STORE,
    clientId
  );
}

async function recoverStaleProcessingItems(
  ownerId: number
) {
  const db = await getDB();

  if (!db) return;

  const now = Date.now();

  const items =
    await db.getAll(OUTBOX_STORE);

  for (const item of items) {
    if (
      item.ownerId !== ownerId
    ) {
      continue;
    }

    if (
      item.status !== "processing"
    ) {
      continue;
    }

    if (
      !item.processing_at
    ) {
      continue;
    }

    if (
      now - item.processing_at >
      PROCESSING_TIMEOUT
    ) {
      console.warn(
        "♻️ Recovering stale processing item:",
        item.client_id
      );

      await db.put(
        OUTBOX_STORE,
        {
          ...item,
          status: "pending",
          processing_at: null,
          next_attempt_at: now,
          last_error:
            "Recovered stale processing item",
        }
      );
    }
  }
}

async function reconcileOutbox(
  ownerId: number
) {
  const db =
    await getDB();

  if (!db) {
    return;
  }
  
  const privatePending =
    await getPendingMessages(ownerId);

  const communityPending =
    await getCommunityPendingMessages(
      ownerId
    );

  for (const message of privatePending) {

    if (message.server_id) {
      continue;
    }
  
    if (
      !hasSendableCommunityContent(
        message as Partial<Message>
      )
    ) {
      console.warn(
        "🗑️ Removing empty private message:",
        message.client_id
      );
  
      await db.delete(
        MESSAGE_STORE,
        message.client_id
      );
  
      await removeFromOutbox(
        message.client_id
      );
  
      continue;
    }
  
    await enqueueMessage({
      client_id:
        message.client_id,
    
      ownerId,
    
      chat_id:
        Number(message.chat),
    
      client_sequence:
        message.client_sequence,
    
      chat_type:
        "private",
    });
  }

  for (const message of communityPending) {

    if (message.server_id) {
      continue;
    }
  
    if (
      !hasSendableCommunityContent(
        message as Partial<Message>
      )
    ) {
      console.warn(
        "🗑️ Removing empty community message:",
        message.client_id
      );
  
      await db.delete(
        MESSAGE_STORE,
        message.client_id
      );
  
      await removeFromOutbox(
        message.client_id
      );
  
      continue;
    }
  
    await enqueueMessage({
      client_id:
        message.client_id,
    
      ownerId,
    
      chat_id:
        Number(
          message.community ??
          message.communityId
        ),
    
      client_sequence:
        message.client_sequence,
    
      chat_type:
        "community",
    });
  }
}

async function processOutboxItems(
  options: ProcessorOptions
) {
  const {
    ownerId,
  } = options;

  const db =
    await getDB();

  if (!db) {
    return;
  }

  while (true) {
    if (
      typeof navigator !== "undefined" &&
      !navigator.onLine
    ) {
      console.log(
        "📴 OUTBOX STOPPED: offline"
      );

      break;
    }

    const now =
      Date.now();

    const allItems =
      await db.getAll(
        OUTBOX_STORE
      );

    const pending =
      allItems
        .filter(
          item =>
            item.ownerId === ownerId &&
            item.status === "pending" &&
            item.next_attempt_at <= now
        )
        .sort(
          (a, b) =>
            a.created_at -
            b.created_at
        );

    if (!pending.length) {
      break;
    }

    let processedAny =
      false;

    for (const item of pending) {
      if (
        typeof navigator !== "undefined" &&
        !navigator.onLine
      ) {
        break;
      }

      const processed =
        await processSingleMessage(
          item,
          options
        );

      if (processed) {
        processedAny = true;
      }
    }

    if (!processedAny) {
      break;
    }
  }
}