import './ProjectsPage.css';
import { useEffect, useState } from 'react';
import { RiAddLine, RiLayoutMasonryLine, RiTeamLine, RiBriefcase4Line, RiBarChartBoxLine } from 'react-icons/ri';
import Header from '../../components/layout/Header/Header';
import { CreateProjectModal } from '../../components/features/projects/CreateProjectModal/CreateProjectModal';
import { ProjectCard } from '../../components/features/projects/ProjectCard/ProjectCard';
import { useAuth } from '../../context/AuthContext';
import { apiGetMyProjects } from '../../api/projectsApi';
import { apiGetMyTeam } from '../../api/teamsApi';

const SLIDES = [
    {
        icon: <RiLayoutMasonryLine size={30} />,
        title: 'Organize your work',
        desc: 'Create a Kanban board for any project. Track every task from idea to done — solo or with a team.',
    },
    {
        icon: <RiTeamLine size={30} />,
        title: 'Invite & collaborate',
        desc: 'Add teammates, assign roles and tasks. Everyone stays aligned and on the same page.',
    },
    {
        icon: <RiBriefcase4Line size={30} />,
        title: 'Client orders as projects',
        desc: 'Got a freelance order? Turn it into a project, track delivery and keep everything organized.',
    },
    {
        icon: <RiBarChartBoxLine size={30} />,
        title: 'Track your progress',
        desc: 'Visual progress bars, task counters and deadlines — always know exactly where things stand.',
    },
];

function WelcomeCard({ onCreateClick }) {
    const [active, setActive] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setActive(a => (a + 1) % SLIDES.length), 3500);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="pp-welcome">
            <div className="pp-welcome-left">
                <div className="pp-slides-area">
                    {SLIDES.map((s, i) => (
                        <div key={i} className={`pp-slide ${i === active ? 'pp-slide--active' : ''}`}>
                            <div className="pp-slide-icon">{s.icon}</div>
                            <h3 className="pp-slide-title">{s.title}</h3>
                            <p className="pp-slide-desc">{s.desc}</p>
                        </div>
                    ))}
                </div>
                <div className="pp-dots">
                    {SLIDES.map((_, i) => (
                        <button
                            key={i}
                            className={`pp-dot ${i === active ? 'pp-dot--active' : ''}`}
                            onClick={() => setActive(i)}
                        />
                    ))}
                </div>
            </div>

            <div className="pp-welcome-right">
                <div className="pp-welcome-cta">
                    <p className="pp-cta-title">No projects yet</p>
                    <p className="pp-cta-desc">
                        Start your first project and bring your ideas to life.
                        Solo work or team collaboration — it all starts here.
                    </p>
                    <button className="pp-create-btn" onClick={onCreateClick}>
                        Create project
                    </button>
                </div>
            </div>
        </div>
    );
}

function EmptyCol({ label }) {
    return (
        <div className="pp-empty-col">
            <span className="pp-empty-col-text">No {label} projects yet</span>
        </div>
    );
}

function ProjectColumn({ title, projects }) {
    return (
        <div className="pp-column">
            <div className="pp-column-header">
                <span className="pp-column-title">{title}</span>
            </div>
            <div className="pp-column-list">
                {projects.length === 0
                    ? <EmptyCol label={title.toLowerCase()} />
                    : projects.map(p => <ProjectCard key={p.id} project={p} />)
                }
            </div>
        </div>
    );
}

export default function ProjectsPage() {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [teamId, setTeamId] = useState(null);
    const [canCreateTeamProject, setCanCreateTeamProject] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        window.scrollTo(0, 0);
        apiGetMyProjects().then(({ ok, data }) => {
            if (ok) setProjects(data);
            setLoading(false);
        });
        apiGetMyTeam().then(({ ok, data: teamData }) => {
            if (!ok) return;
            setTeamId(teamData.id);
            const myMember = (teamData.members || []).find(m => m.username === user?.username);
            const myRole = myMember
                ? (teamData.roles || []).find(r => r.name === myMember.role_name)
                : null;
            setCanCreateTeamProject(myMember?.is_admin || myRole?.can_create_projects || false);
        });
    }, [user]);

    const handleCreate = (project) => {
        setProjects(prev => [project, ...prev]);
    };

    const solo = projects.filter(p => p.type === 'solo');
    const team = projects.filter(p => p.type === 'team');
    const hasProjects = projects.length > 0;

    if (loading) return (
        <div className="projectspage">
            <Header />
            <div className="pp-board-wrap">
                <div className="pp-board-header">
                    <div className="pp-skel-title" />
                </div>
                <div className="pp-board">
                    <div className="pp-column">
                        <div className="pp-column-header"><div className="pp-skel-label" /></div>
                        <div className="pp-column-list">
                            <div className="pp-skel-card" />
                            <div className="pp-skel-card pp-skel-card--short" />
                        </div>
                    </div>
                    <div className="pp-board-divider" />
                    <div className="pp-column">
                        <div className="pp-column-header"><div className="pp-skel-label" /></div>
                        <div className="pp-column-list">
                            <div className="pp-skel-card" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="projectspage">
            <Header />

            {!hasProjects ? (
                <div className="pp-empty-wrap">
                    <WelcomeCard onCreateClick={() => setShowModal(true)} />
                </div>
            ) : (
                <div className="pp-board-wrap">
                    <div className="pp-board-header">
                        <span className="pp-board-title">Your projects</span>
                        <button className="pp-add-btn" onClick={() => setShowModal(true)}>
                            <RiAddLine size={14} />
                        </button>
                    </div>
                    <div className="pp-board">
                        <ProjectColumn title="Solo" projects={solo} />
                        <div className="pp-board-divider" />
                        <ProjectColumn title="Team" projects={team} />
                    </div>
                </div>
            )}

            {showModal && (
                <CreateProjectModal
                    onClose={() => setShowModal(false)}
                    onCreate={handleCreate}
                    teamId={teamId}
                    canCreateTeamProject={canCreateTeamProject}
                />
            )}
        </div>
    );
}
