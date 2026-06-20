import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import { RealtimeProvider } from './providers/RealtimeProvider';
import MainPage from './pages/MainPage/MainPage';
import ProfilePage from './pages/ProfilePage/ProfilePage';
import AuthPage from './pages/AuthPage/AuthPage';
import TeamsPage from './pages/TeamsPage/TeamsPage';
import ProjectsPage from './pages/ProjectsPage/ProjectsPage';
import SingleProjectPage from './pages/SingleProjectPage/SingleProjectPage';
import MarketplacePage from './pages/MarketplacePage';
import OrderDetailPage from './pages/MarketplacePage/OrderDetailPage';
import ChatPage from './pages/ChatPage/ChatPage';
import DarkVeil from './components/layout/DarkVeil/DarkVeil';
import { darkVeilConfig } from './components/config/PagesConfig';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (!user) return <Navigate to="/auth" replace />;
    return children;
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/teams" element={<ProtectedRoute><TeamsPage /></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
            <Route path="/projects/:id" element={<ProtectedRoute><SingleProjectPage /></ProtectedRoute>} />
            <Route path="/marketplace" element={<ProtectedRoute><MarketplacePage /></ProtectedRoute>} />
            <Route path="/marketplace/:slug" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        </Routes>
    );
}

function App() {
    return (
        <Router>
            <AuthProvider>
                <RealtimeProvider>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
                        <DarkVeil {...darkVeilConfig} />
                    </div>
                    <AppRoutes />
                </RealtimeProvider>
            </AuthProvider>
        </Router>
    );
}

export default App;
