import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.code}>404</div>
        <h1 style={styles.title}>Page Not Found</h1>
        <p style={styles.message}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div style={styles.actions}>
          <button style={styles.btnPrimary} onClick={() => navigate('/')}>
            <Home size={16} /> Dashboard
          </button>
          <button style={styles.btnSecondary} onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Go Back
          </button>
          <button style={styles.btnSecondary} onClick={() => navigate('/modules')}>
            <Search size={16} /> Browse Modules
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    padding: '2rem',
  },
  card: {
    textAlign: 'center',
    maxWidth: '480px',
  },
  code: {
    fontSize: '6rem',
    fontWeight: '800',
    letterSpacing: '-0.05em',
    background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    lineHeight: 1,
    marginBottom: '0.5rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: '0.75rem',
  },
  message: {
    color: '#94a3b8',
    lineHeight: '1.6',
    marginBottom: '2rem',
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    background: 'linear-gradient(135deg, #06b6d4, #14b8a6)',
    color: '#0f172a',
    boxShadow: '0 2px 8px rgba(6, 182, 212, 0.3)',
  },
  btnSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    borderRadius: '10px',
    border: '1px solid #334155',
    cursor: 'pointer',
    background: '#334155',
    color: '#f1f5f9',
  },
};
