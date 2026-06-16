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

export function apiGetTasks(projectId) {
    return request(`/api/projects/${projectId}/tasks/`, { headers: auth() });
}

export function apiCreateTask(projectId, data) {
    return request(`/api/projects/${projectId}/tasks/`, {
        method: 'POST',
        headers: auth(),
        body: JSON.stringify(data),
    });
}

export function apiUpdateTask(projectId, taskId, data) {
    return request(`/api/projects/${projectId}/tasks/${taskId}/`, {
        method: 'PATCH',
        headers: auth(),
        body: JSON.stringify(data),
    });
}

export function apiDeleteTask(projectId, taskId) {
    return request(`/api/projects/${projectId}/tasks/${taskId}/`, {
        method: 'DELETE',
        headers: auth(),
    });
}
