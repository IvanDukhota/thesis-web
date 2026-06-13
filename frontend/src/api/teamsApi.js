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

export function apiCreateTeam({ name, description }) {
    return request('/api/teams/', {
        method: 'POST',
        headers: auth(),
        body: JSON.stringify({ name, description }),
    });
}

export function apiGetMyTeam() {
    return request('/api/teams/my/', { headers: auth() });
}

export function apiUpdateTeam(id, data) {
    return request(`/api/teams/${id}/`, {
        method: 'PATCH',
        headers: auth(),
        body: JSON.stringify(data),
    });
}

export function apiDeleteTeam(id) {
    return request(`/api/teams/${id}/`, {
        method: 'DELETE',
        headers: auth(),
    });
}

export function apiCreateRole(teamId, data) {
    return request(`/api/teams/${teamId}/roles/`, {
        method: 'POST',
        headers: auth(),
        body: JSON.stringify(data),
    });
}

export function apiUpdateRole(teamId, roleId, data) {
    return request(`/api/teams/${teamId}/roles/${roleId}/`, {
        method: 'PATCH',
        headers: auth(),
        body: JSON.stringify(data),
    });
}

export function apiDeleteRole(teamId, roleId) {
    return request(`/api/teams/${teamId}/roles/${roleId}/`, {
        method: 'DELETE',
        headers: auth(),
    });
}

export function apiUpdateMember(teamId, memberId, data) {
    return request(`/api/teams/${teamId}/members/${memberId}/`, {
        method: 'PATCH',
        headers: auth(),
        body: JSON.stringify(data),
    });
}

export function apiRemoveMember(teamId, memberId) {
    return request(`/api/teams/${teamId}/members/${memberId}/`, {
        method: 'DELETE',
        headers: auth(),
    });
}
