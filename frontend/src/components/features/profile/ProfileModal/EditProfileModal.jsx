import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RiUpload2Line } from 'react-icons/ri';
import { VscChevronDown } from 'react-icons/vsc';

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const REGIONS = ['North America', 'South America', 'Europe', 'Asia', 'Africa', 'Oceania', 'Middle East'];

function GenderSelect({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        if (!open) return;
        const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
        document.addEventListener('pointerdown', h);
        return () => document.removeEventListener('pointerdown', h);
    }, [open]);
    return (
        <div className="epm-select" ref={ref}>
            <button type="button" className={`epm-select-trigger ${open ? 'epm-select-trigger--open' : ''}`} onClick={() => setOpen(v => !v)}>
                <span style={{ color: value ? '#e4e4e7' : '#3f3f46' }}>{value || 'Select gender'}</span>
                <VscChevronDown size={13} className={`epm-select-arrow ${open ? 'epm-select-arrow--up' : ''}`} />
            </button>
            {open && (
                <div className="epm-select-dropdown">
                    {GENDERS.map(g => (
                        <button key={g} type="button" className={`epm-select-item ${value === g ? 'epm-select-item--active' : ''}`}
                            onClick={() => { onChange(g); setOpen(false); }}>{g}</button>
                    ))}
                </div>
            )}
        </div>
    );
}

function RegionSelect({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        if (!open) return;
        const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
        document.addEventListener('pointerdown', h);
        return () => document.removeEventListener('pointerdown', h);
    }, [open]);
    return (
        <div className="epm-select" ref={ref}>
            <button type="button" className={`epm-select-trigger ${open ? 'epm-select-trigger--open' : ''}`} onClick={() => setOpen(v => !v)}>
                <span style={{ color: value ? '#e4e4e7' : '#3f3f46' }}>{value || 'Select region'}</span>
                <VscChevronDown size={13} className={`epm-select-arrow ${open ? 'epm-select-arrow--up' : ''}`} />
            </button>
            {open && (
                <div className="epm-select-dropdown">
                    {REGIONS.map(r => (
                        <button key={r} type="button" className={`epm-select-item ${value === r ? 'epm-select-item--active' : ''}`}
                            onClick={() => { onChange(r); setOpen(false); }}>{r}</button>
                    ))}
                </div>
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

export function EditProfileModal({ profile, onSave, onClose }) {
    const [form, setForm] = useState({ ...profile });
    const [showConfirm, setShowConfirm] = useState(false);
    const fileRef = useRef(null);

    const isDirty = JSON.stringify(form) !== JSON.stringify(profile);

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

    const handleCancel = () => {
        if (isDirty) setShowConfirm(true);
        else onClose();
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        set('avatar', url);
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
                            {form.avatar
                                ? <img src={form.avatar} alt="avatar" className="epm-avatar-img" />
                                : <div className="epm-avatar-placeholder">{form.nick?.[0]?.toUpperCase() || 'U'}</div>
                            }
                            <button className="epm-avatar-upload-btn" onClick={() => fileRef.current?.click()}>
                                <RiUpload2Line size={13} />
                            </button>
                            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                        </div>
                        <div className="epm-avatar-hint">
                            <p className="epm-avatar-hint-title">Profile photo</p>
                            <p className="epm-avatar-hint-sub">JPG, PNG or GIF. Max 5 MB.</p>
                        </div>
                    </div>

                    <div className="epm-fields">
                        <div className="epm-row">
                            <div className="epm-field">
                                <label className="epm-label">First name</label>
                                <input className="epm-input" value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Alex" />
                            </div>
                            <div className="epm-field">
                                <label className="epm-label">Last name</label>
                                <input className="epm-input" value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Kovalenko" />
                            </div>
                        </div>
                        <div className="epm-field">
                            <label className="epm-label">Nickname</label>
                            <input className="epm-input" value={form.nick} onChange={e => set('nick', e.target.value)} placeholder="alexkv" />
                        </div>
                        <div className="epm-field">
                            <label className="epm-label">Email</label>
                            <input className="epm-input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" />
                        </div>
                        <div className="epm-row">
                            <div className="epm-field">
                                <label className="epm-label">Gender</label>
                                <GenderSelect value={form.gender} onChange={v => set('gender', v)} />
                            </div>
                            <div className="epm-field">
                                <label className="epm-label">Age</label>
                                <input className="epm-input" type="number" min={13} max={120} value={form.age} onChange={e => set('age', e.target.value)} placeholder="25" />
                            </div>
                        </div>
                        <div className="epm-field">
                            <label className="epm-label">Region</label>
                            <RegionSelect value={form.region} onChange={v => set('region', v)} />
                        </div>
                    </div>
                </div>

                <div className="epm-footer">
                    <button className="epm-btn epm-btn--cancel" onClick={handleCancel}>Cancel</button>
                    <button className="epm-btn epm-btn--save" onClick={() => { onSave(form); onClose(); }}>Save changes</button>
                </div>
            </div>
        </div>,
        document.body
    );
}