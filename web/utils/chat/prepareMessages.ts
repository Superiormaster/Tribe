import type { Message } from "@/utils/chat/messageContract";
import { restoreFiles } from "@/utils/chat/restoreFiles";
import { isRenderableMessage } from "@/utils/chat/isRenderableMessage";
import { sortMessages } from "@/utils/chat/messageMerger";

export function prepareMessages(
  messages: Message[],
  currentUserId: number
): Message[] {
  return sortMessages(
    messages
      .map(message => ({
        ...message,
        files: restoreFiles(
          message.files || []
        ),
      }))
      .filter(isRenderableMessage),
    currentUserId
  );
}