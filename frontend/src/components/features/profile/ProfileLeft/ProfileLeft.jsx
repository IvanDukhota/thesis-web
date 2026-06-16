import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiSettings3Line, RiMailLine, RiMapPinLine, RiGenderlessLine, RiCalendarLine, RiTranslate2, RiTeamLine, RiArrowRightSLine } from 'react-icons/ri';

import { EditProfileModal } from '../ProfileModal/EditProfileModal.jsx';
import { useAuth } from '../../../../context/AuthContext.jsx';
import { apiGetMyTeam } from '../../../../api/teamsApi.js';
import './ProfileLeft.css';
import '../ProfileModal/EditProfileModal.css';

const LANGUAGE_LABELS = {
    en: 'English', uk: 'Ukrainian', ru: 'Russian',
    de: 'German', fr: 'French', es: 'Spanish', pl: 'Polish',
};

const GENDER_LABELS = {
    male: 'Male', female: 'Female',
};

const REGION_LABELS = {
    north_america: 'North America', south_america: 'South America', europe: 'Europe',
    asia: 'Asia', africa: 'Africa', oceania: 'Oceania', middle_east: 'Middle East',
};

function MetaRow({ icon, value, placeholder }) {
    return (
        <div className="pl-meta-row">
            <span className="pl-meta-icon">{icon}</span>
            <span className={`pl-meta-value ${!value ? 'pl-meta-value--empty' : ''}`}>
                {value || placeholder}
            </span>
        </div>
    );
}

export function ProfileLeft() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [editOpen, setEditOpen] = useState(false);
    const [team, setTeam] = useState(null);
    const [teamLoaded, setTeamLoaded] = useState(false);

    useEffect(() => {
        apiGetMyTeam().then(({ ok, data }) => {
            if (ok) setTeam(data);
            setTeamLoaded(true);
        });
    }, []);

    return (
        <div className="pl-root">
            <div className="pl-top">
                <div className="pl-avatar-wrap">
                    {user?.avatar
                        ? <img src={user.avatar} alt="avatar" className="pl-avatar-img" />
                        : <div className="pl-avatar-placeholder">{user?.username?.[0]?.toUpperCase() || 'U'}</div>
                    }
                </div>

                <div className="pl-info">
                    <div className="pl-name">
                        {user?.username || <span className="pl-empty">Username not set</span>}
                    </div>
                    <MetaRow icon={<RiMailLine size={13} />} value={user?.email} placeholder="Email not set" />
                    <MetaRow icon={<RiTranslate2 size={13} />} value={LANGUAGE_LABELS[user?.language]} placeholder="Language not set" />
                    <MetaRow icon={<RiMapPinLine size={13} />} value={REGION_LABELS[user?.region]} placeholder="Region not set" />
                    <MetaRow icon={<RiGenderlessLine size={13} />} value={GENDER_LABELS[user?.gender]} placeholder="Gender not set" />
                    <MetaRow icon={<RiCalendarLine size={13} />} value={user?.age ? `${user.age} y.o.` : null} placeholder="Age not set" />
                </div>

                <button className="pl-settings-btn" onClick={() => setEditOpen(true)} aria-label="Edit profile">
                    <RiSettings3Line size={16} />
                </button>
            </div>

            <div className="pl-divider" />

            <div className="pl-bottom">
                <p className="pl-team-title">Current team</p>

                {!teamLoaded ? (
                    <p className="pl-no-team-text" style={{ color: '#3f3f46' }}>Loading...</p>
                ) : team ? (
                    <div className="pl-team-card" onClick={() => navigate('/teams')}>
                        <div className="pl-team-card-icon">
                            <RiTeamLine size={18} />
                        </div>
                        <div className="pl-team-card-info">
                            <span className="pl-team-card-name">{team.name}</span>
                            <span className="pl-team-card-meta">
                                {team.members?.length ?? 0} member{(team.members?.length ?? 0) !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <RiArrowRightSLine size={16} className="pl-team-card-arrow" />
                    </div>
                ) : (
                    <div className="pl-no-team">
                        <p className="pl-no-team-text">
                            You are not part of a team yet. Create your own or join an existing one.
                        </p>
                        <div className="pl-team-actions">
                            <button className="pl-team-btn pl-team-btn--secondary" onClick={() => navigate('/teams')}>
                                Check Notifications
                            </button>
                            <button className="pl-team-btn pl-team-btn--primary" onClick={() => navigate('/teams')}>
                                Create Team
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {editOpen && (
                <EditProfileModal
                    onClose={() => setEditOpen(false)}
                />
            )}
        </div>
    );
}
