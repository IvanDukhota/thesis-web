import './ProfilePage.css';
import { useEffect } from 'react';

import Header from '../../components/layout/Header/Header.jsx';
import { ProfileLeft } from '../../components/features/profile/ProfileLeft/ProfileLeft.jsx';
import { ProfileRight } from '../../components/features/profile/ProfileRight/ProfileRight.jsx';

export default function ProfilePage() {
    useEffect(() => { window.scrollTo(0, 0); }, []);

    return (
        <div className='profilepage'>
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