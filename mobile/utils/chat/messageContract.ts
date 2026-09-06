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
  | "sent"
  | "failed"
  | "delivered"
  | "seen";

export type MediaStatus =
  | "none"
  | "pending"
  | "uploading"
  | "uploaded"
  | "failed"
  | "paused";

export interface ReplyMessage {
  id?: number;
  client_id?: string;

  sender?: number;
  sender_info?: UserSummary;
  sender_username?: string;
  sender_avatar?: string | null;

  encrypted_text?: string;
  text?: string;
  caption?: string;

  media_type?: MessageType;

  media_url?: string[];
  thumbnail?: (string | null)[];

  duration?: number[];

  media_asset_ids?: string[];

  media_assets?: Array<{
    media_id?: string;
    original_url?: string | null;
    thumbnail_url?: string | null;
    media_type?: MessageType;
    duration?: number | null;
    width?: number;
    height?: number;
  }>;

  files?: LocalFile[];
  status?: MessageStatus;
  external_media_urls?: string[];

  is_deleted?: boolean;
  waveform?: number[];
}

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
  sender_username?: string;
  sender_avatar?: string | null;

  encrypted_text?: string;
  caption?: string;

  media_url?: string[];
  media_type?: MessageType;
  media_source?: MediaSource;

  thumbnail?: (string | null)[];
  duration?: number[];

  waveform?: number[];
  media_asset_ids?: string[];
  external_media_urls?: string[];

  status?: MessageStatus;
  media_status?: MediaStatus;

  upload_progress?: number;

  created_at?: string;
  updated_at?: string;

  reactions?: any[];

  hidden_for?: number[];

  is_deleted?: boolean;

  files?: LocalFile[];
  server_id?:number

  ownerId?:number
  client_sequence: number;
  
  deleted_by_admin?:boolean
  
  seen_by?:number[]
  
  delivered_to?:number[]
  
  client_created_at?:string;
  
  reply_to?: ReplyMessage | null;

  reply_to_id?: number | null;

  reply_to_client_id?: string;
  
  is_pinned?: boolean
  
  is_edited?: boolean
  edited_at?: string
  
  forwarded_from?: Message | null
  forwarded_from_id?: number | null;
  
  mentions?: UserSummary[];
  mention_user_ids?: number[];
  mention_all?: boolean;
  
  read_by?: number[]
}