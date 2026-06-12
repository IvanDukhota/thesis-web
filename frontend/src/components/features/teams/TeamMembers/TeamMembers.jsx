import { useState } from 'react';
import { RiAddLine, RiShieldUserLine, RiSettings3Line } from 'react-icons/ri';
import { InviteModal } from '../InviteModal';
import './TeamMembers.css';

export function TeamMembers({ members, onInvite }) {
    const [showInvite, setShowInvite] = useState(false);

    const handleInvite = (nicks) => {
        onInvite(nicks.map(nick => ({ name: nick, role: 'Member', status: 'pending' })));
    };

    return (
        <div className="tm-root">
            <div className="tm-header">
                <span className="tm-title">Members</span>
                <button className="tm-invite-btn" onClick={() => setShowInvite(true)}>
                    <RiAddLine size={14} />
                </button>
            </div>

            <div className="tm-list">
                {members.map((m, i) => (
                    <div key={i} className="tm-member">
                        <div className="tm-avatar">{m.name[0].toUpperCase()}</div>
                        <div className="tm-member-info">
                            <div className="tm-member-name">
                                {m.name}
                                {m.role === 'Admin' && <RiShieldUserLine size={12} className="tm-admin-icon" />}
                            </div>
                            <div className="tm-member-role">{m.role}</div>
                        </div>
                        {m.status === 'pending'
                            ? <span className="tm-pending-badge">Pending</span>
                            : <button className="tm-gear-btn"><RiSettings3Line size={13} /></button>
                        }
                    </div>
                ))}
            </div>

            {showInvite && (
                <InviteModal onClose={() => setShowInvite(false)} onInvite={handleInvite} />
            )}
        </div>
    );
}