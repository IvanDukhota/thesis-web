import { useState, useRef, useEffect } from 'react';
import { RiTeamLine, RiSettings3Line } from 'react-icons/ri';
import './MembersPanel.css';

const STUB_MEMBERS = [
    { name: 'Alex K.', role: 'Owner' },
    { name: 'Maria S.', role: 'Developer' },
    { name: 'Ivan D.', role: 'Designer' },
    { name: 'Olha P.', role: 'Developer' },
];

export function MembersPanel() {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
        document.addEventListener('pointerdown', handler);
        return () => document.removeEventListener('pointerdown', handler);
    }, [open]);

    return (
        <div className="mp-wrap" ref={ref}>
            <button className="mp-trigger" onClick={() => setOpen(v => !v)}>
                <RiTeamLine size={14} />
                <span>Members</span>
                <span className="mp-count">{STUB_MEMBERS.length}</span>
            </button>

            {open && (
                <div className="mp-dropdown">
                    <p className="mp-dropdown-title">Project members</p>
                    <div className="mp-list">
                        {STUB_MEMBERS.map((m, i) => (
                            <div key={i} className="mp-member">
                                <div className="mp-avatar">{m.name[0]}</div>
                                <div className="mp-info">
                                    <span className="mp-name">{m.name}</span>
                                    <span className="mp-role">{m.role}</span>
                                </div>
                                <button className="mp-gear"><RiSettings3Line size={13} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}