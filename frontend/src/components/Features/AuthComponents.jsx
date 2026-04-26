import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Stepper, { Step } from '../../components/Stepper/Stepper';
import { RiEyeLine, RiEyeOffLine, RiGoogleFill, RiFacebookFill, RiArrowUpSLine, RiArrowDownSLine } from 'react-icons/ri';
import { VscChevronDown } from 'react-icons/vsc';
import { onlyLetters, GENDERS, REGIONS, validateStep } from './authHelpers';

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
    const step = (delta) => {
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
                    <button type="button" className="auth-age-btn" onClick={() => step(1)}>
                        <RiArrowUpSLine size={14} />
                    </button>
                    <button type="button" className="auth-age-btn" onClick={() => step(-1)}>
                        <RiArrowDownSLine size={14} />
                    </button>
                </div>
            </div>
            {error && <span className="auth-field-error">{error}</span>}
        </div>
    );
}

export function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [errors, setErrors] = useState({});

    const validate = () => {
        const e = {};
        if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Enter a valid email address.';
        if (password.length < 6) e.password = 'Password must be at least 6 characters.';
        return e;
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
            <button className="auth-submit-btn" onClick={() => setErrors(validate())}>Sign in</button>
            <div className="auth-divider"><span>or continue with</span></div>
            <div className="auth-social">
                <button className="auth-social-btn"><RiGoogleFill size={15} /> Google</button>
                <button className="auth-social-btn"><RiFacebookFill size={15} /> Facebook</button>
            </div>
        </div>
    );
}

export function StepOne({ data, onChange, errors }) {
    return (
        <div className="step-fields">
            <div className="auth-row">
                <Field label="First name" value={data.firstName} onChange={v => onChange('firstName', onlyLetters(v))} placeholder="Alex" error={errors.firstName} />
                <Field label="Last name" value={data.lastName} onChange={v => onChange('lastName', onlyLetters(v))} placeholder="Kovalenko" error={errors.lastName} />
            </div>
            <Field label="Display name (nickname)" value={data.nick} onChange={v => onChange('nick', v)} placeholder="alexkv" error={errors.nick} />
        </div>
    );
}

export function StepTwo({ data, onChange, errors }) {
    return (
        <div className="step-fields">
            <CustomSelect label="Gender" value={data.gender} onChange={v => onChange('gender', v)} placeholder="Select gender" options={GENDERS} error={errors.gender} />
            <AgeCounter value={data.age} onChange={v => onChange('age', v)} error={errors.age} />
            <CustomSelect label="Region" value={data.region} onChange={v => onChange('region', v)} placeholder="Select region" options={REGIONS} error={errors.region} />
        </div>
    );
}

export function StepThree({ data, onChange, errors }) {
    const [showPw, setShowPw] = useState(false);
    const [showPw2, setShowPw2] = useState(false);
    return (
        <div className="step-fields">
            <Field label="Email" type="email" value={data.email} onChange={v => onChange('email', v)} placeholder="you@example.com" error={errors.email} />
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

export function RegisterStepper({ registerState, setRegisterState }) {
    const { data, errors, done } = registerState;

    const change = (key, val) => setRegisterState(s => ({
        ...s,
        data: { ...s.data, [key]: val },
        errors: { ...s.errors, [key]: undefined },
    }));

    const handleBeforeNext = (currentStep) => {
        const e = validateStep(currentStep, data);
        if (Object.keys(e).length) {
            setRegisterState(s => ({ ...s, errors: e }));
            return false;
        }
        setRegisterState(s => ({ ...s, errors: {} }));
        return true;
    };

    if (done) {
        return (
            <div className="auth-done">
                <div className="auth-done-icon">✓</div>
                <p className="auth-done-title">Account created</p>
                <p className="auth-done-sub">Welcome to TeamHub, {data.firstName}.</p>
            </div>
        );
    }

    return (
        <Stepper
            onBeforeNext={handleBeforeNext}
            onFinalStepCompleted={() => setRegisterState(s => ({ ...s, done: true }))}
            disableStepIndicators
            backButtonText="Back"
            nextButtonText="Continue"
        >
            <Step><StepOne data={data} onChange={change} errors={errors} /></Step>
            <Step><StepTwo data={data} onChange={change} errors={errors} /></Step>
            <Step><StepThree data={data} onChange={change} errors={errors} /></Step>
        </Stepper>
    );
}