import { useEffect, useState } from 'react';
import './image-modal.css';

interface ImageModalProps {
  isOpen: boolean;
  imageUrl: string;
  imageName: string;
  allImages: { url: string; name: string; id: string }[];
  currentImageId: string;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
}

export default function ImageModal({
  isOpen,
  imageUrl,
  imageName,
  allImages,
  currentImageId,
  onClose,
  onNavigate,
}: ImageModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'left' | 'right' | null>(null);

  const currentIndex = allImages.findIndex((img) => img.id === currentImageId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allImages.length - 1;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && hasPrev) {
        handleNavigate('prev');
      } else if (e.key === 'ArrowRight' && hasNext) {
        handleNavigate('next');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasPrev, hasNext, onClose]);

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (isAnimating) return;

    setIsAnimating(true);
    setAnimationDirection(direction === 'prev' ? 'right' : 'left');

    setTimeout(() => {
      onNavigate(direction);
      setIsAnimating(false);
      setAnimationDirection(null);
    }, 250);
  };

  if (!isOpen) return null;

  return (
    <div className="image-modal" onClick={onClose}>
      <div className="image-modal__overlay" />

      <div className="image-modal__content" onClick={(e) => e.stopPropagation()}>
        <button className="image-modal__close" onClick={onClose} title="Закрыть (Esc)">
          ×
        </button>

        <div className="image-modal__image-container">
          <img
            src={imageUrl}
            alt={imageName}
            className={`image-modal__image ${
              isAnimating ? `image-modal__image--animating-${animationDirection}` : ''
            }`}
          />
        </div>

        {hasPrev && (
          <button
            className="image-modal__nav image-modal__nav--prev"
            onClick={() => handleNavigate('prev')}
            title="Предыдущее изображение (←)"
          >
            ‹
          </button>
        )}

        {hasNext && (
          <button
            className="image-modal__nav image-modal__nav--next"
            onClick={() => handleNavigate('next')}
            title="Следующее изображение (→)"
          >
            ›
          </button>
        )}

        <div className="image-modal__footer">
          <span className="image-modal__name">{imageName}</span>
          {allImages.length > 1 && (
            <span className="image-modal__counter">
              {currentIndex + 1} / {allImages.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
