function auth() {
    return { Authorization: `Bearer ${localStorage.getItem('access')}` };
}

async function request(path, options = {}) {
    const { headers: extraHeaders, ...restOptions } = options;
    const res = await fetch(path, {
        headers: { 'Content-Type': 'application/json', ...extraHeaders },
        ...restOptions,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data, status: res.status };
}

export function apiGetNotifications() {
    return request('/api/notifications/', { headers: auth() });
}

export function apiMarkNotificationRead(id) {
    return request(`/api/notifications/${id}/read/`, { method: 'POST', headers: auth() });
}
