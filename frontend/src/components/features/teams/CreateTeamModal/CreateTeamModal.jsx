import { useState, useEffect } from 'react';
import { RiCloseLine, RiAddLine, RiDeleteBinLine, RiMailLine } from 'react-icons/ri';
import './CreateTeamModal.css'

const ALL_PERMS = [
    'view',
    'invite',
    'create project',
    'manage team',
    'delete',
];

const DEFAULT_ROLES = [
    { id: 1, name: 'Admin', perms: ['view', 'invite', 'create project', 'edit team', 'manage roles', 'delete'] },
    { id: 2, name: 'Member', perms: ['view', 'invite', 'create project'] },
];

function RoleRow({ role, onChange, onRemove }) {
    const togglePerm = (p) => {
        const next = role.perms.includes(p)
            ? role.perms.filter(x => x !== p)
            : [...role.perms, p];
        onChange({ ...role, perms: next });
    };
    return (
        <div className="ctm-role-row">
            <input
                className="ctm-input ctm-role-name"
                value={role.name}
                placeholder="Role name"
                onChange={e => onChange({ ...role, name: e.target.value })}
            />
            <div className="ctm-perms">
                {ALL_PERMS.map(p => (
                    <button
                        key={p}
                        type="button"
                        className={`ctm-perm-chip ${role.perms.includes(p) ? 'ctm-perm-chip--on' : ''}`}
                        onClick={() => togglePerm(p)}
                    >{p}</button>
                ))}
            </div>
            <button className="ctm-icon-btn ctm-icon-btn--danger" onClick={onRemove} type="button">
                <RiDeleteBinLine size={14} />
            </button>
        </div>
    );
}

export function CreateTeamModal({ onClose, onCreate }) {
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [roles, setRoles] = useState(DEFAULT_ROLES);
    const [inviteInput, setInviteInput] = useState('');
    const [invited, setInvited] = useState([]);
    const [nameError, setNameError] = useState(false);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const addRole = () => setRoles(r => [...r, { id: Date.now(), name: '', perms: ['view'] }]);
    const updateRole = (id, val) => setRoles(r => r.map(x => x.id === id ? val : x));
    const removeRole = (id) => setRoles(r => r.filter(x => x.id !== id));

    const handleInvite = () => {
        const email = inviteInput.trim();
        if (!email || !email.includes('@')) return;
        if (invited.find(i => i.email === email)) return;
        setInvited(v => [...v, { email, status: 'pending' }]);
        setInviteInput('');
    };

    const handleCreate = () => {
        if (!name.trim()) { setNameError(true); return; }
        onCreate({ name, desc, roles, invited });
        onClose();
    };

    return (
        <div className="ctm-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="ctm-modal">
                <div className="ctm-header">
                    <span className="ctm-header-title">Create team</span>
                    <button className="ctm-icon-btn" onClick={onClose} type="button"><RiCloseLine size={18} /></button>
                </div>

                <div className="ctm-body">
                    <div className="ctm-section">
                        <div className="ctm-field">
                            <label className="ctm-label">
                                Team name <span className="ctm-required">*</span>
                            </label>
                            <input
                                className={`ctm-input ${nameError ? 'ctm-input--error' : ''}`}
                                value={name}
                                onChange={e => { setName(e.target.value); setNameError(false); }}
                                placeholder="My awesome team"
                            />
                            {nameError && <span className="ctm-error-text">Team name is required</span>}
                        </div>
                        <div className="ctm-field">
                            <label className="ctm-label">Description</label>
                            <textarea
                                className="ctm-textarea"
                                value={desc}
                                onChange={e => setDesc(e.target.value)}
                                placeholder="What does your team do?"
                                rows={3}
                            />
                        </div>
                        <p className="ctm-skip-hint">All fields except the name can be filled later in team settings.</p>
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
                            {roles.map(r => (
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
                        <div className="ctm-section-header">
                            <span className="ctm-section-title">Invite members</span>
                        </div>
                        <div className="ctm-invite-row">
                            <div className="ctm-invite-input-wrap">
                                <RiMailLine size={14} className="ctm-invite-icon" />
                                <input
                                    className="ctm-input ctm-invite-input"
                                    value={inviteInput}
                                    onChange={e => setInviteInput(e.target.value)}
                                    placeholder="colleague@example.com"
                                    onKeyDown={e => e.key === 'Enter' && handleInvite()}
                                />
                            </div>
                            <button className="ctm-invite-btn" onClick={handleInvite} type="button">Invite</button>
                        </div>
                        {invited.length > 0 && (
                            <div className="ctm-invited-list">
                                {invited.map(i => (
                                    <div key={i.email} className="ctm-invited-item">
                                        <span className="ctm-invited-email">{i.email}</span>
                                        <span className="ctm-invited-badge">Invite sent</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="ctm-footer">
                    <button className="ctm-btn ctm-btn--cancel" onClick={onClose} type="button">Cancel</button>
                    <button className="ctm-btn ctm-btn--create" onClick={handleCreate} type="button">Create team</button>
                </div>
            </div>
        </div>
    );
}