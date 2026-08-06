export type ContactStatus =
  | "new"
  | "read"
  | "replied"
  | "closed";

export interface ContactReply {
  id: number;
  message: string;
  sent_by_name: string;
  created_at: string;
}

export interface ContactMessage {
  id: number;

  name: string;

  email: string;

  subject: string;

  message: string;

  status: ContactStatus;

  admin_note: string;

  created_at: string;

  updated_at: string;
  replies?: ContactReply[];
}


export interface ContactResponse {
  count: number;

  next: string | null;

  previous: string | null;

  results: ContactMessage[];
}