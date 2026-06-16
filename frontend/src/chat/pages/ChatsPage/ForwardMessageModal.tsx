import { useState, useMemo } from 'react';
import type { Chat } from '../../shared/api/chat';
import './forward-message-modal.css';

type ForwardMessageModalProps = {
  isOpen: boolean;
  chats: Chat[];
  onForward: (chatId: string) => void;
  onClose: () => void;
};

export default function ForwardMessageModal({
  isOpen,
  chats,
  onForward,
  onClose,
}: ForwardMessageModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) {
      return chats;
    }

    const query = searchQuery.toLowerCase();
    return chats.filter((chat) =>
      chat.title.toLowerCase().includes(query)
    );
  }, [chats, searchQuery]);

  const handleChatClick = (chatId: string) => {
    onForward(chatId);
    setSearchQuery('');
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="forward-modal-overlay" onClick={handleClose}>
      <div className="forward-modal" onClick={(e) => e.stopPropagation()}>
        <div className="forward-modal__header">
          <h2 className="forward-modal__title">Переслать сообщение</h2>
          <button
            className="forward-modal__close"
            onClick={handleClose}
            title="Закрыть"
          >
            ×
          </button>
        </div>

        <div className="forward-modal__search">
          <input
            type="text"
            className="forward-modal__search-input"
            placeholder="Поиск чатов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="forward-modal__chat-list">
          {filteredChats.length === 0 ? (
            <div className="forward-modal__empty">
              {searchQuery ? 'Чаты не найдены' : 'Нет доступных чатов'}
            </div>
          ) : (
            filteredChats.map((chat) => (
              <button
                key={chat.id}
                className="forward-modal__chat-item"
                onClick={() => handleChatClick(chat.id)}
              >
                <div className="forward-modal__chat-avatar">
                  {chat.title.charAt(0).toUpperCase()}
                </div>
                <div className="forward-modal__chat-info">
                  <div className="forward-modal__chat-name">{chat.title}</div>
                  {chat.description && (
                    <div className="forward-modal__chat-description">
                      {chat.description}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
