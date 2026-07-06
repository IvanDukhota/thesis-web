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

export function apiGetContacts() {
    return request('/api/users/contacts/', { headers: auth() });
}

export function apiSearchUser(username) {
    return request(`/api/users/search/?username=${encodeURIComponent(username)}`, { headers: auth() });
}

export function apiAddContact(contactId) {
    return request('/api/users/contacts/create/', {
        method: 'POST',
        headers: auth(),
        body: JSON.stringify({ contact_id: contactId }),
    });
}
