import { useState } from 'react';
import { createPortal } from 'react-dom';
import { RiCloseLine, RiUserLine, RiAddLine, RiCheckLine } from 'react-icons/ri';
import { apiSearchUser, apiSendInvite } from '../../../api/invitationsApi';
import './CreateTeamModal/CreateTeamModal.css';

export function InviteModal({ teamId, onClose }) {
    const [input, setInput] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [searchError, setSearchError] = useState('');
    const [searching, setSearching] = useState(false);
    const [pending, setPending] = useState([]);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [sendError, setSendError] = useState('');

    const handleSearch = async () => {
        const username = input.trim().replace(/^@/, '');
        if (!username) return;
        setSearching(true);
        setSearchResult(null);
        setSearchError('');
        const { ok, data } = await apiSearchUser(username);
        setSearching(false);
        if (ok) {
            if (pending.find(p => p.id === data.id)) {
                setSearchError('Already added to invite list');
            } else {
                setSearchResult(data);
            }
        } else {
            setSearchError(data.detail || 'No user with this username');
        }
    };

    const addToPending = (user) => {
        setPending(p => [...p, user]);
        setSearchResult(null);
        setInput('');
        setSearchError('');
    };

    const removeFromPending = (id) => setPending(p => p.filter(u => u.id !== id));

    const handleSend = async () => {
        if (pending.length === 0) return;
        setSending(true);
        setSendError('');
        let allOk = true;
        for (const user of pending) {
            const { ok, data } = await apiSendInvite(teamId, user.id);
            if (!ok) {
                allOk = false;
                setSendError(data.detail || 'Failed to send some invitations');
            }
        }
        setSending(false);
        if (allOk) {
            setSent(true);
            setTimeout(onClose, 900);
        }
    };

    return createPortal(
        <div className="ctm-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="ctm-modal" style={{ width: 420 }}>
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
                                    onChange={e => { setInput(e.target.value); setSearchResult(null); setSearchError(''); }}
                                    placeholder="username"
                                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                    disabled={sending || sent}
                                />
                            </div>
                            <button
                                className="ctm-invite-btn"
                                onClick={handleSearch}
                                disabled={searching || sending || sent}
                            >
                                {searching ? '...' : 'Search'}
                            </button>
                        </div>

                        {searchResult && (
                            <div className="im-found-user" onClick={() => addToPending(searchResult)}>
                                <div className="im-found-avatar">{searchResult.username[0].toUpperCase()}</div>
                                <span className="im-found-name">@{searchResult.username}</span>
                                <RiAddLine size={14} className="im-found-add" />
                            </div>
                        )}

                        {searchError && (
                            <p className="im-search-error">{searchError}</p>
                        )}

                        {pending.length > 0 && (
                            <div className="ctm-invited-list" style={{ marginTop: 12 }}>
                                {pending.map(u => (
                                    <div key={u.id} className="ctm-invited-item">
                                        <span className="ctm-invited-email">@{u.username}</span>
                                        <button
                                            className="ctm-icon-btn"
                                            onClick={() => removeFromPending(u.id)}
                                            disabled={sending || sent}
                                        >
                                            <RiCloseLine size={13} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {sendError && <p className="ctm-error-text" style={{ marginTop: 8 }}>{sendError}</p>}
                    </div>
                </div>
                <div className="ctm-footer">
                    <button className="ctm-btn ctm-btn--cancel" onClick={onClose} disabled={sending}>Cancel</button>
                    <button
                        className="ctm-btn ctm-btn--create"
                        onClick={handleSend}
                        disabled={pending.length === 0 || sending || sent}
                    >
                        {sent ? <><RiCheckLine size={14} /> Sent!</> : sending ? 'Sending...' : 'Send invites'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
