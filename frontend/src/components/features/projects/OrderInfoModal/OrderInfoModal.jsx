import { useEffect, useState } from 'react';
import { RiCloseLine, RiDownloadLine, RiPriceTag3Line, RiCalendarLine, RiTimeLine, RiMoneyDollarCircleLine, RiAlertLine } from 'react-icons/ri';
import { apiAbandonProject } from '../../../../api/projectsApi';
import './order-info-modal.css';

export function OrderInfoModal({ orderInfo, projectId, onClose, onAbandon }) {
    const [showConfirm, setShowConfirm] = useState(false);
    const [abandoning, setAbandoning] = useState(false);

    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') { if (showConfirm) setShowConfirm(false); else onClose(); } };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose, showConfirm]);

    const handleAbandon = async () => {
        setAbandoning(true);
        const { ok } = await apiAbandonProject(projectId);
        setAbandoning(false);
        if (ok) onAbandon?.();
    };

    const images = orderInfo.attachments.filter((a) => a.file_type === 'image');
    const files = orderInfo.attachments.filter((a) => a.file_type === 'file');

    return (
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

                    <div className="oim-meta-row">
                        <div className="oim-meta-item">
                            <RiMoneyDollarCircleLine size={14} />
                            <span className="oim-meta-label">Budget</span>
                            <span className="oim-meta-value">${orderInfo.price}</span>
                        </div>
                        <div className="oim-meta-item">
                            <RiTimeLine size={14} />
                            <span className="oim-meta-label">Delivery</span>
                            <span className="oim-meta-value">{orderInfo.estimated_days} days</span>
                        </div>
                        {orderInfo.deadline && (
                            <div className="oim-meta-item oim-meta-item--deadline">
                                <RiCalendarLine size={14} />
                                <span className="oim-meta-label">Deadline</span>
                                <span className="oim-meta-value">{orderInfo.deadline}</span>
                            </div>
                        )}
                        {orderInfo.category && (
                            <div className="oim-meta-item">
                                <span className="oim-meta-label">Category</span>
                                <span className="oim-meta-value">{orderInfo.category}</span>
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

                    <div className="oim-section-label">Description</div>
                    <p className="oim-description">{orderInfo.description}</p>

                    {images.length > 0 && (
                        <>
                            <div className="oim-section-label">Images</div>
                            <div className="oim-images-grid">
                                {images.map((img, i) => (
                                    <a key={i} href={img.url} target="_blank" rel="noopener noreferrer" className="oim-image-wrap">
                                        <img src={img.url} alt={img.filename} className="oim-image" />
                                    </a>
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

                    {projectId && (
                        <div className="oim-abandon-section">
                            {!showConfirm ? (
                                <button className="oim-abandon-btn" onClick={() => setShowConfirm(true)}>
                                    Abandon Order
                                </button>
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
        </div>
    );
}
