'use client';

import { useState, useRef } from "react";
import { apiRequest } from "@/utils/api";
import { Send } from "lucide-react";

type ReplyTarget = {
  id: number | null;
  username?: string;
  type?: "reply" | "comment" | null;
};

interface CommentInputProps {
  postId: number;
  user: any;
  replyTarget?: ReplyTarget | null;
  onNewComment: (comment: any) => void;
  onReplaceComment?: (tempId: string, comment: any) => void;
  onRemoveComment?: (tempId: string) => void;
  onClearReply?: () => void;
  onCommentsCountChange?: (count: number) => void;
}

export default function CommentInput({
  postId,
  user,
  replyTarget,
  onNewComment,
  onReplaceComment,
  onRemoveComment,
  onClearReply,
  onCommentsCountChange,
}: CommentInputProps) {
  const {
    Alert,
    Pressable,
    Text,
    TextInput,
    View,
  } = require("react-native");

  const [text, setText] = useState("");
  const textareaRef = useRef<any>(null);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const message = text.trim();

    if (!message || sending) return;

    setSending(true);

    const clientId =
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`;

    const optimisticComment = {
      id: clientId,
      client_id: clientId,
      text: message,
      created_at: new Date().toISOString(),
      user,
      replies: [],
      likes_count: 0,
      is_liked: false,
      pending: true,
      parent: replyTarget?.id || null,
      root_parent_id:
        replyTarget?.id || null,

      reply_to_user: replyTarget?.username
        ? {
            username:
              replyTarget.username,
          }
        : null,
    };

    // Clear UI immediately
    setText("");
    onClearReply?.();

    // Show immediately
    onNewComment(optimisticComment);

    try {
      const res = await apiRequest(
        "api/comments/",
        {
          method: "POST",
          data: {
            post: Number(postId),
            text: message,
            parent:
              replyTarget?.id || null,
            client_id: clientId,
          },
        }
      );

      console.log(
        "comment input",
        res
      );

      /*
       * The socket can replace the optimistic
       * comment using client_id. Keep the
       * callback available for callers that
       * perform the replacement directly.
       */
      if (
        res &&
        onReplaceComment
      ) {
        onReplaceComment(
          clientId,
          res
        );
      }
    } catch (err) {
      console.error(err);

      // Remove temp comment if request failed
      onRemoveComment?.(clientId);

      Alert.alert(
        "Comment",
        "Failed to send comment."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <View className="w-full z-50">
      {replyTarget?.id && (
        <View className="mb-1 flex-row items-center">
          <Text className="text-xs text-gray-500">
            Replying to{" "}
            {replyTarget.username}
          </Text>

          <Pressable
            onPress={
              onClearReply
            }
            className="ml-2"
            hitSlop={8}
          >
            <Text className="text-xs text-red-500">
              cancel
            </Text>
          </Pressable>
        </View>
      )}

      <View className="flex-row gap-2 items-end">
        <TextInput
          ref={textareaRef}
          value={text}
          onChangeText={setText}
          placeholder={
            replyTarget?.id
              ? "Write a reply..."
              : "Write a comment..."
          }
          placeholderTextColor="#9ca3af"
          multiline
          textAlignVertical="top"
          editable={!sending}
          className="flex-1 rounded px-3 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800"
          style={{
            minHeight: 40,
            maxHeight: 120,
          }}
        />

        <Pressable
          disabled={
            sending ||
            !text.trim()
          }
          onPress={handleSend}
          className={`bg-indigo-600 text-white px-3 rounded items-center justify-center ${
            sending ||
            !text.trim()
              ? "opacity-50"
              : "opacity-100"
          }`}
          style={{
            minHeight: 40,
            minWidth: 44,
          }}
        >
          <Send
            size={20}
            color="#ffffff"
          />
        </Pressable>
      </View>
    </View>
  );
}