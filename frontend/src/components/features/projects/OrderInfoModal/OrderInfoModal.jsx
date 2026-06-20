import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiCloseLine, RiDownloadLine, RiPriceTag3Line, RiAlertLine, RiMessage3Line } from 'react-icons/ri';
import { apiAbandonProject } from '../../../../api/projectsApi';
import { apiAddContact } from '../../../../api/contactsApi';
import ImageModal from '../../chat/ImageModal/ImageModal';
import './order-info-modal.css';

export function OrderInfoModal({ orderInfo, projectId, onClose, onAbandon }) {
    const navigate = useNavigate();
    const [showConfirm, setShowConfirm] = useState(false);
    const [abandoning, setAbandoning] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxImageId, setLightboxImageId] = useState('');

    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape') { if (showConfirm) setShowConfirm(false); else onClose(); }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose, showConfirm]);

    const handleContactClient = async () => {
        if (!orderInfo.buyer) return;
        await apiAddContact(orderInfo.buyer.id);
        navigate('/chat');
    };

    const handleAbandon = async () => {
        setAbandoning(true);
        const { ok } = await apiAbandonProject(projectId);
        setAbandoning(false);
        if (ok) onAbandon?.();
    };

    const images = orderInfo.attachments.filter((a) => a.file_type === 'image');
    const files = orderInfo.attachments.filter((a) => a.file_type === 'file');

    const lightboxImages = images.map((img) => ({ url: img.url || '', name: img.filename || '', id: img.id }));
    const lightboxCurrent = lightboxImages.find((img) => img.id === lightboxImageId);

    const handleOpenLightbox = (id) => { setLightboxImageId(id); setLightboxOpen(true); };
    const handleLightboxNavigate = (direction) => {
        const idx = lightboxImages.findIndex((img) => img.id === lightboxImageId);
        if (direction === 'prev' && idx > 0) setLightboxImageId(lightboxImages[idx - 1].id);
        if (direction === 'next' && idx < lightboxImages.length - 1) setLightboxImageId(lightboxImages[idx + 1].id);
    };

    return (
        <>
        <ImageModal
            isOpen={lightboxOpen}
            imageUrl={lightboxCurrent?.url || ''}
            imageName={lightboxCurrent?.name || ''}
            allImages={lightboxImages}
            currentImageId={lightboxImageId}
            onClose={() => setLightboxOpen(false)}
            onNavigate={handleLightboxNavigate}
        />
        <div className="oim-overlay" onClick={() => { if (!showConfirm) onClose(); }}>
            <div className="oim-modal" onClick={(e) => e.stopPropagation()}>
                <div className="oim-header">
                    <span className="oim-title">Order Details</span>
                    <button className="oim-close" onClick={onClose}>
                        <RiCloseLine size={18} />
                    </button>
                </div>

                <div className="oim-body">
                    <h2 className="oim-order-title">{orderInfo.title}</h2>

                    {orderInfo.description && (
                        <p className="oim-description">{orderInfo.description}</p>
                    )}

                    <div className="oim-stats-grid">
                        <div className="oim-stat">
                            <span className="oim-stat-label">Budget</span>
                            <span className="oim-stat-value">${orderInfo.price}</span>
                        </div>
                        <div className="oim-stat">
                            <span className="oim-stat-label">Delivery</span>
                            <span className="oim-stat-value">{orderInfo.estimated_days} days</span>
                        </div>
                        {orderInfo.deadline && (
                            <div className="oim-stat oim-stat--deadline">
                                <span className="oim-stat-label">Deadline</span>
                                <span className="oim-stat-value">{orderInfo.deadline}</span>
                            </div>
                        )}
                        {orderInfo.category && (
                            <div className="oim-stat">
                                <span className="oim-stat-label">Category</span>
                                <span className="oim-stat-value">{orderInfo.category}</span>
                            </div>
                        )}
                    </div>

                    {orderInfo.tags && orderInfo.tags.length > 0 && (
                        <div className="oim-tags-row">
                            <RiPriceTag3Line size={13} className="oim-tags-icon" />
                            {orderInfo.tags.map((tag) => (
                                <span key={tag} className="oim-tag">{tag}</span>
                            ))}
                        </div>
                    )}

                    {images.length > 0 && (
                        <>
                            <div className="oim-section-label">Images</div>
                            <div className="oim-images-grid">
                                {images.map((img) => (
                                    <div key={img.id} className="oim-image-wrap" onClick={() => handleOpenLightbox(img.id)}>
                                        <img src={img.url} alt={img.filename} className="oim-image" />
                                        <div className="oim-image-expand">⤢</div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {files.length > 0 && (
                        <>
                            <div className="oim-section-label">Files</div>
                            <div className="oim-files-list">
                                {files.map((f, i) => (
                                    <a key={i} href={f.url} download={f.filename} className="oim-file-item" target="_blank" rel="noopener noreferrer">
                                        <RiDownloadLine size={14} />
                                        <span className="oim-file-name">{f.filename}</span>
                                    </a>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {projectId && (
                    <div className="oim-footer">
                        {!showConfirm ? (
                            <div className="oim-footer-actions">
                                {orderInfo.buyer && (
                                    <button className="oim-contact-btn" onClick={handleContactClient}>
                                        <RiMessage3Line size={13} />
                                        Contact Client
                                    </button>
                                )}
                                <button className="oim-abandon-btn" onClick={() => setShowConfirm(true)}>
                                    Abandon Order
                                </button>
                            </div>
                        ) : (
                            <div className="oim-confirm-box">
                                <div className="oim-confirm-header">
                                    <RiAlertLine size={15} className="oim-confirm-icon" />
                                    <span className="oim-confirm-title">Are you sure?</span>
                                </div>
                                <p className="oim-confirm-text">
                                    This will cancel the project, notify the client, and reopen the order for new applications.
                                </p>
                                <div className="oim-confirm-actions">
                                    <button
                                        className="oim-confirm-cancel"
                                        onClick={() => setShowConfirm(false)}
                                        disabled={abandoning}
                                    >
                                        Keep Project
                                    </button>
                                    <button
                                        className="oim-confirm-abandon"
                                        onClick={handleAbandon}
                                        disabled={abandoning}
                                    >
                                        {abandoning ? 'Abandoning…' : 'Yes, Abandon'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
        </>
    );
}
