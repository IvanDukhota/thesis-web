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

export function apiSearchUser(username) {
    return request(`/api/users/search/?username=${encodeURIComponent(username)}`, { headers: auth() });
}

export function apiSendInvite(teamId, invitedUserId) {
    return request('/api/invitations/', {
        method: 'POST',
        headers: auth(),
        body: JSON.stringify({ team_id: teamId, invited_user_id: invitedUserId }),
    });
}

export function apiGetInvitations() {
    return request('/api/invitations/', { headers: auth() });
}

export function apiAcceptInvitation(id) {
    return request(`/api/invitations/${id}/accept/`, { method: 'POST', headers: auth() });
}

export function apiDeclineInvitation(id) {
    return request(`/api/invitations/${id}/decline/`, { method: 'POST', headers: auth() });
}
