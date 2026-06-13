import { RiAddLine, RiFolderLine } from 'react-icons/ri';
import './TeamProjects.css';

export function TeamProjects({ projects, onAddProject, canAddProject }) {
    return (
        <div className="tp-root">
            <div className="tp-header">
                <span className="tp-title">Projects</span>
                {canAddProject && (
                    <button className="tp-add-btn" onClick={onAddProject}><RiAddLine size={14} /></button>
                )}
            </div>
            {projects.length === 0 ? (
                <div className="tp-empty">
                    <RiFolderLine size={28} className="tp-empty-icon" />
                    <p className="tp-empty-text">No projects yet</p>
                    <p className="tp-empty-sub">Create a project to start tracking work</p>
                </div>
            ) : (
                <div className="tp-list">
                    {projects.map((p, i) => (
                        <div key={i} className="tp-card">
                            <div className="tp-card-top">
                                <span className="tp-card-name">{p.name}</span>
                                <span className={`tp-card-status tp-card-status--${p.status.toLowerCase()}`}>{p.status}</span>
                            </div>
                            <div className="tp-card-stats">
                                <span className="tp-stat">{p.tasks} tasks</span>
                                <span className="tp-stat-dot" />
                                <span className="tp-stat">{p.done} done</span>
                                <span className="tp-stat-dot" />
                                <span className="tp-stat">{p.members} members</span>
                            </div>
                            <button className="tp-open-btn">Open →</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
