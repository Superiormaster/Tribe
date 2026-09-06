import {
  useEffect,
  useRef,
  useState,
} from "react";

import { apiRequest } from "@/utils/api";

import {
  useNetwork,
} from "@/components/networkConnection/NetworkContext";

import {
  sendCommunityMessage,
} from "@/utils/communityChatPage/sendCommunityMessage";

import {
  restoreFiles,
} from "@/utils/chat/restoreFiles";

import {
  prepareMessages,
} from "@/utils/chat/prepareMessages";

import {
  isRenderableMessage,
} from "@/utils/chat/isRenderableMessage";

import {
  saveCommunityMessages,
  getCommunityChatScroll,
  getCommunityLatestMessages,
  getCommunityMessagesWindow,
  deleteCommunityMessagesOutsideWindow,
  updateCommunityMessage,
  getCommunityPendingMessages,
} from "@/lib/communityMessageDB";

import type {
  Message,
  MediaSource,
  MessageStatus,
  UserSummary,
} from "@/utils/chat/messageContract";

import {
  getPendingOutbox,
} from "@/utils/chat/outbox";

import {
  createReplySnapshot,
} from "@/utils/chat/replySnapshot";

import {
  mergeMessages,
  sortMessages,
  getMessageKey,
} from "@/utils/chat/messageMerger";

type Props = {
  communityId: number | null;
  currentUser: any;
  socketRef: React.MutableRefObject<any>;
  socketReady: boolean;
  input: string;
  setInput: (v: string) => void;
  replyingTo: any;
  setReplyingTo: (v: any) => void;
  clearDraft: () => Promise<void>;
  updateConversationStatus?: (
    status: MessageStatus
  ) => void;
};

type ReactionUser = {
  id: number;
  username: string;
};

type Reaction = {
  emoji: string;
  count: number;
  users: ReactionUser[];
};

type SendMessagePayload = {
  encrypted_text?: string;
  caption?: string;
  files?: any[];
  media_source?: MediaSource;
  mention_user_ids?: number[];
  mention_all?: boolean;
  mentions?: UserSummary[];
};

/*
 * React Native-safe UUID generator.
 *
 * This replaces:
 *
 * crypto.randomUUID()
 *
 * without requiring expo-crypto.
 */
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (c) => {
      const r =
        (Math.random() * 16) | 0;

      const v =
        c === "x"
          ? r
          : (r & 0x3) | 0x8;

      return v.toString(16);
    }
  );
}

const DEBUG_MESSAGE_ID = 64;

const DEBUG_CLIENT_ID =
  "e359ea3a-98af-40e0-98bb-031845e92435";

function debugMessage(
  label: string,
  messages: any
) {
  const list = Array.isArray(messages)
    ? messages
    : [messages];

  const found = list.find(
    (m: any) =>
      Number(m?.id) ===
        DEBUG_MESSAGE_ID ||
      Number(m?.server_id) ===
        DEBUG_MESSAGE_ID ||
      m?.client_id ===
        DEBUG_CLIENT_ID
  );

  console.log(
    `🔎 [MESSAGE TRACE] ${label}`,
    {
      found: !!found,
      id: found?.id,
      server_id: found?.server_id,
      client_id: found?.client_id,
      chat: found?.chat,
      community: found?.community,
      communityId:
        found?.communityId,
      ownerId:
        found?.ownerId,
      chat_type:
        found?.chat_type,
      media_type:
        found?.media_type,
    }
  );
}

function debugMedia(
  label: string,
  messages: any
) {
  const list = Array.isArray(messages)
    ? messages
    : [messages];

  console.log(
    `🖼️🖼️ [MEDIA TRACE] ${label}`
  );

  list.forEach(
    (m: any, index: number) => {
      if (
        m?.media_type ||
        m?.media_url?.length ||
        m?.media_assets?.length ||
        m?.thumbnail?.length ||
        m?.files?.length
      ) {
        console.log(
          `🖼️ [MEDIA ${index}]`,
          {
            id: m?.id,
            server_id:
              m?.server_id,
            client_id:
              m?.client_id,

            media_type:
              m?.media_type,

            media_source:
              m?.media_source,

            media_url:
              m?.media_url,

            media_url_type:
              typeof m?.media_url,

            media_url_is_array:
              Array.isArray(
                m?.media_url
              ),

            thumbnail:
              m?.thumbnail,

            thumbnail_type:
              typeof m?.thumbnail,

            thumbnail_is_array:
              Array.isArray(
                m?.thumbnail
              ),

            media_assets:
              m?.media_assets,

            files:
              m?.files,

            caption:
              m?.caption,

            encrypted_text:
              m?.encrypted_text,

            community:
              m?.community,

            communityId:
              m?.communityId,
          }
        );
      }
    }
  );
}

export function useCommunityMessages({
  communityId,
  currentUser,
  socketRef,
  socketReady,
  input,
  setInput,
  replyingTo,
  setReplyingTo,
  clearDraft,
  updateConversationStatus,
}: Props) {
  const [
    messages,
    setMessages,
  ] = useState<Message[]>([]);

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    hasMore,
    setHasMore,
  ] = useState(true);

  const [
    initializing,
    setInitializing,
  ] = useState(true);

  const [
    loadingMore,
    setLoadingMore,
  ] = useState(false);

  const [
    hasNewer,
    setHasNewer,
  ] = useState(false);

  const latestMessageIdRef =
    useRef<number | null>(null);

  const [
    loadingNewer,
    setLoadingNewer,
  ] = useState(false);

  const {
    canCommunicate,
    networkStatus,
    connectionType,
  } = useNetwork();

  // =========================
  // INIT LOAD
  // =========================
  useEffect(() => {
    if (
      !communityId ||
      !currentUser?.id
    ) {
      return;
    }

    let cancelled = false;

    const init = async () => {
      try {
        const scroll =
          await getCommunityChatScroll(
            communityId,
            currentUser.id
          );

        const anchorId =
          scroll?.messageId != null
            ? Number(
                scroll.messageId
              )
            : null;

        let cachedMessages:
          Message[] = [];

        if (anchorId != null) {
          cachedMessages =
            await getCommunityMessagesWindow(
              communityId,
              currentUser.id,
              anchorId,
              25,
              25
            );
        } else {
          cachedMessages =
            await getCommunityLatestMessages(
              communityId,
              currentUser.id,
              50
            );

          debugMessage(
            "AFTER getCommunityLatestMessages",
            cachedMessages
          );
        }

        if (cancelled) {
          return;
        }

        if (
          cachedMessages.length > 0
        ) {
          const sorted =
            prepareMessages(
              cachedMessages,
              currentUser.id
            );

          debugMessage(
            "AFTER prepareMessages INITIAL",
            sorted
          );

          setMessages(sorted);

          setInitializing(false);
        } else {
          setInitializing(true);
        }

        const url =
          anchorId != null
            ? `api/chats/${communityId}/community-messages/window/?anchor=${anchorId}&before=25&after=25`
            : `api/chats/${communityId}/community-messages/window/?before=25&after=25`;

        const res =
          await apiRequest(url);

        if (
          Array.isArray(
            res?.messages
          )
        ) {
          console.log(
            "🟢 [COMMUNITY BACKEND MESSAGES]",
            res.messages.map(
              (message: any) => ({
                id: message.id,
                server_id:
                  message.server_id,

                client_id:
                  message.client_id,

                sender:
                  message.sender,

                chat:
                  message.chat,

                community:
                  message.community,

                communityId:
                  message.communityId,

                created_at:
                  message.created_at,

                client_created_at:
                  message.client_created_at,

                status:
                  message.status,

                encrypted_text:
                  message.encrypted_text,

                caption:
                  message.caption,

                media_type:
                  message.media_type,

                media_source:
                  message.media_source,

                media_url:
                  message.media_url,

                thumbnail:
                  message.thumbnail,

                duration:
                  message.duration,

                media_assets:
                  message.media_assets?.map(
                    (asset: any) => ({
                      media_id:
                        asset.media_id,

                      media_type:
                        asset.media_type,

                      duration:
                        asset.duration,

                      original_url:
                        asset.original_url,

                      thumbnail:
                        asset.thumbnail_url,
                    })
                  ),

                reply_to:
                  message.reply_to,

                reply_to_id:
                  message.reply_to_id,

                reply_to_client_id:
                  message.reply_to_client_id,

                reactions:
                  message.reactions,

                is_deleted:
                  message.is_deleted,
              })
            )
          );
        }

        if (cancelled) {
          return;
        }

        const serverMessages:
          Message[] =
          Array.isArray(
            res?.messages
          )
            ? res.messages
            : [];

        debugMessage(
          "BACKEND serverMessages",
          serverMessages
        );

        if (
          serverMessages.length > 0
        ) {
          debugMedia(
            "2️⃣ BEFORE INDEXEDDB SAVE",
            serverMessages
          );

          await saveCommunityMessages(
            serverMessages,
            currentUser.id
          );

          const afterSave =
            anchorId != null
              ? await getCommunityMessagesWindow(
                  communityId,
                  currentUser.id,
                  anchorId,
                  25,
                  25
                )
              : await getCommunityLatestMessages(
                  communityId,
                  currentUser.id,
                  50
                );

          debugMedia(
            "3️⃣ AFTER INDEXEDDB SAVE → READ",
            afterSave
          );
        }

        if (cancelled) {
          return;
        }

        const communityPending =
          await getCommunityPendingMessages(
            currentUser.id
          );

        const pendingForCommunity =
          Array.isArray(
            communityPending
          )
            ? communityPending.filter(
                (message: any) =>
                  Number(
                    message.chat
                  ) ===
                  Number(
                    communityId
                  )
              )
            : [];

        const outbox =
          await getPendingOutbox(
            currentUser.id
          );

        const outboxForCommunity =
          Array.isArray(outbox)
            ? outbox.filter(
                (message: any) =>
                  Number(
                    message.chat
                  ) ===
                  Number(
                    communityId
                  )
              )
            : [];

        const pendingMessages = [
          ...pendingForCommunity,
          ...outboxForCommunity,
        ];

        let combined =
          mergeMessages(
            cachedMessages,
            serverMessages,
            currentUser.id
          );

        debugMessage(
          "AFTER mergeMessages CACHE + SERVER",
          combined
        );

        combined =
          mergeMessages(
            combined,
            pendingMessages,
            currentUser.id
          );

        debugMessage(
          "AFTER mergeMessages + PENDING",
          combined
        );

        let finalMessages =
          prepareMessages(
            combined,
            currentUser.id
          );

        debugMessage(
          "AFTER FINAL prepareMessages",
          finalMessages
        );

        if (
          serverMessages.length >
          0
        ) {
          /*
           * React Native / modern JS:
           *
           * serverMessages.at(-1)
           *
           * becomes:
           *
           * serverMessages[
           *   serverMessages.length - 1
           * ]
           */
          const serverAnchorId =
            anchorId != null
              ? anchorId
              : serverMessages[
                  serverMessages.length -
                    1
                ]?.id;

          if (
            serverAnchorId != null
          ) {
            debugMessage(
              "BEFORE deleteCommunityMessagesOutsideWindow",
              finalMessages
            );

            finalMessages =
              deleteCommunityMessagesOutsideWindow(
                finalMessages,
                serverAnchorId,
                40,
                40
              );

            debugMessage(
              "AFTER deleteCommunityMessagesOutsideWindow",
              finalMessages
            );
          }
        }

        if (cancelled) {
          return;
        }

        setMessages(
          finalMessages
        );

        setHasMore(
          serverMessages.length >
            0
            ? !!res.hasOlder
            : false
        );

        setHasNewer(
          serverMessages.length >
            0
            ? !!res.hasNewer
            : false
        );
      } catch (error) {
        console.error(
          "[useCommunityMessages] Failed to initialize:",
          error
        );
      } finally {
        if (!cancelled) {
          setInitializing(
            false
          );
        }
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [
    communityId,
    currentUser?.id,
  ]);

  useEffect(() => {
    debugMessage(
      "REACT messages STATE CHANGED",
      messages
    );

    console.log(
      "🔥 [REACT STATE COUNT]",
      messages.length
    );
  }, [messages]);

  // =========================
  // REFRESH NEWER
  // =========================
  const refreshNewerMessages =
    async (
      lastMessageId: number
    ) => {
      if (
        !communityId ||
        !currentUser?.id ||
        !lastMessageId
      ) {
        return false;
      }

      try {
        const res =
          await apiRequest(
            `api/chats/${communityId}/community-messages/after/?anchor=${lastMessageId}&limit=25`
          );

        const newer:
          Message[] =
          Array.isArray(
            res?.messages
          )
            ? res.messages
            : [];

        setHasNewer(
          !!res?.hasNewer
        );

        if (
          newer.length === 0
        ) {
          return false;
        }

        await saveCommunityMessages(
          newer,
          currentUser.id
        );

        setMessages(
          (prev) =>
            prepareMessages(
              mergeMessages(
                prev,
                newer,
                currentUser.id
              ),
              currentUser.id
            )
        );

        return true;
      } catch (error) {
        console.error(
          "[useCommunityMessages] Failed to refresh newer messages:",
          error
        );

        return false;
      }
    };

  // =========================
  // TRACK LATEST MESSAGE
  // =========================
  useEffect(() => {
    if (!messages.length) {
      latestMessageIdRef.current =
        null;

      return;
    }

    const serverMessages =
      messages.filter(
        (m) => m.id != null
      );

    if (
      !serverMessages.length
    ) {
      return;
    }

    const latest =
      serverMessages.reduce(
        (latest, message) =>
          Number(message.id) >
          Number(latest.id)
            ? message
            : latest
      );

    latestMessageIdRef.current =
      Number(latest.id);
  }, [messages]);

  // =========================
  // POLL NEWER MESSAGES
  // =========================
  useEffect(() => {
    if (
      !communityId ||
      !currentUser?.id
    ) {
      return;
    }

    const interval =
      setInterval(() => {
        if (!canCommunicate) {
          return;
        }

        const lastMessageId =
          latestMessageIdRef.current;

        if (
          lastMessageId == null
        ) {
          return;
        }

        refreshNewerMessages(
          lastMessageId
        );
      }, 15000);

    return () => {
      clearInterval(
        interval
      );
    };
  }, [
    communityId,
    currentUser?.id,
    canCommunicate,
  ]);

  // =========================
  // LOAD NEWER
  // =========================
  const loadNewer =
    async () => {
      if (
        !communityId ||
        !messages.length ||
        loadingNewer ||
        !hasNewer
      ) {
        return;
      }

      setLoadingNewer(
        true
      );

      try {
        const last =
          messages[
            messages.length - 1
          ];

        const lastId =
          last?.id;

        if (lastId == null) {
          setLoadingNewer(
            false
          );

          return;
        }

        const res =
          await apiRequest(
            `api/chats/${communityId}/community-messages/after/?anchor=${lastId}&limit=25`
          );

        const newer:
          Message[] =
          (
            Array.isArray(
              res?.messages
            )
              ? res.messages
              : []
          ).filter(
            isRenderableMessage
          );

        await saveCommunityMessages(
          newer,
          currentUser.id
        );

        setMessages(
          (prev) =>
            deleteCommunityMessagesOutsideWindow(
              prepareMessages(
                mergeMessages(
                  prev,
                  newer,
                  currentUser.id
                ),
                currentUser.id
              ),
              lastId,
              40,
              40
            )
        );

        setHasNewer(
          !!res.hasNewer
        );
      } finally {
        setLoadingNewer(
          false
        );
      }
    };

  // =========================
  // SEND MESSAGE
  // =========================
  const sendMessage =
    async (
      payload?: SendMessagePayload
    ) => {
      const messageText =
        payload?.encrypted_text ??
        input;

      const caption =
        payload?.caption ?? "";

      const mentionUserIds =
        payload?.mention_user_ids ??
        [];

      const mentionAll =
        payload?.mention_all ??
        false;

      const clientCreatedAt =
        new Date().toISOString();

      const replySnapshot =
        createReplySnapshot(
          replyingTo
        );

      if (
        !messageText.trim() &&
        !caption.trim() &&
        !(
          payload?.files?.length
        )
      ) {
        return;
      }

      const message: Message = {
        client_id:
          generateUUID(),

        client_sequence:
          Date.now(),

        chat:
          communityId!,

        communityId:
          communityId!,

        community:
          communityId!,

        sender:
          currentUser.id,

        encrypted_text:
          messageText,

        caption,

        media_type:
          payload?.files?.length
            ? "gallery"
            : "text",

        media_source:
          payload?.media_source ??
          undefined,

        media_url: [],

        thumbnail: [],

        duration: [],

        waveform: [],

        status:
          canCommunicate
            ? "sending"
            : "pending",

        media_status:
          "none",

        reply_to:
          replySnapshot,

        reply_to_id:
          replySnapshot?.id ??
          null,

        reply_to_client_id:
          replySnapshot?.client_id ??
          undefined,

        upload_progress:
          0,

        client_created_at:
          clientCreatedAt,

        created_at:
          clientCreatedAt,

        reactions: [],

        hidden_for: [],

        is_deleted:
          false,

        files:
          payload?.files ?? [],

        mention_user_ids:
          mentionUserIds,

        mention_all:
          mentionAll,

        mentions:
          payload?.mentions ??
          [],
      };

      await sendCommunityMessage({
        message,

        currentUser,

        socketRef,

        setMessages,

        canCommunicate,

        networkStatus,

        connectionType,
      });

      updateConversationStatus?.(
        "sent"
      );

      setInput("");

      setReplyingTo(
        null
      );

      await clearDraft();
    };

  // =========================
  // SOCKET DELETIONS
  // =========================
  useEffect(() => {
    const socket =
      socketRef.current;

    if (!socket) {
      return;
    }

    const handleCommunityMessagesDeleted =
      async ({
        communityId:
          eventCommunityId,

        messageIds,

        deletedByAdmin,
      }: any) => {
        if (
          Number(
            eventCommunityId
          ) !==
          Number(
            communityId
          )
        ) {
          return;
        }

        if (
          !Array.isArray(
            messageIds
          ) ||
          !messageIds.length
        ) {
          return;
        }

        const deletedSet =
          new Set(
            messageIds.map(
              Number
            )
          );

        setMessages(
          (prev) =>
            prev.map(
              (message) => {
                const messageId =
                  Number(
                    message.server_id ??
                      message.id
                  );

                if (
                  !deletedSet.has(
                    messageId
                  )
                ) {
                  return message;
                }

                return {
                  ...message,

                  is_deleted:
                    true,

                  deleted_by_admin:
                    Boolean(
                      deletedByAdmin
                    ),

                  text:
                    deletedByAdmin
                      ? "Deleted by administrator"
                      : "Deleted message",

                  encrypted_text:
                    "",

                  caption:
                    "",

                  media_assets:
                    [],

                  media_url:
                    [],

                  thumbnail:
                    [],

                  duration:
                    [],

                  waveform:
                    [],

                  media_type:
                    "text",

                  media_source:
                    undefined,

                  preview:
                    null,

                  files:
                    [],
                };
              }
            )
        );

        for (
          const id of messageIds
        ) {
          const message =
            messages.find(
              (m) =>
                Number(
                  m.server_id ??
                    m.id
                ) ===
                Number(id)
            );

          if (!message) {
            continue;
          }

          const clientId =
            message.client_id ??
            `server-${id}`;

          await updateCommunityMessage(
            String(
              clientId
            ),
            currentUser.id,
            {
              is_deleted:
                true,

              deleted_by_admin:
                Boolean(
                  deletedByAdmin
                ),

              text:
                deletedByAdmin
                  ? "Deleted by administrator"
                  : "Deleted message",

              encrypted_text:
                "",

              caption:
                "",

              media_assets:
                [],

              media_url:
                [],

              thumbnail:
                [],

              duration:
                [],

              waveform:
                [],

              media_type:
                "text",

              media_source:
                null,

              preview:
                null,

              files:
                [],
            }
          );
        }
      };

    /*
     * Fixed existing typo:
     *
     * socket.on(
     *   "community_messages_deleted",
     *   handleCommunityMessage
     * )
     *
     * was referencing a function that
     * doesn't exist.
     */
    socket.on(
      "community_messages_deleted",
      handleCommunityMessagesDeleted
    );

    return () => {
      socket.off(
        "community_messages_deleted",
        handleCommunityMessagesDeleted
      );
    };
  }, [
    socketReady,
    communityId,
    socketRef,
    currentUser?.id,
    messages,
  ]);

  // =========================
  // LOAD MESSAGE WINDOW
  // =========================
  const loadMessageWindow =
    async (
      messageId: number
    ) => {
      const response =
        await apiRequest(
          `api/chats/${communityId}/messages/window/?anchor=${messageId}&before=25&after=25`
        );

      const loadedMessages:
        Message[] =
        Array.isArray(
          response?.messages
        )
          ? response.messages
          : [];

      setMessages(
        (prev) =>
          prepareMessages(
            mergeMessages(
              prev,
              loadedMessages,
              currentUser.id
            ),
            currentUser.id
          )
      );

      return loadedMessages;
    };

  // =========================
  // LOAD MORE / OLDER
  // =========================
  const loadMore =
    async () => {
      if (
        !communityId ||
        !messages.length ||
        loadingMore ||
        !hasMore
      ) {
        return;
      }

      setLoadingMore(
        true
      );

      try {
        const first =
          messages[0];

        const firstId =
          first?.id;

        if (firstId == null) {
          setLoadingMore(
            false
          );

          return;
        }

        const res =
          await apiRequest(
            `api/chats/${communityId}/community-messages/before/?anchor=${firstId}&limit=25`
          );

        console.log(
          "🔥🔥 [COMMUNITY BEFORE DURATION CHECK]",
          Array.isArray(
            res?.messages
          )
            ? res.messages.map(
                (message: any) => ({
                  id:
                    message.id,

                  client_id:
                    message.client_id,

                  media_type:
                    message.media_type,

                  duration:
                    message.duration,

                  media_assets:
                    message.media_assets?.map(
                      (asset: any) => ({
                        media_id:
                          asset.media_id,

                        media_type:
                          asset.media_type,

                        duration:
                          asset.duration,
                      })
                    ),
                })
              )
            : []
        );

        const older:
          Message[] =
          (
            Array.isArray(
              res?.messages
            )
              ? res.messages
              : []
          ).filter(
            isRenderableMessage
          );

        await saveCommunityMessages(
          older,
          currentUser.id
        );

        setMessages(
          (prev) =>
            deleteCommunityMessagesOutsideWindow(
              prepareMessages(
                mergeMessages(
                  older,
                  prev,
                  currentUser.id
                ),
                currentUser.id
              ),
              firstId,
              40,
              40
            )
        );

        setHasMore(
          !!res.hasOlder
        );
      } finally {
        setLoadingMore(
          false
        );
      }
    };

  // =========================
  // RESEND
  // =========================
  const resendPendingMessage =
    async (
      msg: any
    ) => {
      await sendCommunityMessage({
        message: {
          ...msg,

          client_id:
            msg.client_id,
        },

        currentUser,

        socketRef,

        setMessages,

        canCommunicate,

        networkStatus,

        connectionType,
      });
    };

  // =========================
  // RETRY
  // =========================
  const retryFailedMessage =
    async (
      msg: any
    ) => {
      await sendCommunityMessage({
        message: {
          ...msg,

          client_id:
            msg.client_id,
        },

        currentUser,

        socketRef,

        setMessages,

        canCommunicate,

        networkStatus,

        connectionType,
      });
    };

  // =========================
  // REACTIONS
  // =========================
  const reactToMessage =
    async (
      messageId:
        | number
        | string,
      emoji: string
    ) => {
      const userId =
        Number(
          currentUser.id
        );

      const key =
        String(messageId);

      const message =
        messages.find(
          (m) => {
            return (
              getMessageKey(m) ===
                key ||
              String(m.id) ===
                key ||
              String(
                m.client_id
              ) === key ||
              String(
                m.server_id
              ) === key
            );
          }
        );

      if (!message) {
        console.warn(
          "⚠️ Cannot react: message not found",
          messageId
        );

        return;
      }

      const serverMessageId =
        message.server_id ??
        message.id;

      if (
        serverMessageId ==
          null ||
        !Number.isFinite(
          Number(
            serverMessageId
          )
        )
      ) {
        console.warn(
          "⚠️ Cannot react to unsynced message:",
          {
            client_id:
              message.client_id,

            id:
              message.id,

            server_id:
              message.server_id,

            status:
              message.status,
          }
        );

        return;
      }

      const reactionId =
        Number(
          serverMessageId
        );

      let updatedReactions:
        Reaction[] = [];

      setMessages(
        (prev) =>
          prev.map(
            (msg) => {
              if (
                String(
                  msg.id
                ) !==
                  String(
                    messageId
                  ) &&
                String(
                  msg.client_id
                ) !==
                  String(
                    messageId
                  )
              ) {
                return msg;
              }

              const currentReactions:
                Reaction[] =
                Array.isArray(
                  msg.reactions
                )
                  ? msg.reactions
                  : [];

              const userReactionIndex =
                currentReactions.findIndex(
                  (reaction) =>
                    Array.isArray(
                      reaction.users
                    ) &&
                    reaction.users.some(
                      (user) =>
                        Number(
                          user.id
                        ) ===
                        userId
                    )
                );

              if (
                userReactionIndex ===
                -1
              ) {
                const emojiIndex =
                  currentReactions.findIndex(
                    (reaction) =>
                      reaction.emoji ===
                      emoji
                  );

                // Existing emoji group
                if (
                  emojiIndex !==
                  -1
                ) {
                  const next =
                    currentReactions.map(
                      (
                        reaction,
                        index
                      ) => {
                        if (
                          index !==
                          emojiIndex
                        ) {
                          return reaction;
                        }

                        const users =
                          [
                            ...(reaction.users ||
                              []),
                            {
                              id:
                                userId,

                              username:
                                currentUser.username,
                            },
                          ];

                        return {
                          ...reaction,

                          count:
                            users.length,

                          users,
                        };
                      }
                    );

                  updatedReactions =
                    next;

                  return {
                    ...msg,
                    reactions:
                      next,
                  };
                }

                // New emoji group
                const next = [
                  ...currentReactions,
                  {
                    emoji,

                    count:
                      1,

                    users: [
                      {
                        id:
                          userId,

                        username:
                          currentUser.username,
                      },
                    ],
                  },
                ];

                updatedReactions =
                  next;

                return {
                  ...msg,

                  reactions:
                    next,
                };
              }

              const existingReaction =
                currentReactions[
                  userReactionIndex
                ];

              if (
                existingReaction.emoji ===
                emoji
              ) {
                const next =
                  currentReactions
                    .map(
                      (
                        reaction,
                        index
                      ) => {
                        if (
                          index !==
                          userReactionIndex
                        ) {
                          return reaction;
                        }

                        const users =
                          (
                            reaction.users ||
                            []
                          ).filter(
                            (user) =>
                              Number(
                                user.id
                              ) !==
                              userId
                          );

                        return {
                          ...reaction,

                          count:
                            users.length,

                          users,
                        };
                      }
                    )
                    .filter(
                      (
                        reaction
                      ) =>
                        Number(
                          reaction.count ||
                            0
                        ) > 0
                    );

                updatedReactions =
                  next;

                return {
                  ...msg,

                  reactions:
                    next,
                };
              }

              let next =
                currentReactions
                  .map(
                    (
                      reaction,
                      index
                    ) => {
                      if (
                        index !==
                        userReactionIndex
                      ) {
                        return reaction;
                      }

                      const users =
                        (
                          reaction.users ||
                          []
                        ).filter(
                          (user) =>
                            Number(
                              user.id
                            ) !==
                            userId
                        );

                      return {
                        ...reaction,

                        count:
                          users.length,

                        users,
                      };
                    }
                  )
                  .filter(
                    (
                      reaction
                    ) =>
                      Number(
                        reaction.count ||
                          0
                      ) > 0
                  );

              // Add user to new emoji group
              const newEmojiIndex =
                next.findIndex(
                  (reaction) =>
                    reaction.emoji ===
                    emoji
                );

              if (
                newEmojiIndex !==
                -1
              ) {
                next =
                  next.map(
                    (
                      reaction,
                      index
                    ) => {
                      if (
                        index !==
                        newEmojiIndex
                      ) {
                        return reaction;
                      }

                      const users =
                        [
                          ...(reaction.users ||
                            []),
                          {
                            id:
                              userId,

                            username:
                              currentUser.username,
                          },
                        ];

                      return {
                        ...reaction,

                        count:
                          users.length,

                        users,
                      };
                    }
                  );
              } else {
                next.push({
                  emoji,

                  count:
                    1,

                  users: [
                    {
                      id:
                        userId,

                      username:
                        currentUser.username,
                    },
                  ],
                });
              }

              updatedReactions =
                next;

              return {
                ...msg,

                reactions:
                  next,
              };
            }
          )
      );

      await updateCommunityMessage(
        String(
          message.client_id ??
            message.id
        ),
        userId,
        {
          reactions:
            updatedReactions,
        }
      );

      socketRef.current?.emit(
        "community_reaction",
        {
          communityId,

          messageId:
            reactionId,

          emoji,
        }
      );
    };

  // =========================
  // DELETE MESSAGE
  // =========================
  const deleteMessage =
    (
      messageId:
        | number
        | string
    ) => {
      if (!communityId) {
        return;
      }

      socketRef.current?.emit(
        "community_delete",
        {
          communityId,

          messageIds: [
            Number(
              messageId
            ),
          ],

          deletedByAdmin:
            false,
        }
      );
    };

  return {
    messages,

    setMessages,

    sendMessage,

    resendPendingMessage,

    retryFailedMessage,

    loadMore,

    loadNewer,

    initializing,

    hasMore,

    hasNewer,

    reactToMessage,

    deleteMessage,

    loadMessageWindow,
  };
}