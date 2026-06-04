import { useState } from 'react';
import './TeamStats.css';

const MEMBERS = [
    { name: 'Alex K.', role: 'Admin', tasks: 24, done: 20, commits: 87, reviews: 12, hours: 64 },
    { name: 'Maria S.', role: 'Developer', tasks: 18, done: 14, commits: 54, reviews: 8, hours: 48 },
    { name: 'Ivan D.', role: 'Designer', tasks: 11, done: 11, commits: 12, reviews: 3, hours: 36 },
    { name: 'Olha P.', role: 'Developer', tasks: 15, done: 9, commits: 43, reviews: 6, hours: 52 },
];

const COLORS = ['#7c3aed', '#a78bfa', '#4ade80', '#facc15'];

function DonutChart({ members }) {
    const total = members.reduce((s, m) => s + m.done, 0);
    let offset = 0;
    const R = 48, C = 2 * Math.PI * R;

    return (
        <div className="ts-donut-wrap">
            <svg width="120" height="120" viewBox="0 0 120 120">
                {members.map((m, i) => {
                    const pct = m.done / total;
                    const dash = pct * C;
                    const gap = C - dash;
                    const el = (
                        <circle key={i} cx="60" cy="60" r={R} fill="none"
                            stroke={COLORS[i]} strokeWidth="13"
                            strokeDasharray={`${dash} ${gap}`}
                            strokeDashoffset={-offset * C}
                            style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px' }}
                        />
                    );
                    offset += pct;
                    return el;
                })}
                <text x="60" y="56" textAnchor="middle" fill="#e4e4e7" fontSize="15" fontWeight="600">{total}</text>
                <text x="60" y="70" textAnchor="middle" fill="#52525b" fontSize="8">done</text>
            </svg>
            <div className="ts-donut-legend">
                {members.map((m, i) => (
                    <div key={i} className="ts-legend-item">
                        <span className="ts-legend-dot" style={{ background: COLORS[i] }} />
                        <span className="ts-legend-name">{m.name}</span>
                        <span className="ts-legend-val">{m.done}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function BarChart({ members }) {
    const max = Math.max(...members.map(m => m.commits));
    return (
        <div className="ts-bar-wrap">
            {members.map((m, i) => (
                <div key={i} className="ts-bar-row">
                    <span className="ts-bar-label">{m.name}</span>
                    <div className="ts-bar-track">
                        <div className="ts-bar-fill" style={{ width: `${(m.commits / max) * 100}%`, background: COLORS[i] }} />
                    </div>
                    <span className="ts-bar-val">{m.commits}</span>
                </div>
            ))}
            <p className="ts-bar-caption">Commits this month</p>
        </div>
    );
}

function TableChart({ members }) {
    return (
        <div className="ts-table-wrap">
            <div className="ts-table-head">
                <span>Member</span><span>Tasks</span><span>Done</span><span>Reviews</span><span>Hours</span>
            </div>
            {members.map((m, i) => (
                <div key={i} className="ts-table-row">
                    <span className="ts-table-name" style={{ color: COLORS[i] }}>{m.name}</span>
                    <span>{m.tasks}</span><span>{m.done}</span><span>{m.reviews}</span><span>{m.hours}h</span>
                </div>
            ))}
        </div>
    );
}

const TABS = [
    { id: 'donut', label: 'Completion' },
    { id: 'bar', label: 'Commits' },
    { id: 'table', label: 'Overview' },
];

export function TeamStats() {
    const [active, setActive] = useState('donut');
    return (
        <div className="ts-root">
            <div className="ts-header">
                <span className="ts-title">Statistics</span>
                <div className="ts-tabs">
                    {TABS.map(t => (
                        <button key={t.id} className={`ts-tab ${active === t.id ? 'ts-tab--active' : ''}`}
                            onClick={() => setActive(t.id)}>{t.label}</button>
                    ))}
                </div>
            </div>
            <div className="ts-body">
                {active === 'donut' && <DonutChart members={MEMBERS} />}
                {active === 'bar' && <BarChart members={MEMBERS} />}
                {active === 'table' && <TableChart members={MEMBERS} />}
            </div>
        </div>
    );
}