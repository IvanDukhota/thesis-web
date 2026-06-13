import './Header.css';
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import {
    RiUser3Line,
    RiBellLine,
    RiLogoutBoxRLine,
    RiCloseLine,
} from 'react-icons/ri';
import { VscLayout } from 'react-icons/vsc';
import { NotificationsPanel } from '../NotificationsPanel/NotificationsPanel';
import { useAuth } from '../../../context/AuthContext';
import { apiGetInvitations } from '../../../api/invitationsApi';

const NAV_LINKS = [
    { label: "Projects", path: '/projects' },
    { label: "Teams", path: '/teams' },
    { label: "Marketplace", path: null },
    { label: "Chat", path: null },
];

const Header = forwardRef(function Header(_, ref) {
    const [hidden, setHidden] = useState(false);
    const [open, setOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showLogout, setShowLogout] = useState(false);
    const [notifCount, setNotifCount] = useState(0);
    const { user, logout } = useAuth();

    useEffect(() => {
        if (!user) return;
        apiGetInvitations().then(({ ok, data }) => {
            if (ok) setNotifCount(data.length);
        });
    }, [user]);

    useImperativeHandle(ref, () => ({
        openNotifications: () => {
            setShowNotifications(true);
            setNotifCount(0);
        },
    }));

    const lastScroll = useRef(0);
    const dropdownRef = useRef(null);
    const avatarRef = useRef(null);
    const notifRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const onScroll = () => {
            const current = window.scrollY;
            setHidden(current > lastScroll.current && current > 80);
            setOpen(false);
            setShowNotifications(false);
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

    useEffect(() => {
        if (!showNotifications) return;
        const onPointerDown = (e) => {
            if (notifRef.current?.contains(e.target)) return;
            setShowNotifications(false);
        };
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [showNotifications]);

    const goToProfile = () => {
        setOpen(false);
        navigate('/profile');
    };

    const handleSignOut = () => {
        logout();
        navigate('/auth', { replace: true });
    };

    const handleNavClick = (path) => {
        if (!user) { navigate('/auth'); return; }
        if (path) navigate(path);
    };

    return (
        <>
            <header className={`header ${hidden ? "header--hidden" : ""}`}>
                <button className="header-left" onClick={() => navigate('/')} aria-label="Go to home">
                    <div className="header-logo">
                        <VscLayout size={18} />
                    </div>
                    <span className="header-wordmark">TeamHub</span>
                </button>

                <nav className="header-nav">
                    {NAV_LINKS.map(({ label, path }) => {
                        const isActive = user && path && location.pathname.startsWith(path);
                        return (
                            <button
                                key={label}
                                className={`header-nav-btn ${isActive ? 'header-nav-btn--active' : ''}`}
                                onClick={() => handleNavClick(path)}
                            >
                                {label}
                            </button>
                        );
                    })}
                </nav>

                <div className="header-right">
                    {user ? (
                        <>
                            <div className="notif-wrapper" ref={notifRef}>
                                <button
                                    className={`header-bell ${showNotifications ? 'header-bell--active' : ''}`}
                                    onClick={() => {
                                        setShowNotifications(v => !v);
                                        setNotifCount(0);
                                    }}
                                    aria-label="Notifications"
                                >
                                    <RiBellLine size={17} />
                                    {notifCount > 0 && <span className="header-bell-badge">{notifCount}</span>}
                                </button>
                                <NotificationsPanel
                                    open={showNotifications}
                                    onCountChange={delta => setNotifCount(c => Math.max(0, c + delta))}
                                />
                            </div>

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
                                    <button className="header-dropdown-item" onClick={goToProfile}>
                                        <span className="header-dropdown-icon"><RiUser3Line size={15} /></span>
                                        Profile
                                    </button>

                                    <div className="header-dropdown-divider" />

                                    <button className="header-dropdown-item header-dropdown-item--logout" onClick={() => { setOpen(false); setShowLogout(true); }}>
                                        <span className="header-dropdown-icon"><RiLogoutBoxRLine size={15} /></span>
                                        Log out
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <button className="header-signin-btn" onClick={() => navigate('/auth')}>
                            Sign in
                        </button>
                    )}
                </div>
            </header>

            {showLogout && (
                <div className="logout-overlay">
                    <div className="logout-modal" onClick={e => e.stopPropagation()}>
                        <div className="logout-modal-header">
                            <div className="logout-modal-title">
                                <RiLogoutBoxRLine size={18} className="logout-modal-title-icon" />
                                Sign out of your account
                            </div>
                            <button className="logout-modal-close" onClick={() => setShowLogout(false)}>
                                <RiCloseLine size={16} />
                            </button>
                        </div>
                        <p className="logout-modal-desc">You&apos;ll be logged out and redirected to the login page.</p>
                        <div className="logout-modal-actions">
                            <button className="logout-btn logout-btn--cancel" onClick={() => setShowLogout(false)}>Cancel</button>
                            <button className="logout-btn logout-btn--confirm" onClick={handleSignOut}>Sign out</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
});

export default Header;
