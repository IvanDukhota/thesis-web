import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { getMe, type User } from "../../shared/api/auth";
import {
  getChats,
  getChat,
  getChatMessages,
  getContactsWithoutChats,
  createGroupChat,
  sendMessage,
  requestTranslations,
  type Chat,
  type ChatMessageDto,
  type ContactWithoutChat,
  type MessageAttachment
} from "../../shared/api/chat";
import { deleteMessage, editMessage } from "../../shared/api/messages";
import { appWebSocketClient, type AppSocketEvent } from "../../shared/realtime/ws-client";
import { useRealtime } from "../../providers/RealtimeProvider";
import CreateGroupChatModal from "./CreateGroupChatModal";
import ImageModal from "./ImageModal";
import MessageContextMenu from "./MessageContextMenu";
import ChatProfileModal from "./ChatProfileModal";
import ForwardMessageModal from "./ForwardMessageModal";
import AlertModal from "../../shared/ui/AlertModal";
import { layoutImages } from "./imageLayout";
import "./chats.css";

const PAGE_SIZE = 50;
const SCROLL_LOAD_THRESHOLD_PX = 320;
const READ_DEBOUNCE_MS = 500;
const SCROLL_TO_BOTTOM_THRESHOLD_PX = 300;

type LocalMessageStatus = "sending" | "confirmed" | "read";

export type LocalMessage = ChatMessageDto & {
  localStatus: LocalMessageStatus;
  isOptimistic?: boolean;
};

type ChatNotificationEvent = AppSocketEvent & {
  chat?: Chat;
  message_sent_at?: string;
};

function makeOptimisticMessage(params: {
  clientId: string;
  chatId: string;
  text: string;
  me: User;
}): LocalMessage {
  return {
    id: `local-${params.clientId}`,
    chat: params.chatId,
    position: 0,
    client_id: params.clientId,
    sender: {
      id: params.me.id,
      email: params.me.email,
      full_name: params.me.full_name,
    },
    type: "text",
    text: params.text,
    reply_to: null,
    forwarded_from: null,
    attachments: [],
    is_deleted: false,
    sent_at: new Date().toISOString(),
    edited_at: null,
    localStatus: "sending",
    isOptimistic: true,
  };
}

function toLocalMessages(
  messages: ChatMessageDto[],
  meId: number,
  recipientReadPosition: number,
): LocalMessage[] {
  return messages.map((message) => ({
    ...message,
    localStatus:
      message.sender.id === meId && message.position <= recipientReadPosition
        ? "read"
        : "confirmed",
  }));
}

// Обрабатывает входящее сообщение, обновляя статус оптимистичного сообщения или добавляя новое в список
function mergeMessage(prev: LocalMessage[], incoming: ChatMessageDto): LocalMessage[] {
  const index = prev.findIndex((message) => {
    if (incoming.client_id && message.client_id === incoming.client_id) return true;
    if (message.id === incoming.id) return true;
    return false;
  });

  const nextMessage: LocalMessage = {
    ...incoming,
    localStatus: "confirmed",
    isOptimistic: false,
  };

  if (index === -1) {
    return [...prev, nextMessage];
  }

  const copy = [...prev];
  copy[index] = {
    ...nextMessage,
    localStatus: copy[index].localStatus === "read" ? "read" : "confirmed",
  };

  return copy;
}

export default function ChatsPage() {
  const { activeChatId, setActiveChatId } = useRealtime();

  const [me, setMe] = useState<User | null>(null);
  const [contactsWithoutChats, setContactsWithoutChats] = useState<ContactWithoutChat[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeRecipientId, setActiveRecipientId] = useState<number | null>(null);
  const [activeChatData, setActiveChatData] = useState<Chat | null>(null);

  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [olderLoading, setOlderLoading] = useState(false);
  const [newerLoading, setNewerLoading] = useState(false);

  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [hasMoreNewer, setHasMoreNewer] = useState(false);
  const [nextBeforePosition, setNextBeforePosition] = useState<number | null>(null);
  const [nextAfterPosition, setNextAfterPosition] = useState<number | null>(null);
  const [myLastReadPosition, setMyLastReadPosition] = useState(0);
  const [recipientLastReadPosition, setRecipientLastReadPosition] = useState(0);
  const [unreadDividerPosition, setUnreadDividerPosition] = useState<number | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [floatingDateText, setFloatingDateText] = useState<string | null>(null);
  const [floatingDateFadeOut, setFloatingDateFadeOut] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [currentImageId, setCurrentImageId] = useState<string>("");

  const [isChatProfileModalOpen, setIsChatProfileModalOpen] = useState(false);

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: "danger" | "warning" | "info" | "success";
  }>({
    isOpen: false,
    title: "",
    message: "",
  });

  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(() => {
    const saved = localStorage.getItem('autoTranslateEnabled');
    return saved ? JSON.parse(saved) : false;
  });

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    message: LocalMessage;
    targetType: 'text' | 'image' | 'file' | 'video' | 'bubble';
    targetAttachment?: MessageAttachment;
    messageRect?: DOMRect;
  } | null>(null);

  const [editingMessage, setEditingMessage] = useState<LocalMessage | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<LocalMessage | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<LocalMessage | null>(null);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const floatingDateTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const scrollModeRef = useRef<"bottom" | "unread" | null>(null);
  const readDebounceTimerRef = useRef<number | null>(null);
  const plannedReadPositionRef = useRef(0);
  const myLastReadPositionRef = useRef(0);
  const activeChatIdRef = useRef<string | null>(null);
  const savedScrollPositionRef = useRef<number | null>(null);
  const shouldPreventReadRef = useRef(false);

  // Синхронизирует рефы с состоянием для использования в коллбеках и эффектах, не зависящих от этих состояний
  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    myLastReadPositionRef.current = myLastReadPosition;
  }, [myLastReadPosition]);

  useEffect(() => {
    localStorage.setItem('autoTranslateEnabled', JSON.stringify(autoTranslateEnabled));
  }, [autoTranslateEnabled]);

  // Вычисляет позицию первого непрочитанного сообщения после myLastReadPosition
  const firstUnreadPosition = useMemo(() => {
    const firstUnread = messages.find(
      (msg) => msg.position > myLastReadPosition && msg.sender.id !== me?.id
    );
    return firstUnread?.position ?? null;
  }, [messages, myLastReadPosition, me]);

  // Вычисляет количество непрочитанных сообщений в активном чате
  const activeChat = chats.find((chat) => chat.id === activeChatId);
  const unreadCount = activeChat?.unread_count ?? 0;

  // Собирает все картинки из всех сообщений для навигации в модальном окне
  const allImages = useMemo(() => {
    const images: { url: string; name: string; id: string }[] = [];
    messages.forEach((msg) => {
      msg.attachments.forEach((att) => {
        if (att.type === 'image') {
          images.push({
            url: att.url,
            name: att.file_name,
            id: att.id,
          });
        }
      });
    });
    return images;
  }, [messages]);

  // Сбрасывает позицию плашки "Новые сообщения", если все сообщения стали прочитанными
  useEffect(() => {
    if (firstUnreadPosition === null) {
      setUnreadDividerPosition(null);
    }
  }, [firstUnreadPosition]);

  // Загружает данные о текущем пользователе, списки чатов и контактов при монтировании страницы, 
  // устанавливая флаг загрузки и обрабатывая ошибки
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [meData, chatsData, contactsData] = await Promise.all([
          getMe(),
          getChats(),
          getContactsWithoutChats(),
        ]);

        setMe(meData);
        setChats(chatsData);
        setContactsWithoutChats(contactsData);
      } finally {
        setLoading(false);
      }
    };

    void loadInitialData();
  }, []);

  // Планирует отправку read-уведомления с позицией последнего видимого непрочитанного сообщения,
  // используя дебаунс для оптимизации количества отправляемых уведомлений при быстром скролле
  const scheduleRead = (position: number) => {
    const currentChatId = activeChatIdRef.current;

    if (!currentChatId) return;
    if (position <= myLastReadPositionRef.current) return;

    plannedReadPositionRef.current = Math.max(plannedReadPositionRef.current, position);

    if (readDebounceTimerRef.current) {
      window.clearTimeout(readDebounceTimerRef.current);
    }

    readDebounceTimerRef.current = window.setTimeout(() => {
      const positionToSend = plannedReadPositionRef.current;
      const chatId = activeChatIdRef.current;

      if (!chatId) return;
      if (positionToSend <= myLastReadPositionRef.current) return;

      appWebSocketClient.markMessagesRead(chatId, positionToSend);
      setMyLastReadPosition(positionToSend);
    }, READ_DEBOUNCE_MS);
  };

  // Подписывается на события из WebSocket, обрабатывая открытие чата, получение новых сообщений, 
  // обновление статуса прочтения и уведомления о новых сообщениях, обновляя состояние чатов, 
  // сообщений и позиций прочтения в зависимости от типа события
  useEffect(() => {
    const unsubscribe = appWebSocketClient.onEvent((event: AppSocketEvent) => {
      if (!me) return;

      // Под вопросом
      if (event.type === "chat.opened") {
        const chatId = event.chat_id ? String(event.chat_id) : null;

        // Если чат не существует (новый direct чат), просто показываем пустой UI
        if (!chatId || !event.exists) {
          // Интерфейс уже открыт через openChatByContact
          return;
        }

        // Если чат уже открыт, ничего не делаем
        if (activeChatIdRef.current === chatId) return;

        // Открываем существующий чат и загружаем его историю
        void openChat(chatId);
        return;
      }

      if (event.type === "message.created") {
        const incomingChatId = String(event.chat_id);
        const payload = event.payload as ChatMessageDto;

        if (activeChatIdRef.current && incomingChatId !== activeChatIdRef.current) {
          return;
        }

        const isNewChat = activeChatIdRef.current === null;

        setActiveChatId(incomingChatId);

        const isSentByMe = payload.sender.id === me.id;

        if (!isSentByMe) {
          const container = messagesContainerRef.current;
          if (container) {
            savedScrollPositionRef.current = container.scrollTop;
            shouldPreventReadRef.current = true;
          }
        }

        setMessages((prev) => mergeMessage(prev, payload));

        if (isSentByMe) {
          scrollModeRef.current = "bottom";
        }

        if (isNewChat) {
          void getChat(incomingChatId).then((newChat) => {
            setChats((prev) => {
              if (prev.some((c) => c.id === newChat.id)) return prev;
              return [{ ...newChat, updated_at: payload.sent_at }, ...prev].sort(
                (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
              );
            });
            void getContactsWithoutChats().then(setContactsWithoutChats);
          });
        } else {
          setChats((prev) => {
            const updated = prev.map((chat) =>
              chat.id === incomingChatId ? { ...chat, updated_at: payload.sent_at } : chat,
            );
            return updated.sort(
              (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );
          });
        }

        return;
      }

      if (event.type === "message.deleted") {
        const messageId = String(event.message_id);

        // Удаляем сообщение из списка
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));

        return;
      }

      if (event.type === "message.edited") {
        const payload = event.payload as ChatMessageDto;

        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === payload.id) {
              return {
                ...msg,
                text: payload.text,
                edited_at: payload.edited_at,
              };
            }
            return msg;
          })
        );
        return;
      }

      if (event.type === "message.read") {
        const chatId = String(event.chat_id);

        if (chatId !== activeChatIdRef.current) return;

        const userId = Number(event.user_id);
        const lastReadPosition = Number(event.last_read_position);
        const unreadCount = Number(event.unread_count ?? 0);

        // Если сообщение прочитано мной - обновляем unread_count
        if (userId === me.id) {
          setChats((prev) =>
            prev.map((chat) =>
              chat.id === chatId
                ? { ...chat, unread_count: unreadCount }
                : chat
            )
          );

          return;
        }

        setRecipientLastReadPosition(lastReadPosition);

        setMessages((prev) =>
          prev.map((message) => {
            if (message.sender.id !== me.id) return message;
            if (message.position > lastReadPosition) return message;

            return {
              ...message,
              localStatus: "read",
            };
          }),
        );

        return;
      }

      if (event.type === "notification.new_message") {
        const notification = event as ChatNotificationEvent;
        const incomingChatId = String(notification.chat_id || "");
        const chat = notification.chat;

        if (chat) {
          setChats((prev) => {
            const exists = prev.some((item) => item.id === chat.id);

            const updated = exists
              ? prev.map((item) =>
                item.id === chat.id
                  ? {
                    ...item,
                    updated_at: notification.message_sent_at || chat.updated_at,
                    unread_count: chat.unread_count,
                    is_new: chat.is_new,
                  }
                  : item,
              )
              : [
                {
                  ...chat,
                  updated_at: notification.message_sent_at || chat.updated_at,
                },
                ...prev,
              ];

            return updated.sort(
              (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );
          });
        }

        if (incomingChatId === activeChatIdRef.current) {
          return;
        }

        return;
      }

      if (event.type === "chat.deleted") {
        const deletedChatId = String(event.chat_id);

        // Получаем название чата перед удалением
        const deletedChat = chats.find((chat) => chat.id === deletedChatId);
        const chatTitle = deletedChat?.title || "Чат";

        // Удаляем чат из списка
        setChats((prev) => prev.filter((chat) => chat.id !== deletedChatId));

        // Если удаленный чат был открыт, закрываем его
        if (activeChatIdRef.current === deletedChatId) {
          setActiveChatId(null);
          setActiveRecipientId(null);
          setActiveChatData(null);
          setMessages([]);

          setAlertModal({
            isOpen: true,
            title: "Чат удален",
            message: `Чат "${chatTitle}" был удален.`,
            variant: "warning",
          });
        }

        return;
      }

      if (event.type === "translation.ready") {
        const { message_id, translated_text } = event;

        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === message_id) {
              return {
                ...msg,
                translated_text: translated_text as string,
                translation_status: "ready" as const,
              };
            }
            return msg;
          })
        );

        return;
      }
    });

    return () => unsubscribe();
  }, [me]);


  // Закрывает WebSocket соединение при размонтировании страницы, сбрасывает активный чат и очищает таймеры
  useEffect(() => {
    return () => {
      appWebSocketClient.closeActiveChat();
      setActiveChatId(null);

      if (readDebounceTimerRef.current) {
        window.clearTimeout(readDebounceTimerRef.current);
      }

      if (floatingDateTimerRef.current) {
        window.clearTimeout(floatingDateTimerRef.current);
      }
    };
  }, []);

  // Управляет скроллом при загрузке сообщений и изменении их количества
  useEffect(() => {
    const container = messagesContainerRef.current;

    if (!container) return;

    if (scrollModeRef.current === "unread" && firstUnreadPosition !== null) {
      const divider = container.querySelector<HTMLElement>('[data-unread-divider="true"]');

      if (divider) {
        const targetScrollTop = divider.offsetTop;
        container.scrollTop = Math.max(0, targetScrollTop);
      } else {
        container.scrollTop = container.scrollHeight;
      }

      scrollModeRef.current = null;
      setUnreadDividerPosition(firstUnreadPosition);
      return;
    }

    if (scrollModeRef.current === "bottom") {
      container.scrollTop = container.scrollHeight;
      scrollModeRef.current = null;
      savedScrollPositionRef.current = null;
      return;
    }

    if (savedScrollPositionRef.current !== null) {
      container.scrollTop = savedScrollPositionRef.current;
      savedScrollPositionRef.current = null;

      setTimeout(() => {
        shouldPreventReadRef.current = false;
      }, 100);
    }
  }, [messages, firstUnreadPosition]);

  // Использует IntersectionObserver для отслеживания видимых сообщений
  // и планирует отправку read-уведомлений при появлении новых непрочитанных сообщений в зоне видимости
  useEffect(() => {
    const container = messagesContainerRef.current;

    if (!container || !me || !activeChatId) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (shouldPreventReadRef.current || contextMenu) return;

        let maxVisiblePosition = myLastReadPositionRef.current;

        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const element = entry.target as HTMLElement;
          const position = Number(element.dataset.position);
          const senderId = Number(element.dataset.senderId);

          if (!position) return;
          if (senderId === me.id) return;

          if (position > maxVisiblePosition) {
            maxVisiblePosition = position;
          }
        });

        if (maxVisiblePosition > myLastReadPositionRef.current) {
          scheduleRead(maxVisiblePosition);
        }
      },
      {
        root: container,
        threshold: 0.65,
      },
    );

    const nodes = container.querySelectorAll<HTMLElement>("[data-position]");
    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [messages, me, activeChatId, contextMenu]);

  // Блокирует скролл колесиком мыши при открытом контекстном меню
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (contextMenu) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [contextMenu]);

  // Управляет видимостью и позицией плашки "Новые сообщения" при скролле,
  // динамически перемещая её на первое непрочитанное сообщение при скролле вверх и скрывая при скролле вниз
  useEffect(() => {
    const container = messagesContainerRef.current;

    if (!container || !unreadDividerPosition || contextMenu) return;

    const dividerObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            const divider = entry.target as HTMLElement;
            const dividerRect = divider.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            // Плашка ушла вверх (скролл вниз)
            if (dividerRect.bottom < containerRect.top) {
              if (firstUnreadPosition === null) {
                setUnreadDividerPosition(null);
              } else {
                setUnreadDividerPosition(null);
              }
              return;
            }

            // Плашка ушла вниз (скролл вверх)
            if (dividerRect.top > containerRect.bottom) {
              if (firstUnreadPosition === null) {
                setUnreadDividerPosition(null);
              } else {
                setUnreadDividerPosition(firstUnreadPosition);
              }
            }
          }
        });
      },
      {
        root: container,
        threshold: 0,
      }
    );

    const divider = container.querySelector<HTMLElement>('[data-unread-divider="true"]');
    if (divider) {
      dividerObserver.observe(divider);
    }

    return () => dividerObserver.disconnect();
  }, [messages, unreadDividerPosition, firstUnreadPosition, contextMenu]);


  // Загружает более старые сообщения при скролле вверх
  const loadOlderMessages = async () => {
    if (!activeChatId || !hasMoreOlder || !nextBeforePosition || olderLoading) return;

    setOlderLoading(true);

    try {
      const response = await getChatMessages(activeChatId, {
        beforePosition: nextBeforePosition,
        limit: PAGE_SIZE,
        translate: autoTranslateEnabled,
      });

      setMessages((prev) => {
        const existingIds = new Set(prev.map((message) => message.id));
        const olderMessages = toLocalMessages(
          response.messages,
          me?.id ?? 0,
          recipientLastReadPosition,
        ).filter((message) => !existingIds.has(message.id));

        return [...olderMessages, ...prev];
      });

      setHasMoreOlder(response.has_more_older);
      setNextBeforePosition(response.next_before_position);
    } finally {
      setOlderLoading(false);
    }
  };

  // Загружает более новые сообщения при скролле вниз, не изменяя позицию скролла
  const loadNewerMessages = async () => {
    if (!activeChatId || !hasMoreNewer || !nextAfterPosition || newerLoading) return;

    setNewerLoading(true);

    try {
      const response = await getChatMessages(activeChatId, {
        afterPosition: nextAfterPosition,
        limit: PAGE_SIZE,
        translate: autoTranslateEnabled,
      });

      setMessages((prev) => {
        const existingIds = new Set(prev.map((message) => message.id));
        const newerMessages = toLocalMessages(
          response.messages,
          me?.id ?? 0,
          recipientLastReadPosition,
        ).filter((message) => !existingIds.has(message.id));

        return [...prev, ...newerMessages];
      });

      setHasMoreNewer(response.has_more_newer);
      setNextAfterPosition(response.next_after_position);
    } finally {
      setNewerLoading(false);
    }
  };

  // Обрабатывает скролл в контейнере сообщений для загрузки старых/новых сообщений и управления видимостью плашки "Прокрутить вниз"
  const handleMessagesScroll = () => {
    // Блокируем обработку скролла если открыто контекстное меню
    if (contextMenu) {
      return;
    }

    const container = messagesContainerRef.current;

    if (!container || messages.length === 0) return;

    if (container.scrollTop <= SCROLL_LOAD_THRESHOLD_PX) {
      void loadOlderMessages();
    }

    const distanceToBottom =
      container.scrollHeight - container.clientHeight - container.scrollTop;

    if (distanceToBottom <= SCROLL_LOAD_THRESHOLD_PX) {
      void loadNewerMessages();
    }

    setShowScrollToBottom(distanceToBottom > SCROLL_TO_BOTTOM_THRESHOLD_PX);

    // Показываем плашку только если первое непрочитанное сообщение находится ниже видимой области
    if (!unreadDividerPosition && firstUnreadPosition !== null) {
      const firstUnreadMessage = container.querySelector<HTMLElement>(
        `[data-position="${firstUnreadPosition}"]`
      );

      if (firstUnreadMessage) {
        const distanceFromViewportTop = firstUnreadMessage.offsetTop - container.scrollTop;
        const isMessageBelowViewport = distanceFromViewportTop > container.clientHeight * 1.1;

        if (isMessageBelowViewport) {
          setUnreadDividerPosition(firstUnreadPosition);
        }
      }
    }

    // Логика плавающей плашки с датой
    const dateDividers = container.querySelectorAll<HTMLElement>('.chat-date-divider:not(.chat-date-divider--floating)');
    let isAnyDateVisible = false;

    dateDividers.forEach((divider) => {
      const rect = divider.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      if (
        rect.top >= containerRect.top - 10 &&
        rect.bottom <= containerRect.bottom + 10
      ) {
        isAnyDateVisible = true;
      }
    });


    // Если стандартная плашка попала на экран, убираем плавающую мгновенно
    if (isAnyDateVisible && floatingDateText) {
      if (floatingDateTimerRef.current) {
        window.clearTimeout(floatingDateTimerRef.current);
      }
      setFloatingDateText(null);
      setFloatingDateFadeOut(false);
      return;
    }

    if (!isAnyDateVisible && messages.length > 0) {
      // Находим первое видимое сообщение
      const messageElements = container.querySelectorAll<HTMLElement>('[data-position]');
      let firstVisibleMessage: HTMLElement | null = null;

      for (const msgEl of Array.from(messageElements)) {
        const rect = msgEl.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        if (rect.top < containerRect.bottom && rect.bottom > containerRect.top) {
          firstVisibleMessage = msgEl;
          break;
        }
      }

      if (firstVisibleMessage) {
        const position = Number(firstVisibleMessage.dataset.position);
        const message = messages.find((m) => m.position === position);

        if (message) {
          const dateText = formatDate(message.sent_at);
          setFloatingDateText(dateText);
          setFloatingDateFadeOut(false);

          // Перезапускаем таймер
          if (floatingDateTimerRef.current) {
            window.clearTimeout(floatingDateTimerRef.current);
          }

          floatingDateTimerRef.current = window.setTimeout(() => {
            setFloatingDateFadeOut(true);
          }, 1000);
        }
      }
    }
  };

  const openChat = async (chatId: string) => {
    activeChatIdRef.current = chatId;
    setActiveChatId(chatId);
    setActiveRecipientId(null);
    setActiveChatData(null);
    setMessages([]);
    setChatLoading(true);

    setOlderLoading(false);
    setNewerLoading(false);
    setHasMoreOlder(false);
    setHasMoreNewer(false);
    setNextBeforePosition(null);
    setNextAfterPosition(null);
    setMyLastReadPosition(0);
    myLastReadPositionRef.current = 0;
    setRecipientLastReadPosition(0);
    setUnreadDividerPosition(null);
    setShowScrollToBottom(false);
    savedScrollPositionRef.current = null;

    // Сброс режима редактирования при открытии нового чата
    setEditingMessage(null);
    setReplyingToMessage(null);
    setForwardingMessage(null);
    setMessageText("");

    // Remove is_new flag when opening chat
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId ? { ...chat, is_new: false } : chat
      )
    );

    try {
      const chatData = await getChatMessages(chatId, {
        limit: PAGE_SIZE,
        translate: autoTranslateEnabled,
      });

      // Сохраняем полную информацию о чате с members
      setActiveChatData(chatData.chat);

      let recipientReadPos = 0;
      if (chatData.chat.members) {
        if (chatData.chat.type === "direct") {
          const recipientMember = chatData.chat.members.find(
            (member) => member.user !== me?.id
          );

          recipientReadPos = recipientMember?.last_read_position ?? 0;
        }

        if (chatData.chat.type === "group") {
          recipientReadPos = Math.max(
            0,
            ...chatData.chat.members
              .filter((member) => member.user !== me?.id)
              .map((member) => member.last_read_position)
          );
        }
      }

      setMessages(
        toLocalMessages(
          chatData.messages,
          me?.id ?? 0,
          recipientReadPos,
        ),
      );
      setHasMoreOlder(chatData.has_more_older);
      setHasMoreNewer(chatData.has_more_newer);
      setNextBeforePosition(chatData.next_before_position);
      setNextAfterPosition(chatData.next_after_position);
      setMyLastReadPosition(chatData.my_last_read_position);
      setRecipientLastReadPosition(recipientReadPos);

      const lastPosition =
        chatData.messages[chatData.messages.length - 1]?.position ?? 0;

      const firstUnreadPosition =
        chatData.my_last_read_position < lastPosition
          ? chatData.my_last_read_position + 1
          : null;

      setUnreadDividerPosition(firstUnreadPosition);

      scrollModeRef.current = firstUnreadPosition ? "unread" : "bottom";

      appWebSocketClient.openChat(chatId);
    } finally {
      setChatLoading(false);
    }
  };

  const openChatByContact = async (contact: ContactWithoutChat) => {
    activeChatIdRef.current = null;
    setActiveChatId(null);
    setActiveRecipientId(contact.id);
    setActiveChatData(null);
    setMessages([]);
    setChatLoading(false);

    setOlderLoading(false);
    setNewerLoading(false);
    setHasMoreOlder(false);
    setHasMoreNewer(false);
    setNextBeforePosition(null);
    setNextAfterPosition(null);
    setMyLastReadPosition(0);
    setRecipientLastReadPosition(0);
    setUnreadDividerPosition(null);
    setShowScrollToBottom(false);
    savedScrollPositionRef.current = null;

    // Сброс режима редактирования при открытии нового чата
    setEditingMessage(null);
    setReplyingToMessage(null);
    setForwardingMessage(null);
    setMessageText("");

    scrollModeRef.current = "bottom";

    appWebSocketClient.openDirectChat(contact.id);
  };

  const handleForwardToChat = async (targetChatId: string) => {
    if (!forwardingMessage) return;

    // Открываем целевой чат
    await openChat(targetChatId);

    // Устанавливаем состояние пересылки (для отображения превью)
    setForwardingMessage(forwardingMessage);
    setIsForwardModalOpen(false);

    // Фокусируем инпут для добавления комментария
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('.chat-main__input');
      if (input) input.focus();
    }, 100);
  };

  const cancelForward = () => {
    setForwardingMessage(null);
    setMessageText("");
  };

  const handleSendMessage = async () => {
    const text = messageText.trim();

    // Если мы в режиме редактирования
    if (editingMessage) {
      if (!text || !me) return;
      try {
        const updatedMessage = await editMessage(editingMessage.id, text);

        // Обновляем сообщение в локальном состоянии
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === editingMessage.id) {
              return {
                ...msg,
                text: updatedMessage.text,
                edited_at: updatedMessage.edited_at,
              };
            }
            return msg;
          })
        );

        setMessageText("");
        setEditingMessage(null);
      } catch (error) {
        console.error('Failed to edit message:', error);
        alert('Ошибка при редактировании сообщения');
      }
      return;
    }

    // Если мы в режиме пересылки
    if (forwardingMessage) {
      if (!me) return;

      const chatId = activeChatId;
      const recipientId = !activeChatId ? activeRecipientId : null;

      setIsUploading(true);
      scrollModeRef.current = "bottom";

      try {
        // Отправляем пересланное сообщение без текста комментария
        await sendMessage(
          chatId,
          recipientId,
          '',
          [],
          crypto.randomUUID(),
          undefined,
          forwardingMessage.id,
          () => {}
        );

        // Если есть комментарий, отправляем его отдельным сообщением
        if (text) {
          await sendMessage(
            chatId,
            recipientId,
            text,
            [],
            crypto.randomUUID(),
            undefined,
            undefined,
            () => {}
          );
        }

        setMessageText("");
        setForwardingMessage(null);
      } catch (error) {
        console.error('Failed to forward message:', error);
        alert('Ошибка при пересылке сообщения');
      } finally {
        setIsUploading(false);
      }
      return;
    }

    if ((!text && selectedFiles.length === 0) || !me) return;

    const clientId = crypto.randomUUID();

    const chatId = activeChatId;
    const recipientId = !activeChatId ? activeRecipientId : null;

    if (selectedFiles.length === 0) {
      setMessages((prev) => [
        ...prev,
        makeOptimisticMessage({
          clientId,
          chatId: chatId || `pending-${recipientId}`,
          text,
          me,
        }),
      ]);
    } else {
      setIsUploading(true);
      setUploadProgress(0);
    }

    scrollModeRef.current = "bottom";

    try {
      await sendMessage(
        chatId,
        recipientId,
        text,
        selectedFiles,
        clientId,
        replyingToMessage?.id,
        undefined,
        (progress) => {
          if (selectedFiles.length > 0) {
            setUploadProgress(progress);
          }
        }
      );

      setMessageText("");
      setSelectedFiles([]);
      setUploadProgress(0);
      setReplyingToMessage(null);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Ошибка при отправке сообщения');

      if (selectedFiles.length === 0) {
        setMessages((prev) => prev.filter(m => m.client_id !== clientId));
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (files) {
      const filesArray = Array.from(files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }

    // Сбрасываем input, чтобы можно было выбрать тот же файл снова
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAutoTranslateToggle = async (enabled: boolean) => {
    if (!enabled || !activeChatId || messages.length === 0 || !me) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    const viewportTop = container.scrollTop;
    const viewportBottom = viewportTop + container.clientHeight;

    const high: string[] = [];
    const medium: string[] = [];
    const low: string[] = [];

    messages.forEach((msg) => {
      // Skip own messages
      if (msg.sender.id === me.id) return;

      // Skip if translation already ready
      if (msg.translation_status === 'ready') return;

      const element = document.querySelector(`[data-position="${msg.position}"]`);
      if (!element) {
        low.push(msg.id);
        return;
      }

      const rect = element.getBoundingClientRect();
      const msgTop = rect.top + viewportTop - container.getBoundingClientRect().top;
      const msgBottom = msgTop + rect.height;

      // Visible in viewport → high
      if (msgBottom >= viewportTop && msgTop <= viewportBottom) {
        high.push(msg.id);
      }
      // Near viewport (within 500px) → medium
      else if (
        (msgTop >= viewportTop - 500 && msgTop <= viewportBottom + 500) ||
        (msgBottom >= viewportTop - 500 && msgBottom <= viewportBottom + 500)
      ) {
        medium.push(msg.id);
      }
      // Far from viewport → low
      else {
        low.push(msg.id);
      }
    });

    if (high.length > 0 || medium.length > 0 || low.length > 0) {
      try {
        await requestTranslations(activeChatId, high, medium, low);

        // Mark messages as pending
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.sender.id === me.id) return msg;
            if (msg.translation_status === 'ready') return msg;
            if (high.includes(msg.id) || medium.includes(msg.id) || low.includes(msg.id)) {
              return {
                ...msg,
                translation_status: 'pending',
              };
            }
            return msg;
          })
        );
      } catch (error) {
        console.error('Failed to request translations:', error);
      }
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const getFilePreview = (file: File) => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.startsWith('video/')) return '🎥';
    if (file.type.startsWith('audio/')) return '🎵';
    if (file.type.includes('pdf')) return '📄';
    return '📎';
  };

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const divider = unreadDividerPosition
      ? container.querySelector<HTMLElement>('[data-unread-divider="true"]')
      : null;

    const isDividerVisible = (() => {
      if (!divider) return false;

      const dividerRect = divider.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      return (
        containerRect.top - dividerRect.top <= 0.5 &&
        dividerRect.bottom - containerRect.bottom <= 0.5
      );
    })();

    // Если плашки нет или она уже видна — скроллим в самый низ
    if (!unreadDividerPosition || isDividerVisible) {
      container.scrollTop = container.scrollHeight;
      return;
    }

    // Если плашка существует, но находится вне зоны видимости — скроллим к ней
    if (divider) {
      container.scrollTop = Math.max(0, divider.offsetTop);
      return;
    }

    container.scrollTop = container.scrollHeight;
  };

  const scrollToMessage = async (messageId: string, replyToPosition?: number) => {
    const container = messagesContainerRef.current;
    if (!container) return;

    let messageElement = container.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`);

    // Если сообщение не найдено и у нас есть позиция, загружаем недостающие сообщения
    if (!messageElement && replyToPosition && activeChatId) {
      const firstMessage = messages[0];
      if (!firstMessage || replyToPosition < firstMessage.position) {
        // Показываем индикатор загрузки
        setOlderLoading(true);

        try {
          // Загружаем сообщения от (replyToPosition - 10) до первого существующего
          const startPosition = Math.max(1, replyToPosition - 10);
          const endPosition = firstMessage ? firstMessage.position : replyToPosition + 50;

          const response = await getChatMessages(activeChatId, {
            afterPosition: startPosition - 1,
            beforePosition: endPosition,
            limit: endPosition - startPosition + 1,
            translate: autoTranslateEnabled,
          });

          // Добавляем загруженные сообщения в начало списка
          setMessages((prev) => {
            const existingIds = new Set(prev.map((message) => message.id));
            const newMessages = toLocalMessages(
              response.messages,
              me?.id ?? 0,
              recipientLastReadPosition,
            ).filter((message) => !existingIds.has(message.id));

            return [...newMessages, ...prev];
          });

          setHasMoreOlder(response.has_more_older);
          setNextBeforePosition(response.next_before_position);

          // Ждем, пока React обновит DOM
          await new Promise(resolve => setTimeout(resolve, 100));

          // Пытаемся найти элемент снова
          messageElement = container.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`);
        } catch (error) {
          console.error('Failed to load missing messages:', error);
          alert('Не удалось загрузить сообщения');
        } finally {
          setOlderLoading(false);
        }
      }
    }

    if (!messageElement) {
      console.warn('Message element not found after loading');
      return;
    }

    // Вычисляем позицию, чтобы сообщение оказалось в центре видимой области
    const containerRect = container.getBoundingClientRect();
    const messageRect = messageElement.getBoundingClientRect();
    const targetScrollTop =
      messageElement.offsetTop -
      (containerRect.height / 2) +
      (messageRect.height / 2);

    container.scrollTop = Math.max(0, targetScrollTop);

    // Добавляем подсветку
    setHighlightedMessageId(messageId);
    setTimeout(() => {
      setHighlightedMessageId(null);
    }, 2000);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setMessageText("");
  };

  const cancelReply = () => {
    setReplyingToMessage(null);
  };

  const renderAttachmentPreview = (attachments: MessageAttachment[] | undefined, text: string) => {
    if (!attachments || attachments.length === 0) {
      return text || '📎 Вложение';
    }

    const firstAttachment = attachments[0];
    const remainingCount = attachments.length - 1;

    let preview = null;
    if (firstAttachment.type === 'image') {
      preview = (
        <img
          src={firstAttachment.url}
          alt=""
          className="chat-preview__attachment-image"
        />
      );
    } else if (firstAttachment.type === 'video') {
      preview = <span className="chat-preview__attachment-icon">🎥</span>;
    } else {
      preview = <span className="chat-preview__attachment-icon">📄</span>;
    }

    return (
      <div className="chat-preview__attachment-container">
        {preview}
        {remainingCount > 0 && (
          <span className="chat-preview__attachment-count">+{remainingCount}</span>
        )}
        {text && <span className="chat-preview__attachment-text">{text}</span>}
      </div>
    );
  };

  const renderStatus = (message: LocalMessage) => {
    if (message.sender.id !== me?.id) return null;

    if (message.localStatus === "read") {
      return <span className="chat-message__status chat-message__status--read">✓✓</span>;
    }

    if (message.localStatus === "confirmed") {
      return <span className="chat-message__status chat-message__status--delivered">✓✓</span>;
    }

    return <span className="chat-message__status chat-message__status--sending">✓</span>;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return "Сегодня";
    if (isYesterday) return "Вчера";

    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  };

  const renderAttachments = (attachments: MessageAttachment[], message: LocalMessage) => {
    if (!attachments || attachments.length === 0) return null;

    const images = attachments.filter((att) => att.type === 'image') as (MessageAttachment & { width: number; height: number })[];
    const nonImages = attachments.filter((att) => att.type !== 'image');

    const imageRows = images.length > 0 ? layoutImages(images) : [];

    return (
      <>
        {imageRows.length > 0 && (
          <div className="chat-message__images-container">
            {imageRows.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className={`chat-message__images-row chat-message__images-row--count-${row.length}`}
              >
                {row.map((attachment) => {
                  const aspectRatio = attachment.width && attachment.height
                    ? attachment.width / attachment.height
                    : 1;

                  return (
                    <div
                      key={attachment.id}
                      className="chat-message__image-wrapper"
                      style={{
                        '--aspect-ratio': aspectRatio,
                      } as React.CSSProperties}
                    >
                      <img
                        src={attachment.url}
                        alt={attachment.file_name}
                        className="chat-message__attachment-image"
                        loading="lazy"
                        onClick={() => handleImageClick(attachment.id)}
                        onContextMenu={(e) => handleContextMenu(e, message, 'image', attachment)}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {nonImages.map((attachment) => {
          if (attachment.type === 'video') {
            return (
              <div
                key={attachment.id}
                className="chat-message__attachment chat-message__attachment--video"
                onContextMenu={(e) => handleContextMenu(e, message, 'video', attachment)}
              >
                <video
                  src={attachment.url}
                  controls
                  className="chat-message__attachment-video"
                  preload="auto"
                  controlsList="nodownload"
                >
                  <source src={attachment.url} type={attachment.mime_type} />
                  Ваш браузер не поддерживает видео.
                </video>
              </div>
            );
          }

          return (
            <a
              key={attachment.id}
              href={attachment.url}
              download={attachment.file_name}
              className="chat-message__attachment chat-message__attachment--file"
              target="_blank"
              rel="noopener noreferrer"
              onContextMenu={(e) => handleContextMenu(e, message, 'file', attachment)}
            >
              <div className="chat-message__attachment-icon">
                {attachment.mime_type.includes('pdf') ? '📄' : '📎'}
              </div>
              <div className="chat-message__attachment-info">
                <div className="chat-message__attachment-name">{attachment.file_name}</div>
                <div className="chat-message__attachment-size">
                  {(attachment.size / 1024).toFixed(1)} KB
                </div>
              </div>
            </a>
          );
        })}
      </>
    );
  };

  const shouldShowDateDivider = (currentMessage: LocalMessage, prevMessage: LocalMessage | null) => {
    if (!prevMessage) return true;

    const currentDate = new Date(currentMessage.sent_at).toDateString();
    const prevDate = new Date(prevMessage.sent_at).toDateString();

    return currentDate !== prevDate;
  };

  const shouldShowSenderInfo = (currentMessage: LocalMessage, prevMessage: LocalMessage | null) => {
    if (!prevMessage) return true;
    if (currentMessage.sender.id !== prevMessage.sender.id) return true;

    // Проверяем, если между сообщениями прошло больше 5 минут
    const currentTime = new Date(currentMessage.sent_at).getTime();
    const prevTime = new Date(prevMessage.sent_at).getTime();
    const timeDiff = currentTime - prevTime;

    return timeDiff > 5 * 60 * 1000; // 5 минут
  };

  const shouldShowAvatar = (currentMessage: LocalMessage, nextMessage: LocalMessage | null) => {
    if (!nextMessage) return true;
    if (currentMessage.sender.id !== nextMessage.sender.id) return true;

    // Проверяем, если между сообщениями прошло больше 5 минут
    const currentTime = new Date(currentMessage.sent_at).getTime();
    const nextTime = new Date(nextMessage.sent_at).getTime();
    const timeDiff = nextTime - currentTime;

    return timeDiff > 5 * 60 * 1000; // 5 минут
  };

  const getMessageText = (message: LocalMessage): string => {
    if (!autoTranslateEnabled) return message.text;
    if (message.sender.id === me?.id) return message.text;
    if (message.translation_status === 'ready' && message.translated_text) {
      return message.translated_text;
    }
    return message.text;
  };

  const isTranslationPending = (message: LocalMessage): boolean => {
    if (!autoTranslateEnabled) return false;
    if (message.sender.id === me?.id) return false;
    return message.translation_status === 'pending';
  };

  const getMessageGroupClass = (
    currentMessage: LocalMessage,
    prevMessage: LocalMessage | null,
    nextMessage: LocalMessage | null
  ) => {
    const isOwn = currentMessage.sender.id === me?.id;
    const showSenderInfo = shouldShowSenderInfo(currentMessage, prevMessage);
    const showAvatar = shouldShowAvatar(currentMessage, nextMessage);

    let classes = "chat-message";
    if (isOwn) {
      classes += " chat-message--own";
    }
    if (!showSenderInfo) {
      classes += " chat-message--grouped";
    }
    if (!showAvatar) {
      classes += " chat-message--no-avatar";
    }

    return classes;
  };

  const isGroupChat = activeChatData?.type === "group";

  const getReadByUsers = (message: LocalMessage) => {
    if (!activeChatData || activeChatData.type !== 'group' || !activeChatData.members) {
      return [];
    }

    return activeChatData.members
      .filter(
        (member) =>
          member.user !== me?.id &&
          member.user !== message.sender.id &&
          member.last_read_position >= message.position
      )
      .map((member) => ({
        id: member.user,
        full_name: member.user_full_name || 'Unknown',
        email: member.user_email || '',
      }));
  };

  const handleCreateGroup = async (params: {
    title: string;
    description: string;
    avatar: string;
    member_ids: number[];
  }) => {
    setIsCreatingGroup(true);

    try {
      const newChat = await createGroupChat(params);

      // Добавляем новый чат в список
      setChats((prev) => [newChat, ...prev]);

      // Закрываем модальное окно
      setIsModalOpen(false);

      // Открываем созданный чат
      await openChat(newChat.id);
    } catch (error) {
      console.error("Failed to create group chat:", error);
      alert("Не удалось создать групповой чат. Попробуйте еще раз.");
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleImageClick = (imageId: string) => {
    setCurrentImageId(imageId);
    setIsImageModalOpen(true);
  };

  const handleImageModalNavigate = (direction: 'prev' | 'next') => {
    const currentIndex = allImages.findIndex((img) => img.id === currentImageId);

    if (direction === 'prev' && currentIndex > 0) {
      setCurrentImageId(allImages[currentIndex - 1].id);
    } else if (direction === 'next' && currentIndex < allImages.length - 1) {
      setCurrentImageId(allImages[currentIndex + 1].id);
    }
  };

  const currentImage = allImages.find((img) => img.id === currentImageId);

  const handleContextMenu = (
    e: React.MouseEvent,
    message: LocalMessage,
    targetType: 'text' | 'image' | 'file' | 'video' | 'bubble',
    targetAttachment?: MessageAttachment
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Получаем границы сообщения для определения стороны клика
    const messageElement = (e.currentTarget as HTMLElement).closest('[data-position]') as HTMLElement;
    const messageRect = messageElement?.getBoundingClientRect();

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      message,
      targetType,
      targetAttachment,
      messageRect,
    });
  };

  const handleContextMenuAction = async (
    action: string,
    message: LocalMessage,
    attachment?: MessageAttachment
  ) => {
    switch (action) {
      case 'copy-text':
        if (message.text) {
          try {
            await navigator.clipboard.writeText(message.text);
          } catch (error) {
            console.error('Ошибка копирования текста:', error);
          }
        }
        break;

      case 'copy-image':
        if (attachment) {
          try {
            const response = await fetch(attachment.url);
            const blob = await response.blob();
            await navigator.clipboard.write([
              new ClipboardItem({ [blob.type]: blob })
            ]);
          } catch (error) {
            console.error('Ошибка копирования изображения:', error);
            alert('Не удалось скопировать изображение. Попробуйте скачать его.');
          }
        }
        break;

      case 'download':
        if (attachment) {
          try {
            const response = await fetch(attachment.url);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = attachment.file_name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          } catch (error) {
            console.error('Ошибка загрузки файла:', error);
            alert('Не удалось загрузить файл');
          }
        }
        break;

      case 'delete':
        try {
          if (confirm('Вы уверены, что хотите удалить это сообщение?')) {
            await deleteMessage(message.id);
            // Сообщение будет удалено из списка через WebSocket событие message.deleted
          }
        } catch (error) {
          console.error('Ошибка удаления сообщения:', error);
          alert('Не удалось удалить сообщение');
        }
        break;

      case 'edit':
        setEditingMessage(message);
        setMessageText(message.text);
        break;

      case 'reply':
        setReplyingToMessage(message);
        break;

      case 'forward':
        setForwardingMessage(message);
        setIsForwardModalOpen(true);
        break;
    }
  };

  return (
    <div className="chat-page">
      <CreateGroupChatModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateGroup}
        isCreating={isCreatingGroup}
      />

      {currentImage && (
        <ImageModal
          isOpen={isImageModalOpen}
          imageUrl={currentImage.url}
          imageName={currentImage.name}
          allImages={allImages}
          currentImageId={currentImageId}
          onClose={() => setIsImageModalOpen(false)}
          onNavigate={handleImageModalNavigate}
        />
      )}

      {contextMenu && me && (
        <MessageContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          message={contextMenu.message}
          currentUser={me}
          isGroupChat={isGroupChat}
          targetType={contextMenu.targetType}
          targetAttachment={contextMenu.targetAttachment}
          readByUsers={getReadByUsers(contextMenu.message)}
          onAction={handleContextMenuAction}
          onClose={() => setContextMenu(null)}
          messageRect={contextMenu.messageRect}
          chatContainerRect={messagesContainerRef.current?.getBoundingClientRect()}
        />
      )}

      {activeChatData && me && (
        <ChatProfileModal
          isOpen={isChatProfileModalOpen}
          onClose={() => setIsChatProfileModalOpen(false)}
          chat={activeChatData}
          currentUser={me}
          onChatDeleted={(chatId) => {
            // Удаляем чат из списка
            setChats((prev) => prev.filter((chat) => chat.id !== chatId));
            // Закрываем чат если он был открыт
            if (activeChatId === chatId) {
              setActiveChatId(null);
              setActiveRecipientId(null);
              setActiveChatData(null);
              setMessages([]);
            }
          }}
        />
      )}

      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
      />

      <aside className="chat-sidebar">
        <div className="chat-sidebar__header">
          <div className="chat-sidebar__title">Чаты</div>
          <button
            className="chat-sidebar__create-button"
            onClick={() => setIsModalOpen(true)}
            title="Создать групповой чат"
          >
            +
          </button>
        </div>

        <div className="chat-sidebar__scroll">
          {loading ? (
            <div className="chat-empty">Загрузка...</div>
          ) : (
            <>
              <div className="chat-contact-list">
                {chats.map((chat) => (
                  <button
                    className={
                      activeChatId === chat.id
                        ? "chat-contact-card chat-contact-card--active"
                        : "chat-contact-card"
                    }
                    key={chat.id}
                    onClick={() => void openChat(chat.id)}
                  >
                    <div className="chat-contact-card__avatar">
                      {chat.title.charAt(0).toUpperCase()}
                    </div>

                    <div className="chat-contact-card__content">
                      <div className="chat-contact-card__name">
                        {chat.title}
                        {chat.unread_count !== undefined && chat.unread_count > 0 && (
                          <span className="chat-contact-card__unread-badge">
                            {chat.unread_count}
                          </span>
                        )}
                      </div>
                      <div className="chat-contact-card__email">
                        {new Date(chat.updated_at).toLocaleString()}
                      </div>
                    </div>

                    {chat.is_new && (
                      <span className="chat-contact-card__new-badge" title="Новый чат">
                        NEW
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {contactsWithoutChats.length > 0 && (
                <>
                  <div className="chat-sidebar__subtitle">Контакты без переписки</div>

                  <div className="chat-contact-list">
                    {contactsWithoutChats.map((contact) => (
                      <button
                        className={
                          activeRecipientId === contact.id
                            ? "chat-contact-card chat-contact-card--active"
                            : "chat-contact-card"
                        }
                        key={contact.id}
                        onClick={() => void openChatByContact(contact)}
                      >
                        <div className="chat-contact-card__avatar">
                          {contact.full_name.charAt(0).toUpperCase()}
                        </div>

                        <div className="chat-contact-card__content">
                          <div className="chat-contact-card__name">{contact.full_name}</div>
                          <div className="chat-contact-card__email">{contact.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {chats.length === 0 && contactsWithoutChats.length === 0 && (
                <div className="chat-empty">Чатов и контактов пока нет</div>
              )}
            </>
          )}
        </div>
      </aside>

      <section className="chat-main">
        {activeChatId || activeRecipientId || messages.length > 0 ? (
          <>
            <div className="chat-main__header">
              <div
                className="chat-main__avatar"
                onClick={() => activeChatData && setIsChatProfileModalOpen(true)}
                style={{ cursor: activeChatData ? 'pointer' : 'default' }}
                title={activeChatData ? "Открыть профиль чата" : undefined}
              >
                {activeChatId
                  ? (chats.find((c) => c.id === activeChatId)?.title || "?").charAt(0).toUpperCase()
                  : activeRecipientId
                    ? (contactsWithoutChats.find((c) => c.id === activeRecipientId)?.full_name || "?").charAt(0).toUpperCase()
                    : "?"}
              </div>

              <div
                onClick={() => activeChatData && setIsChatProfileModalOpen(true)}
                style={{ cursor: activeChatData ? 'pointer' : 'default', flex: 1 }}
              >
                <div className="chat-main__name">
                  {activeChatId
                    ? chats.find((c) => c.id === activeChatId)?.title || "Неизвестный чат"
                    : activeRecipientId
                      ? contactsWithoutChats.find((c) => c.id === activeRecipientId)?.full_name || "Новый чат"
                      : "Новый чат"}
                </div>
                <div className="chat-main__status">
                  {chatLoading
                    ? "Загрузка чата..."
                    : activeChatId
                      ? "Чат открыт"
                      : "Новый чат будет создан при первом сообщении"}
                </div>
              </div>

              <label className="auto-translate-toggle">
                <input
                  type="checkbox"
                  checked={autoTranslateEnabled}
                  onChange={(e) => {
                    setAutoTranslateEnabled(e.target.checked);
                    if (activeChatId && e.target.checked) {
                      void handleAutoTranslateToggle(e.target.checked);
                    }
                  }}
                />
                <span className="auto-translate-toggle__label">Авто-перевод</span>
              </label>
            </div>

            <div
              className={`chat-main__messages ${contextMenu ? 'chat-main__messages--no-scroll' : ''}`}
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll}
            >
              {floatingDateText && (
                <div className={`chat-date-divider chat-date-divider--floating ${floatingDateFadeOut ? 'fade-out' : ''}`}>
                  {floatingDateText}
                </div>
              )}

              {olderLoading && (
                <div className="chat-main__older-loading">Загрузка старых сообщений...</div>
              )}

              {chatLoading ? (
                <div className="chat-main__placeholder">Загрузка истории...</div>
              ) : messages.length === 0 ? (
                <div className="chat-main__placeholder">
                  Сообщений пока нет. Напишите первое сообщение.
                </div>
              ) : (
                messages.map((message, index) => {
                  const prevMessage = index > 0 ? messages[index - 1] : null;
                  const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
                  const showDateDivider = shouldShowDateDivider(message, prevMessage);
                  const showSenderInfo = shouldShowSenderInfo(message, prevMessage);
                  const showAvatar = shouldShowAvatar(message, nextMessage);

                  return (
                    <Fragment key={message.client_id || message.id}>
                      {showDateDivider && (
                        <div className="chat-date-divider">
                          {formatDate(message.sent_at)}
                        </div>
                      )}

                      {unreadDividerPosition && message.position === unreadDividerPosition && (
                        <div
                          className="chat-unread-divider"
                          data-unread-divider="true"
                        >
                          Новые сообщения
                        </div>
                      )}

                      <div
                        className={getMessageGroupClass(message, prevMessage, nextMessage)}
                        data-position={message.position}
                        data-sender-id={message.sender.id}
                        data-message-id={message.id}
                      >
                        {isGroupChat && message.sender.id !== me?.id && showAvatar && (
                          <div className="chat-message__avatar">
                            {message.sender.full_name.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="chat-message__content">
                          {isGroupChat && message.sender.id !== me?.id && showSenderInfo && (
                            <div className="chat-message__sender">
                              {message.sender.full_name}
                            </div>
                          )}

                          <div
                            className={`chat-message__bubble ${highlightedMessageId === message.id ? 'chat-message__bubble--highlighted' : ''}`}
                            onContextMenu={(e) => handleContextMenu(e, message, 'bubble')}
                          >
                            {message.forwarded_from && (
                              <div className="chat-message__forwarded-label">
                                Переслано от {message.forwarded_from.sender.full_name}
                              </div>
                            )}
                            {message.reply_to && (
                              <div
                                className="chat-message__reply"
                                onClick={() => scrollToMessage(message.reply_to!.id, message.reply_to!.position)}
                                onContextMenu={(e) => {
                                  e.stopPropagation();
                                  const replyMessage = messages.find(m => m.id === message.reply_to!.id);
                                  if (replyMessage) {
                                    handleContextMenu(e, replyMessage, 'bubble');
                                  }
                                }}
                              >
                                <div className="chat-message__reply-sender">
                                  {message.reply_to.sender.full_name}
                                </div>
                                <div className="chat-message__reply-text">
                                  {renderAttachmentPreview(message.reply_to.attachments, message.reply_to.text)}
                                </div>
                              </div>
                            )}
                            {renderAttachments(message.attachments, message)}
                            {message.text && (
                              <span
                                className="chat-message__text"
                                onContextMenu={(e) => handleContextMenu(e, message, 'text')}
                              >
                                {getMessageText(message)}
                                {isTranslationPending(message) && (
                                  <span className="chat-message__translation-pending" title="Перевод...">⏳</span>
                                )}
                              </span>
                            )}
                            <span className="chat-message__meta">
                              <span className="chat-message__time">
                                {formatTime(message.sent_at)}
                                {message.edited_at && (
                                  <span className="chat-message__edited" title={`Изменено ${new Date(
                                    message.edited_at).toLocaleString('ru-RU')}`}>
                                    {' '}ред.
                                  </span>
                                )}
                              </span>
                              {renderStatus(message)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Fragment>
                  );
                })
              )}

              {newerLoading && (
                <div className="chat-main__older-loading">Загрузка новых сообщений...</div>
              )}
            </div>

            <div className="chat-main__footer">
              {showScrollToBottom && (
                <button
                  className="chat-scroll-to-bottom"
                  onClick={scrollToBottom}
                  title={unreadCount > 0 ? "К непрочитанным" : "Прокрутить вниз"}
                >
                  <span className="chat-scroll-to-bottom__icon">↓</span>
                  {unreadCount > 0 && (
                    <span className="chat-scroll-to-bottom__badge">
                      {unreadCount}
                    </span>
                  )}
                </button>
              )}

              {editingMessage && (
                <div className="chat-edit-preview">
                  <div className="chat-edit-preview__label">Редактирование сообщения</div>
                  <div
                    className="chat-edit-preview__content"
                    onClick={() => scrollToMessage(editingMessage.id, editingMessage.position)}
                    title="Перейти к сообщению"
                  >
                    <div className="chat-edit-preview__text">
                      {editingMessage.text.length > 100
                        ? `${editingMessage.text.substring(0, 100)}...`
                        : editingMessage.text}
                    </div>
                  </div>
                  <button
                    className="chat-edit-preview__cancel"
                    onClick={cancelEdit}
                    title="Отменить редактирование"
                  >
                    ×
                  </button>
                </div>
              )}

              {replyingToMessage && (
                <div className="chat-reply-preview">
                  <div className="chat-reply-preview__label">Ответ на сообщение</div>
                  <div
                    className="chat-reply-preview__content"
                    onClick={() => scrollToMessage(replyingToMessage.id, replyingToMessage.position)}
                    title="Перейти к сообщению"
                  >
                    <div className="chat-reply-preview__sender">
                      {replyingToMessage.sender.full_name}
                    </div>
                    <div className="chat-reply-preview__text">
                      {renderAttachmentPreview(
                        replyingToMessage.attachments,
                        replyingToMessage.text.length > 100
                          ? `${replyingToMessage.text.substring(0, 100)}...`
                          : replyingToMessage.text
                      )}
                    </div>
                  </div>
                  <button
                    className="chat-reply-preview__cancel"
                    onClick={cancelReply}
                    title="Отменить ответ"
                  >
                    ×
                  </button>
                </div>
              )}

              {forwardingMessage && (
                <div className="chat-forward-preview">
                  <div className="chat-forward-preview__label">Пересылка сообщения</div>
                  <div className="chat-forward-preview__content">
                    <div className="chat-forward-preview__sender">
                      {forwardingMessage.sender.full_name}
                    </div>
                    <div className="chat-forward-preview__text">
                      {renderAttachmentPreview(
                        forwardingMessage.attachments,
                        forwardingMessage.text.length > 100
                          ? `${forwardingMessage.text.substring(0, 100)}...`
                          : forwardingMessage.text
                      )}
                    </div>
                  </div>
                  <button
                    className="chat-forward-preview__cancel"
                    onClick={cancelForward}
                    title="Отменить пересылку"
                  >
                    ×
                  </button>
                </div>
              )}

              {selectedFiles.length > 0 && (
                <div className="chat-attachments-preview">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="chat-attachment-item">
                      <button
                        className="chat-attachment-item__remove"
                        onClick={() => handleRemoveFile(index)}
                        title="Удалить файл"
                        disabled={isUploading}
                      >
                        ×
                      </button>
                      {file.type.startsWith('image/') ? (
                        <img
                          src={getFilePreview(file) || ''}
                          alt={file.name}
                          className="chat-attachment-item__preview"
                        />
                      ) : (
                        <div className="chat-attachment-item__icon">
                          <span className="chat-attachment-item__icon-emoji">{getFileIcon(file)}</span>
                          <span className="chat-attachment-item__name">{file.name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {isUploading && (
                    <div className="chat-upload-progress">
                      <div className="chat-upload-progress__bar">
                        <div
                          className="chat-upload-progress__fill"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <div className="chat-upload-progress__text">
                        Загрузка: {Math.round(uploadProgress)}%
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="chat-main__composer">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  multiple
                  accept="*/*"
                />

                <button
                  className="chat-main__attach"
                  onClick={handleAttachClick}
                  disabled={chatLoading || isUploading}
                  title="Прикрепить файл"
                >
                  📎
                </button>

                <input
                  className="chat-main__input"
                  placeholder="Введите сообщение..."
                  value={messageText}
                  disabled={chatLoading || isUploading}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isUploading) {
                      if (editingMessage) {
                        handleSendMessage();
                      } else if (forwardingMessage) {
                        handleSendMessage();
                      } else if (messageText.trim() || selectedFiles.length > 0) {
                        handleSendMessage();
                      }
                    }
                    if (e.key === "Escape") {
                      if (editingMessage) {
                        cancelEdit();
                      } else if (replyingToMessage) {
                        cancelReply();
                      } else if (forwardingMessage) {
                        cancelForward();
                      }
                    }
                  }}
                />

                <button
                  className="chat-main__send"
                  disabled={chatLoading || isUploading || (!messageText.trim() && selectedFiles.length === 0 && !forwardingMessage)}
                  onClick={handleSendMessage}
                  title={editingMessage ? "Сохранить изменения" : "Отправить сообщение"}
                >
                  {editingMessage ? '✓' : '➤'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="chat-main__empty-state">
            Выберите чат или контакт слева.
          </div>
        )}
      </section>

      <ForwardMessageModal
        isOpen={isForwardModalOpen}
        chats={chats}
        onForward={handleForwardToChat}
        onClose={() => setIsForwardModalOpen(false)}
      />
    </div>
  );
}