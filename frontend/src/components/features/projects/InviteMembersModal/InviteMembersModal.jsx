import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RiCloseLine, RiCheckLine, RiAddLine } from 'react-icons/ri';
import { apiGetMyTeam } from '../../../../api/teamsApi';
import { apiAddProjectMember } from '../../../../api/projectsApi';
import './InviteMembersModal.css';

export function InviteMembersModal({ projectId, teamId, existingMemberIds, onClose, onInvited }) {
    const [teamMembers, setTeamMembers] = useState([]);
    const [selected, setSelected] = useState(new Set());
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!teamId) return;
        apiGetMyTeam().then(({ ok, data }) => {
            if (ok) setTeamMembers(data.members || []);
        });
    }, [teamId]);

    const available = teamMembers.filter(
        m => !existingMemberIds.includes(m.user_id)
    );

    const toggle = (userId) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(userId) ? next.delete(userId) : next.add(userId);
            return next;
        });
    };

    const handleDone = async () => {
        if (selected.size === 0) { onClose(); return; }
        setLoading(true);
        const added = [];
        for (const userId of selected) {
            const { ok, data } = await apiAddProjectMember(projectId, userId);
            if (ok) added.push(data);
        }
        setLoading(false);
        if (added.length > 0) onInvited(added);
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
                                {available.map((m) => {
                                    const isSelected = selected.has(m.user_id);
                                    return (
                                        <div key={m.id} className={`imm-member ${isSelected ? 'imm-member--selected' : ''}`}>
                                            <div className="imm-avatar">{m.username[0].toUpperCase()}</div>
                                            <div className="imm-info">
                                                <span className="imm-name">{m.username}</span>
                                                <span className="imm-role">{m.role_name || 'Member'}</span>
                                            </div>
                                            <button
                                                className={`imm-add-btn ${isSelected ? 'imm-add-btn--active' : ''}`}
                                                onClick={() => toggle(m.user_id)}
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
                    <button className="imm-btn imm-btn--done" onClick={handleDone} disabled={loading}>
                        {loading ? 'Adding...' : `Done${selected.size > 0 ? ` (${selected.size})` : ''}`}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
