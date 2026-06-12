import './ProjectsPage.css';
import { useEffect, useState } from 'react';
import { RiAddLine, RiLayoutMasonryLine, RiTeamLine, RiBriefcase4Line, RiBarChartBoxLine } from 'react-icons/ri';
import Header from '../../components/layout/Header/Header';
import { CreateProjectModal } from '../../components/features/projects/CreateProjectModal/CreateProjectModal';
import { ProjectCard } from '../../components/features/projects/ProjectCard/ProjectCard';

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
                    : projects.map((p, i) => <ProjectCard key={i} project={p} />)
                }
            </div>
        </div>
    );
}

export default function ProjectsPage() {
    const [hasProjects, setHasProjects] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [projects, setProjects] = useState([]);

    useEffect(() => { window.scrollTo(0, 0); }, []);

    const handleCreate = (project) => {
        setProjects(prev => [...prev, project]);
        setHasProjects(true);
    };

    const solo = projects.filter(p => p.type === 'solo');
    const team = projects.filter(p => p.type === 'team');

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
                />
            )}
        </div>
    );
}
