import { useState } from 'react';
import { createPortal } from 'react-dom';
import { RiCloseLine, RiUserLine } from 'react-icons/ri';
import './CreateTeamModal/CreateTeamModal.css';

export function InviteModal({ onClose, onInvite }) {
    const [input, setInput] = useState('');
    const [invited, setInvited] = useState([]);

    const add = () => {
        const nick = input.trim().replace(/^@/, '');
        if (!nick) return;
        if (invited.includes(nick)) return;
        setInvited(v => [...v, nick]);
        setInput('');
    };

    const send = () => {
        onInvite(invited);
        onClose();
    };

    return createPortal(
        <div className="ctm-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="ctm-modal" style={{ width: 400 }}>
                <div className="ctm-header">
                    <span className="ctm-header-title">Invite members</span>
                    <button className="ctm-icon-btn" onClick={onClose}><RiCloseLine size={18} /></button>
                </div>
                <div className="ctm-body">
                    <div className="ctm-section">
                        <div className="ctm-invite-row">
                            <div className="ctm-invite-input-wrap">
                                <RiUserLine size={14} className="ctm-invite-icon" />
                                <input
                                    className="ctm-input ctm-invite-input"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    placeholder="nickname"
                                    onKeyDown={e => e.key === 'Enter' && add()}
                                />
                            </div>
                            <button className="ctm-invite-btn" onClick={add}>Add</button>
                        </div>
                        {invited.length > 0 && (
                            <div className="ctm-invited-list">
                                {invited.map(nick => (
                                    <div key={nick} className="ctm-invited-item">
                                        <span className="ctm-invited-email">@{nick}</span>
                                        <button className="ctm-icon-btn"
                                            onClick={() => setInvited(v => v.filter(n => n !== nick))}>
                                            <RiCloseLine size={13} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="ctm-footer">
                    <button className="ctm-btn ctm-btn--cancel" onClick={onClose}>Cancel</button>
                    <button className="ctm-btn ctm-btn--create" onClick={send} disabled={invited.length === 0}>
                        Send invites
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}