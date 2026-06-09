import './SingleProjectPage.css';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { RiSettings3Line, RiAddLine } from 'react-icons/ri';
import Header from '../../components/layout/Header/Header';
import DarkVeil from '../../components/layout/DarkVeil/DarkVeil';
import { KanbanBoard } from '../../components/features/projects/KanbanBoard/KanbanBoard';
import { MembersPanel } from '../../components/features/projects/MembersPanel/MembersPanel';
import { ProjectSettingsModal } from '../../components/features/projects/ProjectSettingsModal/ProjectSettingsModal';
import { CreateTaskModal } from '../../components/features/projects/CreateTaskModal/CreateTaskModal';

export default function SingleProjectPage() {
    const { id } = useParams();
    const [showSettings, setShowSettings] = useState(false);
    const [showCreateTask, setShowCreateTask] = useState(false);
    const kanbanRef = useRef(null);

    const [projectName, setProjectName] = useState(
        id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    );

    useEffect(() => { window.scrollTo(0, 0); }, []);

    const handleAddTask = (taskData) => {
        kanbanRef.current?.addTask(taskData);
    };

    return (
        <div className="spp-root">
            <div className="spp-bg"><DarkVeil /></div>
            <Header />

            <div className="spp-layout">
                <div className="spp-topbar">
                    <div className="spp-topbar-left">
                        <div className="spp-project-info">
                            <span className="spp-project-name">{projectName}</span>
                            <button className="spp-settings-btn" onClick={() => setShowSettings(true)}>
                                <RiSettings3Line size={15} />
                            </button>
                        </div>
                        <MembersPanel />
                    </div>
                    <button className="spp-create-task-btn" onClick={() => setShowCreateTask(true)}>
                        Create task
                        <RiAddLine size={14} />
                    </button>
                </div>

                <div className="spp-board-wrap">
                    <KanbanBoard ref={kanbanRef} />
                </div>
            </div>

            {showSettings && (
                <ProjectSettingsModal
                    projectName={projectName}
                    onClose={() => setShowSettings(false)}
                    onSave={({ name }) => setProjectName(name)}
                    onDelete={() => { }}
                />
            )}

            {showCreateTask && (
                <CreateTaskModal
                    onClose={() => setShowCreateTask(false)}
                    onAdd={handleAddTask}
                />
            )}
        </div>
    );
}