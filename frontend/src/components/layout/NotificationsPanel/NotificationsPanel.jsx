import { useState } from 'react';
import { RiCloseLine, RiArrowRightLine, RiNotification3Line } from 'react-icons/ri';
import './NotificationsPanel.css';

const INIT_NOTIFICATIONS = [
    { id: 1, title: 'Assigned you to "Build auth endpoints"', from: 'Alex K.', time: '2m ago' },
    { id: 2, title: 'Commented on "Design database schema"', from: 'Maria S.', time: '18m ago' },
    { id: 3, title: 'Added you to project "TeamHub"', from: 'Alex K.', time: '1h ago' },
    { id: 4, title: 'Changed your role to Designer', from: 'Ivan D.', time: '3h ago' },
];

export function NotificationsPanel({ open }) {
    const [items, setItems] = useState(INIT_NOTIFICATIONS);

    const remove = (id) => setItems(prev => prev.filter(n => n.id !== id));

    return (
        <div className={`np-dropdown ${open ? 'np-dropdown--open' : ''}`}>
            <div className="np-header">
                <span className="np-title">Notifications</span>
                {items.length > 0 && (
                    <button className="np-clear-btn" onClick={() => setItems([])}>
                        Clear all
                    </button>
                )}
            </div>

            <div className="np-body">
                {items.length === 0 ? (
                    <div className="np-empty">
                        <RiNotification3Line size={26} />
                        <span>No notifications</span>
                    </div>
                ) : (
                    items.map(n => (
                        <div key={n.id} className="np-item">
                            <div className="np-item-top">
                                <div className="np-avatar">{n.from[0]}</div>
                                <div className="np-item-info">
                                    <span className="np-from">{n.from}</span>
                                    <span className="np-time">{n.time}</span>
                                </div>
                                <button className="np-delete" onClick={() => remove(n.id)}>
                                    <RiCloseLine size={13} />
                                </button>
                            </div>
                            <p className="np-text">{n.title}</p>
                            <button className="np-goto">
                                Go to
                                <RiArrowRightLine size={12} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
