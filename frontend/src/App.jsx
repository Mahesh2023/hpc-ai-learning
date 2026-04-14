import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './utils/auth';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';

// Lazy-loaded pages for code splitting
const ModuleList = React.lazy(() => import('./pages/ModuleList'));
const ModuleDetail = React.lazy(() => import('./pages/ModuleDetail'));
const LessonViewer = React.lazy(() => import('./pages/LessonViewer'));
const LearningPath = React.lazy(() => import('./pages/LearningPath'));
const Sandbox = React.lazy(() => import('./pages/Sandbox'));
const Search = React.lazy(() => import('./pages/Search'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Achievements = React.lazy(() => import('./pages/Achievements'));
const Notes = React.lazy(() => import('./pages/Notes'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', color: '#06b6d4' }}>
      <div className="loading-spinner" />
      <span style={{ marginLeft: '1rem', fontSize: '0.9375rem' }}>Loading...</span>
    </div>
  );
}

function Lazy({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export default function App() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: '#06b6d4' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!user && !isAuthPage) {
    return <Navigate to="/login" replace />;
  }

  if (isAuthPage) {
    return (
      <div className="auth-main">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="app-container">
      <a href="#main-content" className="skip-to-content">Skip to content</a>
      <Sidebar />
      <main className="main-content" id="main-content">
        <Lazy>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/modules" element={<ModuleList />} />
            <Route path="/modules/:id" element={<ModuleDetail />} />
            <Route path="/modules/:id/lessons/:lessonId" element={<LessonViewer />} />
            <Route path="/learning-path" element={<LearningPath />} />
            <Route path="/sandbox" element={<Sandbox />} />
            <Route path="/search" element={<Search />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Lazy>
      </main>
    </div>
  );
}
