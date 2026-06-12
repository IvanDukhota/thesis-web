import { useState } from 'react';
import { createPortal } from 'react-dom';
import { RiCloseLine, RiCodeSSlashLine } from 'react-icons/ri';
import { VscChevronDown } from 'react-icons/vsc';
import '../CreateTaskModal/CreateTaskModal.css';
import './EditTaskModal.css';

const PRIORITIES = ['high', 'medium', 'low'];
const TAGS = ['frontend', 'backend', 'design', 'testing', 'docs', 'devops', 'other'];
const ASSIGNEES = ['Alex K.', 'Maria S.', 'Ivan D.', 'Olha P.'];
const COLUMNS = ['To Do', 'In Progress', 'Testing', 'Finished'];

function SimpleSelect({ value, onChange, options, placeholder }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="ctm2-select">
            <button type="button" className={`ctm2-select-trigger ${open ? 'ctm2-select-trigger--open' : ''}`}
                onClick={() => setOpen(v => !v)}>
                <span style={{ color: value ? '#e4e4e7' : '#3f3f46' }}>{value || placeholder}</span>
                <VscChevronDown size={13} className={`ctm2-select-arrow ${open ? 'ctm2-select-arrow--up' : ''}`} />
            </button>
            {open && (
                <div className="ctm2-select-dropdown">
                    {options.map(o => (
                        <button key={o} type="button"
                            className={`ctm2-select-item ${value === o ? 'ctm2-select-item--active' : ''}`}
                            onClick={() => { onChange(o); setOpen(false); }}>
                            {o}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export function EditTaskModal({ task, currentCol, onClose, onSave }) {
    const [title, setTitle] = useState(task.title || '');
    const [priority, setPriority] = useState(task.priority || '');
    const [deadline, setDeadline] = useState(task.deadline || '');
    const [assignee, setAssignee] = useState(task.assignee || '');
    const [tag, setTag] = useState(task.tag || '');
    const [column, setColumn] = useState(currentCol || 'To Do');
    const [titleErr, setTitleErr] = useState(false);

    const handleSave = () => {
        if (!title.trim()) { setTitleErr(true); return; }
        onSave(
            { ...task, title, priority: priority || null, deadline: deadline || null, assignee: assignee || null, tag: tag || null },
            column
        );
        onClose();
    };

    return createPortal(
        <div className="ctm2-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="ctm2-modal etm-modal">
                <div className="ctm2-header">
                    <span className="ctm2-title">Edit task</span>
                    <button className="ctm2-close" onClick={onClose}><RiCloseLine size={18} /></button>
                </div>

                <div className="ctm2-body">
                    <div className="ctm2-field">
                        <label className="ctm2-label">Title <span className="ctm2-required">*</span></label>
                        <input className={`ctm2-input ${titleErr ? 'ctm2-input--error' : ''}`}
                            value={title} onChange={e => { setTitle(e.target.value); setTitleErr(false); }}
                            placeholder="What needs to be done?" autoFocus />
                        {titleErr && <span className="ctm2-error">Title is required</span>}
                    </div>

                    <div className="ctm2-row">
                        <div className="ctm2-field">
                            <label className="ctm2-label">Priority</label>
                            <SimpleSelect value={priority} onChange={setPriority} options={PRIORITIES} placeholder="Select priority" />
                        </div>
                        <div className="ctm2-field">
                            <label className="ctm2-label">Column</label>
                            <SimpleSelect value={column} onChange={setColumn} options={COLUMNS} placeholder="Select column" />
                        </div>
                    </div>

                    <div className="ctm2-row">
                        <div className="ctm2-field">
                            <label className="ctm2-label">Assignee</label>
                            <SimpleSelect value={assignee} onChange={setAssignee} options={ASSIGNEES} placeholder="Assign to..." />
                        </div>
                        <div className="ctm2-field">
                            <label className="ctm2-label">Deadline</label>
                            <input className="ctm2-input ctm2-input--date" type="date"
                                value={deadline} onChange={e => setDeadline(e.target.value)} />
                        </div>
                    </div>

                    <div className="ctm2-field">
                        <label className="ctm2-label">Tag</label>
                        <SimpleSelect value={tag} onChange={setTag} options={TAGS} placeholder="Select tag" />
                    </div>

                    <div className="etm-divider" />

                    <div className="etm-code-section">
                        <div className="etm-code-header">
                            <RiCodeSSlashLine size={14} />
                            <span>Code</span>
                        </div>
                        <button className="etm-code-btn" disabled>
                            + Attach code snippet
                        </button>
                        <p className="etm-code-note">Git integration coming soon</p>
                    </div>
                </div>

                <div className="ctm2-footer">
                    <button className="ctm2-btn ctm2-btn--cancel" onClick={onClose}>Cancel</button>
                    <button className="ctm2-btn ctm2-btn--create" onClick={handleSave}>Save changes</button>
                </div>
            </div>
        </div>,
        document.body
    );
}
