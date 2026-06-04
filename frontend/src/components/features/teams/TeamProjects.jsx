import { RiAddLine } from 'react-icons/ri';
import './TeamProjects.css';

export function TeamProjects({ projects }) {
    return (
        <div className="tp-root">
            <div className="tp-header">
                <span className="tp-title">Projects</span>
                <button className="tp-add-btn"><RiAddLine size={14} /></button>
            </div>
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
        </div>
    );
}