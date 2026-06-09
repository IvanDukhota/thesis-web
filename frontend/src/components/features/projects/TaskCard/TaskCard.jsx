import { RiUser3Line, RiCalendarLine } from 'react-icons/ri';
import './TaskCard.css';

const formatDeadline = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const PRIORITY_CLASS = {
    high: 'tc-priority--high',
    medium: 'tc-priority--medium',
    low: 'tc-priority--low',
};

export function TaskCard({ task, onDragStart }) {
    return (
        <div
            className="tc-card"
            draggable
            onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                onDragStart(task.id);
            }}
        >
            {task.priority && (
                <span className={`tc-priority ${PRIORITY_CLASS[task.priority] || ''}`}>
                    {task.priority}
                </span>
            )}
            <p className="tc-title">{task.title}</p>
            {task.desc && <p className="tc-desc">{task.desc}</p>}
            <div className="tc-footer">
                {task.assignee && (
                    <span className="tc-assignee">
                        <RiUser3Line size={11} /> {task.assignee}
                    </span>
                )}
                {task.deadline && (
                    <span className="tc-deadline">
                        <RiCalendarLine size={11} /> {formatDeadline(task.deadline)}
                    </span>
                )}
                {task.tag && <span className="tc-tag">{task.tag}</span>}
            </div>
        </div>
    );
}