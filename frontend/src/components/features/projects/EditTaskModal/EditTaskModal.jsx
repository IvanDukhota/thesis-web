import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { RiCloseLine, RiCodeSSlashLine, RiDeleteBinLine, RiCalendarLine, RiUploadLine, RiFileLine, RiFileTextLine, RiFileCodeLine, RiTerminalLine, RiDownloadLine, RiEditLine } from 'react-icons/ri';
import { SiPython, SiJavascript, SiTypescript, SiReact, SiGo, SiRust, SiPhp, SiCplusplus, SiMarkdown, SiKotlin, SiSwift, SiRuby, SiScala, SiElixir, SiHaskell, SiLua, SiVuedotjs } from 'react-icons/si';
import { VscChevronDown } from 'react-icons/vsc';
import { apiUploadTaskFile, apiDeleteTaskFile, apiUpdateTaskFileContent } from '../../../../api/tasksApi';
import '../CreateTaskModal/CreateTaskModal.css';
import './EditTaskModal.css';

const FILE_ICONS = {
    py:     { Icon: SiPython,       color: '#3b82f6' },
    js:     { Icon: SiJavascript,   color: '#f7df1e' },
    mjs:    { Icon: SiJavascript,   color: '#f7df1e' },
    ts:     { Icon: SiTypescript,   color: '#3178c6' },
    jsx:    { Icon: SiReact,        color: '#61dafb' },
    tsx:    { Icon: SiReact,        color: '#61dafb' },
    vue:    { Icon: SiVuedotjs,     color: '#42b883' },
    go:     { Icon: SiGo,           color: '#00add8' },
    rs:     { Icon: SiRust,         color: '#ce412b' },
    php:    { Icon: SiPhp,          color: '#777bb4' },
    cpp:    { Icon: SiCplusplus,    color: '#00599c' },
    cc:     { Icon: SiCplusplus,    color: '#00599c' },
    kt:     { Icon: SiKotlin,       color: '#7f52ff' },
    kts:    { Icon: SiKotlin,       color: '#7f52ff' },
    swift:  { Icon: SiSwift,        color: '#f05138' },
    rb:     { Icon: SiRuby,         color: '#cc342d' },
    scala:  { Icon: SiScala,        color: '#dc322f' },
    ex:     { Icon: SiElixir,       color: '#6e4a7e' },
    exs:    { Icon: SiElixir,       color: '#6e4a7e' },
    hs:     { Icon: SiHaskell,      color: '#5d4f85' },
    lua:    { Icon: SiLua,          color: '#2c2d72' },
    md:     { Icon: SiMarkdown,     color: '#a1a1aa' },
    html:   { Icon: RiFileCodeLine, color: '#e34f26' },
    htm:    { Icon: RiFileCodeLine, color: '#e34f26' },
    css:    { Icon: RiFileCodeLine, color: '#1572b6' },
    scss:   { Icon: RiFileCodeLine, color: '#cc6699' },
    java:   { Icon: RiFileCodeLine, color: '#f89820' },
    c:      { Icon: RiFileCodeLine, color: '#5c6bc0' },
    sh:     { Icon: RiTerminalLine, color: '#71717a' },
    bash:   { Icon: RiTerminalLine, color: '#71717a' },
    zsh:    { Icon: RiTerminalLine, color: '#71717a' },
    txt:    { Icon: RiFileTextLine, color: '#a1a1aa' },
    json:   { Icon: RiFileCodeLine, color: '#8bc34a' },
    xml:    { Icon: RiFileCodeLine, color: '#e37933' },
    yaml:   { Icon: RiFileCodeLine, color: '#cb171e' },
    yml:    { Icon: RiFileCodeLine, color: '#cb171e' },
    sql:    { Icon: RiFileCodeLine, color: '#00758f' },
    toml:   { Icon: RiFileCodeLine, color: '#9b4f96' },
};

function getFileIcon(filename) {
    const ext = filename.includes('.') ? filename.split('.').pop().toLowerCase() : '';
    return FILE_ICONS[ext] || { Icon: RiFileLine, color: '#71717a' };
}

const isDocsFile = (name) => {
    const l = name.toLowerCase();
    return l.endsWith('.md') || l.endsWith('.txt');
};

function DocsPreviewModal({ file: initialFile, taskTitle, projectId, taskId, readOnly, onClose, onFileUpdated, initialEditMode = false, isNewFile = false, onDeleteNew }) {
    const [currentFile, setCurrentFile] = useState(initialFile);
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [editMode, setEditMode] = useState(initialEditMode);
    const [editContent, setEditContent] = useState('');
    const [editName, setEditName] = useState(initialFile.original_name);
    const [saving, setSaving] = useState(false);
    const [hasSaved, setHasSaved] = useState(false);
    const displayName = editMode ? editName : currentFile.original_name;
    const isMarkdown = displayName.toLowerCase().endsWith('.md');
    const { Icon, color } = getFileIcon(displayName);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    useEffect(() => {
        setLoading(true);
        setFetchError(false);
        fetch(currentFile.url)
            .then(r => { if (!r.ok) throw new Error(); return r.text(); })
            .then(text => { setContent(text); setEditContent(text); setLoading(false); })
            .catch(() => { setFetchError(true); setLoading(false); });
    }, [currentFile.url]);

    const handleSave = async () => {
        setSaving(true);
        const { ok, data } = await apiUpdateTaskFileContent(projectId, taskId, currentFile.id, editContent, editName);
        if (ok) {
            setContent(editContent);
            setCurrentFile(data);
            setEditName(data.original_name);
            onFileUpdated(data);
            setEditMode(false);
            setHasSaved(true);
        }
        setSaving(false);
    };

    const handleCancel = () => {
        if (isNewFile && !hasSaved) {
            onDeleteNew?.();
        } else {
            setEditMode(false);
        }
    };

    const handleClose = () => {
        if (isNewFile && !hasSaved) {
            onDeleteNew?.();
        } else {
            onClose();
        }
    };

    return createPortal(
        <div className="fpv-overlay" onMouseDown={e => e.stopPropagation()}>
            <div className="fpv-panel mdpv-panel">
                <div className="dpv-header">
                    <div className="dpv-header-main">
                        <div className="fpv-title-row">
                            <Icon size={15} style={{ color, flexShrink: 0 }} />
                            {editMode ? (
                                <input
                                    className="fpv-filename-input"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    onFocus={e => e.target.select()}
                                    onClick={e => e.stopPropagation()}
                                    spellCheck={false}
                                    placeholder="filename.md"
                                />
                            ) : (
                                <span className="fpv-filename">{currentFile.original_name}</span>
                            )}
                        </div>
                        {!editMode && (
                            <div className="fpv-meta-row" style={{ marginTop: 2 }}>
                                {currentFile.uploaded_by && <span>uploaded by <strong>{currentFile.uploaded_by}</strong></span>}
                                {currentFile.uploaded_by && taskTitle && <span className="fpv-dot">·</span>}
                                {taskTitle && <span>{taskTitle}</span>}
                            </div>
                        )}
                    </div>
                    <div className="dpv-header-right">
                        {!readOnly && !editMode && (
                            <button className="fpv-edit-btn" onClick={() => { setEditContent(content ?? ''); setEditName(currentFile.original_name); setEditMode(true); }}>
                                <RiEditLine size={13} />
                                Edit
                            </button>
                        )}
                        {editMode && (
                            <>
                                <button className="fpv-edit-cancel" onClick={handleCancel} disabled={saving}>Cancel</button>
                                <button className="fpv-edit-save" onClick={handleSave} disabled={saving}>
                                    {saving ? 'Saving...' : 'Save'}
                                </button>
                            </>
                        )}
                        <button className="fpv-close" onClick={handleClose}>
                            <RiCloseLine size={18} />
                        </button>
                    </div>
                </div>
                <div className={`fpv-body${editMode ? ' dpv-edit-body' : ' mdpv-body'}`}>
                    {loading && <div className="fpv-status">Loading...</div>}
                    {fetchError && <div className="fpv-status fpv-status--error">Failed to load file content</div>}
                    {!loading && !fetchError && content !== null && (
                        editMode ? (
                            <textarea
                                className="fpv-edit-textarea"
                                value={editContent}
                                onChange={e => setEditContent(e.target.value)}
                                spellCheck={false}
                                autoFocus
                            />
                        ) : isMarkdown ? (
                            <div className="md-content">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                            </div>
                        ) : (
                            <pre className="fpv-plain-text">{content}</pre>
                        )
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

const CHAR_PX = 7.6;
const LINE_NUM_COL = 68;
const SIDE_PAD = 40;

function FilePreviewModal({ file, taskTitle, onClose }) {
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    useEffect(() => {
        fetch(file.url)
            .then(r => { if (!r.ok) throw new Error(); return r.text(); })
            .then(text => { setContent(text); setLoading(false); })
            .catch(() => { setFetchError(true); setLoading(false); });
    }, [file.url]);

    const panelWidth = (() => {
        if (!content) return 680;
        const maxLen = Math.max(...content.split('\n').map(l => l.length));
        const ideal = LINE_NUM_COL + maxLen * CHAR_PX + SIDE_PAD;
        return Math.min(Math.max(ideal, 560), window.innerWidth * 0.92);
    })();

    const { Icon, color } = getFileIcon(file.original_name);
    const lines = content?.split('\n') ?? [];

    return createPortal(
        <div className="fpv-overlay" onMouseDown={e => e.stopPropagation()}>
            <div className="fpv-panel" style={{ width: panelWidth }}>
                <div className="fpv-header">
                    <div className="fpv-title-row">
                        <Icon size={15} style={{ color, flexShrink: 0 }} />
                        <span className="fpv-filename">{file.original_name}</span>
                    </div>
                    <div className="fpv-meta-row">
                        {file.uploaded_by && <span>uploaded by <strong>{file.uploaded_by}</strong></span>}
                        {file.uploaded_by && taskTitle && <span className="fpv-dot">·</span>}
                        {taskTitle && <span>{taskTitle}</span>}
                    </div>
                    <button className="fpv-close" onClick={onClose}>
                        <RiCloseLine size={18} />
                    </button>
                </div>

                <div className="fpv-body">
                    {loading && <div className="fpv-status">Loading...</div>}
                    {fetchError && <div className="fpv-status fpv-status--error">Failed to load file content</div>}
                    {!loading && !fetchError && (
                        <pre className="fpv-pre">
                            {lines.map((line, i) => (
                                <div key={i} className="fpv-line">
                                    <span className="fpv-ln">{i + 1}</span>
                                    <span className="fpv-lc">{line || ' '}</span>
                                </div>
                            ))}
                        </pre>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

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

export function EditTaskModal({ task, currentCol, projectId, projectType, onClose, onSave, onDelete, onFilesChanged, readOnly = false, canDelete = false, members = [] }) {
    const isTeam = projectType === 'team';
    const [title, setTitle] = useState(task.title || '');
    const [description, setDescription] = useState(task.description || '');
    const descRef = useRef(null);

    useEffect(() => {
        const el = descRef.current;
        if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
    }, []);
    const [priority, setPriority] = useState(task.priority || '');
    const [deadline, setDeadline] = useState(task.deadline || '');
    const [assignee, setAssignee] = useState(task.assignee || '');
    const [tag, setTag] = useState(task.tag || '');
    const [column, setColumn] = useState(currentCol || 'To Do');
    const [errors, setErrors] = useState({});
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [files, setFiles] = useState(task.files || []);
    const [uploading, setUploading] = useState(false);
    const [previewFile, setPreviewFile] = useState(null);
    const [previewAutoEdit, setPreviewAutoEdit] = useState(false);
    const [confirmDeleteFileId, setConfirmDeleteFileId] = useState(null);
    const fileInputRef = useRef(null);

    const assigneeOptions = members.map(m => m.username);

    const clearError = (field) => setErrors(prev => ({ ...prev, [field]: undefined }));

    const validate = () => {
        const e = {};
        if (!title.trim()) e.title = 'Title is required';
        if (!priority) e.priority = 'Priority is required';
        if (isTeam && !assignee) e.assignee = 'Assignee is required';
        return e;
    };

    const handleCreateDoc = async () => {
        if (!projectId) return;
        const blob = new Blob([''], { type: 'text/plain' });
        const file = new File([blob], 'Untitled.md', { type: 'text/plain' });
        setUploading(true);
        const { ok, data } = await apiUploadTaskFile(projectId, task.id, file);
        setUploading(false);
        if (ok) {
            setFiles(prev => [...prev, data]);
            setPreviewAutoEdit(true);
            setPreviewFile(data);
        }
    };

    const handleFileSelect = async (e) => {
        const selected = Array.from(e.target.files || []);
        e.target.value = '';
        if (!selected.length || !projectId) return;
        setUploading(true);
        for (const file of selected) {
            const { ok, data } = await apiUploadTaskFile(projectId, task.id, file);
            if (ok) setFiles(prev => [...prev, data]);
        }
        setUploading(false);
    };

    const handleFileDownload = async (f) => {
        const res = await fetch(f.url);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = f.original_name;
        a.click();
        URL.revokeObjectURL(blobUrl);
    };

    const handleFileRemove = async (fileId) => {
        if (!projectId) return;
        const { ok } = await apiDeleteTaskFile(projectId, task.id, fileId);
        if (ok) setFiles(prev => prev.filter(f => f.id !== fileId));
    };

    const handleClose = () => {
        onFilesChanged?.(files);
        onClose();
    };

    const handleSave = () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }
        onFilesChanged?.(files);
        onSave(
            { ...task, title: title.trim(), description, priority, deadline: deadline || null, assignee: assignee || null, tag: tag || null, files },
            column
        );
        onClose();
    };

    return createPortal(
        <div className="ctm2-overlay" onMouseDown={e => { if (e.target === e.currentTarget) handleClose(); }}>
            <div className="ctm2-modal etm-modal">
                <div className="ctm2-header">
                    <span className="ctm2-title">{readOnly ? 'View task' : 'Edit task'}</span>
                    <button className="ctm2-close" onClick={handleClose}><RiCloseLine size={18} /></button>
                </div>

                <div className="ctm2-body etm-body-split">
                    <div className="etm-col-left">
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

                        <div className="ctm2-field">
                            <label className="ctm2-label">Description</label>
                            <textarea
                                ref={descRef}
                                className={`ctm2-input etm-description ${readOnly ? 'ctm2-input--readonly' : ''}`}
                                value={description}
                                onChange={e => {
                                    if (readOnly) return;
                                    setDescription(e.target.value);
                                    const el = descRef.current;
                                    if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
                                }}
                                placeholder="Add a description..."
                                readOnly={readOnly}
                            />
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

                        {isTeam && (
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
                        )}

                        <div className="ctm2-row">
                            <div className="ctm2-field">
                                <label className="ctm2-label">Deadline</label>
                                <StyledDatePicker
                                    value={deadline}
                                    onChange={v => { if (!readOnly) setDeadline(v); }}
                                    disabled={readOnly}
                                />
                            </div>
                            <div className="ctm2-field">
                                <label className="ctm2-label">Tag</label>
                                <SimpleSelect value={tag} onChange={setTag} options={TAGS} placeholder="Select tag" disabled={readOnly} />
                            </div>
                        </div>
                    </div>

                    <div className="etm-col-right">
                        <div className="etm-code-header">
                            <RiCodeSSlashLine size={14} />
                            <span>Files</span>
                        </div>

                        {!readOnly && (
                            <>
                                <div
                                    className={`etm-drop-zone${uploading ? ' etm-drop-zone--loading' : ''}`}
                                    onClick={() => !uploading && fileInputRef.current?.click()}
                                >
                                    <RiUploadLine size={15} className="etm-drop-icon" />
                                    <span>{uploading ? 'Uploading...' : 'Click to attach files'}</span>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    style={{ display: 'none' }}
                                    onChange={handleFileSelect}
                                />
                            </>
                        )}

                        {(() => {
                            const mdFiles = files.filter(f => isDocsFile(f.original_name));
                            const codeFiles = files.filter(f => !isDocsFile(f.original_name));

                            const renderFileItem = (f) => {
                                const { Icon, color } = getFileIcon(f.original_name);
                                return (
                                    <div key={f.id} className={`etm-file-item${confirmDeleteFileId === f.id ? ' etm-file-item--confirm' : ''}`}>
                                        <span className="etm-file-icon">
                                            <Icon size={15} style={{ color }} />
                                        </span>
                                        <button
                                            className="etm-file-name"
                                            title={f.original_name}
                                            onClick={() => confirmDeleteFileId === f.id ? setConfirmDeleteFileId(null) : setPreviewFile(f)}
                                        >
                                            {f.original_name}
                                        </button>
                                        {confirmDeleteFileId === f.id ? (
                                            <div className="etm-file-confirm">
                                                <span className="etm-file-confirm-text">Delete?</span>
                                                <button className="etm-file-confirm-cancel" onClick={() => setConfirmDeleteFileId(null)}>Cancel</button>
                                                <button className="etm-file-confirm-ok" onClick={() => { setConfirmDeleteFileId(null); handleFileRemove(f.id); }}>Delete</button>
                                            </div>
                                        ) : (
                                            <div className="etm-file-actions">
                                                <button className="etm-file-action" onClick={() => handleFileDownload(f)} title="Download">
                                                    <RiDownloadLine size={13} />
                                                </button>
                                                {!readOnly && (
                                                    <button className="etm-file-action etm-file-remove" onClick={() => setConfirmDeleteFileId(f.id)} title="Remove">
                                                        <RiCloseLine size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            };

                            return (
                                <div className="etm-files-list">
                                    {(mdFiles.length > 0 || !readOnly) && (
                                        <div className="etm-file-group">
                                            <div className="etm-file-group-header">
                                                <span className="etm-file-group-label">Docs</span>
                                                {!readOnly && (
                                                    <button className="etm-docs-add" onClick={handleCreateDoc} title="New document">+</button>
                                                )}
                                            </div>
                                            {mdFiles.length > 0 && <div className="etm-files">{mdFiles.map(renderFileItem)}</div>}
                                        </div>
                                    )}
                                    {codeFiles.length > 0 && (
                                        <div className="etm-file-group">
                                            <span className="etm-file-group-label">Code</span>
                                            <div className="etm-files">{codeFiles.map(renderFileItem)}</div>
                                        </div>
                                    )}
                                    {files.length === 0 && readOnly && (
                                        <p className="etm-code-note">No files attached</p>
                                    )}
                                </div>
                            );
                        })()}
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
                        <button className="ctm2-btn ctm2-btn--cancel" onClick={handleClose}>
                            {readOnly ? 'Close' : 'Cancel'}
                        </button>
                        {!readOnly && (
                            <button className="ctm2-btn ctm2-btn--create" onClick={handleSave}>
                                Save changes
                            </button>
                        )}
                    </div>
                </div>

                {previewFile && (
                    isDocsFile(previewFile.original_name)
                        ? <DocsPreviewModal
                            file={previewFile}
                            taskTitle={task.title}
                            projectId={projectId}
                            taskId={task.id}
                            readOnly={readOnly}
                            initialEditMode={previewAutoEdit}
                            isNewFile={previewAutoEdit}
                            onClose={() => { setPreviewFile(null); setPreviewAutoEdit(false); }}
                            onDeleteNew={async () => {
                                await handleFileRemove(previewFile.id);
                                setPreviewFile(null);
                                setPreviewAutoEdit(false);
                            }}
                            onFileUpdated={(updated) => {
                                setFiles(prev => prev.map(f => f.id === updated.id ? updated : f));
                                setPreviewFile(updated);
                            }}
                          />
                        : <FilePreviewModal file={previewFile} taskTitle={task.title} onClose={() => setPreviewFile(null)} />
                )}

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
