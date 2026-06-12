import { useState } from 'react';
import { createPortal } from 'react-dom';
import { RiCloseLine, RiAddLine, RiDeleteBinLine, RiErrorWarningLine } from 'react-icons/ri';
import './ProjectSettingsModal.css';

const ALL_PERMS = ['create', 'edit', 'delete'];

const DEFAULT_ROLES = [
    { id: 1, name: 'Owner', perms: ['create', 'edit', 'delete'] },
    { id: 2, name: 'Developer', perms: ['create', 'edit'] },
    { id: 3, name: 'Viewer', perms: [] },
];

function DeleteConfirm({ name, onConfirm, onCancel }) {
    return createPortal(
        <div className="psm-confirm-overlay">
            <div className="psm-confirm">
                <div className="psm-confirm-icon"><RiErrorWarningLine size={24} /></div>
                <p className="psm-confirm-title">Delete &quot;{name}&quot;?</p>
                <p className="psm-confirm-sub">All tasks, roles and data will be permanently removed.</p>
                <div className="psm-confirm-actions">
                    <button className="psm-btn psm-btn--cancel" onClick={onCancel}>Cancel</button>
                    <button className="psm-btn psm-btn--delete" onClick={onConfirm}>Yes, delete</button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export function ProjectSettingsModal({ projectName, onClose, onSave, onDelete }) {
    const [name, setName] = useState(projectName);
    const [desc, setDesc] = useState('');
    const [roles, setRoles] = useState(DEFAULT_ROLES);
    const [nameErr, setNameErr] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const addRole = () => setRoles(r => [...r, { id: Date.now(), name: '', perms: [] }]);
    const removeRole = (id) => setRoles(r => r.filter(x => x.id !== id));
    const togglePerm = (id, p) => setRoles(r => r.map(x =>
        x.id !== id ? x : {
            ...x,
            perms: x.perms.includes(p) ? x.perms.filter(v => v !== p) : [...x.perms, p]
        }
    ));
    const updateRoleName = (id, val) => setRoles(r => r.map(x => x.id === id ? { ...x, name: val } : x));

    const handleSave = () => {
        if (!name.trim()) { setNameErr(true); return; }
        onSave({ name, desc, roles });
        onClose();
    };

    return (
        <>
            <div className="psm-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
                <div className="psm-modal">
                    <div className="psm-header">
                        <span className="psm-title">Project settings</span>
                        <button className="psm-close" onClick={onClose}><RiCloseLine size={18} /></button>
                    </div>

                    <div className="psm-body">
                        <div className="psm-section">
                            <div className="psm-field">
                                <label className="psm-label">Project name <span className="psm-required">*</span></label>
                                <input className={`psm-input ${nameErr ? 'psm-input--error' : ''}`}
                                    value={name} onChange={e => { setName(e.target.value); setNameErr(false); }} />
                                {nameErr && <span className="psm-error">Name is required</span>}
                            </div>
                            <div className="psm-field">
                                <label className="psm-label">Description</label>
                                <textarea className="psm-textarea" rows={3} value={desc}
                                    onChange={e => setDesc(e.target.value)} placeholder="Describe the project..." />
                            </div>
                        </div>

                        <div className="psm-divider" />

                        <div className="psm-section">
                            <div className="psm-section-head">
                                <span className="psm-section-title">Roles & permissions</span>
                                <button className="psm-add-btn" onClick={addRole}>
                                    <RiAddLine size={13} /> Add role
                                </button>
                            </div>
                            <div className="psm-roles">
                                {roles.map(r => (
                                    <div key={r.id} className="psm-role-row">
                                        <input className="psm-input psm-role-name"
                                            value={r.name} onChange={e => updateRoleName(r.id, e.target.value)}
                                            placeholder="Role name" />
                                        <div className="psm-perms">
                                            {ALL_PERMS.map(p => (
                                                <button key={p}
                                                    className={`psm-perm-chip ${r.perms.includes(p) ? 'psm-perm-chip--on' : ''}`}
                                                    onClick={() => togglePerm(r.id, p)}>{p}</button>
                                            ))}
                                        </div>
                                        <button className="psm-remove-btn" onClick={() => removeRole(r.id)}>
                                            <RiDeleteBinLine size={13} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

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
                    </div>

                    <div className="psm-footer">
                        <button className="psm-btn psm-btn--cancel" onClick={onClose}>Cancel</button>
                        <button className="psm-btn psm-btn--save" onClick={handleSave}>Save changes</button>
                    </div>
                </div>
            </div>

            {showConfirm && (
                <DeleteConfirm
                    name={name}
                    onConfirm={() => { onDelete(); onClose(); }}
                    onCancel={() => setShowConfirm(false)}
                />
            )}
        </>
    );
}