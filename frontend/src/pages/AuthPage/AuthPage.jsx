import './AuthPage.css';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DarkVeil from '../../components/DarkVeil/DarkVeil';
import { darkVeilConfig } from './AuthPageConfig';
import { LoginForm, RegisterStepper } from '../../components/Features/AuthComponents';

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
    const navigate = useNavigate();

    return (
        <div className='authpage'>
            <div className="authpage-bg">
                <DarkVeil {...darkVeilConfig} />
            </div>

            <div className={`auth-container ${mode === 'register' ? 'auth-container--wide' : ''}`}>
                <button className="auth-logo" onClick={() => navigate('/')}>
                    <span className="auth-logo-mark">T</span>
                    <span className="auth-logo-word">TeamHub</span>
                </button>

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