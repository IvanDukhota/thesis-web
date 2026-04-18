import './MainPage.css';
import { useEffect } from "react";
import Header from '../../components/Header/Header';

import DarkVeil from '../../components/DarkVeil/DarkVeil';
import AnimatedContent from '../../components/AnimatedContent/AnimatedContent';
import ShinyText from '../../components/ShinyText/ShinyText';
import { darkVeilConfig, shinyTextConfig, firstAnimation, secondAnimation, thirdAnimation } from './MainPageConfig.js';

function MainPage() {

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="mainpage">
            <div className="mainpage-bg">
                <DarkVeil {...darkVeilConfig} />
            </div>
            <Header />
            <div className='welcome-container'>
                <AnimatedContent {...firstAnimation}>
                    <h1 className='text-type1'>TeamHub Workspace For Best Developers</h1>
                </AnimatedContent>
                <AnimatedContent {...secondAnimation}>
                    <ShinyText {...shinyTextConfig}></ShinyText>
                </AnimatedContent>
                <AnimatedContent {...thirdAnimation}>
                    <div className='button-block'>
                        <button className='button-class1'>Learn More 🛈</button>
                        <button className='button-class2'>Get Started ↗</button>
                    </div>
                </AnimatedContent>
            </div>
        </div>
    );
}

export default MainPage;