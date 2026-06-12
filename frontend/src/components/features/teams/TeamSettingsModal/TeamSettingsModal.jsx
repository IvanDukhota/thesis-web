import { useState } from 'react';
import { createPortal } from 'react-dom';
import { RiCloseLine, RiErrorWarningLine } from 'react-icons/ri';
import '../CreateTeamModal/CreateTeamModal.css';
import './TeamSettingsModal.css';

function DeleteConfirm({ teamName, onConfirm, onCancel }) {
    return createPortal(
        <div className="tsm-confirm-overlay">
            <div className="tsm-confirm">
                <div className="tsm-confirm-icon"><RiErrorWarningLine size={24} /></div>
                <p className="tsm-confirm-title">Delete &quot;{teamName}&quot;?</p>
                <p className="tsm-confirm-sub">
                    This action is permanent. All projects, members and data
                    associated with this team will be removed.
                </p>
                <div className="tsm-confirm-actions">
                    <button className="ctm-btn ctm-btn--cancel" onClick={onCancel}>Cancel</button>
                    <button className="tsm-delete-btn" onClick={onConfirm}>Yes, delete team</button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export function TeamSettingsModal({ teamName, teamDesc, onClose, onSave, onDelete }) {
    const [name, setName] = useState(teamName);
    const [desc, setDesc] = useState(teamDesc || '');
    const [nameErr, setNameErr] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleSave = () => {
        if (!name.trim()) { setNameErr(true); return; }
        onSave({ name, desc });
        onClose();
    };

    const handleDelete = () => {
        onDelete();
        onClose();
    };

    return (
        <>
            <div className="ctm-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
                <div className="ctm-modal tsm-modal">
                    <div className="ctm-header">
                        <span className="ctm-header-title">Team settings</span>
                        <button className="ctm-icon-btn" onClick={onClose}><RiCloseLine size={18} /></button>
                    </div>

                    <div className="ctm-body">
                        <div className="ctm-section">
                            <div className="ctm-field">
                                <label className="ctm-label">Team name <span className="ctm-required">*</span></label>
                                <input
                                    className={`ctm-input ${nameErr ? 'ctm-input--error' : ''}`}
                                    value={name}
                                    onChange={e => { setName(e.target.value); setNameErr(false); }}
                                />
                                {nameErr && <span className="ctm-error-text">Team name is required</span>}
                            </div>
                            <div className="ctm-field">
                                <label className="ctm-label">Description</label>
                                <textarea
                                    className="ctm-textarea"
                                    value={desc}
                                    onChange={e => setDesc(e.target.value)}
                                    placeholder="Describe your team..."
                                    rows={4}
                                />
                            </div>
                        </div>

                        <div className="ctm-divider" />

                        <div className="ctm-section">
                            <p className="tsm-danger-title">Danger zone</p>
                            <div className="tsm-danger-row">
                                <div>
                                    <p className="tsm-danger-label">Delete this team</p>
                                    <p className="tsm-danger-sub">Once deleted, all data will be permanently removed.</p>
                                </div>
                                <button className="tsm-delete-btn" onClick={() => setShowConfirm(true)}>
                                    Delete team
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="ctm-footer">
                        <button className="ctm-btn ctm-btn--cancel" onClick={onClose}>Cancel</button>
                        <button className="ctm-btn ctm-btn--create" onClick={handleSave}>Save changes</button>
                    </div>
                </div>
            </div>

            {showConfirm && (
                <DeleteConfirm
                    teamName={name}
                    onConfirm={handleDelete}
                    onCancel={() => setShowConfirm(false)}
                />
            )}
        </>
    );
}