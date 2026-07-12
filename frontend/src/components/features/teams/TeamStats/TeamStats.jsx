import { useState, useEffect } from 'react';
import { RiBarChartBoxLine } from 'react-icons/ri';
import { apiGetTeamStats } from '../../../../api/statsApi';
import './TeamStats.css';

const SEGMENTS = [
    { key: 'finished',   label: 'Finished',    color: '#22c55e' },
    { key: 'in_progress',label: 'In Progress',  color: '#7c3aed' },
    { key: 'testing',    label: 'Testing',      color: '#f59e0b' },
    { key: 'to_do',      label: 'To Do',        color: '#3f3f46' },
];

function DonutChart({ t, total }) {
    const r = 36;
    const circ = 2 * Math.PI * r;
    const doneRate = total > 0 ? Math.round((t.finished / total) * 100) : 0;

    const computed = [];
    let acc = 0;
    for (const seg of SEGMENTS) {
        const val = t[seg.key] ?? 0;
        const len = total > 0 ? (val / total) * circ : 0;
        computed.push({ ...seg, val, len, offset: acc });
        acc += len;
    }

    return (
        <div className="ts-donut-wrap">
            <div className="ts-donut-svg-wrap">
                <svg viewBox="0 0 100 100" className="ts-donut-svg">
                    <circle cx="50" cy="50" r={r} fill="none"
                        stroke="rgba(255,255,255,0.05)" strokeWidth="11" />
                    {computed.map((seg, i) => seg.len > 0 && (
                        <circle key={seg.key}
                            cx="50" cy="50" r={r}
                            fill="none"
                            stroke={seg.color}
                            strokeWidth="11"
                            strokeLinecap="butt"
                            className="ts-donut-seg"
                            style={{
                                strokeDashoffset: -seg.offset,
                                '--seg-len': seg.len,
                                '--seg-gap': circ - seg.len,
                                animationDelay: `${i * 0.07}s`,
                            }}
                        />
                    ))}
                </svg>
                <div className="ts-donut-center">
                    <span className="ts-donut-pct">{doneRate}%</span>
                    <span className="ts-donut-sub">done</span>
                </div>
            </div>
            <div className="ts-donut-legend">
                {computed.map(seg => (
                    <div key={seg.key} className="ts-legend-item">
                        <div className="ts-legend-dot" style={{ background: seg.color }} />
                        <span className="ts-legend-name">{seg.label}</span>
                        <span className="ts-legend-val">{seg.val}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MiniRing({ rate }) {
    const r = 14;
    const circ = 2 * Math.PI * r;
    const filled = (rate / 100) * circ;
    const color = rate >= 70 ? '#22c55e' : rate >= 40 ? '#f59e0b' : '#52525b';
    return (
        <div className="ts-mini-ring">
            <svg viewBox="0 0 36 36" width="34" height="34">
                <circle cx="18" cy="18" r={r} fill="none"
                    stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                <circle cx="18" cy="18" r={r} fill="none"
                    stroke={color} strokeWidth="4"
                    strokeLinecap="round"
                    className="ts-donut-seg"
                    style={{
                        strokeDashoffset: circ / 4,
                        '--seg-len': filled,
                        '--seg-gap': circ - filled,
                    }}
                />
            </svg>
            <span className="ts-mini-ring-val" style={{ color }}>{rate}%</span>
        </div>
    );
}

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
                <DonutChart t={t} total={total} />
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
                        <span>{m.assigned > 0 ? <MiniRing rate={rate} /> : '—'}</span>
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
