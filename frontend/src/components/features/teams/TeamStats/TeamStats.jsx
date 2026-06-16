import { useState, useEffect } from 'react';
import { RiBarChartBoxLine } from 'react-icons/ri';
import { apiGetTeamStats } from '../../../../api/statsApi';
import './TeamStats.css';

const COLUMNS = [
    { key: 'finished', label: 'Finished', color: '#22c55e' },
    { key: 'in_progress', label: 'In Progress', color: '#7c3aed' },
    { key: 'testing', label: 'Testing', color: '#f59e0b' },
    { key: 'to_do', label: 'To Do', color: '#3f3f46' },
];

function OverviewTab({ stats }) {
    const t = stats.tasks;
    const total = t.total;

    return (
        <div className="ts-content">
            <div className="ts-kpi-row">
                <div className="ts-kpi">
                    <span className="ts-kpi-val">{stats.projects_count}</span>
                    <span className="ts-kpi-label">Projects</span>
                </div>
                <div className="ts-kpi">
                    <span className="ts-kpi-val">{total}</span>
                    <span className="ts-kpi-label">Total tasks</span>
                </div>
                <div className="ts-kpi">
                    <span className="ts-kpi-val">{t.finished}</span>
                    <span className="ts-kpi-label">Finished</span>
                </div>
                <div className="ts-kpi">
                    <span className="ts-kpi-val">
                        {total > 0 ? `${Math.round((t.finished / total) * 100)}%` : '0%'}
                    </span>
                    <span className="ts-kpi-label">Done rate</span>
                </div>
            </div>

            {total === 0 ? (
                <p className="ts-no-tasks">No tasks in team projects yet</p>
            ) : (
                <div className="ts-bars-section">
                    <div className="ts-bar-wrap">
                        {COLUMNS.map(col => {
                            const val = t[col.key];
                            const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                            return (
                                <div key={col.key} className="ts-bar-row">
                                    <span className="ts-bar-label">{col.label}</span>
                                    <div className="ts-bar-track">
                                        <div
                                            className="ts-bar-fill"
                                            style={{ width: `${pct}%`, background: col.color }}
                                        />
                                    </div>
                                    <span className="ts-bar-val">{val}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function MembersTab({ stats }) {
    const members = stats.members;

    if (members.length === 0) {
        return <p className="ts-no-tasks">No members found</p>;
    }

    return (
        <div className="ts-content ts-table-wrap">
            <div className="ts-table-head">
                <span>Member</span>
                <span>Assigned</span>
                <span>Done</span>
                <span>Pending</span>
                <span>Rate</span>
            </div>
            {members.map(m => {
                const pending = m.assigned - m.completed;
                const rate = m.assigned > 0 ? Math.round((m.completed / m.assigned) * 100) : 0;
                return (
                    <div key={m.username} className="ts-table-row">
                        <span className="ts-table-name">{m.username}</span>
                        <span>{m.assigned}</span>
                        <span style={{ color: '#22c55e' }}>{m.completed}</span>
                        <span style={{ color: '#71717a' }}>{pending}</span>
                        <span style={{ color: rate >= 70 ? '#22c55e' : rate >= 40 ? '#f59e0b' : '#71717a' }}>
                            {m.assigned > 0 ? `${rate}%` : '—'}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

export function TeamStats({ teamId }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview');

    useEffect(() => {
        if (!teamId) return;
        setLoading(true);
        apiGetTeamStats(teamId).then(({ ok, data }) => {
            if (ok) setStats(data);
            setLoading(false);
        });
    }, [teamId]);

    return (
        <div className="ts-root">
            <div className="ts-header">
                <span className="ts-title">Statistics</span>
                {stats && (
                    <div className="ts-tabs">
                        <button
                            className={`ts-tab ${tab === 'overview' ? 'ts-tab--active' : ''}`}
                            onClick={() => setTab('overview')}
                        >
                            Overview
                        </button>
                        <button
                            className={`ts-tab ${tab === 'members' ? 'ts-tab--active' : ''}`}
                            onClick={() => setTab('members')}
                        >
                            Members
                        </button>
                    </div>
                )}
            </div>

            <div className={`ts-body ${stats ? 'ts-body--data' : ''}`}>
                {loading && (
                    <div className="ts-empty">
                        <p className="ts-empty-text" style={{ color: '#3f3f46' }}>Loading...</p>
                    </div>
                )}
                {!loading && !stats && (
                    <div className="ts-empty">
                        <RiBarChartBoxLine size={28} className="ts-empty-icon" />
                        <p className="ts-empty-text">No data yet</p>
                        <p className="ts-empty-sub">Statistics will appear once the team starts working on projects</p>
                    </div>
                )}
                {!loading && stats && tab === 'overview' && <OverviewTab stats={stats} />}
                {!loading && stats && tab === 'members' && <MembersTab stats={stats} />}
            </div>
        </div>
    );
}
