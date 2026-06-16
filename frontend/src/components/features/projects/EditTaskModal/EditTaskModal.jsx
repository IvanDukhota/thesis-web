import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RiCloseLine, RiCodeSSlashLine, RiDeleteBinLine, RiCalendarLine } from 'react-icons/ri';
import { VscChevronDown } from 'react-icons/vsc';
import '../CreateTaskModal/CreateTaskModal.css';
import './EditTaskModal.css';

const PRIORITIES = ['high', 'medium', 'low'];
const TAGS = ['frontend', 'backend', 'design', 'testing', 'docs', 'devops', 'other'];
const COLUMNS = ['To Do', 'In Progress', 'Testing', 'Finished'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                 'July', 'August', 'September', 'October', 'November', 'December'];

function SimpleSelect({ value, onChange, options, placeholder, disabled, error }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="ctm2-select">
            <button
                type="button"
                className={`ctm2-select-trigger ${open ? 'ctm2-select-trigger--open' : ''} ${disabled ? 'ctm2-select-trigger--disabled' : ''} ${error ? 'ctm2-select-trigger--error' : ''}`}
                onClick={() => !disabled && setOpen(v => !v)}
                disabled={disabled}
            >
                <span style={{ color: value ? '#e4e4e7' : '#3f3f46' }}>{value || placeholder}</span>
                <VscChevronDown size={13} className={`ctm2-select-arrow ${open ? 'ctm2-select-arrow--up' : ''}`} />
            </button>
            {open && !disabled && (
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

function StyledDatePicker({ value, onChange, disabled }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const [selYear, selMonth, selDay] = value ? value.split('-').map(Number) : [null, null, null];
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 6 }, (_, i) => currentYear + i);
    const daysInMonth = selYear && selMonth ? new Date(selYear, selMonth, 0).getDate() : 31;
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const display = value
        ? new Date(value + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : null;

    useEffect(() => {
        if (!open) return;
        const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
        document.addEventListener('pointerdown', handler);
        return () => document.removeEventListener('pointerdown', handler);
    }, [open]);

    const update = (type, val) => {
        const y = type === 'year' ? val : (selYear || currentYear);
        const m = type === 'month' ? val : (selMonth || 1);
        const d = type === 'day' ? val : (selDay || 1);
        const maxDay = new Date(y, m, 0).getDate();
        onChange(`${y}-${String(m).padStart(2, '0')}-${String(Math.min(d, maxDay)).padStart(2, '0')}`);
    };

    return (
        <div
            className={`sdp-wrap ${disabled ? 'sdp-wrap--disabled' : ''}`}
            ref={ref}
            onClick={() => !disabled && setOpen(v => !v)}
        >
            <RiCalendarLine size={13} className="sdp-icon" />
            <span className={display ? 'sdp-text' : 'sdp-placeholder'}>{display || 'Set deadline'}</span>
            {open && (
                <div className="sdp-dropdown" onClick={e => e.stopPropagation()}>
                    <select className="sdp-sel" value={selDay || ''} onChange={e => update('day', Number(e.target.value))}>
                        <option value="">Day</option>
                        {days.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select className="sdp-sel" value={selMonth || ''} onChange={e => update('month', Number(e.target.value))}>
                        <option value="">Month</option>
                        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <select className="sdp-sel" value={selYear || ''} onChange={e => update('year', Number(e.target.value))}>
                        <option value="">Year</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            )}
        </div>
    );
}

export function EditTaskModal({ task, currentCol, projectType, onClose, onSave, onDelete, readOnly = false, canDelete = false, members = [] }) {
    const isTeam = projectType === 'team';
    const [title, setTitle] = useState(task.title || '');
    const [priority, setPriority] = useState(task.priority || '');
    const [deadline, setDeadline] = useState(task.deadline || '');
    const [assignee, setAssignee] = useState(task.assignee || '');
    const [tag, setTag] = useState(task.tag || '');
    const [column, setColumn] = useState(currentCol || 'To Do');
    const [errors, setErrors] = useState({});
    const [confirmDelete, setConfirmDelete] = useState(false);

    const assigneeOptions = members.map(m => m.username);

    const clearError = (field) => setErrors(prev => ({ ...prev, [field]: undefined }));

    const validate = () => {
        const e = {};
        if (!title.trim()) e.title = 'Title is required';
        if (!priority) e.priority = 'Priority is required';
        if (isTeam && !assignee) e.assignee = 'Assignee is required';
        return e;
    };

    const handleSave = () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }
        onSave(
            { ...task, title: title.trim(), priority, deadline: deadline || null, assignee: assignee || null, tag: tag || null },
            column
        );
        onClose();
    };

    return createPortal(
        <div className="ctm2-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="ctm2-modal etm-modal">
                <div className="ctm2-header">
                    <span className="ctm2-title">{readOnly ? 'View task' : 'Edit task'}</span>
                    <button className="ctm2-close" onClick={onClose}><RiCloseLine size={18} /></button>
                </div>

                <div className="ctm2-body">
                    <div className="ctm2-field">
                        <label className="ctm2-label">
                            Title {!readOnly && <span className="ctm2-required">*</span>}
                        </label>
                        <input
                            className={`ctm2-input ${errors.title ? 'ctm2-input--error' : ''} ${readOnly ? 'ctm2-input--readonly' : ''}`}
                            value={title}
                            onChange={e => { if (!readOnly) { setTitle(e.target.value); clearError('title'); } }}
                            placeholder="What needs to be done?"
                            readOnly={readOnly}
                            autoFocus
                        />
                        {errors.title && <span className="ctm2-error">{errors.title}</span>}
                    </div>

                    <div className="ctm2-row">
                        <div className="ctm2-field">
                            <label className="ctm2-label">
                                Priority {!readOnly && <span className="ctm2-required">*</span>}
                            </label>
                            <SimpleSelect
                                value={priority}
                                onChange={v => { setPriority(v); clearError('priority'); }}
                                options={PRIORITIES}
                                placeholder="Select priority"
                                disabled={readOnly}
                                error={!!errors.priority}
                            />
                            {errors.priority && <span className="ctm2-error">{errors.priority}</span>}
                        </div>
                        <div className="ctm2-field">
                            <label className="ctm2-label">Column</label>
                            <SimpleSelect value={column} onChange={setColumn} options={COLUMNS} placeholder="Select column" disabled={readOnly} />
                        </div>
                    </div>

                    {isTeam ? (
                        <div className="ctm2-row">
                            <div className="ctm2-field">
                                <label className="ctm2-label">
                                    Assignee {!readOnly && <span className="ctm2-required">*</span>}
                                </label>
                                <SimpleSelect
                                    value={assignee}
                                    onChange={v => { setAssignee(v); clearError('assignee'); }}
                                    options={assigneeOptions}
                                    placeholder="Assign to..."
                                    disabled={readOnly}
                                    error={!!errors.assignee}
                                />
                                {errors.assignee && <span className="ctm2-error">{errors.assignee}</span>}
                            </div>
                            <div className="ctm2-field">
                                <label className="ctm2-label">Deadline</label>
                                <StyledDatePicker
                                    value={deadline}
                                    onChange={v => { if (!readOnly) setDeadline(v); }}
                                    disabled={readOnly}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="ctm2-field">
                            <label className="ctm2-label">Deadline</label>
                            <StyledDatePicker
                                value={deadline}
                                onChange={v => { if (!readOnly) setDeadline(v); }}
                                disabled={readOnly}
                            />
                        </div>
                    )}

                    <div className="ctm2-field">
                        <label className="ctm2-label">Tag</label>
                        <SimpleSelect value={tag} onChange={setTag} options={TAGS} placeholder="Select tag" disabled={readOnly} />
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
                    <div className="etm-footer-left">
                        {canDelete && (
                            <button className="etm-delete-btn" onClick={() => setConfirmDelete(true)}>
                                <RiDeleteBinLine size={14} />
                                Delete
                            </button>
                        )}
                    </div>
                    <div className="etm-footer-right">
                        <button className="ctm2-btn ctm2-btn--cancel" onClick={onClose}>
                            {readOnly ? 'Close' : 'Cancel'}
                        </button>
                        {!readOnly && (
                            <button className="ctm2-btn ctm2-btn--create" onClick={handleSave}>
                                Save changes
                            </button>
                        )}
                    </div>
                </div>

                {confirmDelete && (
                    <div className="etm-confirm">
                        <p className="etm-confirm-text">Delete this task?</p>
                        <p className="etm-confirm-sub">This action cannot be undone.</p>
                        <div className="etm-confirm-actions">
                            <button className="etm-confirm-cancel" onClick={() => setConfirmDelete(false)}>
                                Cancel
                            </button>
                            <button className="etm-confirm-delete" onClick={() => onDelete(task.id)}>
                                <RiDeleteBinLine size={13} />
                                Yes, delete
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
