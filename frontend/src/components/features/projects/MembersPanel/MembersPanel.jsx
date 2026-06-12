import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RiCloseLine, RiSettings3Line, RiUserAddLine } from 'react-icons/ri';
import { InviteMembersModal } from '../InviteMembersModal/InviteMembersModal';
import { MemberActionModal } from '../MemberActionModal/MemberActionModal';
import './MembersPanel.css';

const INIT_MEMBERS = [
    { name: 'Alex K.', role: 'Owner' },
    { name: 'Maria S.', role: 'Developer' },
    { name: 'Ivan D.', role: 'Designer' },
    { name: 'Olha P.', role: 'Developer' },
];

export function MembersPanel({ onClose }) {
    const [closing, setClosing] = useState(false);
    const [members, setMembers] = useState(INIT_MEMBERS);
    const [showInvite, setShowInvite] = useState(false);
    const [activeMember, setActiveMember] = useState(null);

    useEffect(() => {
        document.documentElement.style.overflow = 'hidden';
        return () => { document.documentElement.style.overflow = ''; };
    }, []);

    const handleClose = () => {
        setClosing(true);
        setTimeout(onClose, 220);
    };

    const handleInvite = (newMembers) => {
        setMembers(prev => [...prev, ...newMembers.map(m => ({ ...m, role: 'Developer' }))]);
    };

    const handleSaveRole = (updated) => {
        setMembers(prev => prev.map(m => m.name === updated.name ? updated : m));
    };

    const handleRemove = (name) => {
        setMembers(prev => prev.filter(m => m.name !== name));
    };

    return createPortal(
        <>
            <div className={`msb-backdrop ${closing ? 'msb-backdrop--closing' : ''}`} onClick={handleClose} />
            <div className={`msb-panel ${closing ? 'msb-panel--closing' : ''}`}>
                <div className="msb-header">
                    <span className="msb-title">Project members</span>
                    <button className="msb-close" onClick={handleClose}>
                        <RiCloseLine size={18} />
                    </button>
                </div>

                <div className="msb-body">
                    <p className="msb-section-label">Members · {members.length}</p>
                    <div className="msb-list">
                        {members.map((m, i) => (
                            <div key={i} className="msb-member">
                                <div className="msb-avatar">{m.name[0]}</div>
                                <div className="msb-info">
                                    <span className="msb-name">{m.name}</span>
                                    <span className="msb-role">{m.role}</span>
                                </div>
                                <button className="msb-gear" onClick={() => setActiveMember(m)}>
                                    <RiSettings3Line size={13} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="msb-footer">
                    <button className="msb-invite-btn" onClick={() => setShowInvite(true)}>
                        <RiUserAddLine size={14} />
                        Invite member
                    </button>
                </div>
            </div>

            {showInvite && (
                <InviteMembersModal
                    projectMembers={members}
                    onClose={() => setShowInvite(false)}
                    onInvite={handleInvite}
                />
            )}

            {activeMember && (
                <MemberActionModal
                    member={activeMember}
                    onClose={() => setActiveMember(null)}
                    onSave={handleSaveRole}
                    onRemove={handleRemove}
                />
            )}
        </>,
        document.body
    );
}
