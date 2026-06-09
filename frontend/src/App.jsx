import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import MainPage from './pages/MainPage/MainPage';
import ProfilePage from './pages/ProfilePage/ProfilePage';
import AuthPage from './pages/AuthPage/AuthPage';
import TeamsPage from './pages/TeamsPage/TeamsPage';
import ProjectsPage from './pages/ProjectsPage/ProjectsPage';
import SingleProjectPage from './pages/SingleProjectPage/SingleProjectPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<SingleProjectPage />} />
      </Routes>
    </Router>
  );
}

export default App;