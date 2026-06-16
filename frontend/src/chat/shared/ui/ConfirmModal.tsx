import "./confirmModal.css";

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
};

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Подтвердить",
  cancelText = "Отмена",
  variant = "info",
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onCancel();
    }
  };

  return (
    <div className="confirm-modal__overlay" onClick={handleOverlayClick}>
      <div className="confirm-modal">
        <div className="confirm-modal__header">
          <h3 className="confirm-modal__title">{title}</h3>
        </div>

        <div className="confirm-modal__content">
          <p className="confirm-modal__message">{message}</p>
        </div>

        <div className="confirm-modal__actions">
          <button
            className="confirm-modal__button confirm-modal__button--secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            className={`confirm-modal__button confirm-modal__button--${variant}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Загрузка..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
