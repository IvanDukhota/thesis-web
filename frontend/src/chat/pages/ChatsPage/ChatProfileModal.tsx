import { useEffect, useState } from "react";
import { type Chat, getChatStats, type ChatStats, deleteChat } from "../../shared/api/chat";
import { type User } from "../../shared/api/auth";
import ConfirmModal from "../../shared/ui/ConfirmModal";
import "./chatProfileModal.css";

type ChatProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat;
  currentUser: User;
  onChatDeleted?: (chatId: string) => void;
};

export default function ChatProfileModal({
  isOpen,
  onClose,
  chat,
  currentUser,
  onChatDeleted,
}: ChatProfileModalProps) {
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isGroupChat = chat.type === "group";
  const currentMember = chat.members?.find((m) => m.user === currentUser.id);
  const isAdmin = currentMember?.role === "admin" || currentMember?.role === "owner";

  const otherMember = !isGroupChat
    ? chat.members?.find((m) => m.user !== currentUser.id)
    : null;

  useEffect(() => {
    if (isOpen) {
      setIsLoadingStats(true);
      getChatStats(chat.id)
        .then(setStats)
        .catch((err) => console.error("Failed to load chat stats:", err))
        .finally(() => setIsLoadingStats(false));
    }
  }, [isOpen, chat.id]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleDeleteChat = async () => {
    setIsDeleting(true);

    try {
      await deleteChat(chat.id);
      onChatDeleted?.(chat.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      console.error("Failed to delete chat:", error);
      alert("Не удалось удалить чат. Возможно, у вас нет прав на это действие.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="chat-profile-modal__overlay" onClick={handleOverlayClick}>
      <div className="chat-profile-modal">
        <div className="chat-profile-modal__header">
          <h2 className="chat-profile-modal__title">
            {isGroupChat ? "Настройки группы" : "Профиль"}
          </h2>
          <button
            className="chat-profile-modal__close"
            onClick={onClose}
            title="Закрыть"
          >
            ✕
          </button>
        </div>

        <div className="chat-profile-modal__content">
          {/* Аватар и основная информация */}
          <div className="chat-profile-modal__main-info">
            <div className="chat-profile-modal__avatar">
              {chat.title.charAt(0).toUpperCase()}
            </div>
            <h3 className="chat-profile-modal__name">{chat.title}</h3>
            {isGroupChat && chat.description && (
              <p className="chat-profile-modal__description">{chat.description}</p>
            )}
            {!isGroupChat && otherMember && (
              <p className="chat-profile-modal__email">{otherMember.user_email}</p>
            )}
          </div>

          {/* Статистика */}
          <div className="chat-profile-modal__section">
            <h4 className="chat-profile-modal__section-title">Статистика</h4>
            {isLoadingStats ? (
              <p className="chat-profile-modal__loading">Загрузка...</p>
            ) : stats ? (
              <div className="chat-profile-modal__stats">
                <div className="chat-profile-modal__stat-item">
                  <span className="chat-profile-modal__stat-icon">💬</span>
                  <span className="chat-profile-modal__stat-label">Сообщений:</span>
                  <span className="chat-profile-modal__stat-value">{stats.total_messages}</span>
                </div>
                <div className="chat-profile-modal__stat-item">
                  <span className="chat-profile-modal__stat-icon">🖼️</span>
                  <span className="chat-profile-modal__stat-label">Изображений:</span>
                  <span className="chat-profile-modal__stat-value">{stats.total_images}</span>
                </div>
                <div className="chat-profile-modal__stat-item">
                  <span className="chat-profile-modal__stat-icon">🎥</span>
                  <span className="chat-profile-modal__stat-label">Видео:</span>
                  <span className="chat-profile-modal__stat-value">{stats.total_videos}</span>
                </div>
                <div className="chat-profile-modal__stat-item">
                  <span className="chat-profile-modal__stat-icon">📎</span>
                  <span className="chat-profile-modal__stat-label">Файлов:</span>
                  <span className="chat-profile-modal__stat-value">{stats.total_files}</span>
                </div>
              </div>
            ) : (
              <p className="chat-profile-modal__error">Не удалось загрузить статистику</p>
            )}
          </div>

          {/* Участники группового чата */}
          {isGroupChat && chat.members && (
            <div className="chat-profile-modal__section">
              <h4 className="chat-profile-modal__section-title">
                Участники ({chat.members.length})
              </h4>
              <div className="chat-profile-modal__members">
                {chat.members.map((member) => (
                  <div key={member.id} className="chat-profile-modal__member">
                    <div className="chat-profile-modal__member-avatar">
                      {member.user_full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="chat-profile-modal__member-info">
                      <div className="chat-profile-modal__member-name">
                        {member.user_full_name}
                        {member.user === currentUser.id && " (Вы)"}
                      </div>
                      <div className="chat-profile-modal__member-role">
                        {member.role === "owner" && "Владелец"}
                        {member.role === "admin" && "Администратор"}
                        {member.role === "member" && "Участник"}
                      </div>
                    </div>
                    {isAdmin && member.user !== currentUser.id && (
                      <button
                        className="chat-profile-modal__member-remove"
                        onClick={() => alert("Удаление участника будет реализовано позже")}
                        title="Удалить участника"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {isAdmin && (
                <button
                  className="chat-profile-modal__add-member"
                  onClick={() => alert("Добавление участников будет реализовано позже")}
                >
                  + Добавить участника
                </button>
              )}
            </div>
          )}

          {/* Действия */}
          <div className="chat-profile-modal__section">
            <h4 className="chat-profile-modal__section-title">Действия</h4>
            <div className="chat-profile-modal__actions">
              <button
                className="chat-profile-modal__action-button chat-profile-modal__action-button--warning"
                onClick={() => alert("Отключение уведомлений будет реализовано позже")}
              >
                🔕 Отключить уведомления
              </button>
              {isGroupChat && !isAdmin && (
                <button
                  className="chat-profile-modal__action-button chat-profile-modal__action-button--danger"
                  onClick={() => alert("Выход из чата будет реализован позже")}
                >
                  🚪 Выйти из чата
                </button>
              )}
              {!isGroupChat && (
                <button
                  className="chat-profile-modal__action-button chat-profile-modal__action-button--danger"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                >
                  🗑️ Удалить чат
                </button>
              )}
              {isGroupChat && isAdmin && (
                <button
                  className="chat-profile-modal__action-button chat-profile-modal__action-button--danger"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                >
                  🗑️ Удалить чат
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Удаление чата"
        message={
          isGroupChat
            ? `Вы уверены, что хотите удалить групповой чат "${chat.title}"?\n\nЭто действие нельзя отменить. Все сообщения и файлы будут удалены для всех участников.`
            : `Вы уверены, что хотите удалить чат с "${chat.title}"?\n\nЭто действие нельзя отменить. Все сообщения и файлы будут удалены.`
        }
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
        onConfirm={handleDeleteChat}
        onCancel={() => setShowDeleteConfirm(false)}
        isLoading={isDeleting}
      />
    </div>
  );
}
