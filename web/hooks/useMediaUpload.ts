import { useState, useEffect } from 'react';
import { sendChatMessage } from "@/utils/chat/sendChatMessage";
import { getVideoDuration } from "@/utils/chat/videoThumbnail";
import { restoreFiles } from "@/utils/chat/restoreFiles";
import { useNetwork } from '@/components/networkConnection/NetworkContext';

export function useMediaUpload({
  chatId,
  currentUser,
  socketRef,
  setMessages,
}: any) {
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [fileProgress, setFileProgress] = useState<Record<string, number>>({});
  const { canCommunicate } = useNetwork();
  
  const pickFile = async (
    fileOrFiles: File | File[]
  ) => {
    const processFile = async (file) => {
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
  
  const resendMedia = async (msg) => {
    console.log("RESEND MEDIA FUNCTION", msg);
    // STEP 1: mark UI uploading
    setMessages(prev =>
      prev.map(m =>
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
  
  const sendMedia = async ({
    message,
  } = {}) => {
    const mediaFiles =
      message?.files ?? files;
  
    const mediaCaption =
      message?.caption ?? caption;
  
    const replyTo =
      message?.reply_to ?? null;
  
    const mediaChatId =
      message?.chatId ?? chatId;
  
    if (
      !mediaChatId ||
      mediaFiles.length === 0
    ) {
      return;
    }
  
    const optimisticMedia =
      await Promise.all(
        mediaFiles.map(async (file) => ({
          url:
            file.preview ||
            URL.createObjectURL(file),
    
          type:
            file.type.startsWith("video/")
              ? "video"
              : "image",
    
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
  
      media_url: optimisticMedia.map(x => x.url),
  
      thumbnail: optimisticMedia
          .map(x => x.thumbnail)
          .filter(Boolean),
  
      duration: optimisticMedia
          .map(x => x.duration)
          .filter(Boolean),
  
      waveform: [],
  
      reply_to: replyTo?.id ?? null,
  
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