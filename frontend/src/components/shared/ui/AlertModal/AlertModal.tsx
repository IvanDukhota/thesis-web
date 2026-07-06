import "./alertModal.css";

type AlertModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  buttonText?: string;
  variant?: "danger" | "warning" | "info" | "success";
  onClose: () => void;
};

export default function AlertModal({
  isOpen,
  title,
  message,
  buttonText = "ОК",
  variant = "info",
  onClose,
}: AlertModalProps) {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="alert-modal__overlay" onClick={handleOverlayClick}>
      <div className="alert-modal">
        <div className="alert-modal__header">
          <h3 className="alert-modal__title">{title}</h3>
        </div>

        <div className="alert-modal__content">
          <p className="alert-modal__message">{message}</p>
        </div>

        <div className="alert-modal__actions">
          <button
            className={`alert-modal__button alert-modal__button--${variant}`}
            onClick={onClose}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}
