import './ProfilePage.css';

import Header from '../../components/Header/Header';
import DarkVeil from '../../components/DarkVeil/DarkVeil';
import { darkVeilConfig } from './ProfilePageConfig';

export default function ProfilePage() {
    return (
        <div className='profilepage'>
            <div className="profilepage-bg">
                <DarkVeil {...darkVeilConfig} />
            </div>
            <Header />
        </div>
    );
}