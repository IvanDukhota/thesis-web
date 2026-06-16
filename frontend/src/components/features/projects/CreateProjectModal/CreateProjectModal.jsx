import { useState } from 'react';
import { RiCloseLine } from 'react-icons/ri';
import { apiCreateProject } from '../../../../api/projectsApi';
import './CreateProjectModal.css';

export function CreateProjectModal({ onClose, onCreate, teamId, canCreateTeamProject }) {
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [isSolo, setIsSolo] = useState(true);
    const [nameErr, setNameErr] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const selectTeam = () => {
        if (!teamId) {
            setError('You need to be in a team to create a team project.');
            return;
        }
        if (!canCreateTeamProject) {
            setError("You don't have permission to create team projects. Ask your team admin.");
            return;
        }
        setIsSolo(false);
        setError('');
    };

    const handleCreate = async () => {
        if (!name.trim()) { setNameErr(true); return; }
        if (!isSolo && !teamId) {
            setError('You need to be in a team to create a team project.');
            return;
        }

        setLoading(true);
        const payload = { name: name.trim(), description: desc.trim(), type: isSolo ? 'solo' : 'team' };
        if (!isSolo && teamId) payload.team = teamId;

        const { ok, data } = await apiCreateProject(payload);
        setLoading(false);

        if (!ok) {
            setError(data?.detail || data?.name?.[0] || 'Failed to create project.');
            return;
        }

        onCreate(data);
        onClose();
    };

    return (
        <div className="cpm-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="cpm-modal">
                <div className="cpm-header">
                    <span className="cpm-title">New project</span>
                    <button className="cpm-close" onClick={onClose}><RiCloseLine size={18} /></button>
                </div>

                <div className="cpm-body">
                    <div className="cpm-field">
                        <label className="cpm-label">Project name <span className="cpm-required">*</span></label>
                        <input
                            className={`cpm-input ${nameErr ? 'cpm-input--error' : ''}`}
                            value={name}
                            onChange={e => { setName(e.target.value); setNameErr(false); }}
                            placeholder="my-awesome-project"
                            autoFocus
                        />
                        {nameErr && <span className="cpm-error">Name is required</span>}
                    </div>

                    <div className="cpm-field">
                        <label className="cpm-label">Description</label>
                        <textarea
                            className="cpm-textarea"
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                            placeholder="What is this project about?"
                            rows={3}
                        />
                    </div>

                    <div className="cpm-field">
                        <label className="cpm-label">Project type</label>
                        <div className="cpm-type-row">
                            <label className={`cpm-type-option ${isSolo ? 'cpm-type-option--active' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={isSolo}
                                    onChange={() => { setIsSolo(true); setError(''); }}
                                    className="cpm-checkbox"
                                />
                                <span className="cpm-type-label">
                                    <span className="cpm-type-name">Solo</span>
                                    <span className="cpm-type-sub">Just you</span>
                                </span>
                            </label>
                            <label className={`cpm-type-option ${!isSolo ? 'cpm-type-option--active' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={!isSolo}
                                    onChange={selectTeam}
                                    className="cpm-checkbox"
                                />
                                <span className="cpm-type-label">
                                    <span className="cpm-type-name">Team</span>
                                    <span className="cpm-type-sub">Collaborative</span>
                                </span>
                            </label>
                        </div>
                        {error && <span className="cpm-error">{error}</span>}
                    </div>
                </div>

                <div className="cpm-footer">
                    <button className="cpm-btn cpm-btn--cancel" onClick={onClose}>Cancel</button>
                    <button className="cpm-btn cpm-btn--create" onClick={handleCreate} disabled={loading}>
                        {loading ? 'Creating...' : 'Create project'}
                    </button>
                </div>
            </div>
        </div>
    );
}
