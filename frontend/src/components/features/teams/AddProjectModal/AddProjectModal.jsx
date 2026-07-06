import { useState } from 'react';
import { RiCloseLine, RiAddLine, RiCheckLine } from 'react-icons/ri';
import { apiCreateProject } from '../../../../api/projectsApi';
import { useAuth } from '../../../../context/AuthContext';
import '../CreateTeamModal/CreateTeamModal.css';
import './AddProjectModal.css';

export function AddProjectModal({ teamId, members, onClose, onAdd }) {
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [assigned, setAssigned] = useState([]);
    const [nameErr, setNameErr] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const toggle = (userId) => {
        if (!userId) return;
        setAssigned(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleAdd = async () => {
        if (!name.trim()) { setNameErr(true); return; }
        setLoading(true);
        const { ok, data } = await apiCreateProject({
            name: name.trim(),
            description: desc.trim(),
            type: 'team',
            team: teamId,
            member_ids: assigned.filter(Boolean),
        });
        setLoading(false);
        if (!ok) {
            setError(data?.detail || data?.name?.[0] || 'Failed to create project.');
            return;
        }
        onAdd(data);
        onClose();
    };

    return (
        <div className="ctm-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="ctm-modal apm-modal">
                <div className="ctm-header">
                    <span className="ctm-header-title">Add project</span>
                    <button className="ctm-icon-btn" onClick={onClose}><RiCloseLine size={18} /></button>
                </div>

                <div className="ctm-body">
                    <div className="ctm-section">
                        <div className="ctm-field">
                            <label className="ctm-label">Project name <span className="ctm-required">*</span></label>
                            <input
                                className={`ctm-input ${nameErr ? 'ctm-input--error' : ''}`}
                                value={name}
                                onChange={e => { setName(e.target.value); setNameErr(false); }}
                                placeholder="my-project"
                                autoFocus
                            />
                            {nameErr && <span className="ctm-error-text">Project name is required</span>}
                        </div>
                        <div className="ctm-field">
                            <label className="ctm-label">Description</label>
                            <textarea
                                className="ctm-textarea"
                                value={desc}
                                onChange={e => setDesc(e.target.value)}
                                placeholder="What is this project about?"
                                rows={3}
                            />
                        </div>
                        {error && <span className="ctm-error-text">{error}</span>}
                    </div>

                    <div className="ctm-divider" />

                    <div className="ctm-section">
                        <div className="ctm-section-header">
                            <span className="ctm-section-title">Assign members</span>
                        </div>
                        <div className="apm-member-list">
                            {members.filter(m => m.name !== user?.username).map((m) => {
                                const active = assigned.includes(m.userId);
                                return (
                                    <div key={m.id} className="apm-member-row">
                                        <div className="apm-avatar">{m.name[0].toUpperCase()}</div>
                                        <div className="apm-member-info">
                                            <span className="apm-member-name">{m.name}</span>
                                            <span className="apm-member-role">{m.role}</span>
                                        </div>
                                        <button
                                            className={`apm-assign-btn ${active ? 'apm-assign-btn--active' : ''}`}
                                            onClick={() => toggle(m.userId)}
                                        >
                                            {active ? <RiCheckLine size={13} /> : <RiAddLine size={13} />}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="ctm-footer">
                    <button className="ctm-btn ctm-btn--cancel" onClick={onClose}>Cancel</button>
                    <button className="ctm-btn ctm-btn--create" onClick={handleAdd} disabled={loading}>
                        {loading ? 'Creating...' : 'Add project'}
                    </button>
                </div>
            </div>
        </div>
    );
}
