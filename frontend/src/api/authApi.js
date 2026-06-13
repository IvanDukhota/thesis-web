async function request(path, options = {}) {
    const { headers: extraHeaders, ...restOptions } = options;
    const res = await fetch(path, {
        headers: { 'Content-Type': 'application/json', ...extraHeaders },
        ...restOptions,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data, status: res.status };
}

export function apiLogin(email, password) {
    return request('/api/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
}

export function apiRegister({ username, email, password, password_confirm, language, gender, age, region }) {
    return request('/api/auth/register/', {
        method: 'POST',
        body: JSON.stringify({ username, email, password, password_confirm, language, gender, age, region }),
    });
}

export function apiMe(accessToken) {
    return request('/api/users/me/', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
}

export function apiRefresh(refresh) {
    return request('/api/auth/refresh/', {
        method: 'POST',
        body: JSON.stringify({ refresh }),
    });
}

export function apiUpdateProfile(data) {
    const access = localStorage.getItem('access');
    return request('/api/users/me/', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${access}` },
        body: JSON.stringify(data),
    });
}
