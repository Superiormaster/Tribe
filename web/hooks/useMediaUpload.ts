import { useState, useEffect } from 'react';
import { sendChatMessage } from "@/utils/chat/sendChatMessage";
import { getVideoDuration } from "@/utils/chat/videoThumbnail";
import { restoreFiles } from "@/utils/chat/restoreFiles";
import type {
  Message,
  MessageType,
} from "@/utils/chat/messageContract";
import { useNetwork } from '@/components/networkConnection/NetworkContext';

type UploadFile = File & {
  preview?: string;
  thumbnail?: string;
  duration?: number;
};

type SendMediaPayload = {
  chat?: number;
  files?: UploadFile[];
  caption?: string;
  encrypted_text?: string;
  media_source?: "upload" | "forward" | "external";
  reply_to?: Message | null;
};

type SendMediaArgs = {
  message?: SendMediaPayload;
};

export function useMediaUpload({
  chatId,
  currentUser,
  socketRef,
  setMessages,
}: any) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [caption, setCaption] = useState('');
  const [fileProgress, setFileProgress] = useState<Record<string, number>>({});
  const { canCommunicate } = useNetwork();
  
  const pickFile = async (
    fileOrFiles: UploadFile | UploadFile[]
  ) => {
    const processFile = async (
      file: UploadFile
    ): Promise<UploadFile> => {
      const preview =
        URL.createObjectURL(file);
    
      file.preview = preview;
    
      if (file.type.startsWith("image/")) {
        file.thumbnail = preview;
      }
    
      if (file.type.startsWith("video/")) {
        file.duration =
          await getVideoDuration(file);
      }
    
      return file;
    };
  
    if (Array.isArray(fileOrFiles)) {
      const processed =
        await Promise.all(
          fileOrFiles.map(processFile)
        );
    
      setFiles(prev => [
        ...prev,
        ...processed,
      ]);
    }
    else {
      const processed =
        await processFile(fileOrFiles);
    
      setFiles(prev => [
        ...prev,
        processed,
      ]);
    }
  };
  
  const resendMedia = async (msg: any) => {
    console.log("RESEND MEDIA FUNCTION", msg);
    // STEP 1: mark UI uploading
    setMessages((prev: any) =>
      prev.map((m: any) =>
        m.client_id === msg.client_id
          ? { ...m, status: "uploading", upload_progress: 0 }
          : m
      )
    );
  
    msg.files =
      restoreFiles(msg.files);
  
    msg.media_url = msg.media_url
      ? Array.isArray(msg.media_url)
        ? msg.media_url
        : [msg.media_url]
      : [];
    
    msg.thumbnail = msg.thumbnail
      ? Array.isArray(msg.thumbnail)
        ? msg.thumbnail
        : [msg.thumbnail]
      : [];
    
    msg.duration = msg.duration
      ? Array.isArray(msg.duration)
        ? msg.duration
        : [msg.duration]
      : [];
  
    await sendChatMessage({
      message: {
        ...msg,
        client_id: msg.client_id,
      },
      currentUser,
      socketRef,
      setMessages,
      canCommunicate,
    });
  };
  
  const sendMedia = async (
    { message }: SendMediaArgs = {}
  ) => {
    const mediaFiles =
      message?.files ?? files;
  
    const mediaCaption =
      message?.caption ?? caption;
  
    const replyTo =
      message?.reply_to ?? null;
  
    const mediaChatId =
      message?.chat ?? chatId;
  
    if (
      !mediaChatId ||
      mediaFiles.length === 0
    ) {
      return;
    }
  
    const optimisticMedia =
      await Promise.all(
        mediaFiles.map(async (file: UploadFile) => ({
          url:
            file.preview ||
            URL.createObjectURL(file),
    
          type: (
            file.type.startsWith("video/")
              ? "video"
              : "image"
          ) as MessageType,
    
          thumbnail:
            file.thumbnail || null,
    
          duration:
            file.duration || null,
        }))
      );
  
    const optimistic: Message = {
      client_id: crypto.randomUUID(),
      chat: mediaChatId,
      sender: currentUser.id,
      encrypted_text: mediaCaption,
      caption: mediaCaption,
      media_type: optimisticMedia.length > 1
          ? "gallery"
          : optimisticMedia[0].type,
      media_url: optimisticMedia.map((x: any) => x.url),
      thumbnail: optimisticMedia
          .map((x: any) => x.thumbnail)
          .filter(Boolean),
      duration: optimisticMedia
          .map((x: any) => x.duration)
          .filter(Boolean),
      waveform: [],
      reply_to: replyTo,
      status: "pending",
      upload_progress: 0,
      created_at: new Date().toISOString(),
      reactions: [],
      hidden_for: [],
      is_deleted: false,
      files: mediaFiles,
    };
  
    await sendChatMessage({
      message: optimistic,
      currentUser,
      socketRef,
      setMessages,
      canCommunicate,
    });
  
    setFiles([]);
    setCaption("");
  };
  
  const sendExternalMedia = async ({
    media_type,
    media_url,
    thumbnail,
    caption = "",
  }: any) => {
    if (!chatId) return;
  
    await sendChatMessage({
      message: {
        chat: chatId,
        media_type,
        media_url: Array.isArray(media_url)
          ? media_url
          : [media_url],
        thumbnail: thumbnail
          ? (Array.isArray(thumbnail) ? thumbnail : [thumbnail])
          : [],
        caption,
        media_source: "external",
      },
      currentUser,
      socketRef,
      setMessages,
      canCommunicate,
    });
  };

  return {
    files,
    caption,
    setCaption,
    resendMedia,
    handleFileSelect: pickFile,
    handleSendMedia: sendMedia,
    handleSendExternalMedia: sendExternalMedia,
  };
}