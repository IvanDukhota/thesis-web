import './Header.css';
import { useEffect, useRef, useState } from "react";

function Header() {
    const [hidden, setHidden] = useState(false);
    const lastScroll = useRef(0);

    useEffect(() => {
        const onScroll = () => {
            const current = window.scrollY;
            
            if (current > lastScroll.current && current > 80) {
                setHidden(true);
            } else {
                setHidden(false);
            }

            lastScroll.current = current;
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <header className={`header ${hidden ? "header--hidden" : ""}`}>
            {}
        </header>
    );
}

export default Header;