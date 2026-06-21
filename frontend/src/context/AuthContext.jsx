import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiLogin, apiMe, apiRefresh, apiRegister, apiUpdateProfile } from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const clearAuth = useCallback(() => {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        setUser(null);
    }, []);

    useEffect(() => {
        const restore = async () => {
            const access = localStorage.getItem('access');
            if (!access) return;

            const { ok, data } = await apiMe(access);
            if (ok) { setUser(data); return; }

            const refresh = localStorage.getItem('refresh');
            if (!refresh) { clearAuth(); return; }

            const { ok: rok, data: rdata } = await apiRefresh(refresh);
            if (!rok) { clearAuth(); return; }

            localStorage.setItem('access', rdata.access);
            const { ok: mok, data: mdata } = await apiMe(rdata.access);
            if (mok) setUser(mdata);
            else clearAuth();
        };

        restore().finally(() => setLoading(false));
    }, [clearAuth]);

    const login = async (email, password) => {
        const { ok, data } = await apiLogin(email, password);
        if (!ok) return { ok: false, error: data };
        localStorage.setItem('access', data.access);
        localStorage.setItem('refresh', data.refresh);
        const { ok: mok, data: mdata } = await apiMe(data.access);
        if (mok) setUser(mdata);
        return { ok: true };
    };

    const register = async ({ username, email, password, password_confirm, language, gender, age, region }) => {
        const { ok, data } = await apiRegister({ username, email, password, password_confirm, language, gender, age, region });
        if (!ok) return { ok: false, error: data };
        localStorage.setItem('access', data.access);
        localStorage.setItem('refresh', data.refresh);
        setUser(data.user);
        return { ok: true };
    };

    const updateProfile = async (data, avatarFile = null) => {
        const { ok, data: userData } = await apiUpdateProfile(data, avatarFile);
        if (ok) setUser(userData);
        return { ok, data: userData };
    };

    const logout = clearAuth;

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
