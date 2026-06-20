import { useState } from 'react';
import { createPortal } from 'react-dom';
import { RiCloseLine, RiAddLine, RiDeleteBinLine, RiErrorWarningLine } from 'react-icons/ri';
import './ProjectSettingsModal.css';

const PERM_MAP = [
    { label: 'view', key: 'can_view' },
    { label: 'create', key: 'can_create' },
    { label: 'edit', key: 'can_edit' },
    { label: 'delete', key: 'can_delete' },
];

const backendToPerms = (r) => PERM_MAP.filter(({ key }) => r[key]).map(({ label }) => label);

function DeleteConfirm({ name, onConfirm, onCancel, deleting }) {
    return createPortal(
        <div className="psm-confirm-overlay">
            <div className="psm-confirm">
                <div className="psm-confirm-icon"><RiErrorWarningLine size={24} /></div>
                <p className="psm-confirm-title">Delete &quot;{name}&quot;?</p>
                <p className="psm-confirm-sub">All tasks, roles and data will be permanently removed.</p>
                <div className="psm-confirm-actions">
                    <button className="psm-btn psm-btn--cancel" onClick={onCancel} disabled={deleting}>Cancel</button>
                    <button className="psm-btn psm-btn--delete" onClick={onConfirm} disabled={deleting}>
                        {deleting ? 'Deleting...' : 'Yes, delete'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export function ProjectSettingsModal({ project, myRole, onClose, onSave, onDelete, isMarketplace = false }) {
    const [name, setName] = useState(project.name);
    const [desc, setDesc] = useState(project.description || '');
    const [localRoles, setLocalRoles] = useState(
        (project.roles || []).map(r => ({
            ...r,
            perms: backendToPerms(r),
            isNew: false,
            changed: false,
            isDefault: r.is_owner || r.name === 'Developer',
        }))
    );
    const [deletedIds, setDeletedIds] = useState([]);
    const [nameErr, setNameErr] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const isTeam = project.type === 'team';
    const isOwner = myRole?.is_owner;

    const addRole = () => setLocalRoles(r => [...r, {
        id: `new-${Date.now()}`, name: '', perms: ['view'],
        is_owner: false, isNew: true, changed: false, isDefault: false,
    }]);

    const removeRole = (id) => {
        const role = localRoles.find(r => r.id === id);
        if (role && !role.isNew) setDeletedIds(d => [...d, id]);
        setLocalRoles(r => r.filter(x => x.id !== id));
    };

    const updateName = (id, val) => setLocalRoles(r =>
        r.map(x => x.id === id ? { ...x, name: val, changed: true } : x)
    );

    const togglePerm = (id, label) => setLocalRoles(r => r.map(x => {
        if (x.id !== id) return x;
        const perms = x.perms.includes(label)
            ? x.perms.filter(p => p !== label)
            : [...x.perms, label];
        return { ...x, perms, changed: true };
    }));

    const handleSave = async () => {
        if (!isMarketplace && !name.trim()) { setNameErr(true); return; }
        setSaving(true);
        setSaveError('');
        const result = await onSave({
            name: isMarketplace ? project.name : name.trim(),
            description: isMarketplace ? (project.description || '') : desc.trim(),
            roles: localRoles,
            deletedIds,
        });
        setSaving(false);
        if (!result?.ok) { setSaveError('Failed to save changes.'); return; }
        onClose();
    };

    const handleDelete = async () => {
        setDeleting(true);
        await onDelete();
        setDeleting(false);
    };

    return (
        <>
            <div className="psm-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
                <div className="psm-modal">
                    <div className="psm-header">
                        <span className="psm-title">Project settings</span>
                        <button className="psm-close" onClick={onClose} disabled={saving}>
                            <RiCloseLine size={18} />
                        </button>
                    </div>

                    <div className="psm-body">
                        {!isMarketplace && (
                            <div className="psm-section">
                                <div className="psm-field">
                                    <label className="psm-label">Project name <span className="psm-required">*</span></label>
                                    <input
                                        className={`psm-input ${nameErr ? 'psm-input--error' : ''}`}
                                        value={name}
                                        onChange={e => { setName(e.target.value); setNameErr(false); }}
                                    />
                                    {nameErr && <span className="psm-error">Name is required</span>}
                                </div>
                                <div className="psm-field">
                                    <label className="psm-label">Description</label>
                                    <textarea
                                        className="psm-textarea"
                                        rows={3}
                                        value={desc}
                                        onChange={e => setDesc(e.target.value)}
                                        placeholder="Describe the project..."
                                    />
                                </div>
                            </div>
                        )}

                        {isTeam && (
                            <>
                                {!isMarketplace && <div className="psm-divider" />}
                                <div className="psm-section">
                                    <div className="psm-section-head">
                                        <span className="psm-section-title">Roles & permissions</span>
                                        {isOwner && (
                                            <button className="psm-add-btn" onClick={addRole} type="button">
                                                <RiAddLine size={13} /> Add role
                                            </button>
                                        )}
                                    </div>
                                    <div className="psm-roles">
                                        {localRoles.map(r => {
                                            const nameLocked = r.is_owner || r.isDefault;
                                            const permsLocked = r.is_owner;
                                            const canDelete = isOwner && !r.is_owner && !r.isDefault;
                                            return (
                                                <div key={r.id} className="psm-role-row">
                                                    <input
                                                        className="psm-input psm-role-name"
                                                        value={r.name}
                                                        onChange={e => updateName(r.id, e.target.value)}
                                                        placeholder="Role name"
                                                        readOnly={nameLocked}
                                                        style={nameLocked ? { opacity: 0.55, cursor: 'default' } : undefined}
                                                    />
                                                    <div className="psm-perms">
                                                        {PERM_MAP.map(({ label }) => (
                                                            <button
                                                                key={label}
                                                                type="button"
                                                                className={`psm-perm-chip ${r.perms.includes(label) ? 'psm-perm-chip--on' : ''}`}
                                                                onClick={() => !permsLocked && togglePerm(r.id, label)}
                                                                style={permsLocked ? { opacity: 0.45, cursor: 'default' } : undefined}
                                                            >
                                                                {label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {canDelete ? (
                                                        <button
                                                            className="psm-remove-btn"
                                                            onClick={() => removeRole(r.id)}
                                                            type="button"
                                                        >
                                                            <RiDeleteBinLine size={13} />
                                                        </button>
                                                    ) : (
                                                        <span style={{ width: 21, flexShrink: 0 }} />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}

                        {isOwner && !isMarketplace && (
                            <>
                                <div className="psm-divider" />
                                <div className="psm-section">
                                    <p className="psm-danger-title">Danger zone</p>
                                    <div className="psm-danger-row">
                                        <div>
                                            <p className="psm-danger-label">Delete this project</p>
                                            <p className="psm-danger-sub">All tasks and data will be permanently removed.</p>
                                        </div>
                                        <button className="psm-delete-btn" onClick={() => setShowConfirm(true)}>
                                            Delete project
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="psm-footer">
                        {saveError && <span className="psm-error" style={{ marginRight: 'auto' }}>{saveError}</span>}
                        <button className="psm-btn psm-btn--cancel" onClick={onClose} disabled={saving}>Cancel</button>
                        <button className="psm-btn psm-btn--save" onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : 'Save changes'}
                        </button>
                    </div>
                </div>
            </div>

            {showConfirm && (
                <DeleteConfirm
                    name={project.name}
                    onConfirm={handleDelete}
                    onCancel={() => setShowConfirm(false)}
                    deleting={deleting}
                />
            )}
        </>
    );
}
