import './SingleProjectPage.css';
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RiSettings3Line, RiAddLine, RiTeamLine, RiArrowRightSLine, RiInformationLine } from 'react-icons/ri';
import Header from '../../components/layout/Header/Header';
import { KanbanBoard } from '../../components/features/projects/KanbanBoard/KanbanBoard';
import { MembersPanel } from '../../components/features/projects/MembersPanel/MembersPanel';
import { ProjectSettingsModal } from '../../components/features/projects/ProjectSettingsModal/ProjectSettingsModal';
import { CreateTaskModal } from '../../components/features/projects/CreateTaskModal/CreateTaskModal';
import { OrderInfoModal } from '../../components/features/projects/OrderInfoModal/OrderInfoModal';
import {
    apiGetProject, apiUpdateProject, apiDeleteProject,
    apiCreateProjectRole, apiUpdateProjectRole, apiDeleteProjectRole,
    apiGetProjectMembers,
} from '../../api/projectsApi';

const PERM_MAP = [
    { label: 'view', key: 'can_view' },
    { label: 'create', key: 'can_create' },
    { label: 'edit', key: 'can_edit' },
    { label: 'delete', key: 'can_delete' },
];

const permsToBackend = (perms) =>
    Object.fromEntries(PERM_MAP.map(({ label, key }) => [key, perms.includes(label)]));

export default function SingleProjectPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [myRole, setMyRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorStatus, setErrorStatus] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showCreateTask, setShowCreateTask] = useState(false);
    const [showMembers, setShowMembers] = useState(false);
    const [showOrderInfo, setShowOrderInfo] = useState(false);
    const [projectMembers, setProjectMembers] = useState([]);
    const kanbanRef = useRef(null);

    useEffect(() => {
        window.scrollTo(0, 0);
        apiGetProject(id).then(({ ok, data, status }) => {
            if (ok) {
                setProject(data);
                setMyRole(data.my_role || null);
                if (data.type === 'team') {
                    apiGetProjectMembers(data.id).then(({ ok: mOk, data: mData }) => {
                        if (mOk) setProjectMembers(mData);
                    });
                }
            } else {
                setErrorStatus(status);
            }
            setLoading(false);
        });
    }, [id]);

    const handleAddTask = (taskData) => {
        kanbanRef.current?.addTask(taskData);
    };

    const handleSaveSettings = async ({ name, description, roles, deletedIds }) => {
        const { ok } = await apiUpdateProject(project.id, { name, description });
        if (!ok) return { ok: false };

        for (const roleId of deletedIds) {
            await apiDeleteProjectRole(project.id, roleId);
        }

        for (const r of roles) {
            if (r.isNew && r.name.trim()) {
                await apiCreateProjectRole(project.id, { name: r.name.trim(), ...permsToBackend(r.perms) });
            } else if (!r.isNew && !r.is_owner && r.changed) {
                await apiUpdateProjectRole(project.id, r.id, { name: r.name, ...permsToBackend(r.perms) });
            }
        }

        const { ok: ok2, data } = await apiGetProject(project.id);
        if (ok2) { setProject(data); setMyRole(data.my_role || null); }

        return { ok: true };
    };

    const handleDeleteProject = async () => {
        const { ok } = await apiDeleteProject(project.id);
        if (ok) navigate('/projects');
    };

    const canEdit = myRole?.is_owner || myRole?.can_edit;
    const canCreate = myRole?.is_owner || myRole?.can_create;
    const canDelete = myRole?.is_owner || myRole?.can_delete;
    const isMarketplaceProject = !!project?.order_info;
    const showGear = canEdit && !(isMarketplaceProject && project?.type === 'solo');

    if (loading) return <div className="spp-root"><Header /></div>;
    if (!project) return (
        <div className="spp-root">
            <Header />
            <div className="spp-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <span style={{ color: '#71717a', fontSize: 15 }}>
                        {errorStatus === 403 ? "You don't have access to this project." : 'Project not found.'}
                    </span>
                    <button onClick={() => navigate(-1)} style={{
                        background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 7, color: '#a1a1aa', fontSize: 13,
                        padding: '6px 16px', cursor: 'pointer',
                    }}>
                        Go back
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="spp-root">
            <Header />

            <div className="spp-layout">
                <div className="spp-topbar">
                    <div className="spp-topbar-left">
                        <div className="spp-project-info">
                            <span className="spp-project-name">{project.name}</span>
                            {showGear && (
                                <button className="spp-settings-btn" onClick={() => setShowSettings(true)}>
                                    <RiSettings3Line size={15} />
                                </button>
                            )}
                            {project.order_info && (
                                <button className="spp-order-info-btn" onClick={() => setShowOrderInfo(true)} title="Order details">
                                    <RiInformationLine size={15} />
                                </button>
                            )}
                        </div>
                        {project.order_info?.deadline && (
                            <div className="spp-deadline-block">
                                <span className="spp-deadline-label">Deadline:</span>
                                <span className="spp-deadline-value">{project.order_info.deadline}</span>
                            </div>
                        )}
                    </div>
                    <div className="spp-topbar-right">
                        {canCreate && (
                            <button className="spp-create-task-btn" onClick={() => setShowCreateTask(true)}>
                                Create task
                                <RiAddLine size={14} />
                            </button>
                        )}
                        {project.type === 'team' && (
                            <button className="spp-members-btn" onClick={() => setShowMembers(true)}>
                                <RiTeamLine size={14} />
                                Members
                                <RiArrowRightSLine size={14} className="spp-members-arrow" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="spp-board-wrap">
                    <KanbanBoard
                        ref={kanbanRef}
                        projectId={project.id}
                        projectType={project.type}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        members={projectMembers}
                    />
                </div>
            </div>

            {showSettings && showGear && (
                <ProjectSettingsModal
                    project={project}
                    myRole={myRole}
                    onClose={() => setShowSettings(false)}
                    onSave={handleSaveSettings}
                    onDelete={handleDeleteProject}
                    isMarketplace={isMarketplaceProject}
                />
            )}

            {showMembers && (
                <MembersPanel
                    projectId={project.id}
                    teamId={project.team}
                    roles={project.roles || []}
                    myRole={myRole}
                    onClose={() => setShowMembers(false)}
                />
            )}

            {showCreateTask && canCreate && (
                <CreateTaskModal
                    onClose={() => setShowCreateTask(false)}
                    onAdd={handleAddTask}
                    projectId={project.id}
                    projectType={project.type}
                    members={projectMembers}
                />
            )}

            {showOrderInfo && project.order_info && (
                <OrderInfoModal
                    orderInfo={project.order_info}
                    projectId={project.id}
                    onClose={() => setShowOrderInfo(false)}
                    onAbandon={() => navigate('/projects')}
                />
            )}
        </div>
    );
}
