import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './utils/auth';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ModuleList from './pages/ModuleList';
import ModuleDetail from './pages/ModuleDetail';
import LessonViewer from './pages/LessonViewer';
import LearningPath from './pages/LearningPath';
import Login from './pages/Login';
import Register from './pages/Register';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: '#06b6d4', fontSize: '1.2rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div className="loading-spinner" />
        <span style={{ marginLeft: '1rem' }}>Loading...</span>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
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
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/modules" element={<ModuleList />} />
          <Route path="/modules/:id" element={<ModuleDetail />} />
          <Route path="/modules/:id/lessons/:lessonId" element={<LessonViewer />} />
          <Route path="/learning-path" element={<LearningPath />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
