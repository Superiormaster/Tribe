import { useCallback, useEffect, useState } from "react";
import {
DeviceEventEmitter,
} from "react-native";

import {
getAllDrafts,
getPendingMessages,
getAllChatMeta,
} from "@/lib/messageDB";

import type { Message } from "@/utils/chat/messageContract";

import type {
PendingMessage,
ChatStatus,
} from "@/hooks/inbox/useRecentChats";

interface Draft {
chatId: number;
text: string;
updated_at: string;
}

export interface ChatMeta {
chatId: number;
username?: string;
avatar?: string;
}

export function usePendingMessages(userId?: number) {
const [drafts, setDrafts] =
useState<Record<number, Draft>>({});

const [pendingMap, setPendingMap] =
useState<Record<number, PendingMessage>>({});

const [chatMeta, setChatMeta] =
useState<Record<number, ChatMeta>>({});

const [loaded, setLoaded] =
useState(false);

const loadPendingData = useCallback(async () => {
if (!userId) return;

try {
  const [
    draftsData,
    pendingData,
    metaData,
  ] = await Promise.all([
    getAllDrafts(),
    getPendingMessages(userId),
    getAllChatMeta(),
  ]);

  const draftMap: Record<number, Draft> = {};

  const pending: Record<
    number,
    PendingMessage
  > = {};

  const meta: Record<number, ChatMeta> = {};

  draftsData.forEach((d: any) => {
    draftMap[d.chatId] = d;
  });

  pendingData.forEach((m: any) => {
    const chatId =
      m.chat ?? m.chatId;

    const existing = pending[chatId];

    if (
      !existing ||
      new Date(m.created_at).getTime() >
        new Date(
          existing.created_at
        ).getTime()
    ) {
      pending[chatId] = m;
    }
  });

  metaData.forEach((m: any) => {
    meta[m.chatId] = m;
  });

  setDrafts(draftMap);
  setPendingMap(pending);
  setChatMeta(meta);
  setLoaded(true);
} catch (err) {
  console.error(
    "Failed to load pending message",
    err
  );
}

}, [userId]);

useEffect(() => {
void loadPendingData();
}, [loadPendingData]);

/**

* Draft updates.
  */
  useEffect(() => {
  const subscription =
  DeviceEventEmitter.addListener(
  "draft-updated",
  (data: {
  chatId: number;
  text?: string;
  updated_at: string;
  }) => {
  const {
  chatId,
  text,
  updated_at,
  } = data;
  
   setDrafts(prev => {
   const next = { ...prev };

   if (!text?.trim()) {
     delete next[chatId];
   } else {
     next[chatId] = {
       chatId,
       text,
       updated_at,
     };
   }

   return next;
 });
  
  }
  );

return () => {
  subscription.remove();
};

}, []);

/**

* Message successfully synced.
  */
  useEffect(() => {
  const subscription =
  DeviceEventEmitter.addListener(
  "message-synced",
  (data: {
  chatId: number;
  }) => {
  const { chatId } = data;
  
   setPendingMap(prev => {
   const next = { ...prev };
   delete next[chatId];
   return next;
 });

 setDrafts(prev => {
   const next = { ...prev };
   delete next[chatId];
   return next;
 });
  
  }
  );

return () => {
  subscription.remove();
};

}, []);

/**

* Pending message delivered.
  */
  useEffect(() => {
  const subscription =
  DeviceEventEmitter.addListener(
  "message-delivered",
  (data: {
  chatId: number;
  messageIds: Array<
  number | string
  >;
  }) => {
  const {
  chatId,
  messageIds,
  } = data;
  
   setPendingMap(prev => {
   const next = { ...prev };

   if (
     next[chatId] &&
     messageIds.includes(
       next[chatId].id!
     )
   ) {
     next[chatId] = {
       ...next[chatId],
       status: "delivered",
     };
   }

   return next;
 });
  
  }
  );

return () => {
  subscription.remove();
};

}, []);

return {
drafts,
pendingMap,
chatMeta,
loaded,

setDrafts,
setPendingMap,
setChatMeta,

reloadPendingData:
  loadPendingData,

};
}