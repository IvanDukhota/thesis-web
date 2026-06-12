import { useNavigate } from 'react-router-dom';
import './ProjectCard.css';

const STATUS_CLASS = {
    Active: 'pc-status--active',
    Paused: 'pc-status--paused',
    Archived: 'pc-status--archived',
};

export function ProjectCard({ project }) {
    const navigate = useNavigate();
    const slug = project.name.toLowerCase().replace(/\s+/g, '-');
    const pct = project.tasks > 0 ? Math.round((project.done / project.tasks) * 100) : 0;

    return (
        <div className="pc-card" onClick={() => navigate(`/projects/${slug}`)}>
            <div className="pc-card-top">
                <span className="pc-name">{project.name}</span>
                <span className={`pc-status ${STATUS_CLASS[project.status] || 'pc-status--paused'}`}>
                    {project.status}
                </span>
            </div>
            {project.desc && <p className="pc-desc">{project.desc}</p>}
            <div className="pc-progress-wrap">
                <div className="pc-progress-bar" style={{ width: `${pct}%` }} />
            </div>
            <div className="pc-footer">
                <span className="pc-tasks">{project.done}/{project.tasks} tasks</span>
                <span className="pc-arrow">Open →</span>
            </div>
        </div>
    );
}