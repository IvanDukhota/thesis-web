import './MainPage.css';
import { useEffect, useRef } from 'react';

import Header from '../../components/Header/Header';
import DarkVeil from '../../components/DarkVeil/DarkVeil';
import CodeWindow from '../../components/CodeWindow/CodeWindow';
import IdeSection from '../../components/Features/IdeSection.jsx';

import { darkVeilConfig } from './MainPageConfig.js';
import { FEATURES } from '../../components/Features/FeaturesData.jsx';

function MainPage() {
    const ideRef = useRef(null);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const scrollToIde = () => {
        ideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div className="mainpage">
            <div className="mainpage-bg">
                <DarkVeil {...darkVeilConfig} />
            </div>
            <Header />
            <div className='welcome-container'>
                <div className='welcome-container-text'>
                    <p className='text-type-1 hero-anim hero-anim--1'>
                        Build, collaborate, and grow — in one place.
                    </p>
                    <p className='text-type-2 hero-anim hero-anim--2'>
                        TeamHub is a complete platform for developers: a professional IDE,
                        a talent marketplace, project management, and team collaboration —
                        everything connected under one account.
                    </p>
                    <div className='button-container-1 hero-anim hero-anim--3'>
                        <button className='button-class-1' onClick={scrollToIde}>Download IDE</button>
                        <button className='button-class-2'>Get Started</button>
                    </div>
                </div>
                <div className='welcome-container-media hero-anim hero-anim--4'>
                    <CodeWindow />
                </div>
            </div>

            <div className='sub-header-container'>
                <h1>One platform. Every tool you need.</h1>
                <p>From writing your first line to hiring your next teammate — TeamHub has it covered.</p>
            </div>

            <div className='information-container'>
                {FEATURES.slice(0, 3).map((f) => (
                    <div className='information-card' key={f.title}>
                        <div className='card-icon'>{f.icon}</div>
                        <h3 className='card-title'>{f.title}</h3>
                        <p className='card-text'>{f.text}</p>
                    </div>
                ))}
            </div>

            <div className='information-container'>
                {FEATURES.slice(3, 6).map((f) => (
                    <div className='information-card' key={f.title}>
                        <div className='card-icon'>{f.icon}</div>
                        <h3 className='card-title'>{f.title}</h3>
                        <p className='card-text'>{f.text}</p>
                    </div>
                ))}
            </div>

            <div ref={ideRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <IdeSection />
            </div>
        </div>
    );
}

export default MainPage;