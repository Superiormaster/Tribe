// utils/chat/messageContract.ts

export type MessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "gif"
  | "sticker"
  | "gallery";

export type MessageStatus =
  | "pending"
  | "sending"
  | "uploading"
  | "sent"
  | "failed"
  | "delivered"
  | "seen";

export interface MessageMedia {
  url: string;
  thumbnail?: string | null;
  duration?: number | null;
  width?: number;
  height?: number;
}

export interface LocalFile {
  blob?: Blob;
  name: string;
  type: string;
  size: number;
  media_url?: string;
  thumbnail?: string;
  duration?: number;
}

export type MediaSource =
  | "upload"
  | "forward"
  | "external";

type UserRole = "owner" | "admin" | "moderator" | "member";

export interface UserSummary {
  id: number;
  username: string;
  avatar?: string;
  role: UserRole;
}

export interface Message {

  // ids
  community?: number;
  communityId?: number;
  client_id: string;
  id?: number;

  chat?: number;

  sender: number;
  sender_info?: UserSummary;

  encrypted_text?: string;
  caption?: string;

  media_url?: string[];
  media_type?: MessageType;
  media_source?: MediaSource;

  thumbnail?: (string | null)[];
  duration?: number[];

  waveform?: number[];

  status?: MessageStatus;

  upload_progress?: number;

  created_at?: string;
  updated_at?: string;

  reactions?: any[];

  hidden_for?: number[];

  is_deleted?: boolean;

  files?: LocalFile[];
  server_id?:number

  ownerId?:number
  
  deleted_by_admin?:boolean
  
  seen_by?:number[]
  
  delivered_to?:number[]
  
  reply_to?: Message|null
  
  is_pinned?: boolean
  
  is_edited?: boolean
  edited_at?: string
  
  forwarded_from?: Message | null
  
  mentions?: UserSummary
  
  read_by?: number[]
}