import './ProfilePage.css';
import { useEffect } from 'react';

import Header from '../../components/layout/Header/Header.jsx';
import DarkVeil from '../../components/layout/DarkVeil/DarkVeil.jsx';
import { darkVeilConfig } from '../../components/config/PagesConfig.js';
import { ProfileLeft } from '../../components/features/profile/ProfileLeft/ProfileLeft.jsx';
import { ProfileRight } from '../../components/features/profile/ProfileRight/ProfileRight.jsx';

export default function ProfilePage() {
    useEffect(() => { window.scrollTo(0, 0); }, []);

    return (
        <div className='profilepage'>
            <div className="profilepage-bg">
                <DarkVeil {...darkVeilConfig} />
            </div>
            <Header />
            <div className='profile-container'>
                <div className='profile-container-left'>
                    <ProfileLeft />
                </div>
                <div className='profile-container-right'>
                    <ProfileRight />
                </div>
            </div>
        </div>
    );
}