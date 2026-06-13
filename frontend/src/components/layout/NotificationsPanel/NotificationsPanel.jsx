import { useEffect, useState } from 'react';
import { RiCheckLine, RiCloseLine, RiNotification3Line } from 'react-icons/ri';
import { apiAcceptInvitation, apiDeclineInvitation, apiGetInvitations } from '../../../api/invitationsApi';
import './NotificationsPanel.css';

function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export function NotificationsPanel({ open, onCountChange }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        apiGetInvitations().then(({ ok, data }) => {
            setLoading(false);
            if (ok) setItems(data);
        });
    }, [open]);

    const handleAccept = async (inv) => {
        setActionLoading(inv.id);
        const { ok } = await apiAcceptInvitation(inv.id);
        setActionLoading(null);
        if (ok) {
            setItems(prev => prev.filter(i => i.id !== inv.id));
            onCountChange?.(-1);
            window.dispatchEvent(new Event('teamInviteAccepted'));
        }
    };

    const handleDecline = async (inv) => {
        setActionLoading(inv.id);
        const { ok } = await apiDeclineInvitation(inv.id);
        setActionLoading(null);
        if (ok) {
            setItems(prev => prev.filter(i => i.id !== inv.id));
            onCountChange?.(-1);
        }
    };

    return (
        <div className={`np-dropdown ${open ? 'np-dropdown--open' : ''}`}>
            <div className="np-header">
                <span className="np-title">Notifications</span>
            </div>

            <div className="np-body">
                {loading ? (
                    <div className="np-empty">
                        <span>Loading...</span>
                    </div>
                ) : items.length === 0 ? (
                    <div className="np-empty">
                        <RiNotification3Line size={26} />
                        <span>No notifications</span>
                    </div>
                ) : (
                    items.map(inv => (
                        <div key={inv.id} className="np-item">
                            <div className="np-item-top">
                                <div className="np-avatar">{inv.invited_by.username[0].toUpperCase()}</div>
                                <div className="np-item-info">
                                    <span className="np-from">{inv.invited_by.username}</span>
                                    <span className="np-time">{timeAgo(inv.created_at)}</span>
                                </div>
                            </div>
                            <p className="np-text">
                                Invited you to join <strong>{inv.team.name}</strong>
                            </p>
                            <div className="np-actions">
                                <button
                                    className="np-accept-btn"
                                    onClick={() => handleAccept(inv)}
                                    disabled={actionLoading === inv.id}
                                >
                                    <RiCheckLine size={12} />
                                    Accept
                                </button>
                                <button
                                    className="np-decline-btn"
                                    onClick={() => handleDecline(inv)}
                                    disabled={actionLoading === inv.id}
                                >
                                    <RiCloseLine size={12} />
                                    Decline
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
