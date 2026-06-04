import { useState } from 'react';

export function useMediaUpload({
  chatId,
  currentUser,
  socketRef,
  setMessages,
}: any) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');

  const pickFile = (f: File) => {
    setFile(f);
  };

  const sendMedia = async () => {
    if (!file || !chatId) return;

    const localId = crypto.randomUUID();

    const mediaType =
      file.type.startsWith('image') ? 'image'
      : file.type.startsWith('video') ? 'video'
      : file.type.startsWith('audio') ? 'audio'
      : 'gif';

    const preview = URL.createObjectURL(file);

    // ✅ 1. OPTIMISTIC MESSAGE (ALWAYS SAME SHAPE)
    const optimistic = {
      localId,
      chatId,
      senderId: currentUser.id,
      username: currentUser.username,

      text: caption,
      media_url: preview,
      media_type: mediaType,

      status: 'sending',
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimistic]);

    try {
      // upload to cloudinary
      const url = await uploadToCloudinary({
        file,
        folder: "Tribe/Chat",
      });

      // ✅ update UI with real URL
      setMessages(prev =>
        prev.map(m =>
          m.localId === localId
            ? {
                ...m,
                media_url: url,
                status: "sent",
              }
            : m
        )
      );

      // ✅ send socket (FINAL STEP)
      socketRef.current?.emit("send_message", {
        clientId: localId,
        chatId,
        encrypted_text: caption,
        media_url: url,
        media_type: mediaType,
      });

      setFile(null);
      setCaption('');

    } catch (err) {
      setMessages(prev =>
        prev.map(m =>
          m.localId === localId
            ? { ...m, status: "failed" }
            : m
        )
      );
    }
  };

  return {
    file,
    caption,
    setCaption,
    pickFile,
    sendMedia,
  };
}