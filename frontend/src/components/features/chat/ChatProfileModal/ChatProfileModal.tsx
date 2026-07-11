import { useEffect, useState } from "react";
import {
  RiCloseLine,
  RiMessage2Line,
  RiImageLine,
  RiVideoLine,
  RiAttachmentLine,
  RiNotificationOffLine,
  RiDoorOpenLine,
  RiDeleteBin6Line,
  RiUserAddLine,
} from "react-icons/ri";
import { type Chat, getChatStats, type ChatStats, deleteChat, leaveChat, removeChatMember } from "../../../../shared/api/chat";
import { type User } from "../../../../shared/api/auth";
import ConfirmModal from "../../../shared/ui/ConfirmModal/ConfirmModal";
import AddMemberModal from "../AddMemberModal/AddMemberModal";
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
  const [isLeaving, setIsLeaving] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  const isGroupChat = chat.type === "group";
  const currentMember = chat.members?.find((m) => m.user === currentUser.id);
  const isAdmin = currentMember?.role === "admin" || currentMember?.role === "owner";
  const isOwner = currentMember?.role === "owner";

  // For direct chats, get other member info for email display
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
      alert("Failed to delete chat. You may not have permission.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLeaveChat = async () => {
    setIsLeaving(true);

    try {
      await leaveChat(chat.id);
      onChatDeleted?.(chat.id);
      setShowLeaveConfirm(false);
      onClose();
    } catch (error) {
      console.error("Failed to leave chat:", error);
      alert("Failed to leave chat. Please try again.");
    } finally {
      setIsLeaving(false);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    setRemovingMemberId(userId);

    try {
      await removeChatMember(chat.id, userId);
      // Member will be removed from local state when WebSocket event arrives
    } catch (error) {
      console.error("Failed to remove member:", error);
      alert("Failed to remove member. Please try again.");
    } finally {
      setRemovingMemberId(null);
    }
  };

  return (
    <div className="chat-profile-modal__overlay" onClick={handleOverlayClick}>
      <div className="chat-profile-modal">
        <div className="chat-profile-modal__header">
          <h2 className="chat-profile-modal__title">
            {isGroupChat ? "Group settings" : "Profile"}
          </h2>
          <button
            className="chat-profile-modal__close"
            onClick={onClose}
            title="Close"
          >
            <RiCloseLine size={20} />
          </button>
        </div>

        <div className="chat-profile-modal__content">
          {/* Аватар и основная информация */}
          <div className="chat-profile-modal__main-info">
            <div className="chat-profile-modal__avatar">
              {chat.avatar ? (
                <img src={chat.avatar} alt={chat.title} />
              ) : (
                chat.title.charAt(0).toUpperCase()
              )}
            </div>
            <h3 className="chat-profile-modal__name">{chat.title}</h3>
            {isGroupChat && chat.description && (
              <p className="chat-profile-modal__description">{chat.description}</p>
            )}
            {!isGroupChat && otherMember && (
              <p className="chat-profile-modal__email">{otherMember.user_email}</p>
            )}
          </div>

          <div className="chat-profile-modal__section">
            <h4 className="chat-profile-modal__section-title">Stats</h4>
            {isLoadingStats ? (
              <p className="chat-profile-modal__loading">Loading...</p>
            ) : stats ? (
              <div className="chat-profile-modal__stats">
                <div className="chat-profile-modal__stat-item">
                  <span className="chat-profile-modal__stat-icon"><RiMessage2Line size={22} /></span>
                  <span className="chat-profile-modal__stat-label">Messages:</span>
                  <span className="chat-profile-modal__stat-value">{stats.total_messages}</span>
                </div>
                <div className="chat-profile-modal__stat-item">
                  <span className="chat-profile-modal__stat-icon"><RiImageLine size={22} /></span>
                  <span className="chat-profile-modal__stat-label">Images:</span>
                  <span className="chat-profile-modal__stat-value">{stats.total_images}</span>
                </div>
                <div className="chat-profile-modal__stat-item">
                  <span className="chat-profile-modal__stat-icon"><RiVideoLine size={22} /></span>
                  <span className="chat-profile-modal__stat-label">Videos:</span>
                  <span className="chat-profile-modal__stat-value">{stats.total_videos}</span>
                </div>
                <div className="chat-profile-modal__stat-item">
                  <span className="chat-profile-modal__stat-icon"><RiAttachmentLine size={22} /></span>
                  <span className="chat-profile-modal__stat-label">Files:</span>
                  <span className="chat-profile-modal__stat-value">{stats.total_files}</span>
                </div>
              </div>
            ) : (
              <p className="chat-profile-modal__error">Failed to load stats</p>
            )}
          </div>

          {isGroupChat && chat.members && (
            <div className="chat-profile-modal__section">
              <h4 className="chat-profile-modal__section-title">
                Members ({chat.members.length})
              </h4>
              <div className="chat-profile-modal__members">
                {chat.members.map((member) => (
                  <div key={member.id} className="chat-profile-modal__member">
                    <div className="chat-profile-modal__member-avatar">
                      {member.user_avatar ? (
                        <img src={member.user_avatar} alt={member.user_full_name} />
                      ) : (
                        member.user_full_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="chat-profile-modal__member-info">
                      <div className="chat-profile-modal__member-name">
                        {member.user_full_name}
                        {member.user === currentUser.id && " (You)"}
                      </div>
                      <div className="chat-profile-modal__member-role">
                        {member.role === "owner" && "Owner"}
                        {member.role === "admin" && "Admin"}
                        {member.role === "member" && "Member"}
                      </div>
                    </div>
                    {isAdmin && member.user !== currentUser.id && member.role !== "owner" && (
                      <button
                        className="chat-profile-modal__member-remove"
                        onClick={() => handleRemoveMember(member.user)}
                        disabled={removingMemberId === member.user}
                        title="Remove member"
                      >
                        <RiCloseLine size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {isAdmin && (
                <button
                  className="chat-profile-modal__add-member"
                  onClick={() => setShowAddMemberModal(true)}
                >
                  <RiUserAddLine size={16} /> Add member
                </button>
              )}
            </div>
          )}

          <div className="chat-profile-modal__section">
            <h4 className="chat-profile-modal__section-title">Actions</h4>
            <div className="chat-profile-modal__actions">
              <button
                className="chat-profile-modal__action-button"
                onClick={() => alert("Mute notifications will be available soon")}
              >
                <RiNotificationOffLine size={16} /> Mute notifications
              </button>
              {isGroupChat && !isOwner && (
                <button
                  className="chat-profile-modal__action-button chat-profile-modal__action-button--danger"
                  onClick={() => setShowLeaveConfirm(true)}
                  disabled={isLeaving}
                >
                  <RiDoorOpenLine size={16} /> Leave chat
                </button>
              )}
              {(!isGroupChat || isOwner) && (
                <button
                  className="chat-profile-modal__action-button chat-profile-modal__action-button--danger"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                >
                  <RiDeleteBin6Line size={16} /> Delete chat
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete chat"
        message={
          isGroupChat
            ? `Are you sure you want to delete "${chat.title}"?\n\nThis cannot be undone. All messages and files will be deleted for all members.`
            : `Are you sure you want to delete the chat with "${otherMember?.user_full_name || chat.title}"?\n\nThis cannot be undone. All messages and files will be deleted.`
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteChat}
        onCancel={() => setShowDeleteConfirm(false)}
        isLoading={isDeleting}
      />

      <ConfirmModal
        isOpen={showLeaveConfirm}
        title="Leave chat"
        message={`Are you sure you want to leave "${chat.title}"?\n\nYou will no longer receive messages from this chat. Only the owner can add you back.`}
        confirmText="Leave"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleLeaveChat}
        onCancel={() => setShowLeaveConfirm(false)}
        isLoading={isLeaving}
      />

      <AddMemberModal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        chatId={chat.id}
        existingMemberIds={chat.members?.map((m) => m.user) || []}
        onMembersAdded={() => {
          // Chat members will be updated via WebSocket
        }}
      />
    </div>
  );
}
