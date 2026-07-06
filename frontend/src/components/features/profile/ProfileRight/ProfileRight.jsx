import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProfileRight.css';
import { useAuth } from '../../../../context/AuthContext';
import { apiGetPersonalStats } from '../../../../api/statsApi';
import { apiGetMyProjects } from '../../../../api/projectsApi';
import { apiGetContacts, apiSearchUser, apiAddContact } from '../../../../api/contactsApi';

const TABS = [
    { id: 'stat', label: 'Personal stat' },
    { id: 'projects', label: 'My projects' },
    { id: 'contacts', label: 'Contacts' },
];

const COLUMN_SEGMENTS = [
    { label: 'Finished', color: '#22c55e' },
    { label: 'In Progress', color: '#7c3aed' },
    { label: 'Testing', color: '#f59e0b' },
    { label: 'To Do', color: '#3f3f46' },
];

function relativeTime(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
}

function DonutChart({ segments, total }) {
    const cx = 85, cy = 85, r = 60, sw = 18;
    const circ = 2 * Math.PI * r;
    const finished = segments.find(s => s.label === 'Finished')?.value ?? 0;
    const pct = total > 0 ? Math.round((finished / total) * 100) : 0;

    const rotations = segments.reduce(({ angle, rots }, seg) => ({
        angle: angle + (seg.value / total) * 360,
        rots: [...rots, angle],
    }), { angle: -90, rots: [] }).rots;

    if (total === 0) {
        return (
            <svg width="170" height="170" viewBox="0 0 170 170">
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw} />
                <text x={cx} y={cy + 5} textAnchor="middle" fill="#3f3f46" fontSize="13" fontFamily="inherit">
                    No tasks yet
                </text>
            </svg>
        );
    }

    return (
        <svg width="170" height="170" viewBox="0 0 170 170">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={sw} />
            {segments.map((seg, i) => {
                const fraction = seg.value / total;
                const dash = fraction * circ - 3;
                const gap = circ - dash;
                return (
                    <circle key={i} cx={cx} cy={cy} r={r}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={sw}
                        strokeDasharray={`${Math.max(dash, 0)} ${gap}`}
                        transform={`rotate(${rotations[i]} ${cx} ${cy})`}
                    />
                );
            })}
            <text x={cx} y={cy - 7} textAnchor="middle"
                fill="#e4e4e7" fontSize="22" fontWeight="600" fontFamily="inherit">
                {pct}%
            </text>
            <text x={cx} y={cy + 11} textAnchor="middle"
                fill="#52525b" fontSize="11" fontFamily="inherit">
                complete
            </text>
        </svg>
    );
}

function StatPanel() {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        apiGetPersonalStats().then(({ ok, data }) => {
            if (ok) setStats(data);
        });
    }, []);

    const tasks = stats?.tasks;
    const total = tasks?.total ?? 0;

    const segments = COLUMN_SEGMENTS.map(seg => ({
        ...seg,
        value: tasks ? {
            'Finished': tasks.finished,
            'In Progress': tasks.in_progress,
            'Testing': tasks.testing,
            'To Do': tasks.to_do,
        }[seg.label] : 0,
    }));

    const pct = total > 0 ? Math.round((tasks.finished / total) * 100) : 0;

    return (
        <div className="pr-stat-panel">
            <div className="pr-donut-wrap">
                <DonutChart segments={segments} total={total} />
                <div className="pr-donut-legend">
                    {segments.map(seg => (
                        <div key={seg.label} className="pr-legend-item">
                            <span className="pr-legend-dot" style={{ background: seg.color }} />
                            <span className="pr-legend-label">{seg.label}</span>
                            <span className="pr-legend-val">{seg.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="pr-stat-grid">
                <div className="pr-stat-card">
                    <span className="pr-stat-value">{total}</span>
                    <span className="pr-stat-label">Total tasks</span>
                </div>
                <div className="pr-stat-card">
                    <span className="pr-stat-value">{stats?.projects ?? '—'}</span>
                    <span className="pr-stat-label">Projects</span>
                </div>
                <div className="pr-stat-card">
                    <span className="pr-stat-value">{stats?.teams ?? '—'}</span>
                    <span className="pr-stat-label">Teams</span>
                </div>
                <div className="pr-stat-card">
                    <span className="pr-stat-value">{stats ? `${pct}%` : '—'}</span>
                    <span className="pr-stat-label">Completed</span>
                </div>
            </div>
        </div>
    );
}

function ProjectsPanel() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [projects, setProjects] = useState(null);

    useEffect(() => {
        apiGetMyProjects().then(({ ok, data }) => {
            if (ok) setProjects(data);
        });
    }, []);

    if (!projects) {
        return <div className="pr-panel-list" style={{ color: '#3f3f46', fontSize: 13 }}>Loading...</div>;
    }

    if (projects.length === 0) {
        return <div className="pr-panel-list" style={{ color: '#3f3f46', fontSize: 13 }}>No projects yet.</div>;
    }

    return (
        <div className="pr-panel-list">
            {projects.map(p => {
                const myMember = p.project_members?.find(m => m.user_id === user?.id);
                const roleName = myMember?.role_name || '—';
                const progress = p.task_count > 0 ? Math.round((p.done_count / p.task_count) * 100) : 0;
                return (
                    <div
                        key={p.id}
                        className="pr-project-card pr-project-card--link"
                        onClick={() => navigate(`/projects/${p.id}`)}
                    >
                        <div className="pr-project-top">
                            <span className="pr-project-name">{p.name}</span>
                            <div className="pr-project-meta">
                                <span className="pr-project-role">{roleName}</span>
                                <span className="pr-project-dot">·</span>
                                <span className="pr-project-updated">{relativeTime(p.updated_at)}</span>
                            </div>
                        </div>
                        <div className="pr-progress-wrap">
                            <div className="pr-progress-bar" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="pr-project-footer">
                            <span className="pr-project-tasks">{p.done_count} / {p.task_count} tasks done</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function ContactsPanel() {
    const navigate = useNavigate();
    const [contacts, setContacts] = useState(null);
    const [query, setQuery] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [adding, setAdding] = useState(false);
    const [addMsg, setAddMsg] = useState('');

    useEffect(() => {
        apiGetContacts().then(({ ok, data }) => {
            if (ok) setContacts(data);
        });
    }, []);

    async function handleSearch(e) {
        e.preventDefault();
        if (!query.trim()) return;
        setSearchResult(null);
        setAddMsg('');
        const { ok, data } = await apiSearchUser(query.trim());
        setSearchResult(ok ? data : 'not_found');
    }

    async function handleAdd() {
        if (!searchResult || searchResult === 'not_found') return;
        setAdding(true);
        const { ok } = await apiAddContact(searchResult.id);
        if (ok) {
            setQuery('');
            setSearchResult(null);
            setAddMsg('');
            const { ok: ok2, data } = await apiGetContacts();
            if (ok2) setContacts(data);
        } else {
            setAddMsg('Already in contacts.');
        }
        setAdding(false);
    }

    if (contacts === null) {
        return <div className="pr-panel-list" style={{ color: '#3f3f46', fontSize: 13 }}>Loading...</div>;
    }

    const isEmpty = contacts.length === 0;

    return (
        <div className={`pr-contacts-root${isEmpty ? ' pr-contacts-root--empty' : ''}`}>
            <form className="pr-contacts-search" onSubmit={handleSearch}>
                <input
                    className="pr-contacts-input"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setSearchResult(null); setAddMsg(''); }}
                    placeholder="Enter username"
                />
                <button className="pr-contacts-search-btn" type="submit">Search</button>
            </form>

            {isEmpty && !searchResult && !addMsg && (
                <p className="pr-contacts-empty-msg">No contacts yet. Search for a user above to add them.</p>
            )}

            {searchResult && searchResult !== 'not_found' && (
                <div className="pr-contacts-result">
                    <span className="pr-contacts-result-name">@{searchResult.username}</span>
                    <button className="pr-contacts-add-btn" onClick={handleAdd} disabled={adding}>
                        {adding ? 'Adding...' : 'Add'}
                    </button>
                </div>
            )}
            {searchResult === 'not_found' && (
                <p className="pr-contacts-feedback">User not found.</p>
            )}
            {addMsg && <p className="pr-contacts-feedback">{addMsg}</p>}

            {!isEmpty && (
                <div className="pr-panel-list pr-contacts-list">
                    {contacts.map(c => (
                        <div
                            key={c.id}
                            className="pr-project-card pr-project-card--link"
                            onClick={() => navigate('/chat')}
                        >
                            <div className="pr-contacts-card-row">
                                {c.avatar
                                    ? <img className="pr-contacts-avatar" src={c.avatar} alt="" />
                                    : <div className="pr-contacts-avatar pr-contacts-avatar--placeholder">
                                        {(c.username || '?')[0].toUpperCase()}
                                      </div>
                                }
                                <div className="pr-contacts-card-info">
                                    <span className="pr-contacts-name">{c.full_name || c.username}</span>
                                    <span className="pr-contacts-username">@{c.username}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function ProfileRight() {
    const [activeTab, setActiveTab] = useState('stat');

    return (
        <div className="pr-root">
            <div className="pr-tabs">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        className={`pr-tab ${activeTab === t.id ? 'pr-tab--active' : ''}`}
                        onClick={() => setActiveTab(t.id)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
            <div className="pr-content">
                {activeTab === 'stat' && <StatPanel />}
                {activeTab === 'projects' && <ProjectsPanel />}
                {activeTab === 'contacts' && <ContactsPanel />}
            </div>
        </div>
    );
}
