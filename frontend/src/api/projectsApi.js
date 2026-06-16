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

export function apiGetMyProjects() {
    return request('/api/projects/', { headers: auth() });
}

export function apiGetTeamProjects(teamId) {
    return request(`/api/projects/?team=${teamId}`, { headers: auth() });
}

export function apiCreateProject(data) {
    return request('/api/projects/', {
        method: 'POST', headers: auth(), body: JSON.stringify(data),
    });
}

export function apiGetProject(id) {
    return request(`/api/projects/${id}/`, { headers: auth() });
}

export function apiUpdateProject(id, data) {
    return request(`/api/projects/${id}/`, {
        method: 'PATCH', headers: auth(), body: JSON.stringify(data),
    });
}

export function apiDeleteProject(id) {
    return request(`/api/projects/${id}/`, { method: 'DELETE', headers: auth() });
}

export function apiGetProjectMembers(projectId) {
    return request(`/api/projects/${projectId}/members/`, { headers: auth() });
}

export function apiAddProjectMember(projectId, userId) {
    return request(`/api/projects/${projectId}/members/`, {
        method: 'POST', headers: auth(), body: JSON.stringify({ user_id: userId }),
    });
}

export function apiUpdateProjectMember(projectId, memberId, data) {
    return request(`/api/projects/${projectId}/members/${memberId}/`, {
        method: 'PATCH', headers: auth(), body: JSON.stringify(data),
    });
}

export function apiRemoveProjectMember(projectId, memberId) {
    return request(`/api/projects/${projectId}/members/${memberId}/`, {
        method: 'DELETE', headers: auth(),
    });
}

export function apiGetProjectRoles(projectId) {
    return request(`/api/projects/${projectId}/roles/`, { headers: auth() });
}

export function apiCreateProjectRole(projectId, data) {
    return request(`/api/projects/${projectId}/roles/`, {
        method: 'POST', headers: auth(), body: JSON.stringify(data),
    });
}

export function apiUpdateProjectRole(projectId, roleId, data) {
    return request(`/api/projects/${projectId}/roles/${roleId}/`, {
        method: 'PATCH', headers: auth(), body: JSON.stringify(data),
    });
}

export function apiDeleteProjectRole(projectId, roleId) {
    return request(`/api/projects/${projectId}/roles/${roleId}/`, {
        method: 'DELETE', headers: auth(),
    });
}
