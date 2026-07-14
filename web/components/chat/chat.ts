// types/chat.ts

export interface ChatUser {
  id: number;
  username: string;
  avatar?: string;
  status?: string;
  last_seen?: string | null;
  is_message_blocked?: boolean;
  blocked_me?: boolean;
}