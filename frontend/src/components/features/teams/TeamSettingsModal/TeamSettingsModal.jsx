import { useState } from 'react';
import { createPortal } from 'react-dom';
import { RiCloseLine, RiErrorWarningLine, RiAddLine, RiDeleteBinLine } from 'react-icons/ri';
import '../CreateTeamModal/CreateTeamModal.css';
import './TeamSettingsModal.css';

const PERM_MAP = [
    { label: 'view', key: 'can_view' },
    { label: 'create project', key: 'can_create_projects' },
    { label: 'edit team', key: 'can_edit_team' },
    { label: 'manage settings', key: 'can_manage_settings' },
    { label: 'delete', key: 'can_delete' },
];

const backendToPerms = (role) => PERM_MAP.filter(({ key }) => role[key]).map(({ label }) => label);

function RoleRow({ role, onChange, onRemove }) {
    const locked = role.is_admin;
    const togglePerm = (label) => {
        if (locked) return;
        const next = role.perms.includes(label)
            ? role.perms.filter(x => x !== label)
            : [...role.perms, label];
        onChange({ ...role, perms: next, changed: true });
    };
    return (
        <div className="ctm-role-row">
            <input
                className="ctm-input ctm-role-name"
                value={role.name}
                placeholder="Role name"
                readOnly={locked}
                onChange={e => !locked && onChange({ ...role, name: e.target.value, changed: true })}
            />
            <div className="ctm-perms">
                {PERM_MAP.map(({ label }) => (
                    <button
                        key={label}
                        type="button"
                        className={`ctm-perm-chip ${role.perms.includes(label) ? 'ctm-perm-chip--on' : ''} ${locked ? 'ctm-perm-chip--locked' : ''}`}
                        onClick={() => togglePerm(label)}
                    >{label}</button>
                ))}
            </div>
            {!locked && (
                <button className="ctm-icon-btn ctm-icon-btn--danger" onClick={onRemove} type="button">
                    <RiDeleteBinLine size={14} />
                </button>
            )}
        </div>
    );
}

function DeleteConfirm({ teamName, onConfirm, onCancel, loading }) {
    return createPortal(
        <div className="tsm-confirm-overlay">
            <div className="tsm-confirm">
                <div className="tsm-confirm-icon"><RiErrorWarningLine size={24} /></div>
                <p className="tsm-confirm-title">Delete &quot;{teamName}&quot;?</p>
                <p className="tsm-confirm-sub">
                    This action is permanent. All projects, members and data
                    associated with this team will be removed.
                </p>
                <div className="tsm-confirm-actions">
                    <button className="ctm-btn ctm-btn--cancel" onClick={onCancel} disabled={loading}>Cancel</button>
                    <button className="tsm-delete-btn" onClick={onConfirm} disabled={loading}>
                        {loading ? 'Deleting...' : 'Yes, delete team'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export function TeamSettingsModal({ teamName, teamDesc, roles, onClose, onSave, onDelete }) {
    const [name, setName] = useState(teamName);
    const [desc, setDesc] = useState(teamDesc || '');
    const [nameErr, setNameErr] = useState(false);
    const [localRoles, setLocalRoles] = useState(
        roles.map(r => ({ ...r, perms: backendToPerms(r), isNew: false, changed: false }))
    );
    const [deletedIds, setDeletedIds] = useState([]);
    const [showConfirm, setShowConfirm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [deleting, setDeleting] = useState(false);

    const addRole = () => setLocalRoles(r => [...r, {
        id: `new-${Date.now()}`,
        name: '',
        perms: ['view'],
        is_admin: false,
        isNew: true,
        changed: false,
    }]);

    const updateRole = (id, val) => setLocalRoles(r => r.map(x => x.id === id ? val : x));

    const removeRole = (id) => {
        const role = localRoles.find(r => r.id === id);
        if (!role.isNew) setDeletedIds(d => [...d, id]);
        setLocalRoles(r => r.filter(x => x.id !== id));
    };

    const handleSave = async () => {
        if (!name.trim()) { setNameErr(true); return; }
        setSaving(true);
        setSaveError('');
        const result = await onSave({ name, desc, roles: localRoles, deletedIds });
        setSaving(false);
        if (result?.ok === false) { setSaveError('Failed to save changes'); return; }
        onClose();
    };

    const handleDelete = async () => {
        setDeleting(true);
        await onDelete();
        setDeleting(false);
        onClose();
    };

    return (
        <>
            <div className="ctm-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
                <div className="ctm-modal tsm-modal">
                    <div className="ctm-header">
                        <span className="ctm-header-title">Team settings</span>
                        <button className="ctm-icon-btn" onClick={onClose}><RiCloseLine size={18} /></button>
                    </div>

                    <div className="ctm-body">
                        <div className="ctm-section">
                            <div className="ctm-field">
                                <label className="ctm-label">Team name <span className="ctm-required">*</span></label>
                                <input
                                    className={`ctm-input ${nameErr ? 'ctm-input--error' : ''}`}
                                    value={name}
                                    onChange={e => { setName(e.target.value); setNameErr(false); }}
                                />
                                {nameErr && <span className="ctm-error-text">Team name is required</span>}
                            </div>
                            <div className="ctm-field">
                                <label className="ctm-label">Description</label>
                                <textarea
                                    className="ctm-textarea"
                                    value={desc}
                                    onChange={e => setDesc(e.target.value)}
                                    placeholder="Describe your team..."
                                    rows={4}
                                />
                            </div>
                        </div>

                        <div className="ctm-divider" />

                        <div className="ctm-section">
                            <div className="ctm-section-header">
                                <span className="ctm-section-title">Roles & permissions</span>
                                <button className="ctm-add-btn" onClick={addRole} type="button">
                                    <RiAddLine size={13} /> Add role
                                </button>
                            </div>
                            <div className="ctm-roles">
                                {localRoles.map(r => (
                                    <RoleRow
                                        key={r.id}
                                        role={r}
                                        onChange={val => updateRole(r.id, val)}
                                        onRemove={() => removeRole(r.id)}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="ctm-divider" />

                        <div className="ctm-section">
                            <p className="tsm-danger-title">Danger zone</p>
                            <div className="tsm-danger-row">
                                <div>
                                    <p className="tsm-danger-label">Delete this team</p>
                                    <p className="tsm-danger-sub">Once deleted, all data will be permanently removed.</p>
                                </div>
                                <button className="tsm-delete-btn" onClick={() => setShowConfirm(true)}>
                                    Delete team
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="ctm-footer">
                        {saveError && <span className="ctm-error-text">{saveError}</span>}
                        <button className="ctm-btn ctm-btn--cancel" onClick={onClose} disabled={saving}>Cancel</button>
                        <button className="ctm-btn ctm-btn--create" onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : 'Save changes'}
                        </button>
                    </div>
                </div>
            </div>

            {showConfirm && (
                <DeleteConfirm
                    teamName={name}
                    onConfirm={handleDelete}
                    onCancel={() => setShowConfirm(false)}
                    loading={deleting}
                />
            )}
        </>
    );
}
