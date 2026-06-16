import { useEffect, useRef, useState } from 'react';
import type { LocalMessage } from './ChatsPage';
import type { MessageAttachment } from '../../shared/api/chat';
import type { User } from '../../shared/api/auth';
import './message-context-menu.css';

type ContextMenuAction =
  | 'delete'
  | 'edit'
  | 'forward'
  | 'reply'
  | 'copy-text'
  | 'copy-image'
  | 'download';

type ContextMenuProps = {
  x: number;
  y: number;
  message: LocalMessage;
  currentUser: User;
  isGroupChat: boolean;
  targetType: 'text' | 'image' | 'file' | 'video' | 'bubble';
  targetAttachment?: MessageAttachment;
  readByUsers?: Array<{ id: number; full_name: string; email: string }>;
  onAction: (action: ContextMenuAction, message: LocalMessage, attachment?: MessageAttachment) => void;
  onClose: () => void;
  messageRect?: DOMRect;
  chatContainerRect?: DOMRect;
};

export default function MessageContextMenu({
  x,
  y,
  message,
  currentUser,
  isGroupChat,
  targetType,
  targetAttachment,
  readByUsers = [],
  onAction,
  onClose,
  messageRect,
  chatContainerRect,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [hoveredUser, setHoveredUser] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [menuPosition, setMenuPosition] = useState({ left: x, top: y });

  const isOwnMessage = message.sender.id === currentUser.id;
  const hasText = !!message.text;
  const canDelete = isOwnMessage;
  const canEdit = isOwnMessage && message.type === 'text';

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [onClose]);

  // Корректировка позиции меню (только один раз при монтировании)
  useEffect(() => {
    if (!menuRef.current || !chatContainerRect) return;

    const rect = menuRef.current.getBoundingClientRect();
    let newX = x;
    let newY = y;

    // Определяем, находится ли клик справа от сообщения
    const isRightSide = messageRect && x > messageRect.left + messageRect.width / 2;

    // Если клик справа (на своих сообщениях), открываем меню слева от курсора
    if (isRightSide) {
      newX = x - rect.width;
    }

    // Проверяем выход за правую границу
    if (newX + rect.width > window.innerWidth) {
      newX = window.innerWidth - rect.width - 10;
    }

    // Проверяем выход за левую границу
    if (newX < 10) {
      newX = 10;
    }

    // Проверяем выход за нижнюю границу чата (до поля ввода)
    const chatBottom = chatContainerRect.bottom;
    if (y + rect.height > chatBottom) {
      // Открываем меню вверх от точки клика
      newY = y - rect.height;
    }

    // Проверяем выход за верхнюю границу
    if (newY < chatContainerRect.top) {
      newY = chatContainerRect.top + 10;
    }

    setMenuPosition({ left: newX, top: newY });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Запускаем только при монтировании

  const handleAction = (action: ContextMenuAction) => {
    onAction(action, message, targetAttachment);
    onClose();
  };

  const handleAvatarMouseEnter = (userId: number, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredUser(userId);
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  };

  const handleAvatarMouseLeave = () => {
    setHoveredUser(null);
    setTooltipPosition(null);
  };

  const showReadBy = isGroupChat && isOwnMessage && readByUsers.length > 0;

  const formatEditTime = (editedAt: string) => {
    const date = new Date(editedAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    }
    if (isYesterday) {
      return "вчера";
    }

    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <>
      <div
        ref={menuRef}
        className="message-context-menu"
        style={{ left: menuPosition.left, top: menuPosition.top }}
      >
        <div className="message-context-menu__actions">
          {canEdit && (
            <button
              className="message-context-menu__item"
              onClick={() => handleAction('edit')}
            >
              <span className="message-context-menu__icon">✎</span>
              <span className="message-context-menu__label">Редактировать</span>
            </button>
          )}

          <button
            className="message-context-menu__item"
            onClick={() => handleAction('reply')}
          >
            <span className="message-context-menu__icon">↵</span>
            <span className="message-context-menu__label">Ответить</span>
          </button>

          <button
            className="message-context-menu__item"
            onClick={() => handleAction('forward')}
          >
            <span className="message-context-menu__icon">→</span>
            <span className="message-context-menu__label">Переслать</span>
          </button>

          {targetType === 'text' && hasText && (
            <button
              className="message-context-menu__item"
              onClick={() => handleAction('copy-text')}
            >
              <span className="message-context-menu__icon">⎘</span>
              <span className="message-context-menu__label">Скопировать текст</span>
            </button>
          )}

          {targetType === 'image' && targetAttachment && (
            <button
              className="message-context-menu__item"
              onClick={() => handleAction('copy-image')}
            >
              <span className="message-context-menu__icon">⎗</span>
              <span className="message-context-menu__label">Скопировать изображение</span>
            </button>
          )}

          {(targetType === 'image' || targetType === 'file' || targetType === 'video') && targetAttachment && (
            <button
              className="message-context-menu__item"
              onClick={() => handleAction('download')}
            >
              <span className="message-context-menu__icon">↓</span>
              <span className="message-context-menu__label">Скачать</span>
            </button>
          )}

          {canDelete && (
            <>
              <div className="message-context-menu__divider" />
              <button
                className="message-context-menu__item message-context-menu__item--danger"
                onClick={() => handleAction('delete')}
              >
                <span className="message-context-menu__icon">×</span>
                <span className="message-context-menu__label">Удалить</span>
              </button>
            </>
          )}
        </div>

        {showReadBy && (
          <>
            <div className="message-context-menu__divider" />
            <div className="message-context-menu__read-by">
              <div className="message-context-menu__read-by-label">Прочитали:</div>
              <div className="message-context-menu__read-by-avatars">
                {readByUsers.map((user) => (
                  <div
                    key={user.id}
                    className="message-context-menu__read-by-avatar"
                    onMouseEnter={(e) => handleAvatarMouseEnter(user.id, e)}
                    onMouseLeave={handleAvatarMouseLeave}
                  >
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {message.edited_at && (
          <>
            <div className="message-context-menu__divider" />
            <div className="message-context-menu__info">
              <span className="message-context-menu__info-label">Изменено:</span>
              <span className="message-context-menu__info-value">{formatEditTime(message.edited_at)}</span>
            </div>
          </>
        )}

      </div>

      {hoveredUser && tooltipPosition && (
        <div
          className="message-context-menu__tooltip"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
          }}
        >
          {readByUsers.find((u) => u.id === hoveredUser)?.full_name}
        </div>
      )}
    </>
  );
}
