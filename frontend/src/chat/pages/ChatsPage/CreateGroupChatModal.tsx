import { useEffect, useRef, useState } from "react";
import { getContacts, type User } from "../../shared/api/auth";
import "./modal.css";

type CreateGroupChatModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (params: {
    title: string;
    description: string;
    avatar: string;
    member_ids: number[];
  }) => void;
  isCreating: boolean;
};

export default function CreateGroupChatModal({
  isOpen,
  onClose,
  onCreate,
  isCreating,
}: CreateGroupChatModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [avatar, setAvatar] = useState("");
  const [contacts, setContacts] = useState<User[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<number>>(new Set());
  const [loadingContacts, setLoadingContacts] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setDescription("");
      setAvatar("");
      setSelectedMemberIds(new Set());
      loadContacts();
    }
  }, [isOpen]);

  const loadContacts = async () => {
    setLoadingContacts(true);
    try {
      const data = await getContacts();
      setContacts(data);
    } finally {
      setLoadingContacts(false);
    }
  };

  const toggleMember = (userId: number) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("Название группы обязательно");
      return;
    }

    if (selectedMemberIds.size === 0) {
      alert("Выберите хотя бы одного участника");
      return;
    }

    onCreate({
      title: title.trim(),
      description: description.trim(),
      avatar: avatar.trim(),
      member_ids: Array.from(selectedMemberIds),
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  const avatarLetter = title.trim() ? title.trim().charAt(0).toUpperCase() : "?";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Создать групповой чат</h2>
          <button className="modal-close" onClick={onClose} disabled={isCreating}>
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="modal-avatar-section">
            <div
              className="modal-avatar-upload"
              onClick={handleAvatarClick}
              title="Нажмите, чтобы выбрать аватарку"
            >
              {avatar ? (
                <img src={avatar} alt="Аватарка группы" className="modal-avatar-image" />
              ) : (
                <div className="modal-avatar-placeholder">{avatarLetter}</div>
              )}
              <div className="modal-avatar-overlay">
                <span className="modal-avatar-icon">📷</span>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="modal-file-input-hidden"
              accept="image/*"
              onChange={handleAvatarChange}
              disabled={isCreating}
            />
          </div>

          <div className="modal-form-group">
            <label className="modal-label" htmlFor="title">
              Название группы *
            </label>
            <input
              id="title"
              type="text"
              className="modal-input"
              placeholder="Введите название группы"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isCreating}
              maxLength={255}
              required
            />
          </div>

          <div className="modal-form-group">
            <label className="modal-label" htmlFor="description">
              Описание
            </label>
            <textarea
              id="description"
              className="modal-textarea"
              placeholder="Введите описание группы (необязательно)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isCreating}
              rows={3}
            />
          </div>

          <div className="modal-form-group">
            <label className="modal-label">
              Участники * ({selectedMemberIds.size} выбрано)
            </label>

            {loadingContacts ? (
              <div className="modal-contacts-loading">Загрузка контактов...</div>
            ) : contacts.length === 0 ? (
              <div className="modal-contacts-empty">
                У вас пока нет контактов. Добавьте контакты на странице "Пользователи".
              </div>
            ) : (
              <div className="modal-contacts-list">
                {contacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    className={
                      selectedMemberIds.has(contact.id)
                        ? "modal-contact-card modal-contact-card--selected"
                        : "modal-contact-card"
                    }
                    onClick={() => toggleMember(contact.id)}
                    disabled={isCreating}
                  >
                    <div className="modal-contact-avatar">
                      {contact.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="modal-contact-info">
                      <div className="modal-contact-name">{contact.full_name}</div>
                      <div className="modal-contact-email">{contact.email}</div>
                    </div>
                    {selectedMemberIds.has(contact.id) && (
                      <div className="modal-contact-check">✓</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="modal-button modal-button--secondary"
              onClick={onClose}
              disabled={isCreating}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="modal-button modal-button--primary"
              disabled={isCreating || !title.trim() || selectedMemberIds.size === 0}
            >
              {isCreating ? "Создание..." : "Создать группу"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
