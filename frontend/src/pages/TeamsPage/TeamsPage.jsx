import './TeamsPage.css';
import { useEffect, useState, useRef, useCallback } from 'react';
import { RiSettings3Line, RiTeamLine, RiUserAddLine, RiUserSettingsLine, RiBarChartBoxLine } from 'react-icons/ri';
import Header from '../../components/layout/Header/Header';
import { useAuth } from '../../context/AuthContext';

import { CreateTeamModal } from '../../components/features/teams/CreateTeamModal/CreateTeamModal';
import { TeamSettingsModal } from '../../components/features/teams/TeamSettingsModal/TeamSettingsModal';
import { AddProjectModal } from '../../components/features/teams/AddProjectModal/AddProjectModal';
import { TeamMembers } from '../../components/features/teams/TeamMembers/TeamMembers';
import { TeamProjects } from '../../components/features/teams/TeamProjects/TeamProjects';
import { TeamStats } from '../../components/features/teams/TeamStats/TeamStats';
import { apiCreateTeam, apiDeleteTeam, apiGetMyTeam, apiUpdateTeam, apiCreateRole, apiUpdateRole, apiDeleteRole, apiUpdateMember, apiRemoveMember } from '../../api/teamsApi';

const PERM_MAP = [
    { label: 'view', key: 'can_view' },
    { label: 'create project', key: 'can_create_projects' },
    { label: 'edit team', key: 'can_edit_team' },
    { label: 'manage settings', key: 'can_manage_settings' },
    { label: 'delete', key: 'can_delete' },
];

const permsToBackend = (perms) => Object.fromEntries(PERM_MAP.map(({ label, key }) => [key, perms.includes(label)]));

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


function normalizeMember(m) {
    return { id: m.id, name: m.username, role: m.role_name, status: 'active', is_admin: m.is_admin, avatar: m.avatar };
}

export default function TeamsPage() {
    const { user } = useAuth();
    const [teamLoading, setTeamLoading] = useState(true);
    const [hasTeam, setHasTeam] = useState(false);
    const [teamId, setTeamId] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showAddProj, setShowAddProj] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [teamName, setTeamName] = useState('');
    const [teamDesc, setTeamDesc] = useState('');
    const [members, setMembers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [projects, setProjects] = useState([]);
    const headerRef = useRef(null);

    const loadTeam = useCallback(() => {
        apiGetMyTeam().then(({ ok, data }) => {
            if (ok) {
                setTeamId(data.id);
                setTeamName(data.name);
                setTeamDesc(data.description || '');
                setMembers((data.members || []).map(normalizeMember));
                setRoles(data.roles || []);
                setHasTeam(true);
            } else {
                setHasTeam(false);
            }
            setTeamLoading(false);
        });
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
        loadTeam();
    }, [loadTeam]);

    useEffect(() => {
        window.addEventListener('teamInviteAccepted', loadTeam);
        return () => window.removeEventListener('teamInviteAccepted', loadTeam);
    }, [loadTeam]);

    const handleCreate = async ({ name, desc, customRoles }) => {
        const { ok, data } = await apiCreateTeam({ name, description: desc || '' });
        if (!ok) return { ok: false, error: data?.name?.[0] || 'Failed to create team' };

        for (const role of customRoles) {
            await apiCreateRole(data.id, { name: role.name, ...permsToBackend(role.perms) });
        }

        const { ok: ok2, data: fresh } = await apiGetMyTeam();
        if (ok2) {
            setTeamId(fresh.id);
            setTeamName(fresh.name);
            setTeamDesc(fresh.description || '');
            setMembers((fresh.members || []).map(normalizeMember));
            setRoles(fresh.roles || []);
        } else {
            setTeamId(data.id);
            setTeamName(data.name);
            setTeamDesc(data.description || '');
            setMembers((data.members || []).map(normalizeMember));
            setRoles(data.roles || []);
        }
        setHasTeam(true);
        return { ok: true };
    };

    const handleSaveSettings = async ({ name, desc, roles: localRoles, deletedIds }) => {
        const { ok, data } = await apiUpdateTeam(teamId, { name, description: desc || '' });
        if (!ok) return { ok: false };

        for (const id of deletedIds) {
            await apiDeleteRole(teamId, id);
        }

        for (const role of localRoles) {
            if (role.isNew && role.name.trim()) {
                await apiCreateRole(teamId, { name: role.name, ...permsToBackend(role.perms) });
            } else if (!role.isNew && !role.is_admin && role.changed) {
                await apiUpdateRole(teamId, role.id, { name: role.name, ...permsToBackend(role.perms) });
            }
        }

        const { ok: ok2, data: fresh } = await apiGetMyTeam();
        if (ok2) {
            setTeamName(fresh.name);
            setTeamDesc(fresh.description || '');
            setRoles(fresh.roles || []);
        } else {
            setTeamName(data.name);
            setTeamDesc(data.description || '');
        }
        return { ok: true };
    };

    const handleUpdateMember = async (memberId, roleId) => {
        const { ok } = await apiUpdateMember(teamId, memberId, { role_id: roleId });
        if (!ok) return;
        const role = roles.find(r => r.id === roleId);
        setMembers(prev => prev.map(m =>
            m.id === memberId ? { ...m, role: role?.name || m.role, is_admin: role?.is_admin || false } : m
        ));
    };

    const handleRemoveMember = async (memberId) => {
        const { ok } = await apiRemoveMember(teamId, memberId);
        if (ok) setMembers(prev => prev.filter(m => m.id !== memberId));
    };

    const handleDeleteTeam = async () => {
        const { ok } = await apiDeleteTeam(teamId);
        if (ok) {
            setHasTeam(false);
            setTeamId(null);
            setTeamName('');
            setTeamDesc('');
            setMembers([]);
            setRoles([]);
            setProjects([]);
        }
    };

    const handleAddProject = (proj) => setProjects(prev => [...prev, proj]);

    const handleLeaveTeam = async () => {
        const currentMember = members.find(m => m.name === user?.username);
        if (!currentMember) return;
        setLeaving(true);
        const { ok } = await apiRemoveMember(teamId, currentMember.id);
        setLeaving(false);
        if (ok) {
            setShowLeaveConfirm(false);
            setHasTeam(false);
            setTeamId(null);
            setTeamName('');
            setTeamDesc('');
            setMembers([]);
            setRoles([]);
            setProjects([]);
        }
    };

    const currentMember = members.find(m => m.name === user?.username);
    const currentRole = currentMember ? roles.find(r => r.name === currentMember.role) : null;
    const canManageSettings = currentMember?.is_admin || currentRole?.can_manage_settings || false;
    const canEditTeam = currentMember?.is_admin || currentRole?.can_edit_team || false;
    const canCreateProjects = currentMember?.is_admin || currentRole?.can_create_projects || false;

    if (teamLoading) return <div className="teamspage"><Header ref={headerRef} /></div>;

    return (
        <div className="teamspage">
            <Header ref={headerRef} />

            {!hasTeam ? (
                <div className="teamspage-empty-wrap">
                    <WelcomeCard onCreateClick={() => setShowCreate(true)} onNotifClick={() => headerRef.current?.openNotifications()} />
                </div>
            ) : (
                <div className="teamspage-board-wrap">
                    <div className="teamspage-board-topbar">
                        <div className="teamspage-board-header">
                            <span className="teamspage-board-name">{teamName}</span>
                            {canManageSettings && (
                                <button className="teamspage-board-gear" onClick={() => setShowSettings(true)}>
                                    <RiSettings3Line size={15} />
                                </button>
                            )}
                        </div>
                        {currentMember && !currentMember.is_admin && (
                            <button className="teamspage-leave-btn" onClick={() => setShowLeaveConfirm(true)}>
                                Leave team
                            </button>
                        )}
                    </div>
                    <div className="teamspage-board">
                        <div className="teamspage-col">
                            <TeamMembers
                                teamId={teamId}
                                members={members}
                                roles={roles}
                                currentUsername={user?.username}
                                canEditTeam={canEditTeam}
                                canInvite={canManageSettings}
                                onUpdateMember={handleUpdateMember}
                                onRemoveMember={handleRemoveMember}
                            />
                        </div>
                        <div className="teamspage-col">
                            <TeamProjects
                                projects={projects}
                                onAddProject={() => setShowAddProj(true)}
                                canAddProject={canCreateProjects}
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
                    roles={roles}
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

            {showLeaveConfirm && (
                <div className="teamspage-confirm-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setShowLeaveConfirm(false); }}>
                    <div className="teamspage-confirm">
                        <p className="teamspage-confirm-title">Leave &quot;{teamName}&quot;?</p>
                        <p className="teamspage-confirm-sub">You will lose access to this team and its projects.</p>
                        <div className="teamspage-confirm-actions">
                            <button className="teamspage-confirm-cancel" onClick={() => setShowLeaveConfirm(false)} disabled={leaving}>Cancel</button>
                            <button className="teamspage-confirm-leave" onClick={handleLeaveTeam} disabled={leaving}>
                                {leaving ? 'Leaving...' : 'Leave team'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
