import './AuthPage.css';
import { useState } from 'react';
import { VscLayout } from 'react-icons/vsc';

import DarkVeil from '../../components/layout/DarkVeil/DarkVeil.jsx';
import { darkVeilConfig } from '../../components/config/PagesConfig.js';
import { LoginForm, RegisterStepper } from '../../components/features/auth/AuthComponents.jsx';

const EMPTY_REGISTER_STATE = {
    data: { nick: '', email: '', password: '', password2: '', firstName: '', lastName: '', gender: '', age: '', region: '' },
    errors: {},
    done: false,
    showSkipModal: false,
    stepperActive: false,
};

export default function AuthPage() {
    const [mode, setMode] = useState('login');
    const [registerState, setRegisterState] = useState(EMPTY_REGISTER_STATE);
    return (
        <div className='authpage'>
            <div className="authpage-bg">
                <DarkVeil {...darkVeilConfig} />
            </div>

            <div className={`auth-container ${mode === 'register' ? 'auth-container--wide' : ''}`}>
                <div className="auth-logo">
                    <div className="auth-logo-mark"><VscLayout size={16} /></div>
                    <span className="auth-logo-word">TeamHub</span>
                </div>

                <div className="auth-toggle">
                    <button className={`auth-toggle-btn ${mode === 'login' ? 'auth-toggle-btn--active' : ''}`} onClick={() => setMode('login')}>Sign in</button>
                    <button className={`auth-toggle-btn ${mode === 'register' ? 'auth-toggle-btn--active' : ''}`} onClick={() => setMode('register')}>Create account</button>
                </div>

                <div className="auth-body">
                    {mode === 'login'
                        ? <LoginForm />
                        : <RegisterStepper registerState={registerState} setRegisterState={setRegisterState} />
                    }
                </div>
            </div>
        </div>
    );
}