import { useState } from 'react';
import { createPortal } from 'react-dom';
import { RiCloseLine, RiUserUnfollowLine } from 'react-icons/ri';
import './MemberActionModal.css';

const ROLES = ['Owner', 'Developer', 'Designer', 'Tester', 'Viewer'];

export function MemberActionModal({ member, onClose, onSave, onRemove }) {
    const [role, setRole] = useState(member.role);
    const [confirmRemove, setConfirmRemove] = useState(false);

    const handleSave = () => {
        onSave({ ...member, role });
        onClose();
    };

    const handleRemove = () => {
        if (!confirmRemove) { setConfirmRemove(true); return; }
        onRemove(member.name);
        onClose();
    };

    return createPortal(
        <div className="mam-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="mam-modal">
                <div className="mam-header">
                    <div className="mam-member-info">
                        <div className="mam-avatar">{member.name[0]}</div>
                        <div>
                            <span className="mam-name">{member.name}</span>
                            <span className="mam-current-role">{member.role}</span>
                        </div>
                    </div>
                    <button className="mam-close" onClick={onClose}><RiCloseLine size={18} /></button>
                </div>

                <div className="mam-body">
                    <p className="mam-label">Change role</p>
                    <div className="mam-roles">
                        {ROLES.map(r => (
                            <button
                                key={r}
                                className={`mam-role-pill ${role === r ? 'mam-role-pill--active' : ''}`}
                                onClick={() => setRole(r)}
                            >
                                {r}
                            </button>
                        ))}
                    </div>

                    <button
                        className={`mam-remove-btn ${confirmRemove ? 'mam-remove-btn--confirm' : ''}`}
                        onClick={handleRemove}
                    >
                        <RiUserUnfollowLine size={14} />
                        {confirmRemove ? 'Click again to confirm' : 'Remove from project'}
                    </button>
                </div>

                <div className="mam-footer">
                    <button className="mam-btn mam-btn--cancel" onClick={onClose}>Cancel</button>
                    <button className="mam-btn mam-btn--save" onClick={handleSave}>Save changes</button>
                </div>
            </div>
        </div>,
        document.body
    );
}
