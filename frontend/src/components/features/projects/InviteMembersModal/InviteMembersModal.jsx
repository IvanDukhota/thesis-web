import { useState } from 'react';
import { createPortal } from 'react-dom';
import { RiCloseLine, RiCheckLine, RiAddLine } from 'react-icons/ri';
import './InviteMembersModal.css';

const TEAM_MEMBERS = [
    { name: 'Dmytro V.', role: 'Developer' },
    { name: 'Sofia M.', role: 'Designer' },
    { name: 'Taras B.', role: 'Tester' },
];

export function InviteMembersModal({ projectMembers, onClose, onInvite }) {
    const [selected, setSelected] = useState(new Set());

    const available = TEAM_MEMBERS.filter(
        m => !projectMembers.some(pm => pm.name === m.name)
    );

    const toggle = (name) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(name) ? next.delete(name) : next.add(name);
            return next;
        });
    };

    const handleDone = () => {
        const toAdd = available.filter(m => selected.has(m.name));
        if (toAdd.length > 0) onInvite(toAdd);
        onClose();
    };

    return createPortal(
        <div className="imm-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="imm-modal">
                <div className="imm-header">
                    <span className="imm-title">Invite to project</span>
                    <button className="imm-close" onClick={onClose}><RiCloseLine size={18} /></button>
                </div>

                <div className="imm-body">
                    {available.length === 0 ? (
                        <p className="imm-empty">All team members are already in this project.</p>
                    ) : (
                        <>
                            <p className="imm-label">Team members</p>
                            <div className="imm-list">
                                {available.map((m, i) => {
                                    const isSelected = selected.has(m.name);
                                    return (
                                        <div key={i} className={`imm-member ${isSelected ? 'imm-member--selected' : ''}`}>
                                            <div className="imm-avatar">{m.name[0]}</div>
                                            <div className="imm-info">
                                                <span className="imm-name">{m.name}</span>
                                                <span className="imm-role">{m.role}</span>
                                            </div>
                                            <button
                                                className={`imm-add-btn ${isSelected ? 'imm-add-btn--active' : ''}`}
                                                onClick={() => toggle(m.name)}
                                            >
                                                {isSelected ? <RiCheckLine size={14} /> : <RiAddLine size={14} />}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                <div className="imm-footer">
                    <button className="imm-btn imm-btn--cancel" onClick={onClose}>Cancel</button>
                    <button className="imm-btn imm-btn--done" onClick={handleDone}>
                        Done {selected.size > 0 && `(${selected.size})`}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
