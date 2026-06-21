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

export async function apiUploadTaskFile(projectId, taskId, file) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}/files/`, {
        method: 'POST',
        headers: auth(),
        body: fd,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
}

export function apiDeleteTaskFile(projectId, taskId, fileId) {
    return request(`/api/projects/${projectId}/tasks/${taskId}/files/${fileId}/`, {
        method: 'DELETE',
        headers: auth(),
    });
}

export async function apiUpdateTaskFileContent(projectId, taskId, fileId, content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], filename, { type: 'text/plain' });
    const fd = new FormData();
    fd.append('file', file);
    fd.append('original_name', filename);
    const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}/files/${fileId}/`, {
        method: 'PATCH',
        headers: auth(),
        body: fd,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
}
