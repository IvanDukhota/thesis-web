import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    RiEyeLine, RiEyeOffLine,
    RiGoogleFill, RiFacebookFill,
    RiArrowUpSLine, RiArrowDownSLine,
} from 'react-icons/ri';
import { VscChevronDown } from 'react-icons/vsc';

import Stepper, { Step } from '../../features/auth/Stepper/Stepper.jsx';
import { GENDERS, LANGUAGES, REGIONS, validateStepOne, validateStepThree } from '../../config/AuthHelpers.js';

export function Field({ label, type = 'text', value, onChange, error, placeholder, rightSlot, filter }) {
    const handle = (v) => onChange(filter ? filter(v) : v);
    return (
        <div className="auth-field">
            <label className="auth-field-label">{label}</label>
            <div className="auth-field-wrap">
                <input
                    className={`auth-input ${error ? 'auth-input--error' : ''}`}
                    type={type}
                    value={value}
                    onChange={e => handle(e.target.value)}
                    placeholder={placeholder}
                    autoComplete="off"
                />
                {rightSlot && <div className="auth-input-slot">{rightSlot}</div>}
            </div>
            {error && <span className="auth-field-error">{error}</span>}
        </div>
    );
}

export function CustomSelect({ label, value, onChange, error, options, placeholder }) {
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const triggerRef = useRef(null);
    const dropdownRef = useRef(null);

    const openDropdown = () => {
        if (triggerRef.current) {
            const r = triggerRef.current.getBoundingClientRect();
            setCoords({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX, width: r.width });
        }
        setOpen(v => !v);
    };

    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (triggerRef.current?.contains(e.target)) return;
            if (dropdownRef.current?.contains(e.target)) return;
            setOpen(false);
        };
        document.addEventListener('pointerdown', handler);
        return () => document.removeEventListener('pointerdown', handler);
    }, [open]);

    const selected = options.find(o => o.value === value);

    return (
        <div className="auth-field">
            <label className="auth-field-label">{label}</label>
            <div className="auth-custom-select">
                <button
                    ref={triggerRef}
                    type="button"
                    className={`auth-custom-select-trigger ${error ? 'auth-input--error' : ''} ${open ? 'auth-custom-select-trigger--open' : ''}`}
                    onClick={openDropdown}
                >
                    <span className={selected ? 'auth-select-value' : 'auth-select-placeholder'}>
                        {selected ? selected.label : placeholder}
                    </span>
                    <VscChevronDown size={14} className={`auth-select-arrow ${open ? 'auth-select-arrow--up' : ''}`} />
                </button>
            </div>
            {error && <span className="auth-field-error">{error}</span>}
            {open && createPortal(
                <div
                    ref={dropdownRef}
                    className="auth-custom-select-dropdown auth-custom-select-dropdown--portal"
                    style={{ top: coords.top, left: coords.left, width: coords.width }}
                >
                    {options.map(o => (
                        <button
                            key={o.value}
                            type="button"
                            className={`auth-custom-select-item ${value === o.value ? 'auth-custom-select-item--active' : ''}`}
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

export function AgeCounter({ value, onChange, error }) {
    const num = parseInt(value);
    const stepAge = (delta) => {
        const base = isNaN(num) ? 18 : num;
        const next = base + delta;
        if (next >= 13 && next <= 120) onChange(String(next));
    };
    return (
        <div className="auth-field">
            <label className="auth-field-label">Age</label>
            <div className={`auth-age-counter ${error ? 'auth-input--error' : ''}`}>
                <input
                    className="auth-age-input"
                    type="text"
                    inputMode="numeric"
                    value={value}
                    placeholder="18"
                    onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
                />
                <div className="auth-age-btns">
                    <button type="button" className="auth-age-btn" onClick={() => stepAge(1)}><RiArrowUpSLine size={14} /></button>
                    <button type="button" className="auth-age-btn" onClick={() => stepAge(-1)}><RiArrowDownSLine size={14} /></button>
                </div>
            </div>
            {error && <span className="auth-field-error">{error}</span>}
        </div>
    );
}

export function SkipModal({ onContinue, onSkip, isLoading }) {
    return createPortal(
        <div className="skip-modal-overlay">
            <div className="skip-modal">
                <p className="skip-modal-title">Fill in your profile?</p>
                <p className="skip-modal-sub">
                    You can complete your profile now, or skip and fill it in later from your profile page.
                </p>
                <div className="skip-modal-actions">
                    <button className="skip-modal-btn skip-modal-btn--skip" onClick={onSkip} disabled={isLoading}>
                        {isLoading ? 'Creating account...' : 'Skip for now'}
                    </button>
                    <button className="skip-modal-btn skip-modal-btn--continue" onClick={onContinue} disabled={isLoading}>
                        Fill in now
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export function LoginForm({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState('');
    const [loading, setLoading] = useState(false);

    const validate = () => {
        const e = {};
        if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Enter a valid email address.';
        if (password.length < 6) e.password = 'Password must be at least 6 characters.';
        return e;
    };

    const handleSubmit = async () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }
        setLoading(true);
        setApiError('');
        const result = await onLogin(email, password);
        setLoading(false);
        if (!result.ok) {
            setApiError(result.error?.detail || 'Invalid email or password.');
        }
    };

    return (
        <div className="auth-form">
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" error={errors.email} />
            <Field
                label="Password" type={showPw ? 'text' : 'password'}
                value={password} onChange={setPassword}
                placeholder="••••••••" error={errors.password}
                rightSlot={
                    <button className="auth-eye-btn" onClick={() => setShowPw(v => !v)} type="button" tabIndex={-1}>
                        {showPw ? <RiEyeOffLine size={16} /> : <RiEyeLine size={16} />}
                    </button>
                }
            />
            {apiError && <span className="auth-field-error">{apiError}</span>}
            <button className="auth-submit-btn" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
            </button>
            <div className="auth-divider"><span>or continue with</span></div>
            <div className="auth-social">
                <button className="auth-social-btn"><RiGoogleFill size={15} /> Google</button>
                <button className="auth-social-btn"><RiFacebookFill size={15} /> Facebook</button>
            </div>
        </div>
    );
}

export function StepOne({ data, onChange, errors }) {
    const [showPw, setShowPw] = useState(false);
    const [showPw2, setShowPw2] = useState(false);
    return (
        <div className="step-fields">
            {errors.api && <span className="auth-field-error" style={{ display: 'block', marginBottom: 8 }}>{errors.api}</span>}
            <Field
                label="Display name (nickname)" value={data.nick}
                onChange={v => onChange('nick', v)} placeholder="alexkv" error={errors.nick}
            />
            <Field
                label="Email" type="email" value={data.email}
                onChange={v => onChange('email', v)} placeholder="you@example.com" error={errors.email}
            />
            <Field
                label="Password" type={showPw ? 'text' : 'password'}
                value={data.password} onChange={v => onChange('password', v)}
                placeholder="••••••••" error={errors.password}
                rightSlot={<button className="auth-eye-btn" onClick={() => setShowPw(p => !p)} type="button" tabIndex={-1}>{showPw ? <RiEyeOffLine size={16} /> : <RiEyeLine size={16} />}</button>}
            />
            <Field
                label="Confirm password" type={showPw2 ? 'text' : 'password'}
                value={data.password2} onChange={v => onChange('password2', v)}
                placeholder="••••••••" error={errors.password2}
                rightSlot={<button className="auth-eye-btn" onClick={() => setShowPw2(p => !p)} type="button" tabIndex={-1}>{showPw2 ? <RiEyeOffLine size={16} /> : <RiEyeLine size={16} />}</button>}
            />
        </div>
    );
}

export function StepTwo({ data, onChange, errors }) {
    return (
        <div className="step-fields">
            <AgeCounter value={data.age} onChange={v => onChange('age', v)} error={errors.age} />
            <CustomSelect label="Gender" value={data.gender} onChange={v => onChange('gender', v)} placeholder="Select gender (optional)" options={GENDERS} error={errors.gender} />
        </div>
    );
}

export function StepThree({ data, onChange, errors }) {
    return (
        <div className="step-fields">
            {errors.api && <span className="auth-field-error" style={{ display: 'block', marginBottom: 8 }}>{errors.api}</span>}
            <CustomSelect label="Region" value={data.region} onChange={v => onChange('region', v)} placeholder="Select region (optional)" options={REGIONS} error={errors.region} />
            <CustomSelect label="Language" value={data.language} onChange={v => onChange('language', v)} placeholder="Select language" options={LANGUAGES} error={errors.language} />
        </div>
    );
}

function parseApiError(error) {
    if (!error) return 'Something went wrong. Please try again.';
    if (error.username) return Array.isArray(error.username) ? error.username[0] : error.username;
    if (error.email) return Array.isArray(error.email) ? error.email[0] : error.email;
    if (error.detail) return error.detail;
    return 'Something went wrong. Please try again.';
}

export function RegisterStepper({ registerState, setRegisterState, onRegister }) {
    const { data, errors, done, showSkipModal } = registerState;
    const [stepperKey, setStepperKey] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const change = (key, val) => setRegisterState(s => ({
        ...s,
        data: { ...s.data, [key]: val },
        errors: { ...s.errors, [key]: undefined },
    }));

    const handleBeforeNext = async (currentStep) => {
        if (currentStep === 1) {
            const e = validateStepOne(data);
            if (Object.keys(e).length) {
                setRegisterState(s => ({ ...s, errors: e }));
                return false;
            }
            setRegisterState(s => ({ ...s, errors: {}, showSkipModal: true }));
            return false;
        }
        if (currentStep === 3) {
            const e = validateStepThree(data);
            if (Object.keys(e).length) {
                setRegisterState(s => ({ ...s, errors: e }));
                return false;
            }
            setIsSubmitting(true);
            const result = await onRegister(data);
            setIsSubmitting(false);
            if (result.ok) {
                setRegisterState(s => ({ ...s, done: true }));
            } else {
                setRegisterState(s => ({ ...s, errors: { api: parseApiError(result.error) } }));
            }
            return false;
        }
        setRegisterState(s => ({ ...s, errors: {} }));
        return true;
    };

    const handleSkip = async () => {
        setIsSubmitting(true);
        const result = await onRegister(data);
        setIsSubmitting(false);
        if (result.ok) {
            setRegisterState(s => ({ ...s, showSkipModal: false, done: true }));
        } else {
            setRegisterState(s => ({
                ...s,
                showSkipModal: false,
                errors: { api: parseApiError(result.error) },
            }));
        }
    };

    const handleContinue = () => {
        setRegisterState(s => ({ ...s, showSkipModal: false }));
        setStepperKey(k => k + 1);
    };

    if (done) {
        return (
            <div className="auth-done">
                <div className="auth-done-icon">✓</div>
                <p className="auth-done-title">Account created</p>
                <p className="auth-done-sub">Welcome to TeamHub, {data.nick || 'there'}.</p>
            </div>
        );
    }

    return (
        <>
            {showSkipModal && (
                <SkipModal
                    onContinue={handleContinue}
                    onSkip={handleSkip}
                    isLoading={isSubmitting}
                />
            )}
            <Stepper
                key={stepperKey}
                initialStep={stepperKey > 0 ? 2 : 1}
                onBeforeNext={handleBeforeNext}
                onFinalStepCompleted={() => {}}
                disableStepIndicators
                backButtonText="Back"
                nextButtonText="Continue"
                isProcessingExternal={isSubmitting}
            >
                <Step><StepOne data={data} onChange={change} errors={errors} /></Step>
                <Step><StepTwo data={data} onChange={change} errors={errors} /></Step>
                <Step><StepThree data={data} onChange={change} errors={errors} /></Step>
            </Stepper>
        </>
    );
}
