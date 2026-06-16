import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RiCloseLine, RiUserAddLine, RiSettings3Line, RiArrowDownSLine } from 'react-icons/ri';
import { InviteMembersModal } from '../InviteMembersModal/InviteMembersModal';
import { apiGetProjectMembers, apiUpdateProjectMember, apiRemoveProjectMember } from '../../../../api/projectsApi';
import './MembersPanel.css';

function RoleSelect({ roles, value, onChange }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const selected = roles.find(r => r.id === value);

    useEffect(() => {
        if (!open) return;
        const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
        document.addEventListener('pointerdown', handler);
        return () => document.removeEventListener('pointerdown', handler);
    }, [open]);

    return (
        <div className="msb-role-select" ref={ref}>
            <button
                className={`msb-role-trigger ${open ? 'msb-role-trigger--open' : ''}`}
                onClick={() => setOpen(v => !v)}
                type="button"
            >
                <span>{selected?.name || 'Select role'}</span>
                <RiArrowDownSLine size={14} className={`msb-role-arrow ${open ? 'msb-role-arrow--up' : ''}`} />
            </button>
            {open && (
                <div className="msb-role-list">
                    {roles.map(r => (
                        <button
                            key={r.id}
                            className={`msb-role-option ${r.id === value ? 'msb-role-option--active' : ''}`}
                            onClick={() => { onChange(r.id); setOpen(false); }}
                            type="button"
                        >
                            {r.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function MemberModal({ member, roles, projectId, onSaved, onRemoved, onClose }) {
    const currentRole = roles.find(r => r.name === member.role_name);
    const [selectedRoleId, setSelectedRoleId] = useState(currentRole?.id || '');
    const [saving, setSaving] = useState(false);
    const [removing, setRemoving] = useState(false);

    const handleSave = async () => {
        if (!selectedRoleId || selectedRoleId === currentRole?.id) { onClose(); return; }
        setSaving(true);
        const { ok, data } = await apiUpdateProjectMember(projectId, member.id, { role_id: selectedRoleId });
        setSaving(false);
        if (ok) { onSaved(data); onClose(); }
    };

    const handleRemove = async () => {
        setRemoving(true);
        const { ok } = await apiRemoveProjectMember(projectId, member.id);
        setRemoving(false);
        if (ok) { onRemoved(member.id); onClose(); }
    };

    return createPortal(
        <div className="msb-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="msb-modal">
                <div className="msb-modal-header">
                    <span className="msb-modal-title">Edit member</span>
                    <button className="msb-modal-close" onClick={onClose}><RiCloseLine size={17} /></button>
                </div>
                <div className="msb-modal-body">
                    <div className="msb-modal-user">
                        <div className="msb-avatar">{member.username[0].toUpperCase()}</div>
                        <span className="msb-modal-username">{member.username}</span>
                    </div>
                    <div className="msb-modal-field">
                        <label className="msb-modal-label">Role</label>
                        <RoleSelect roles={roles} value={selectedRoleId} onChange={setSelectedRoleId} />
                    </div>
                </div>
                <div className="msb-modal-footer">
                    {!member.is_owner && (
                        <button className="msb-modal-remove" onClick={handleRemove} disabled={removing || saving}>
                            {removing ? 'Removing...' : 'Remove from project'}
                        </button>
                    )}
                    <div className="msb-modal-footer-right">
                        <button className="msb-modal-cancel" onClick={onClose} disabled={saving || removing}>Cancel</button>
                        <button className="msb-modal-save" onClick={handleSave} disabled={saving || removing}>
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

export function MembersPanel({ projectId, teamId, roles, myRole, onClose }) {
    const [closing, setClosing] = useState(false);
    const [members, setMembers] = useState([]);
    const [showInvite, setShowInvite] = useState(false);
    const [editingMember, setEditingMember] = useState(null);

    useEffect(() => {
        document.documentElement.style.overflow = 'hidden';
        apiGetProjectMembers(projectId).then(({ ok, data }) => {
            if (ok) setMembers(data);
        });
        return () => { document.documentElement.style.overflow = ''; };
    }, [projectId]);

    const handleClose = () => { setClosing(true); setTimeout(onClose, 220); };

    const handleInvited = (newMembers) => setMembers(prev => [...prev, ...newMembers]);

    const handleSaved = (updated) => {
        setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
    };

    const handleRemoved = (id) => {
        setMembers(prev => prev.filter(m => m.id !== id));
    };

    const canManage = myRole?.is_owner;
    const canInvite = myRole?.is_owner || myRole?.can_edit;

    return createPortal(
        <>
            <div className={`msb-backdrop ${closing ? 'msb-backdrop--closing' : ''}`} onClick={handleClose} />
            <div className={`msb-panel ${closing ? 'msb-panel--closing' : ''}`}>
                <div className="msb-header">
                    <span className="msb-title">Project members</span>
                    <button className="msb-close" onClick={handleClose}><RiCloseLine size={18} /></button>
                </div>

                <div className="msb-body">
                    <p className="msb-section-label">Members · {members.length}</p>
                    <div className="msb-list">
                        {members.map((m) => (
                            <div key={m.id} className="msb-member">
                                <div className="msb-avatar">{m.username[0].toUpperCase()}</div>
                                <div className="msb-info">
                                    <span className="msb-name">{m.username}</span>
                                    <span className="msb-role">{m.role_name || '—'}</span>
                                </div>
                                {canManage && !m.is_owner && (
                                    <button className="msb-gear" onClick={() => setEditingMember(m)}>
                                        <RiSettings3Line size={13} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {canInvite && (
                    <div className="msb-footer">
                        <button className="msb-invite-btn" onClick={() => setShowInvite(true)}>
                            <RiUserAddLine size={14} />
                            Invite member
                        </button>
                    </div>
                )}
            </div>

            {showInvite && (
                <InviteMembersModal
                    projectId={projectId}
                    teamId={teamId}
                    existingMemberIds={members.map(m => m.user_id)}
                    onClose={() => setShowInvite(false)}
                    onInvited={handleInvited}
                />
            )}

            {editingMember && (
                <MemberModal
                    member={editingMember}
                    roles={roles}
                    projectId={projectId}
                    onSaved={handleSaved}
                    onRemoved={handleRemoved}
                    onClose={() => setEditingMember(null)}
                />
            )}
        </>,
        document.body
    );
}
