import './TeamsPage.css';
import { useEffect, useState } from 'react';
import { RiSettings3Line } from 'react-icons/ri';
import Header from '../../components/layout/Header/Header';
import DarkVeil from '../../components/layout/DarkVeil/DarkVeil';

import { CreateTeamModal } from '../../components/features/teams/CreateTeamModal/CreateTeamModal';
import { TeamSettingsModal } from '../../components/features/teams/TeamSettingsModal/TeamSettingsModal';
import { AddProjectModal } from '../../components/features/teams/AddProjectModal/AddProjectModal';
import { TeamMembers } from '../../components/features/teams/TeamMembers/TeamMembers';
import { TeamProjects } from '../../components/features/teams/TeamProjects/TeamProjects';
import { TeamStats } from '../../components/features/teams/TeamStats/TeamStats';

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
            <div className="teamspage-bg"><DarkVeil /></div>
            <Header />

            {!hasTeam ? (
                <div className="teamspage-empty-wrap">
                    <div className="teamspage-empty">
                        <p className="teamspage-empty-title">You are not part of any team yet</p>
                        <p className="teamspage-empty-desc">
                            Create your own team and invite members, or check your notifications
                            for pending invitations from others.
                        </p>
                        <div className="teamspage-empty-actions">
                            <button className="teamspage-btn teamspage-btn--secondary">
                                Check notifications
                            </button>
                            <button className="teamspage-btn teamspage-btn--primary" onClick={() => setShowCreate(true)}>
                                Create team
                            </button>
                        </div>
                    </div>
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