import { useState } from 'react';
import { RiCloseLine } from 'react-icons/ri';
import './CreateProjectModal.css';

export function CreateProjectModal({ onClose, onCreate }) {
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [isSolo, setIsSolo] = useState(true);
    const [nameErr, setNameErr] = useState(false);

    const handleCreate = () => {
        if (!name.trim()) { setNameErr(true); return; }
        onCreate({ name, desc, type: isSolo ? 'solo' : 'team', tasks: 0, done: 0, status: 'Active' });
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
                                    onChange={() => setIsSolo(true)}
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
                                    onChange={() => setIsSolo(false)}
                                    className="cpm-checkbox"
                                />
                                <span className="cpm-type-label">
                                    <span className="cpm-type-name">Team</span>
                                    <span className="cpm-type-sub">Collaborative</span>
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="cpm-footer">
                    <button className="cpm-btn cpm-btn--cancel" onClick={onClose}>Cancel</button>
                    <button className="cpm-btn cpm-btn--create" onClick={handleCreate}>Create project</button>
                </div>
            </div>
        </div>
    );
}