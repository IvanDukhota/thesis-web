import './AuthPage.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VscLayout } from 'react-icons/vsc';

import { LoginForm, RegisterStepper } from '../../components/features/auth/AuthComponents.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const EMPTY_REGISTER_STATE = {
    data: { nick: '', email: '', password: '', password2: '', language: 'en', gender: '', age: '', region: '' },
    errors: {},
    done: false,
    showSkipModal: false,
};

export default function AuthPage() {
    const [mode, setMode] = useState('login');
    const [registerState, setRegisterState] = useState(EMPTY_REGISTER_STATE);
    const { user, loading, login, register } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && user) navigate(user.is_staff ? '/admin' : '/', { replace: true });
    }, [user, loading, navigate]);

    useEffect(() => {
        if (registerState.done) {
            const t = setTimeout(() => navigate('/'), 1500);
            return () => clearTimeout(t);
        }
    }, [registerState.done, navigate]);

    const handleLogin = async (email, password) => {
        const result = await login(email, password);
        return result;
    };

    const handleRegister = async (data) => {
        return register({
            username: data.nick,
            email: data.email,
            password: data.password,
            password_confirm: data.password2,
            language: data.language || 'en',
            gender: data.gender || '',
            age: data.age ? parseInt(data.age) : null,
            region: data.region || '',
        });
    };

    return (
        <div className='authpage'>
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
                        ? <LoginForm onLogin={handleLogin} />
                        : <RegisterStepper registerState={registerState} setRegisterState={setRegisterState} onRegister={handleRegister} />
                    }
                </div>
            </div>
        </div>
    );
}
