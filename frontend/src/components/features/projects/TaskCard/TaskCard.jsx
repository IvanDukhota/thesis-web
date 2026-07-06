import { RiUser3Line, RiCalendarLine, RiAttachmentLine } from 'react-icons/ri';
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

export function TaskCard({ task, onDragStart, onEdit, canEdit = true }) {
    return (
        <div
            className="tc-card"
            draggable={canEdit}
            onDragStart={canEdit ? (e) => {
                e.dataTransfer.effectAllowed = 'move';
                onDragStart(task.id, e.currentTarget.offsetHeight);
            } : undefined}
            onDoubleClick={onEdit}
        >
            {task.priority && (
                <span className={`tc-priority ${PRIORITY_CLASS[task.priority] || ''}`}>
                    {task.priority}
                </span>
            )}
            <p className="tc-title">{task.title}</p>
            {task.description && <p className="tc-desc">{task.description}</p>}
            <div className="tc-hint">{canEdit ? 'Double click to edit' : 'Double click to view'}</div>
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
                <div className="tc-footer-right">
                    {task.files?.length > 0 && (
                        <span className="tc-attachments">
                            <RiAttachmentLine size={11} /> {task.files.length}
                        </span>
                    )}
                    {task.tag && <span className="tc-tag">{task.tag}</span>}
                </div>
            </div>
        </div>
    );
}
