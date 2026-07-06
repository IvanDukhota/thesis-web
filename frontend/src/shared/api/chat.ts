import { apiRequest } from "./client";
import { getAccessToken } from "../lib/token";

export type ChatMember = {
  id: string;
  user: number;
  user_email: string;
  user_full_name: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
  is_active: boolean;
  nickname: string;
  last_read_position: number;
};

export type Chat = {
  id: string;
  type: "direct" | "group";
  direct_key: string | null;
  title: string;
  description: string;
  avatar: string;
  created_by: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  unread_count?: number;
  is_new?: boolean;
  members?: ChatMember[];
};

export type MessageSender = {
  id: number;
  email: string;
  full_name: string;
};

export type ReplyToMessage = {
  id: string;
  position: number;
  sender: MessageSender;
  type: "text" | "image" | "file" | "video" | "system";
  text: string;
  attachments?: MessageAttachment[];
};

export type MessageAttachment = {
  id: string;
  type: "image" | "file" | "video";
  file_name: string;
  url: string;
  mime_type: string;
  size: number;
  width?: number | null;
  height?: number | null;
  duration_sec?: number | null;
  created_at: string;
};

export type ChatMessageDto = {
  id: string;
  chat: string;
  position: number;
  client_id: string | null;
  sender: MessageSender;
  type: "text" | "image" | "file" | "video" | "system";
  text: string;
  reply_to: ReplyToMessage | null;
  forwarded_from: ReplyToMessage | null;
  attachments: MessageAttachment[];
  is_deleted: boolean;
  sent_at: string;
  edited_at: string | null;
  translated_text?: string | null;
  translation_status?: "pending" | "ready";
};

export type ChatMessagesResponse = {
  chat: Chat;
  messages: ChatMessageDto[];
  has_more_older: boolean;
  has_more_newer: boolean;
  next_before_position: number | null;
  next_after_position: number | null;
  first_unread_position: number | null;
  my_last_read_position: number;
};

export type ContactWithoutChat = {
  id: number;
  email: string;
  full_name: string;
  avatar: string;
};

export async function getChats() {
  return apiRequest<Chat[]>("/chats/", {
    method: "GET",
    auth: true,
  });
}

export async function getChat(chatId: string) {
  return apiRequest<Chat>(`/chats/${chatId}/`, {
    method: "GET",
    auth: true,
  });
}

export async function getChatMessages(
  chatId: string,
  options?: {
    beforePosition?: number | null;
    afterPosition?: number | null;
    limit?: number;
    translate?: boolean;
  },
) {
  const params = new URLSearchParams({
    limit: String(options?.limit ?? 50),
  });

  if (options?.beforePosition) {
    params.set("before_position", String(options.beforePosition));
  }

  if (options?.afterPosition) {
    params.set("after_position", String(options.afterPosition));
  }

  if (options?.translate) {
    params.set("translate", "true");
  }

  return apiRequest<ChatMessagesResponse>(`/chats/${chatId}/?${params.toString()}`, {
    method: "GET",
    auth: true,
  });
}

export async function getContactsWithoutChats() {
  return apiRequest<ContactWithoutChat[]>("/users/contacts-without-chats/", {
    method: "GET",
    auth: true,
  });
}

export async function createGroupChat(params: {
  title: string;
  description?: string;
  avatar?: string;
  member_ids: number[];
}) {
  return apiRequest<Chat>("/chats/groups/create/", {
    method: "POST",
    auth: true,
    body: JSON.stringify(params),
  });
}

export async function sendMessage(
  chatId: string | null,
  recipientId: number | null,
  text: string,
  files: File[],
  clientId?: string,
  replyToId?: string,
  forwardedFromId?: string,
  onProgress?: (progress: number) => void
) {
  const formData = new FormData();

  if (text) {
    formData.append('text', text);
  }

  if (clientId) {
    formData.append('client_id', clientId);
  }

  if (recipientId) {
    formData.append('recipient_id', String(recipientId));
  }

  if (replyToId) {
    formData.append('reply_to_id', replyToId);
  }

  if (forwardedFromId) {
    formData.append('forwarded_from_id', forwardedFromId);
  }

  files.forEach((file) => {
    formData.append('files', file);
  });

  const url = chatId
    ? `/chats/${chatId}/messages/`
    : `/messages/direct/`;

  return new Promise<ChatMessageDto>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = (e.loaded / e.total) * 100;
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (error) {
          reject(new Error('Failed to parse response'));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.detail || 'Upload failed'));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    const token = getAccessToken();
    const baseUrl = import.meta.env.VITE_API_URL || '/api';

    xhr.open('POST', `${baseUrl}${url}`);

    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.send(formData);
  });
}

export async function requestTranslations(
  chatId: string,
  highPriority: string[],
  mediumPriority: string[],
  lowPriority: string[],
  forceRetranslate: boolean = false
) {
  return apiRequest('/translations/request/', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({
      chat_id: chatId,
      high_priority: highPriority,
      medium_priority: mediumPriority,
      low_priority: lowPriority,
      force_retranslate: forceRetranslate,
    }),
  });
}

export type ChatStats = {
  total_messages: number;
  total_images: number;
  total_videos: number;
  total_files: number;
};

export async function getChatStats(chatId: string) {
  return apiRequest<ChatStats>(`/chats/${chatId}/stats/`, {
    method: 'GET',
    auth: true,
  });
}

export async function deleteChat(chatId: string) {
  return apiRequest(`/chats/${chatId}/delete/`, {
    method: 'DELETE',
    auth: true,
  });
}

export type AIAssistantAction = 'generate' | 'business' | 'friendly';

export type AIAssistantRequest = {
  action: AIAssistantAction;
  text: string;
  context_messages?: Array<{ sender: string; text: string; sent_at: string }>;
};

export type AIAssistantResponse = {
  result: string;
};

export async function callAIAssistant(params: AIAssistantRequest) {
  const body: Record<string, unknown> = {
    action: params.action,
    text: params.text,
  };

  if (params.context_messages) {
    body.context_messages = params.context_messages;
  }

  return apiRequest<AIAssistantResponse>('/messages/assistant/', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(body),
  });
}
