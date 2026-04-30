import { useState } from 'react';
import { RiSettings3Line, RiUserLine, RiMailLine, RiMapPinLine, RiGenderlessLine, RiCalendarLine } from 'react-icons/ri';

import { EditProfileModal } from '../ProfileModal/EditProfileModal.jsx';
import './ProfileLeft.css';
import '../ProfileModal/EditProfileModal.css';

const DEFAULT_PROFILE = {
    avatar: null,
    nick: 'testnick',
    email: 'test@example.com',
    firstName: 'test',
    lastName: 'Tester',
    region: 'Europe',
    gender: 'Male',
    age: '24',
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
    const [profile, setProfile] = useState(DEFAULT_PROFILE);
    const [editOpen, setEditOpen] = useState(false);

    return (
        <div className="pl-root">
            <div className="pl-top">
                <div className="pl-avatar-wrap">
                    {profile.avatar
                        ? <img src={profile.avatar} alt="avatar" className="pl-avatar-img" />
                        : <div className="pl-avatar-placeholder">{profile.nick?.[0]?.toUpperCase() || 'U'}</div>
                    }
                </div>

                <div className="pl-info">
                    <div className="pl-name">
                        {(profile.firstName || profile.lastName)
                            ? `${profile.firstName} ${profile.lastName}`.trim()
                            : <span className="pl-empty">Name not set</span>
                        }
                    </div>
                    <MetaRow icon={<RiUserLine size={13} />} value={profile.nick} placeholder="Nickname not set" />
                    <MetaRow icon={<RiMailLine size={13} />} value={profile.email} placeholder="Email not set" />
                    <MetaRow icon={<RiMapPinLine size={13} />} value={profile.region} placeholder="Region not set" />
                    <MetaRow icon={<RiGenderlessLine size={13} />} value={profile.gender} placeholder="Gender not set" />
                    <MetaRow icon={<RiCalendarLine size={13} />} value={profile.age ? `${profile.age} y.o.` : null} placeholder="Age not set" />
                </div>

                <button className="pl-settings-btn" onClick={() => setEditOpen(true)} aria-label="Edit profile">
                    <RiSettings3Line size={16} />
                </button>
            </div>

            <div className="pl-divider" />

            <div className="pl-bottom">
                <p className="pl-team-title">Current team</p>
                <div className="pl-no-team">
                    <p className="pl-no-team-text">
                        You are not part of a team yet. Create your own or join an existing one.
                    </p>
                    <button className="pl-team-btn">Browse teams</button>
                </div>
            </div>

            {editOpen && (
                <EditProfileModal
                    profile={profile}
                    onSave={setProfile}
                    onClose={() => setEditOpen(false)}
                />
            )}
        </div>
    );
}