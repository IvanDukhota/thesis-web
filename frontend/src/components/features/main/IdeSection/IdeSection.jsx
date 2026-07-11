import { useState } from 'react';
import './IdeSection.css';

const WIN_URL = import.meta.env.VITE_DESKTOP_WIN_URL || 'http://localhost:9000/teamhub-releases/TeamHub-Setup.exe';

const OS_TABS = ["Windows", "macOS", "Linux"];
const DISABLED_OS = new Set(["macOS", "Linux"]);

const DOWNLOAD_INFO = {
    Windows: { label: "Download for Windows", sub: "Installer (.exe) · v2.4.1 · 134 MB" },
    macOS:   { label: "Download for macOS",   sub: "Universal Binary · v2.4.1 · 148 MB" },
    Linux:   { label: "Download for Linux",   sub: "AppImage · v2.4.1 · 127 MB" },
};

export default function IdeSection() {
    const [activeOS, setActiveOS] = useState("Windows");

    return (
        <div className='ide-container'>
            <div className='ide-left'>
                <span className='ide-eyebrow'>TeamHub IDE</span>
                <h2 className='ide-headline'>
                    A professional environment,<br />ready in minutes.
                </h2>
                <p className='ide-body'>
                    The IDE is the heart of TeamHub. Lightweight enough to open instantly,
                    powerful enough for mono-repos and large teams. It connects directly
                    to your TeamHub projects, marketplace contracts, and team workspaces —
                    so everything stays in sync without the overhead.
                </p>
                <ul className='ide-checklist'>
                    <li>Native performance — no Electron overhead</li>
                    <li>Linked to your projects, teams, and marketplace work</li>
                    <li>Built-in SSH, Docker, and remote workspace support</li>
                    <li>Free for individuals. Transparent pricing for teams.</li>
                </ul>
            </div>

            <div className='ide-right'>
                <div className='ide-os-tabs'>
                    {OS_TABS.map((os) => {
                        const disabled = DISABLED_OS.has(os);
                        return (
                            <button
                                key={os}
                                className={`ide-os-tab ${activeOS === os ? 'ide-os-tab--active' : ''} ${disabled ? 'ide-os-tab--disabled' : ''}`}
                                onClick={() => !disabled && setActiveOS(os)}
                            >
                                {os}
                                {disabled && <span className="ide-os-soon">Soon</span>}
                            </button>
                        );
                    })}
                </div>

                <div className='ide-download-card'>
                    <div className='ide-dl-icon'>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                    </div>
                    <div>
                        <div className='ide-dl-label'>{DOWNLOAD_INFO[activeOS].label}</div>
                        <div className='ide-dl-sub'>{DOWNLOAD_INFO[activeOS].sub}</div>
                    </div>
                </div>

                {activeOS === 'Windows'
                    ? <a href={WIN_URL} download className='ide-btn-primary ide-btn-download'>{DOWNLOAD_INFO.Windows.label}</a>
                    : <button disabled className='ide-btn-primary ide-btn-primary--soon'>Coming Soon</button>
                }
                <button className='ide-btn-secondary'>
                    View release notes
                </button>

                <p className='ide-release-note'>
                    Latest stable release — April 2025
                </p>

                <div className='ide-stats'>
                    <div className='ide-stat'>
                        <span className='ide-stat-value'>94k</span>
                        <span className='ide-stat-label'>Downloads this month</span>
                    </div>
                    <div className='ide-stat-divider' />
                    <div className='ide-stat'>
                        <span className='ide-stat-value'>4.9</span>
                        <span className='ide-stat-label'>Average rating</span>
                    </div>
                    <div className='ide-stat-divider' />
                    <div className='ide-stat'>
                        <span className='ide-stat-value'>99.8%</span>
                        <span className='ide-stat-label'>Uptime SLA</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
