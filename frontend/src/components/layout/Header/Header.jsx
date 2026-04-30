import './Header.css';
import { useEffect, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom';
import {
    RiUser3Line,
    RiChat3Line,
    RiBellLine,
    RiLogoutBoxRLine,
} from 'react-icons/ri';
import { VscLayout } from 'react-icons/vsc';

const NAV_LINKS = ["Projects", "Teams", "Marketplace"];

function Header() {
    const [hidden, setHidden] = useState(false);
    const [open, setOpen] = useState(false);
    const lastScroll = useRef(0);
    const dropdownRef = useRef(null);
    const avatarRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const onScroll = () => {
            const current = window.scrollY;
            setHidden(current > lastScroll.current && current > 80);
            setOpen(false);
            lastScroll.current = current;
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e) => {
            if (
                dropdownRef.current?.contains(e.target) ||
                avatarRef.current?.contains(e.target)
            ) return;
            setOpen(false);
        };
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [open]);

    const goToProfile = () => {
        setOpen(false);
        navigate('/profile');
    };

    const DROPDOWN_ITEMS = [
        { icon: <RiUser3Line size={15} />, label: "Profile", action: goToProfile },
        { icon: <RiChat3Line size={15} />, label: "Chat", action: () => setOpen(false) },
        { icon: <RiBellLine size={15} />, label: "Notifications", action: () => setOpen(false) },
    ];

    return (
        <header className={`header ${hidden ? "header--hidden" : ""}`}>

            <button className="header-left" onClick={() => navigate('/')} aria-label="Go to home">
                <div className="header-logo">
                    <VscLayout size={18} />
                </div>
                <span className="header-wordmark">TeamHub</span>
            </button>

            <nav className="header-nav">
                {NAV_LINKS.map((label) => (
                    <button key={label} className="header-nav-btn">
                        {label}
                    </button>
                ))}
            </nav>

            <div className="profile-wrapper" ref={dropdownRef}>
                <button
                    ref={avatarRef}
                    className={`header-avatar ${open ? "header-avatar--active" : ""}`}
                    onClick={() => setOpen((v) => !v)}
                    aria-label="Profile menu"
                >
                    <RiUser3Line size={17} />
                </button>

                <div className={`header-dropdown ${open ? "header-dropdown--open" : ""}`}>
                    {DROPDOWN_ITEMS.map(({ icon, label, action }) => (
                        <button key={label} className="header-dropdown-item" onClick={action}>
                            <span className="header-dropdown-icon">{icon}</span>
                            {label}
                        </button>
                    ))}

                    <div className="header-dropdown-divider" />

                    <button className="header-dropdown-item header-dropdown-item--logout" onClick={() => setOpen(false)}>
                        <span className="header-dropdown-icon"><RiLogoutBoxRLine size={15} /></span>
                        Log out
                    </button>
                </div>
            </div>
        </header>
    );
}

export default Header;