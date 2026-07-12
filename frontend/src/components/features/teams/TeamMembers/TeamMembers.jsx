import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RiAddLine, RiShieldUserLine, RiSettings3Line, RiCloseLine, RiArrowDownSLine, RiUserUnfollowLine } from 'react-icons/ri';
import { InviteModal } from '../InviteModal';
import './TeamMembers.css';

function RoleSelect({ roles, value, onChange }) {
    const [open, setOpen] = useState(false);
    const [dropdownStyle, setDropdownStyle] = useState({});
    const triggerRef = useRef(null);
    const selected = roles.find(r => r.id === value);

    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (!triggerRef.current?.contains(e.target)) setOpen(false);
        };
        document.addEventListener('pointerdown', handler);
        return () => document.removeEventListener('pointerdown', handler);
    }, [open]);

    const handleOpen = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setDropdownStyle({
                position: 'fixed',
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width,
                zIndex: 999999,
            });
        }
        setOpen(v => !v);
    };

    return (
        <div className="tmm-role-select">
            <button
                ref={triggerRef}
                className={`tmm-role-trigger ${open ? 'tmm-role-trigger--open' : ''}`}
                onClick={handleOpen}
                type="button"
            >
                <span>{selected?.name || 'Select role'}</span>
                <RiArrowDownSLine size={15} className={`tmm-role-arrow ${open ? 'tmm-role-arrow--up' : ''}`} />
            </button>
            {open && createPortal(
                <div className="tmm-role-list" style={dropdownStyle}>
                    {roles.map(r => (
                        <button
                            key={r.id}
                            className={`tmm-role-option ${r.id === value ? 'tmm-role-option--active' : ''}`}
                            onClick={() => { onChange(r.id); setOpen(false); }}
                            type="button"
                        >
                            {r.name}
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
}

function MemberModal({ member, roles, onSave, onRemove, onClose }) {
    const currentRoleId = roles.find(r => r.name === member.role)?.id || '';
    const [selectedRole, setSelectedRole] = useState(currentRoleId);
    const [saving, setSaving] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(false);

    const handleSave = async () => {
        if (!selectedRole || selectedRole === currentRoleId) { onClose(); return; }
        setSaving(true);
        await onSave(selectedRole);
        setSaving(false);
    };

    const handleRemove = async () => {
        setRemoving(true);
        await onRemove();
        setRemoving(false);
    };

    return createPortal(
        <div className="tmm-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="tmm-modal">
                <div className="tmm-header">
                    <span className="tmm-title">Edit member</span>
                    <button className="tmm-close-btn" onClick={onClose}><RiCloseLine size={17} /></button>
                </div>
                <div className="tmm-body">
                    <div className="tmm-user-row">
                        <div className="tmm-avatar">{member.name[0].toUpperCase()}</div>
                        <span className="tmm-username">{member.name}</span>
                    </div>
                    <div className="tmm-field">
                        <label className="tmm-label">Role</label>
                        <RoleSelect roles={roles} value={selectedRole} onChange={setSelectedRole} />
                    </div>
                </div>
                <div className="tmm-footer">
                    <button
                        className="tmm-remove-btn"
                        onClick={() => setConfirmRemove(true)}
                        disabled={removing || saving}
                    >
                        Remove from team
                    </button>
                    <div className="tmm-footer-right">
                        <button className="tmm-cancel-btn" onClick={onClose} disabled={saving || removing}>Cancel</button>
                        <button className="tmm-save-btn" onClick={handleSave} disabled={saving || removing}>
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>

                {confirmRemove && (
                    <div className="tmm-confirm">
                        <div className="tmm-confirm-icon">
                            <RiUserUnfollowLine size={22} />
                        </div>
                        <p className="tmm-confirm-text">Remove <strong>{member.name}</strong> from team?</p>
                        <p className="tmm-confirm-sub">They will lose access to all team projects.</p>
                        <div className="tmm-confirm-actions">
                            <button className="tmm-confirm-cancel" onClick={() => setConfirmRemove(false)}>
                                Cancel
                            </button>
                            <button className="tmm-confirm-remove" onClick={handleRemove} disabled={removing}>
                                {removing ? 'Removing...' : 'Yes, remove'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}

export function TeamMembers({ teamId, members, roles, currentUsername, canEditTeam, canInvite, onUpdateMember, onRemoveMember }) {
    const [showInvite, setShowInvite] = useState(false);
    const [editingMember, setEditingMember] = useState(null);

    const handleSaveMember = async (roleId) => {
        await onUpdateMember(editingMember.id, roleId);
        setEditingMember(null);
    };

    const handleRemoveMember = async () => {
        await onRemoveMember(editingMember.id);
        setEditingMember(null);
    };

    const canShowGear = (m) =>
        canEditTeam && !m.is_admin && m.name !== currentUsername;

    return (
        <div className="tm-root">
            <div className="tm-header">
                <span className="tm-title">Members</span>
                {canInvite && (
                    <button className="tm-invite-btn" onClick={() => setShowInvite(true)}>
                        <RiAddLine size={14} />
                    </button>
                )}
            </div>

            <div className="tm-list">
                {members.map((m, i) => (
                    <div key={i} className="tm-member">
                        <div className="tm-avatar">{m.name[0].toUpperCase()}</div>
                        <div className="tm-member-info">
                            <div className="tm-member-name">
                                {m.name}
                                {m.is_admin && <RiShieldUserLine size={12} className="tm-admin-icon" />}
                            </div>
                            <div className="tm-member-role">{m.role}</div>
                        </div>
                        {m.status === 'pending'
                            ? <span className="tm-pending-badge">Pending</span>
                            : canShowGear(m) && (
                                <button className="tm-gear-btn" onClick={() => setEditingMember(m)}>
                                    <RiSettings3Line size={13} />
                                </button>
                            )
                        }
                    </div>
                ))}
            </div>

            {showInvite && (
                <InviteModal teamId={teamId} onClose={() => setShowInvite(false)} />
            )}

            {editingMember && (
                <MemberModal
                    member={editingMember}
                    roles={roles}
                    onSave={handleSaveMember}
                    onRemove={handleRemoveMember}
                    onClose={() => setEditingMember(null)}
                />
            )}
        </div>
    );
}
