import { useEffect, useState } from 'react';
import { RiCheckLine, RiCloseLine, RiNotification3Line } from 'react-icons/ri';
import { apiAcceptInvitation, apiDeclineInvitation, apiGetInvitations } from '../../../api/invitationsApi';
import { apiGetNotifications, apiMarkNotificationRead } from '../../../api/notificationsApi';
import './NotificationsPanel.css';

function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export function NotificationsPanel({ open, onCountChange }) {
    const [invitations, setInvitations] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        Promise.all([apiGetInvitations(), apiGetNotifications()]).then(([invRes, notifRes]) => {
            setLoading(false);
            if (invRes.ok) setInvitations(invRes.data);
            if (notifRes.ok) setNotifications(notifRes.data);
        });
    }, [open]);

    const handleAccept = async (inv) => {
        setActionLoading(inv.id);
        const { ok } = await apiAcceptInvitation(inv.id);
        setActionLoading(null);
        if (ok) {
            setInvitations(prev => prev.filter(i => i.id !== inv.id));
            onCountChange?.(-1);
            window.dispatchEvent(new Event('teamInviteAccepted'));
        }
    };

    const handleDecline = async (inv) => {
        setActionLoading(inv.id);
        const { ok } = await apiDeclineInvitation(inv.id);
        setActionLoading(null);
        if (ok) {
            setInvitations(prev => prev.filter(i => i.id !== inv.id));
            onCountChange?.(-1);
        }
    };

    const handleDismissNotif = async (notif) => {
        setActionLoading(notif.id);
        const { ok } = await apiMarkNotificationRead(notif.id);
        setActionLoading(null);
        if (ok) {
            setNotifications(prev => prev.filter(n => n.id !== notif.id));
            onCountChange?.(-1);
        }
    };

    const isEmpty = invitations.length === 0 && notifications.length === 0;

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
                ) : isEmpty ? (
                    <div className="np-empty">
                        <RiNotification3Line size={26} />
                        <span>No notifications</span>
                    </div>
                ) : (
                    <>
                        {invitations.map(inv => (
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
                        ))}

                        {notifications.map(notif => (
                            <div key={notif.id} className="np-item np-item--info">
                                <div className="np-item-top">
                                    <div className="np-avatar np-avatar--project">P</div>
                                    <div className="np-item-info">
                                        <span className="np-from">{notif.title}</span>
                                        <span className="np-time">{timeAgo(notif.created_at)}</span>
                                    </div>
                                    <button
                                        className="np-dismiss-btn"
                                        onClick={() => handleDismissNotif(notif)}
                                        disabled={actionLoading === notif.id}
                                    >
                                        <RiCloseLine size={13} />
                                    </button>
                                </div>
                                <p className="np-text">{notif.body}</p>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
