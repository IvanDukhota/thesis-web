import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RiCloseLine, RiCalendarLine, RiFileLine, RiUploadLine } from 'react-icons/ri';
import { VscChevronDown } from 'react-icons/vsc';
import { apiCreateTask, apiUploadTaskFile } from '../../../../api/tasksApi';
import './CreateTaskModal.css';

const PRIORITIES = ['high', 'medium', 'low'];
const TAGS = ['frontend', 'backend', 'design', 'testing', 'docs', 'devops', 'other'];
const COLUMNS = ['To Do', 'In Progress', 'Testing', 'Finished'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                 'July', 'August', 'September', 'October', 'November', 'December'];

function SimpleSelect({ value, onChange, options, placeholder, error }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="ctm2-select">
            <button
                type="button"
                className={`ctm2-select-trigger ${open ? 'ctm2-select-trigger--open' : ''} ${error ? 'ctm2-select-trigger--error' : ''}`}
                onClick={() => setOpen(v => !v)}
            >
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

export function CreateTaskModal({ onClose, onAdd, projectId, projectType, members = [] }) {
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState('');
    const [deadline, setDeadline] = useState('');
    const [assignee, setAssignee] = useState('');
    const [tag, setTag] = useState('');
    const [column, setColumn] = useState('To Do');
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [pendingFiles, setPendingFiles] = useState([]);
    const fileInputRef = useRef(null);

    const isTeam = projectType === 'team';
    const assigneeOptions = members.map(m => m.username);

    const validate = () => {
        const e = {};
        if (!title.trim()) e.title = 'Title is required';
        if (!priority) e.priority = 'Priority is required';
        if (isTeam && !assignee) e.assignee = 'Assignee is required';
        return e;
    };

    const handleFileSelect = (e) => {
        const selected = Array.from(e.target.files || []);
        e.target.value = '';
        if (!selected.length) return;
        const entries = selected.map(file => ({
            file,
            previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
            id: Math.random().toString(36).slice(2),
        }));
        setPendingFiles(prev => [...prev, ...entries]);
    };

    const handleRemovePending = (id) => {
        setPendingFiles(prev => {
            const entry = prev.find(f => f.id === id);
            if (entry?.previewUrl) URL.revokeObjectURL(entry.previewUrl);
            return prev.filter(f => f.id !== id);
        });
    };

    const handleAdd = async () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }
        setSaving(true);
        const payload = {
            title: title.trim(),
            priority,
            column,
            assignee: isTeam ? assignee : '',
            deadline: deadline || null,
            tag: tag || '',
        };
        const { ok, data } = await apiCreateTask(projectId, payload);
        if (!ok) { setSaving(false); return; }

        let task = data;
        for (const entry of pendingFiles) {
            const { ok: fOk, data: fData } = await apiUploadTaskFile(projectId, data.id, entry.file);
            if (fOk) task = { ...task, files: [...(task.files || []), fData] };
            if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
        }

        setSaving(false);
        onAdd(task);
        onClose();
    };

    const set = (field, value) => {
        if (field === 'title') setTitle(value);
        if (field === 'priority') setPriority(value);
        if (field === 'assignee') setAssignee(value);
        setErrors(prev => ({ ...prev, [field]: undefined }));
    };

    return createPortal(
        <div className="ctm2-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="ctm2-modal">
                <div className="ctm2-header">
                    <span className="ctm2-title">Create task</span>
                    <button className="ctm2-close" onClick={onClose}><RiCloseLine size={18} /></button>
                </div>

                <div className="ctm2-body">
                    <div className="ctm2-field">
                        <label className="ctm2-label">Title <span className="ctm2-required">*</span></label>
                        <input
                            className={`ctm2-input ${errors.title ? 'ctm2-input--error' : ''}`}
                            value={title}
                            onChange={e => set('title', e.target.value)}
                            placeholder="What needs to be done?"
                            autoFocus
                        />
                        {errors.title && <span className="ctm2-error">{errors.title}</span>}
                    </div>

                    <div className="ctm2-row">
                        <div className="ctm2-field">
                            <label className="ctm2-label">Priority <span className="ctm2-required">*</span></label>
                            <SimpleSelect
                                value={priority}
                                onChange={v => set('priority', v)}
                                options={PRIORITIES}
                                placeholder="Select priority"
                                error={!!errors.priority}
                            />
                            {errors.priority && <span className="ctm2-error">{errors.priority}</span>}
                        </div>
                        <div className="ctm2-field">
                            <label className="ctm2-label">Column</label>
                            <SimpleSelect value={column} onChange={setColumn} options={COLUMNS} placeholder="Select column" />
                        </div>
                    </div>

                    {isTeam ? (
                        <div className="ctm2-row">
                            <div className="ctm2-field">
                                <label className="ctm2-label">Assignee <span className="ctm2-required">*</span></label>
                                <SimpleSelect
                                    value={assignee}
                                    onChange={v => set('assignee', v)}
                                    options={assigneeOptions}
                                    placeholder="Assign to..."
                                    error={!!errors.assignee}
                                />
                                {errors.assignee && <span className="ctm2-error">{errors.assignee}</span>}
                            </div>
                            <div className="ctm2-field">
                                <label className="ctm2-label">Deadline</label>
                                <StyledDatePicker value={deadline} onChange={setDeadline} />
                            </div>
                        </div>
                    ) : (
                        <div className="ctm2-field">
                            <label className="ctm2-label">Deadline</label>
                            <StyledDatePicker value={deadline} onChange={setDeadline} />
                        </div>
                    )}

                    <div className="ctm2-field">
                        <label className="ctm2-label">Tag</label>
                        <SimpleSelect value={tag} onChange={setTag} options={TAGS} placeholder="Select tag" />
                    </div>

                    <div className="ctm2-field">
                        <label className="ctm2-label">Attachments</label>
                        <div className="ctm2-upload-zone" onClick={() => fileInputRef.current?.click()}>
                            <RiUploadLine size={13} />
                            <span>Click to attach files</span>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            style={{ display: 'none' }}
                            onChange={handleFileSelect}
                        />
                        {pendingFiles.length > 0 && (
                            <div className="ctm2-files-list">
                                {pendingFiles.map(entry => (
                                    <div key={entry.id} className="ctm2-pending-file">
                                        {entry.previewUrl
                                            ? <img src={entry.previewUrl} alt="" className="ctm2-file-thumb" />
                                            : <RiFileLine size={14} style={{ color: '#52525b', flexShrink: 0 }} />
                                        }
                                        <span className="ctm2-pending-filename">{entry.file.name}</span>
                                        <button
                                            type="button"
                                            className="ctm2-pending-remove"
                                            onClick={() => handleRemovePending(entry.id)}
                                        >
                                            <RiCloseLine size={13} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="ctm2-footer">
                    <button className="ctm2-btn ctm2-btn--cancel" onClick={onClose} disabled={saving}>Cancel</button>
                    <button className="ctm2-btn ctm2-btn--create" onClick={handleAdd} disabled={saving}>
                        {saving ? 'Creating...' : 'Create task'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
