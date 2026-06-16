import { useNavigate } from 'react-router-dom';
import './ProjectCard.css';

const STATUS_CLASS = {
    active: 'pc-status--active',
    paused: 'pc-status--paused',
    archived: 'pc-status--archived',
};

export function ProjectCard({ project }) {
    const navigate = useNavigate();
    const total = project.task_count ?? 0;
    const done = project.done_count ?? 0;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    return (
        <div className="pc-card" onClick={() => navigate(`/projects/${project.id}`)}>
            <div className="pc-card-top">
                <span className="pc-name">{project.name}</span>
                <span className={`pc-status ${STATUS_CLASS[project.status] || 'pc-status--paused'}`}>
                    {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                </span>
            </div>
            {project.description && <p className="pc-desc">{project.description}</p>}
            <div className="pc-progress-wrap">
                <div className="pc-progress-bar" style={{ width: `${pct}%` }} />
            </div>
            <div className="pc-footer">
                <span className="pc-tasks">{done}/{total} tasks</span>
                <span className="pc-arrow">Open →</span>
            </div>
        </div>
    );
}
