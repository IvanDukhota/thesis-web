import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { RiAddLine, RiFolderLine, RiCloseLine } from 'react-icons/ri';
import { apiGetProject } from '../../../../api/projectsApi';
import './TeamProjects.css';

function AccessToast({ message, onClose }) {
    useEffect(() => {
        const id = setTimeout(onClose, 5000);
        return () => clearTimeout(id);
    }, [onClose]);

    return createPortal(
        <div className="tp-toast">
            <span className="tp-toast-msg">{message}</span>
            <button className="tp-toast-close" onClick={onClose}>
                <RiCloseLine size={15} />
            </button>
        </div>,
        document.body
    );
}

export function TeamProjects({ projects, onAddProject, canAddProject }) {
    const navigate = useNavigate();
    const [loadingId, setLoadingId] = useState(null);
    const [toast, setToast] = useState(null);
    const toastId = useRef(0);

    const showToast = (message) => {
        const id = ++toastId.current;
        setToast({ id, message });
    };

    const handleOpen = async (p) => {
        setLoadingId(p.id);
        const { ok, status } = await apiGetProject(p.id);
        setLoadingId(null);
        if (ok) {
            navigate(`/projects/${p.id}`);
        } else if (status === 403) {
            showToast("You don't have access to this project");
        }
    };

    return (
        <>
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
                        {projects.map((p) => (
                            <div key={p.id} className="tp-card">
                                <div className="tp-card-top">
                                    <span className="tp-card-name">{p.name}</span>
                                    <span className={`tp-card-status tp-card-status--${p.status}`}>{p.status}</span>
                                </div>
                                <div className="tp-card-stats">
                                    <span className="tp-stat">0 tasks</span>
                                    <span className="tp-stat-dot" />
                                    <span className="tp-stat">0 done</span>
                                    <span className="tp-stat-dot" />
                                    <span className="tp-stat">{p.project_members?.length || 0} members</span>
                                </div>
                                <div className="tp-card-footer">
                                    <button
                                        className="tp-open-btn"
                                        onClick={() => handleOpen(p)}
                                        disabled={loadingId === p.id}
                                    >
                                        {loadingId === p.id ? '...' : 'Open →'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {toast && (
                <AccessToast
                    key={toast.id}
                    message={toast.message}
                    onClose={() => setToast(null)}
                />
            )}
        </>
    );
}
