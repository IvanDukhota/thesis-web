import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiCheckLine, RiCloseLine, RiNotification3Line } from 'react-icons/ri';
import { apiAcceptInvitation, apiDeclineInvitation } from '../../../api/invitationsApi';
import { apiMarkNotificationRead } from '../../../api/notificationsApi';
import { useRealtime } from '../../../providers/RealtimeProvider';
import './NotificationsPanel.css';

function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export function NotificationsPanel({ open }) {
    const navigate = useNavigate();
    const { notifications, removeNotification } = useRealtime();
    const [actionLoading, setActionLoading] = useState(null);

    const handleAccept = async (inv) => {
        setActionLoading(inv.id);
        const { ok } = await apiAcceptInvitation(inv.id);
        setActionLoading(null);
        if (ok) {
            removeNotification(inv.id);
            window.dispatchEvent(new Event('teamInviteAccepted'));
        }
    };

    const handleDecline = async (inv) => {
        setActionLoading(inv.id);
        const { ok } = await apiDeclineInvitation(inv.id);
        setActionLoading(null);
        if (ok) removeNotification(inv.id);
    };

    const handleDismissNotif = async (notif) => {
        setActionLoading(notif.id);
        const { ok } = await apiMarkNotificationRead(notif.id);
        setActionLoading(null);
        if (ok) removeNotification(notif.id);
    };

    const handleApplicationClick = (notif) => {
        removeNotification(notif.id);
        navigate('/marketplace', { state: { tab: 'applications' } });
    };

    return (
        <div className={`np-dropdown ${open ? 'np-dropdown--open' : ''}`}>
            <div className="np-header">
                <span className="np-title">Notifications</span>
            </div>

            <div className="np-body">
                {notifications.length === 0 ? (
                    <div className="np-empty">
                        <RiNotification3Line size={26} />
                        <span>No notifications</span>
                    </div>
                ) : (
                    notifications.map((item) => {
                        if (item.kind === 'invitation') {
                            return (
                                <div key={item.id} className="np-item">
                                    <div className="np-item-top">
                                        <div className="np-avatar">{item.invited_by.username[0].toUpperCase()}</div>
                                        <div className="np-item-info">
                                            <span className="np-from">{item.invited_by.username}</span>
                                            <span className="np-time">{timeAgo(item.created_at)}</span>
                                        </div>
                                    </div>
                                    <p className="np-text">
                                        Invited you to join <strong>{item.team.name}</strong>
                                    </p>
                                    <div className="np-actions">
                                        <button
                                            className="np-accept-btn"
                                            onClick={() => handleAccept(item)}
                                            disabled={actionLoading === item.id}
                                        >
                                            <RiCheckLine size={12} />
                                            Accept
                                        </button>
                                        <button
                                            className="np-decline-btn"
                                            onClick={() => handleDecline(item)}
                                            disabled={actionLoading === item.id}
                                        >
                                            <RiCloseLine size={12} />
                                            Decline
                                        </button>
                                    </div>
                                </div>
                            );
                        }

                        if (item.kind === 'general') {
                            return (
                                <div key={item.id} className="np-item np-item--info">
                                    <div className="np-item-top">
                                        <div className="np-avatar np-avatar--project">P</div>
                                        <div className="np-item-info">
                                            <span className="np-from">{item.title}</span>
                                            <span className="np-time">{timeAgo(item.created_at)}</span>
                                        </div>
                                        <button
                                            className="np-dismiss-btn"
                                            onClick={() => handleDismissNotif(item)}
                                            disabled={actionLoading === item.id}
                                        >
                                            <RiCloseLine size={13} />
                                        </button>
                                    </div>
                                    <p className="np-text">{item.body}</p>
                                </div>
                            );
                        }

                        if (item.kind === 'new_application') {
                            return (
                                <div
                                    key={item.id}
                                    className="np-item np-item--application"
                                    onClick={() => handleApplicationClick(item)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="np-item-top">
                                        <div className="np-avatar np-avatar--application">A</div>
                                        <div className="np-item-info">
                                            <span className="np-from">{item.applicant_name}</span>
                                            <span className="np-time">{timeAgo(item.created_at)}</span>
                                        </div>
                                    </div>
                                    <p className="np-text">
                                        Applied for <strong>{item.order_title}</strong>
                                    </p>
                                </div>
                            );
                        }

                        if (item.kind === 'application_accepted') {
                            return (
                                <div
                                    key={item.id}
                                    className="np-item np-item--accepted"
                                    onClick={() => { removeNotification(item.id); navigate(`/projects/${item.project_id}`); }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="np-item-top">
                                        <div className="np-avatar np-avatar--accepted">✓</div>
                                        <div className="np-item-info">
                                            <span className="np-from">Application Accepted</span>
                                            <span className="np-time">{timeAgo(item.created_at)}</span>
                                        </div>
                                    </div>
                                    <p className="np-text">
                                        Your application for <strong>{item.order_title}</strong> was accepted. Project created!
                                    </p>
                                </div>
                            );
                        }

                        if (item.kind === 'application_rejected') {
                            return (
                                <div key={item.id} className="np-item np-item--rejected">
                                    <div className="np-item-top">
                                        <div className="np-avatar np-avatar--rejected">✕</div>
                                        <div className="np-item-info">
                                            <span className="np-from">Application Declined</span>
                                            <span className="np-time">{timeAgo(item.created_at)}</span>
                                        </div>
                                        <button
                                            className="np-dismiss-btn"
                                            onClick={(e) => { e.stopPropagation(); removeNotification(item.id); }}
                                        >
                                            <RiCloseLine size={13} />
                                        </button>
                                    </div>
                                    <p className="np-text">
                                        Your application for <strong>{item.order_title}</strong> was declined.
                                    </p>
                                </div>
                            );
                        }

                        if (item.kind === 'order_abandoned') {
                            return (
                                <div
                                    key={item.id}
                                    className="np-item np-item--abandoned"
                                    onClick={() => { removeNotification(item.id); navigate(`/marketplace/${item.order_slug}`); }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="np-item-top">
                                        <div className="np-avatar np-avatar--abandoned">!</div>
                                        <div className="np-item-info">
                                            <span className="np-from">Order Abandoned</span>
                                            <span className="np-time">{timeAgo(item.created_at)}</span>
                                        </div>
                                        <button
                                            className="np-dismiss-btn"
                                            onClick={(e) => { e.stopPropagation(); removeNotification(item.id); }}
                                        >
                                            <RiCloseLine size={13} />
                                        </button>
                                    </div>
                                    <p className="np-text">
                                        <strong>{item.abandoned_by}</strong> abandoned <strong>{item.order_title}</strong>. Order is open again.
                                    </p>
                                </div>
                            );
                        }

                        return null;
                    })
                )}
            </div>
        </div>
    );
}
