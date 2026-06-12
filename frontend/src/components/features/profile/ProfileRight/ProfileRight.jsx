import { useState } from 'react';
import './ProfileRight.css';

const TABS = [
    { id: 'stat', label: 'Personal stat' },
    { id: 'projects', label: 'My projects' },
];

const TASK_SEGMENTS = [
    { label: 'Done', value: 12, color: '#22c55e' },
    { label: 'In Progress', value: 8, color: '#7c3aed' },
    { label: 'Testing', value: 3, color: '#f59e0b' },
    { label: 'To Do', value: 5, color: '#3f3f46' },
];

const STUB_PROJECTS = [
    { name: 'teamhub-kanban', role: 'Owner', updated: '2 hours ago', progress: 43, tasks: '12 / 28 tasks done' },
    { name: 'portfolio-v2', role: 'Developer', updated: 'Yesterday', progress: 78, tasks: '18 / 23 tasks done' },
    { name: 'mobile-app', role: 'Designer', updated: '3 days ago', progress: 15, tasks: '3 / 20 tasks done' },
];

function DonutChart({ segments }) {
    const cx = 85, cy = 85, r = 60, sw = 18;
    const circ = 2 * Math.PI * r;
    const total = segments.reduce((s, x) => s + x.value, 0);
    const done = segments.find(s => s.label === 'Done')?.value ?? 0;

    let angle = -90;
    return (
        <svg width="170" height="170" viewBox="0 0 170 170">
            <circle cx={cx} cy={cy} r={r} fill="none"
                stroke="rgba(255,255,255,0.04)" strokeWidth={sw} />
            {segments.map((seg, i) => {
                const fraction = seg.value / total;
                const dash = fraction * circ - 3;
                const gap = circ - dash;
                const rot = angle;
                angle += fraction * 360;
                return (
                    <circle key={i} cx={cx} cy={cy} r={r}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={sw}
                        strokeDasharray={`${dash} ${gap}`}
                        transform={`rotate(${rot} ${cx} ${cy})`}
                    />
                );
            })}
            <text x={cx} y={cy - 7} textAnchor="middle"
                fill="#e4e4e7" fontSize="22" fontWeight="600" fontFamily="inherit">
                {Math.round((done / total) * 100)}%
            </text>
            <text x={cx} y={cy + 11} textAnchor="middle"
                fill="#52525b" fontSize="11" fontFamily="inherit">
                complete
            </text>
        </svg>
    );
}

function StatPanel() {
    const total = TASK_SEGMENTS.reduce((s, x) => s + x.value, 0);
    return (
        <div className="pr-stat-panel">
            <div className="pr-donut-wrap">
                <DonutChart segments={TASK_SEGMENTS} />
                <div className="pr-donut-legend">
                    {TASK_SEGMENTS.map(seg => (
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
                    <span className="pr-stat-value">{STUB_PROJECTS.length}</span>
                    <span className="pr-stat-label">Projects</span>
                </div>
                <div className="pr-stat-card">
                    <span className="pr-stat-value">2</span>
                    <span className="pr-stat-label">Teams</span>
                </div>
                <div className="pr-stat-card">
                    <span className="pr-stat-value">43%</span>
                    <span className="pr-stat-label">Avg. progress</span>
                </div>
            </div>
        </div>
    );
}

function ProjectsPanel() {
    return (
        <div className="pr-panel-list">
            {STUB_PROJECTS.map(p => (
                <div key={p.name} className="pr-project-card">
                    <div className="pr-project-top">
                        <span className="pr-project-name">{p.name}</span>
                        <div className="pr-project-meta">
                            <span className="pr-project-role">{p.role}</span>
                            <span className="pr-project-dot">·</span>
                            <span className="pr-project-updated">{p.updated}</span>
                        </div>
                    </div>
                    <div className="pr-progress-wrap">
                        <div className="pr-progress-bar" style={{ width: `${p.progress}%` }} />
                    </div>
                    <div className="pr-project-footer">
                        <span className="pr-project-tasks">{p.tasks}</span>
                    </div>
                </div>
            ))}
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
            </div>
        </div>
    );
}
