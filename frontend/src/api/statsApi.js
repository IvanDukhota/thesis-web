function auth() {
    return { Authorization: `Bearer ${localStorage.getItem('access')}` };
}

async function request(path) {
    const res = await fetch(path, { headers: { 'Content-Type': 'application/json', ...auth() } });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
}

export function apiGetPersonalStats() {
    return request('/api/stats/personal/');
}

export function apiGetTeamStats(teamId) {
    return request(`/api/stats/team/${teamId}/`);
}
