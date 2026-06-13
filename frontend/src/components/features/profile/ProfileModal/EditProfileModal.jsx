import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RiUpload2Line } from 'react-icons/ri';
import { VscChevronDown } from 'react-icons/vsc';
import { useAuth } from '../../../../context/AuthContext.jsx';

const GENDERS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
];

const REGIONS = [
    { value: 'north_america', label: 'North America' },
    { value: 'south_america', label: 'South America' },
    { value: 'europe', label: 'Europe' },
    { value: 'asia', label: 'Asia' },
    { value: 'africa', label: 'Africa' },
    { value: 'oceania', label: 'Oceania' },
    { value: 'middle_east', label: 'Middle East' },
];

const LANGUAGES = [
    { value: 'en', label: 'English' },
    { value: 'uk', label: 'Ukrainian' },
    { value: 'ru', label: 'Russian' },
    { value: 'de', label: 'German' },
    { value: 'fr', label: 'French' },
    { value: 'es', label: 'Spanish' },
    { value: 'pl', label: 'Polish' },
];

function OptionSelect({ value, onChange, options, placeholder }) {
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const triggerRef = useRef(null);
    const dropdownRef = useRef(null);

    const openDropdown = () => {
        if (triggerRef.current) {
            const r = triggerRef.current.getBoundingClientRect();
            setCoords({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: r.width });
        }
        setOpen(v => !v);
    };

    useEffect(() => {
        if (!open) return;
        const h = (e) => {
            if (triggerRef.current?.contains(e.target)) return;
            if (dropdownRef.current?.contains(e.target)) return;
            setOpen(false);
        };
        document.addEventListener('pointerdown', h);
        return () => document.removeEventListener('pointerdown', h);
    }, [open]);

    const selected = options.find(o => o.value === value);

    return (
        <div className="epm-select">
            <button
                ref={triggerRef}
                type="button"
                className={`epm-select-trigger ${open ? 'epm-select-trigger--open' : ''}`}
                onClick={openDropdown}
            >
                <span style={{ color: selected ? '#e4e4e7' : '#3f3f46' }}>
                    {selected ? selected.label : placeholder}
                </span>
                <VscChevronDown size={13} className={`epm-select-arrow ${open ? 'epm-select-arrow--up' : ''}`} />
            </button>
            {open && createPortal(
                <div
                    ref={dropdownRef}
                    className="epm-select-dropdown epm-select-dropdown--portal"
                    style={{ top: coords.top, left: coords.left, width: coords.width }}
                >
                    {options.map(o => (
                        <button
                            key={o.value}
                            type="button"
                            className={`epm-select-item ${value === o.value ? 'epm-select-item--active' : ''}`}
                            onClick={() => { onChange(o.value); setOpen(false); }}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
}

function ConfirmCancelModal({ onConfirm, onBack }) {
    return createPortal(
        <div className="epm-confirm-overlay">
            <div className="epm-confirm">
                <p className="epm-confirm-title">Discard changes?</p>
                <p className="epm-confirm-sub">Your unsaved changes will be lost.</p>
                <div className="epm-confirm-actions">
                    <button className="epm-confirm-btn epm-confirm-btn--back" onClick={onBack}>Keep editing</button>
                    <button className="epm-confirm-btn epm-confirm-btn--discard" onClick={onConfirm}>Discard</button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export function EditProfileModal({ onClose }) {
    const { user, updateProfile } = useAuth();
    const [form, setForm] = useState({
        language: user?.language || 'en',
        gender: user?.gender || '',
        age: user?.age ? String(user.age) : '',
        region: user?.region || '',
    });
    const [showConfirm, setShowConfirm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const fileRef = useRef(null);

    const initial = {
        language: user?.language || 'en',
        gender: user?.gender || '',
        age: user?.age ? String(user.age) : '',
        region: user?.region || '',
    };
    const isDirty = JSON.stringify(form) !== JSON.stringify(initial);

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

    const handleCancel = () => {
        if (isDirty) setShowConfirm(true);
        else onClose();
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        const { ok } = await updateProfile({
            language: form.language,
            gender: form.gender || '',
            age: form.age ? parseInt(form.age) : null,
            region: form.region || '',
        });
        setSaving(false);
        if (ok) onClose();
        else setError('Failed to save. Please try again.');
    };

    return createPortal(
        <div className="epm-overlay">
            {showConfirm && (
                <ConfirmCancelModal
                    onConfirm={onClose}
                    onBack={() => setShowConfirm(false)}
                />
            )}
            <div className="epm-modal">
                <div className="epm-header">
                    <span className="epm-title">Edit profile</span>
                    <button className="epm-close-btn" onClick={handleCancel}>✕</button>
                </div>

                <div className="epm-body">
                    <div className="epm-avatar-row">
                        <div className="epm-avatar-wrap">
                            {user?.avatar
                                ? <img src={user.avatar} alt="avatar" className="epm-avatar-img" />
                                : <div className="epm-avatar-placeholder">{user?.username?.[0]?.toUpperCase() || 'U'}</div>
                            }
                            <button className="epm-avatar-upload-btn" onClick={() => fileRef.current?.click()}>
                                <RiUpload2Line size={13} />
                            </button>
                            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} />
                        </div>
                        <div className="epm-avatar-hint">
                            <p className="epm-avatar-hint-title">Profile photo</p>
                            <p className="epm-avatar-hint-sub">JPG, PNG or GIF. Max 5 MB.</p>
                        </div>
                    </div>

                    <div className="epm-fields">
                        <div className="epm-row">
                            <div className="epm-field">
                                <label className="epm-label">Gender</label>
                                <OptionSelect value={form.gender} onChange={v => set('gender', v)} options={GENDERS} placeholder="Select gender" />
                            </div>
                            <div className="epm-field">
                                <label className="epm-label">Age</label>
                                <input className="epm-input" type="number" min={13} max={120} value={form.age} onChange={e => set('age', e.target.value)} placeholder="25" />
                            </div>
                        </div>
                        <div className="epm-field">
                            <label className="epm-label">Region</label>
                            <OptionSelect value={form.region} onChange={v => set('region', v)} options={REGIONS} placeholder="Select region" />
                        </div>
                        <div className="epm-field">
                            <label className="epm-label">Language</label>
                            <OptionSelect value={form.language} onChange={v => set('language', v)} options={LANGUAGES} placeholder="Select language" />
                        </div>
                    </div>

                    {error && <p style={{ color: '#f87171', fontSize: 13, marginTop: 8 }}>{error}</p>}
                </div>

                <div className="epm-footer">
                    <button className="epm-btn epm-btn--cancel" onClick={handleCancel} disabled={saving}>Cancel</button>
                    <button className="epm-btn epm-btn--save" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save changes'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
