import './AdminPage.css';
import { useState, useEffect, useCallback, Fragment } from 'react';
import {
    RiDashboardLine,
    RiFileListLine,
    RiServerLine,
    RiShieldLine,
    RiLogoutBoxLine,
    RiRefreshLine,
    RiCpuLine,
} from 'react-icons/ri';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
    { id: 'metrics',  label: 'Metrics',      icon: <RiDashboardLine size={16} /> },
    { id: 'logs',     label: 'Request Logs', icon: <RiFileListLine size={16} /> },
    { id: 'services', label: 'Services',     icon: <RiServerLine size={16} /> },
];

const SERVICES = [
    'teamhub-backend',
    'teamhub-celery',
    'teamhub-embedding',
    'teamhub-translation',
    'teamhub-db',
    'teamhub-redis',
    'teamhub-minio',
    'teamhub-frontend',
];

const STATUS_CLASS = {
    2: 'adm-status--2xx',
    3: 'adm-status--3xx',
    4: 'adm-status--4xx',
    5: 'adm-status--5xx',
};

function authFetch(path) {
    const access = localStorage.getItem('access');
    return fetch(path, { headers: { Authorization: `Bearer ${access}` } });
}

function StatCard({ label, value, unit }) {
    return (
        <div className="adm-stat-card">
            <span className="adm-stat-label">{label}</span>
            <span className="adm-stat-value">
                {value ?? '—'}
                {value != null && unit && <span className="adm-stat-unit">{unit}</span>}
            </span>
        </div>
    );
}

function MetricsSection() {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchMetrics = useCallback(() => {
        setLoading(true);
        authFetch('/api/admin-panel/metrics/')
            .then(r => r.json())
            .then(setMetrics)
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchMetrics();
        const id = setInterval(fetchMetrics, 15000);
        return () => clearInterval(id);
    }, [fetchMetrics]);

    if (!metrics && !loading) return (
        <div className="adm-section">
            <div className="adm-placeholder">
                <RiCpuLine size={28} />
                <span>No metrics yet — Prometheus may still be scraping</span>
            </div>
        </div>
    );

    const r = metrics?.requests;
    const p = metrics?.process;

    return (
        <div className="adm-section">
            <div className="adm-logs-toolbar" style={{ marginBottom: 20 }}>
                <h2 className="adm-section-title" style={{ margin: 0 }}>Metrics</h2>
                <button className="adm-refresh-btn" onClick={fetchMetrics} disabled={loading}>
                    <RiRefreshLine size={14} className={loading ? 'adm-spin' : ''} />
                </button>
            </div>

            <div className="adm-metrics-group-label">Requests</div>
            <div className="adm-stats-grid" style={{ marginBottom: 28 }}>
                <StatCard label="Req / sec" value={r?.rps} />
                <StatCard label="Latency p95" value={r?.latency_p95_ms} unit="ms" />
                <StatCard label="5xx / sec" value={r?.errors_5xx} />
                <StatCard label="4xx / sec" value={r?.errors_4xx} />
                <StatCard label="DB queries / sec" value={r?.db_qps} />
            </div>

            <div className="adm-metrics-group-label">Django Process</div>
            <div className="adm-stats-grid" style={{ marginBottom: 28 }}>
                <StatCard label="CPU" value={p?.cpu_percent} unit="%" />
                <StatCard label="RAM" value={p?.ram_mb} unit="MB" />
                <StatCard label="Uptime" value={p?.uptime} />
            </div>

            {metrics?.top_latency?.length > 0 && (
                <>
                    <div className="adm-metrics-group-label">Slowest Endpoints (p95)</div>
                    <div className="adm-table-wrap" style={{ marginBottom: 20 }}>
                        <table className="adm-table">
                            <thead><tr><th>Endpoint</th><th>Latency p95</th></tr></thead>
                            <tbody>
                                {metrics.top_latency.map((e, i) => (
                                    <tr key={i}>
                                        <td className="adm-td-mono">{e.view}</td>
                                        <td className="adm-td-mono">{e.latency_ms}ms</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {metrics?.top_traffic?.length > 0 && (
                <>
                    <div className="adm-metrics-group-label">Most Requested Endpoints</div>
                    <div className="adm-table-wrap">
                        <table className="adm-table">
                            <thead><tr><th>Endpoint</th><th>Req / sec</th></tr></thead>
                            <tbody>
                                {metrics.top_traffic.map((e, i) => (
                                    <tr key={i}>
                                        <td className="adm-td-mono">{e.view}</td>
                                        <td className="adm-td-mono">{e.rps}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

function LogsSection() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [service, setService] = useState('teamhub-backend');
    const [limit, setLimit] = useState(50);
    const [selectedLog, setSelectedLog] = useState(null);

    const logKey = (log) => `${log.ts}_${log.method}_${log.path}_${log.ip}`;

    const fetchLogs = useCallback(() => {
        setLoading(true);
        setError(null);
        authFetch(`/api/admin-panel/logs/?service=${service}&limit=${limit}`)
            .then(r => r.json())
            .then(data => {
                if (data.error) setError(data.error);
                else setLogs(data.logs || []);
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [service, limit]);

    useEffect(() => {
        fetchLogs();
        const id = setInterval(fetchLogs, 5000);
        return () => clearInterval(id);
    }, [fetchLogs]);

    const statusClass = (status) => STATUS_CLASS[Math.floor(status / 100)] || '';
    const formatTime = (ts) => ts ? new Date(ts * 1000).toLocaleTimeString() : '—';

    const toggleSelect = (log) =>
        setSelectedLog(prev => prev && logKey(prev) === logKey(log) ? null : log);

    return (
        <div className="adm-section">
            <div className="adm-logs-toolbar">
                <h2 className="adm-section-title" style={{ margin: 0 }}>Request Logs</h2>
                <div className="adm-logs-controls">
                    <select className="adm-select" value={service} onChange={e => setService(e.target.value)}>
                        {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select className="adm-select" value={limit} onChange={e => setLimit(Number(e.target.value))}>
                        {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n} rows</option>)}
                    </select>
                    <button className="adm-refresh-btn" onClick={fetchLogs} disabled={loading}>
                        <RiRefreshLine size={14} className={loading ? 'adm-spin' : ''} />
                    </button>
                </div>
            </div>

            {selectedLog && (
                <div className="adm-log-panel">
                    <div className="adm-log-panel-header">
                        <div className="adm-log-panel-meta">
                            {selectedLog.method && (
                                <span className={`adm-method adm-method--${selectedLog.method.toLowerCase()}`}>
                                    {selectedLog.method}
                                </span>
                            )}
                            <span className="adm-td-mono" style={{ color: '#d4d4d8' }}>{selectedLog.path || '—'}</span>
                            {selectedLog.status && (
                                <span className={`adm-status ${statusClass(selectedLog.status)}`}>{selectedLog.status}</span>
                            )}
                            {selectedLog.duration_ms != null && (
                                <span className="adm-td-mono adm-td-muted">{selectedLog.duration_ms}ms</span>
                            )}
                            <span className="adm-td-mono adm-td-muted">{formatTime(selectedLog.ts)}</span>
                        </div>
                        <button className="adm-log-panel-close" onClick={() => setSelectedLog(null)}>✕</button>
                    </div>
                    {selectedLog.raw
                        ? <pre className="adm-log-raw">{selectedLog.raw}</pre>
                        : (
                            <div className="adm-log-detail-fields">
                                {Object.entries(selectedLog).filter(([, v]) => v != null).map(([k, v]) => (
                                    <div key={k} className="adm-log-detail-field">
                                        <span className="adm-log-detail-key">{k}</span>
                                        <span className="adm-log-detail-val">{String(v)}</span>
                                    </div>
                                ))}
                            </div>
                        )
                    }
                </div>
            )}

            {error && <div className="adm-error">{error}</div>}

            {!error && logs.length === 0 && !loading && (
                <div className="adm-placeholder">
                    <RiFileListLine size={28} />
                    <span>No logs yet — make some requests first</span>
                </div>
            )}

            {logs.length > 0 && (
                <div className="adm-table-wrap">
                    <table className="adm-table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Method</th>
                                <th>Path</th>
                                <th>Status</th>
                                <th>Duration</th>
                                <th>User</th>
                                <th>IP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log, i) => {
                                const isSelected = selectedLog && logKey(selectedLog) === logKey(log);
                                return (
                                    <tr
                                        key={i}
                                        className={`adm-log-row${isSelected ? ' adm-log-row--selected' : ''}`}
                                        onClick={() => toggleSelect(log)}
                                    >
                                        <td className="adm-td-mono">{formatTime(log.ts)}</td>
                                        <td>{log.method ? <span className={`adm-method adm-method--${log.method.toLowerCase()}`}>{log.method}</span> : '—'}</td>
                                        <td className="adm-td-path adm-td-mono" title={log.path || log.raw}>{log.path || log.raw || '—'}</td>
                                        <td>{log.status ? <span className={`adm-status ${statusClass(log.status)}`}>{log.status}</span> : '—'}</td>
                                        <td className="adm-td-mono">{log.duration_ms != null ? `${log.duration_ms}ms` : '—'}</td>
                                        <td>{log.user || <span className="adm-td-muted">anon</span>}</td>
                                        <td className="adm-td-mono adm-td-muted">{log.ip || '—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

const SERVICE_GROUPS = [
    { label: 'Core',          names: ['PostgreSQL', 'Redis'] },
    { label: 'Storage',       names: ['MinIO'] },
    { label: 'AI Services',   names: ['Embedding Service', 'Translation Service'] },
    { label: 'Observability', names: ['Loki', 'Promtail', 'Grafana', 'Prometheus', 'cAdvisor'] },
];

function ServiceCard({ svc }) {
    return (
        <div className={`adm-service-card ${svc.status === 'online' ? 'adm-service-card--online' : 'adm-service-card--offline'}`}>
            <div className="adm-service-header">
                <span className={`adm-service-dot ${svc.status === 'online' ? 'adm-service-dot--online' : 'adm-service-dot--offline'}`} />
                <span className="adm-service-name">{svc.name}</span>
            </div>
            <div className="adm-service-status">
                {svc.status === 'online'
                    ? <span className="adm-service-online">online</span>
                    : <span className="adm-service-offline">offline</span>
                }
            </div>
            <div className="adm-service-ms">
                {svc.response_ms != null ? `${svc.response_ms}ms` : '—'}
            </div>
            {svc.error && <div className="adm-service-error">{svc.error}</div>}
        </div>
    );
}

function ServicesSection() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchServices = useCallback(() => {
        setLoading(true);
        authFetch('/api/admin-panel/services/')
            .then(r => r.json())
            .then(data => {
                setServices(data.services || []);
                setLastUpdated(new Date());
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchServices();
        const id = setInterval(fetchServices, 15000);
        return () => clearInterval(id);
    }, [fetchServices]);

    const byName = Object.fromEntries(services.map(s => [s.name, s]));

    return (
        <div className="adm-section">
            <div className="adm-logs-toolbar">
                <h2 className="adm-section-title" style={{ margin: 0 }}>Services</h2>
                <div className="adm-logs-controls">
                    {lastUpdated && (
                        <span className="adm-td-muted" style={{ fontSize: 12 }}>
                            Updated {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                    <button className="adm-refresh-btn" onClick={fetchServices} disabled={loading}>
                        <RiRefreshLine size={14} className={loading ? 'adm-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="adm-services-groups">
                {SERVICE_GROUPS.map(group => {
                    const groupServices = group.names.map(n => byName[n]).filter(Boolean);
                    if (groupServices.length === 0) return null;
                    return (
                        <div key={group.label} className="adm-services-group">
                            <div className="adm-services-group-label">{group.label}</div>
                            <div className="adm-services-row">
                                {groupServices.map(svc => <ServiceCard key={svc.name} svc={svc} />)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function PlaceholderSection({ label }) {
    return (
        <div className="adm-section">
            <h2 className="adm-section-title">{label}</h2>
            <div className="adm-placeholder">
                <RiServerLine size={28} />
                <span>Coming soon</span>
            </div>
        </div>
    );
}

export default function AdminPage() {
    const [active, setActive] = useState('metrics');
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/auth', { replace: true });
    };

    return (
        <div className="adm-root">
            <aside className="adm-sidebar">
                <div className="adm-sidebar-logo">
                    <RiShieldLine size={18} />
                    <span>Admin</span>
                </div>

                <nav className="adm-nav">
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.id}
                            className={`adm-nav-item ${active === item.id ? 'adm-nav-item--active' : ''}`}
                            onClick={() => setActive(item.id)}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="adm-sidebar-footer">
                    <div className="adm-user-row">
                        <span className="adm-user-name">{user?.username}</span>
                        <span className="adm-user-badge">staff</span>
                    </div>
                    <button className="adm-logout-btn" onClick={handleLogout}>
                        <RiLogoutBoxLine size={15} />
                        Sign out
                    </button>
                </div>
            </aside>

            <main className="adm-main">
                {active === 'metrics' && <MetricsSection />}
                {active === 'logs' && <LogsSection />}

                {active === 'services' && <ServicesSection />}
            </main>
        </div>
    );
}
