import { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { TaskCard } from '../TaskCard/TaskCard';
import { EditTaskModal } from '../EditTaskModal/EditTaskModal';
import './KanbanBoard.css';

const COLUMNS = ['To Do', 'In Progress', 'Testing', 'Finished'];

const INIT_TASKS = {
    'To Do': [
        { id: 1, title: 'Set up project structure', priority: 'high', assignee: 'Alex K.', tag: 'setup', deadline: '2025-05-10' },
        { id: 2, title: 'Design database schema', priority: 'medium', assignee: 'Maria S.', tag: 'backend', deadline: '2025-05-14' },
        { id: 3, title: 'Write API documentation', priority: 'low', assignee: null, tag: 'docs', deadline: null },
    ],
    'In Progress': [
        { id: 4, title: 'Build auth endpoints', priority: 'high', assignee: 'Alex K.', tag: 'backend', deadline: '2025-05-08' },
        { id: 5, title: 'Create UI components', priority: 'medium', assignee: 'Ivan D.', tag: 'frontend', deadline: '2025-05-12' },
    ],
    'Testing': [
        { id: 6, title: 'Unit tests for auth', priority: 'medium', assignee: 'Olha P.', tag: 'testing', deadline: '2025-05-09' },
    ],
    'Finished': [
        { id: 7, title: 'Project kickoff meeting', priority: 'low', assignee: null, tag: null, deadline: null },
    ],
};

let nextId = 10;

export const KanbanBoard = forwardRef(function KanbanBoard(_, ref) {
    const [tasks, setTasks] = useState(INIT_TASKS);
    const [dragId, setDragId] = useState(null);
    const [dragOver, setDragOver] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const dragColRef = useRef(null);

    useImperativeHandle(ref, () => ({
        addTask: ({ title, priority, deadline, assignee, tag, column }) => {
            const col = COLUMNS.includes(column) ? column : 'To Do';
            const task = { id: nextId++, title, priority, deadline, assignee, tag };
            setTasks(prev => ({ ...prev, [col]: [...prev[col], task] }));
        }
    }));

    const handleEditSave = (updatedTask, newCol) => {
        setTasks(prev => {
            const srcCol = editingTask.col;
            if (srcCol === newCol) {
                return { ...prev, [srcCol]: prev[srcCol].map(t => t.id === updatedTask.id ? updatedTask : t) };
            }
            return {
                ...prev,
                [srcCol]: prev[srcCol].filter(t => t.id !== updatedTask.id),
                [newCol]: [...prev[newCol], updatedTask],
            };
        });
        setEditingTask(null);
    };

    const handleDragStart = (id, col) => { setDragId(id); dragColRef.current = col; };

    const handleDrop = (targetCol) => {
        if (!dragId || !dragColRef.current) return;
        const srcCol = dragColRef.current;
        if (srcCol !== targetCol) {
            setTasks(prev => {
                const task = prev[srcCol].find(t => t.id === dragId);
                if (!task) return prev;
                return {
                    ...prev,
                    [srcCol]: prev[srcCol].filter(t => t.id !== dragId),
                    [targetCol]: [...prev[targetCol], task],
                };
            });
        }
        setDragId(null);
        setDragOver(null);
        dragColRef.current = null;
    };

    return (
        <>
            <div className="kb-board">
                {COLUMNS.map(col => (
                    <div
                        key={col}
                        className={`kb-column ${dragOver === col ? 'kb-column--over' : ''}`}
                        onDragOver={e => { e.preventDefault(); setDragOver(col); }}
                        onDragLeave={() => setDragOver(null)}
                        onDrop={() => handleDrop(col)}
                    >
                        <div className="kb-col-header">
                            <span className="kb-col-title">{col}</span>
                            <span className="kb-col-count">{tasks[col].length}</span>
                        </div>

                        <div className="kb-col-body">
                            {tasks[col].map(task => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    onDragStart={(id) => handleDragStart(id, col)}
                                    onEdit={() => setEditingTask({ task, col })}
                                />
                            ))}
                            {tasks[col].length === 0 && (
                                <div className="kb-col-empty">drop here</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {editingTask && (
                <EditTaskModal
                    task={editingTask.task}
                    currentCol={editingTask.col}
                    onClose={() => setEditingTask(null)}
                    onSave={handleEditSave}
                />
            )}
        </>
    );
});