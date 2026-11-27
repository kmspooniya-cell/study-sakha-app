export interface ChatChannelDef {
  id: string;
  name: string;
  desc: string;
  lockedWrite: boolean;
}

export interface ChatAttachment {
  name: string;
  size: string;
  pages?: number;
  uri?: string;
  mimeType?: string;
  kind?: 'image' | 'document';
}

export interface ChatReplyPreview {
  id: string;
  sender: string;
  text: string;
}

export interface ChatMessageReaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

export interface ChatMessagePoll {
  question: string;
  options: { id: string; label: string; votes: number }[];
  votedId: string | null;
}

export interface ChatMessageItem {
  id: string;
  createdAt?: string;
  sender: string;
  initials: string;
  role: string;
  time: string;
  pinned?: boolean;
  edited?: boolean;
  status?: 'sending' | 'sent' | 'failed';
  replyTo?: ChatReplyPreview;
  text: string;
  attachment?: ChatAttachment;
  poll?: ChatMessagePoll;
  reactions: ChatMessageReaction[];
  replies: number;
}
