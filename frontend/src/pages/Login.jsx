import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../utils/auth';
import { LogIn, Mail, KeyRound, AlertCircle, Cpu, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login, error, setError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    try { await login(email, password); navigate('/', { replace: true }); }
    catch (err) { /* error set in context */ }
    finally { setLoading(false); }
  };

  const inputStyle = {
    width: '100%', padding: '0.8rem 1rem 0.8rem 2.75rem', fontFamily: "'Inter', sans-serif",
    fontSize: '0.9375rem', color: '#f1f5f9', background: '#0f172a', border: '1px solid #334155',
    borderRadius: '12px', outline: 'none', transition: 'all 150ms ease',
  };

  return (
    <div style={{ width: '100%', maxWidth: '420px', padding: '0 1.5rem', animation: 'fadeInUp 0.5s ease-out' }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 8px 24px rgba(6,182,212,0.25)' }}>
          <Cpu size={28} color="#0f172a" strokeWidth={2.5} />
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.025em' }}>
          <span style={{ color: '#06b6d4' }}>HPC</span>{' '}<span style={{ color: '#8b5cf6' }}>AI</span>{' '}<span style={{ color: '#f1f5f9' }}>Learning</span>
        </div>
        <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>Platform Engineering Academy</div>
      </div>

      {/* Card */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '20px', padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
        <h2 style={{ fontSize: '1.375rem', fontWeight: '700', color: '#f1f5f9', textAlign: 'center', marginBottom: '0.25rem' }}>Welcome Back</h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', textAlign: 'center', marginBottom: '1.75rem' }}>Sign in to continue your learning journey</p>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: '0.8125rem', marginBottom: '1rem' }}>
            <AlertCircle size={16} />{error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
            <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
            <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = '#06b6d4'; e.target.style.boxShadow = '0 0 0 3px rgba(6,182,212,0.1)'; }}
              onBlur={(e) => { e.target.style.borderColor = '#334155'; e.target.style.boxShadow = 'none'; }}
              autoComplete="email" />
          </div>

          <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
            <KeyRound size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
            <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle, paddingRight: '2.75rem' }}
              onFocus={(e) => { e.target.style.borderColor = '#06b6d4'; e.target.style.boxShadow = '0 0 0 3px rgba(6,182,212,0.1)'; }}
              onBlur={(e) => { e.target.style.borderColor = '#334155'; e.target.style.boxShadow = 'none'; }}
              autoComplete="current-password" />
            <button type="button" style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}
              onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '0.875rem', fontSize: '0.9375rem', fontWeight: '700', fontFamily: "'Inter', sans-serif", color: '#0f172a', background: 'linear-gradient(135deg, #06b6d4, #14b8a6)', border: 'none', borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 200ms ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 16px rgba(6,182,212,0.3)', marginTop: '0.5rem', opacity: loading ? 0.7 : 1 }}
            onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(6,182,212,0.4)'; } }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(6,182,212,0.3)'; }}>
            {loading ? <><div className="loading-spinner sm" />Signing in...</> : <><LogIn size={18} />Sign In</>}
          </button>
        </form>

        <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', fontSize: '0.75rem', color: '#fbbf24', textAlign: 'center', lineHeight: 1.6 }}>
          <strong>Demo Mode:</strong> Use <code style={{ background: 'rgba(6,182,212,0.15)', padding: '0.1rem 0.3rem', borderRadius: '4px', color: '#22d3ee' }}>demo@hpcai.dev</code> with any password to explore
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#64748b' }}>
        Don't have an account?{' '}<Link to="/register" style={{ color: '#06b6d4', fontWeight: '600', textDecoration: 'none' }}>Create Account</Link>
      </div>
    </div>
  );
}
