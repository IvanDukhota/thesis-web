import './TeamsPage.css';
import { useEffect, useState, useRef } from 'react';
import { RiSettings3Line, RiTeamLine, RiUserAddLine, RiUserSettingsLine, RiBarChartBoxLine } from 'react-icons/ri';
import Header from '../../components/layout/Header/Header';

import { CreateTeamModal } from '../../components/features/teams/CreateTeamModal/CreateTeamModal';
import { TeamSettingsModal } from '../../components/features/teams/TeamSettingsModal/TeamSettingsModal';
import { AddProjectModal } from '../../components/features/teams/AddProjectModal/AddProjectModal';
import { TeamMembers } from '../../components/features/teams/TeamMembers/TeamMembers';
import { TeamProjects } from '../../components/features/teams/TeamProjects/TeamProjects';
import { TeamStats } from '../../components/features/teams/TeamStats/TeamStats';

const SLIDES = [
    {
        icon: <RiTeamLine size={30} />,
        title: 'Build your team',
        desc: 'Create a team and bring the right people together. Developers, designers, testers — all in one place.',
    },
    {
        icon: <RiUserAddLine size={30} />,
        title: 'Invite members',
        desc: 'Add people with a simple invite. They join your workspace and get access to shared projects instantly.',
    },
    {
        icon: <RiUserSettingsLine size={30} />,
        title: 'Manage roles',
        desc: 'Assign roles like Admin, Developer or Designer. Each member gets exactly the access they need.',
    },
    {
        icon: <RiBarChartBoxLine size={30} />,
        title: 'Track team progress',
        desc: 'See how your team performs across all projects — tasks completed, active work and overall velocity.',
    },
];

function WelcomeCard({ onCreateClick, onNotifClick }) {
    const [active, setActive] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setActive(a => (a + 1) % SLIDES.length), 3500);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="tp-welcome">
            <div className="tp-welcome-left">
                <div className="tp-slides-area">
                    {SLIDES.map((s, i) => (
                        <div key={i} className={`tp-slide ${i === active ? 'tp-slide--active' : ''}`}>
                            <div className="tp-slide-icon">{s.icon}</div>
                            <h3 className="tp-slide-title">{s.title}</h3>
                            <p className="tp-slide-desc">{s.desc}</p>
                        </div>
                    ))}
                </div>
                <div className="tp-dots">
                    {SLIDES.map((_, i) => (
                        <button
                            key={i}
                            className={`tp-dot ${i === active ? 'tp-dot--active' : ''}`}
                            onClick={() => setActive(i)}
                        />
                    ))}
                </div>
            </div>

            <div className="tp-welcome-right">
                <div className="tp-welcome-cta">
                    <p className="tp-cta-title">No team yet</p>
                    <p className="tp-cta-desc">
                        Create your own team and invite members, or check
                        your notifications for pending invitations.
                    </p>
                    <div className="tp-cta-actions">
                        <button className="teamspage-btn teamspage-btn--secondary" onClick={onNotifClick}>
                            Check notifications
                        </button>
                        <button className="teamspage-btn teamspage-btn--primary" onClick={onCreateClick}>
                            Create team
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const INIT_PROJECTS = [
    { name: 'teamhub-ui', status: 'Active', tasks: 12, done: 8, members: 4 },
    { name: 'realtime-board', status: 'Active', tasks: 7, done: 3, members: 3 },
    { name: 'pg-migrate-cli', status: 'Paused', tasks: 5, done: 5, members: 2 },
];

const STUB_ADMIN = { name: 'Alex K.', role: 'Admin', status: 'active' };

export default function TeamsPage() {
    const [hasTeam, setHasTeam] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showAddProj, setShowAddProj] = useState(false);
    const [teamName, setTeamName] = useState('');
    const [teamDesc, setTeamDesc] = useState('');
    const [members, setMembers] = useState([STUB_ADMIN]);
    const [projects, setProjects] = useState(INIT_PROJECTS);
    const headerRef = useRef(null);

    useEffect(() => { window.scrollTo(0, 0); }, []);

    const handleCreate = ({ name, desc }) => {
        setTeamName(name);
        setTeamDesc(desc || '');
        setHasTeam(true);
    };

    const handleInvite = (newMembers) => setMembers(prev => [...prev, ...newMembers]);
    const handleSaveSettings = ({ name, desc }) => { setTeamName(name); setTeamDesc(desc); };
    const handleDeleteTeam = () => { setHasTeam(false); setMembers([STUB_ADMIN]); setProjects(INIT_PROJECTS); };
    const handleAddProject = (proj) => setProjects(prev => [...prev, proj]);

    return (
        <div className="teamspage">
            <Header ref={headerRef} />

            {!hasTeam ? (
                <div className="teamspage-empty-wrap">
                    <WelcomeCard onCreateClick={() => setShowCreate(true)} onNotifClick={() => headerRef.current?.openNotifications()} />
                </div>
            ) : (
                <div className="teamspage-board-wrap">
                    <div className="teamspage-board-header">
                        <span className="teamspage-board-name">{teamName}</span>
                        <button className="teamspage-board-gear" onClick={() => setShowSettings(true)}>
                            <RiSettings3Line size={15} />
                        </button>
                    </div>
                    <div className="teamspage-board">
                        <div className="teamspage-col">
                            <TeamMembers members={members} onInvite={handleInvite} />
                        </div>
                        <div className="teamspage-col">
                            <TeamProjects
                                projects={projects}
                                onAddProject={() => setShowAddProj(true)}
                            />
                        </div>
                        <div className="teamspage-col teamspage-col--lg">
                            <TeamStats />
                        </div>
                    </div>
                </div>
            )}

            {showCreate && (
                <CreateTeamModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
            )}
            {showSettings && (
                <TeamSettingsModal
                    teamName={teamName}
                    teamDesc={teamDesc}
                    onClose={() => setShowSettings(false)}
                    onSave={handleSaveSettings}
                    onDelete={handleDeleteTeam}
                />
            )}
            {showAddProj && (
                <AddProjectModal
                    members={members}
                    onClose={() => setShowAddProj(false)}
                    onAdd={handleAddProject}
                />
            )}
        </div>
    );
}