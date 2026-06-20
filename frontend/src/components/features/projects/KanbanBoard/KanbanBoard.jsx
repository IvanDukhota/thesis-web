import { useState, useRef, useImperativeHandle, forwardRef, useEffect, useCallback } from 'react';
import { TaskCard } from '../TaskCard/TaskCard';
import { EditTaskModal } from '../EditTaskModal/EditTaskModal';
import { apiGetTasks, apiUpdateTask, apiDeleteTask } from '../../../../api/tasksApi';
import { useAuth } from '../../../../context/AuthContext';
import { useKanbanSocket } from './useKanbanSocket';
import './KanbanBoard.css';

const COLUMNS = ['To Do', 'In Progress', 'Testing', 'Finished'];

const emptyBoard = () => Object.fromEntries(COLUMNS.map(c => [c, []]));

function groupByColumn(tasks) {
    const board = emptyBoard();
    tasks.forEach(t => {
        if (board[t.column]) board[t.column].push(t);
    });
    return board;
}

export const KanbanBoard = forwardRef(function KanbanBoard({ projectId, projectType, canEdit = true, canDelete = false, members = [] }, ref) {
    const { user } = useAuth();
    const [tasks, setTasks] = useState(emptyBoard());
    const [loading, setLoading] = useState(true);
    const [dragId, setDragId] = useState(null);
    const [dragOver, setDragOver] = useState(null);
    const [editingTask, setEditingTask] = useState(null);
    const dragColRef = useRef(null);

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        apiGetTasks(projectId).then(({ ok, data }) => {
            if (ok) setTasks(groupByColumn(data));
            setLoading(false);
        });
    }, [projectId]);

    const handleKanbanEvent = useCallback((event) => {
        if (event.user_id === user?.id) return;

        if (event.type === 'task.created') {
            const task = event.task;
            const col = COLUMNS.includes(task.column) ? task.column : 'To Do';
            setTasks(prev => {
                if (prev[col].some(t => t.id === task.id)) return prev;
                return { ...prev, [col]: [...prev[col], task] };
            });
        } else if (event.type === 'task.updated') {
            const task = event.task;
            const newCol = COLUMNS.includes(task.column) ? task.column : 'To Do';
            setTasks(prev => {
                const srcCol = Object.keys(prev).find(c => prev[c].some(t => t.id === task.id));
                if (!srcCol) return prev;
                if (srcCol === newCol) {
                    return { ...prev, [srcCol]: prev[srcCol].map(t => t.id === task.id ? { ...t, ...task } : t) };
                }
                return {
                    ...prev,
                    [srcCol]: prev[srcCol].filter(t => t.id !== task.id),
                    [newCol]: [...prev[newCol], { ...task, column: newCol }],
                };
            });
        } else if (event.type === 'task.deleted') {
            setTasks(prev => {
                const col = Object.keys(prev).find(c => prev[c].some(t => t.id === event.task_id));
                if (!col) return prev;
                return { ...prev, [col]: prev[col].filter(t => t.id !== event.task_id) };
            });
        }
    }, [user?.id]);

    useKanbanSocket(projectId, handleKanbanEvent);

    useImperativeHandle(ref, () => ({
        addTask: (task) => {
            setTasks(prev => {
                const col = COLUMNS.includes(task.column) ? task.column : 'To Do';
                return { ...prev, [col]: [...prev[col], task] };
            });
        },
    }));

    if (loading) return null;

    const handleEditSave = (updatedTask, newCol) => {
        setTasks(prev => {
            const srcCol = editingTask.col;
            const payload = { title: updatedTask.title, priority: updatedTask.priority || '', column: newCol, assignee: updatedTask.assignee || '', deadline: updatedTask.deadline || null, tag: updatedTask.tag || '' };
            apiUpdateTask(projectId, updatedTask.id, payload);
            if (srcCol === newCol) {
                return { ...prev, [srcCol]: prev[srcCol].map(t => t.id === updatedTask.id ? { ...t, ...updatedTask } : t) };
            }
            return {
                ...prev,
                [srcCol]: prev[srcCol].filter(t => t.id !== updatedTask.id),
                [newCol]: [...prev[newCol], { ...updatedTask, column: newCol }],
            };
        });
        setEditingTask(null);
    };

    const handleDeleteTask = (taskId) => {
        apiDeleteTask(projectId, taskId);
        setTasks(prev => {
            const col = Object.keys(prev).find(c => prev[c].some(t => t.id === taskId));
            if (!col) return prev;
            return { ...prev, [col]: prev[col].filter(t => t.id !== taskId) };
        });
        setEditingTask(null);
    };

    const handleDragStart = (id, col) => {
        if (!canEdit) return;
        setDragId(id);
        dragColRef.current = col;
    };

    const handleDrop = (targetCol) => {
        if (!canEdit || !dragId || !dragColRef.current) return;
        const srcCol = dragColRef.current;
        if (srcCol !== targetCol) {
            setTasks(prev => {
                const task = prev[srcCol].find(t => t.id === dragId);
                if (!task) return prev;
                apiUpdateTask(projectId, dragId, { column: targetCol });
                return {
                    ...prev,
                    [srcCol]: prev[srcCol].filter(t => t.id !== dragId),
                    [targetCol]: [...prev[targetCol], { ...task, column: targetCol }],
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
                                    canEdit={canEdit}
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
                    projectType={projectType}
                    onClose={() => setEditingTask(null)}
                    onSave={handleEditSave}
                    onDelete={handleDeleteTask}
                    readOnly={!canEdit}
                    canDelete={canDelete}
                    members={members}
                />
            )}
        </>
    );
});
