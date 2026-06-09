import './ProjectsPage.css';
import { useEffect, useState } from 'react';
import { RiAddLine } from 'react-icons/ri';
import Header from '../../components/layout/Header/Header';
import DarkVeil from '../../components/layout/DarkVeil/DarkVeil';
import { CreateProjectModal } from '../../components/features/projects/CreateProjectModal/CreateProjectModal';
import { ProjectCard } from '../../components/features/projects/ProjectCard/ProjectCard';

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
            <div className="projectspage-bg"><DarkVeil /></div>
            <Header />

            {!hasProjects ? (
                <div className="pp-empty-wrap">
                    <div className="pp-empty">
                        <p className="pp-empty-title">No projects yet</p>
                        <p className="pp-empty-desc">
                            Start your first solo project or create a team one.
                            Projects help you track tasks, progress and collaborate.
                        </p>
                        <button className="pp-create-btn" onClick={() => setShowModal(true)}>
                            Create project
                        </button>
                    </div>
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
                        <ProjectColumn
                            title="Solo"
                            projects={solo}
                        />
                        <div className="pp-board-divider" />
                        <ProjectColumn
                            title="Team"
                            projects={team}
                        />
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