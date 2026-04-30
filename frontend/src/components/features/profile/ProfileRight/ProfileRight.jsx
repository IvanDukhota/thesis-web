import { useState } from 'react';

import './ProfileRight.css';

const TABS = [
    { id: 'projects', label: 'My projects' },
    { id: 'orders', label: 'Orders' },
    { id: 'team', label: 'Team stats' },
];

export function ProfileRight() {
    const [activeTab, setActiveTab] = useState('projects');

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
            <div className="pr-content" />
        </div>
    );
}