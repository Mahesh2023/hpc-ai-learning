import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.iconWrap}>
            <AlertTriangle size={48} color="#f59e0b" />
          </div>
          <h1 style={styles.title}>Something went wrong</h1>
          <p style={styles.message}>
            An unexpected error occurred. This has been logged for review.
          </p>
          {this.state.error && (
            <pre style={styles.detail}>{this.state.error.message}</pre>
          )}
          <div style={styles.actions}>
            <button
              style={styles.btnPrimary}
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={16} /> Reload Page
            </button>
            <button
              style={styles.btnSecondary}
              onClick={() => { window.location.href = '/'; }}
            >
              <Home size={16} /> Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#0f172a',
    padding: '2rem',
  },
  card: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '16px',
    padding: '3rem',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
  },
  iconWrap: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'rgba(245, 158, 11, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.5rem',
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
    marginBottom: '1.5rem',
  },
  detail: {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    fontSize: '0.8125rem',
    color: '#ef4444',
    fontFamily: "'JetBrains Mono', monospace",
    textAlign: 'left',
    overflow: 'auto',
    maxHeight: '120px',
    marginBottom: '1.5rem',
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'center',
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
