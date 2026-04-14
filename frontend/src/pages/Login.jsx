import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../utils/auth';
import { LogIn, Mail, KeyRound, AlertCircle, Cpu, Eye, EyeOff, Shield } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login, error, setError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields'); return; }
    if (needs2FA && !totpCode) { setError('Please enter your 2FA code'); return; }
    setLoading(true);
    try {
      const result = await login(email, password, needs2FA ? totpCode : null);
      if (result && result.requires_2fa) {
        setNeeds2FA(true);
        setError(null);
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) { /* error set in context */ }
    finally { setLoading(false); }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    try { await login('demo@hpcai.dev', 'demo'); navigate('/', { replace: true }); }
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
        <h2 style={{ fontSize: '1.375rem', fontWeight: '700', color: '#f1f5f9', textAlign: 'center', marginBottom: '0.25rem' }}>
          {needs2FA ? 'Two-Factor Authentication' : 'Welcome Back'}
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', textAlign: 'center', marginBottom: '1.75rem' }}>
          {needs2FA ? 'Enter the code from your authenticator app' : 'Sign in to continue your learning journey'}
        </p>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: '0.8125rem', marginBottom: '1rem' }}>
            <AlertCircle size={16} />{error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!needs2FA ? (
            <>
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
            </>
          ) : (
            <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
              <Shield size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
              <input type="text" placeholder="6-digit code" value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{ ...inputStyle, letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.25rem', fontWeight: '700' }}
                onFocus={(e) => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.1)'; }}
                onBlur={(e) => { e.target.style.borderColor = '#334155'; e.target.style.boxShadow = 'none'; }}
                autoComplete="one-time-code" inputMode="numeric" maxLength={6} autoFocus />
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '0.875rem', fontSize: '0.9375rem', fontWeight: '700', fontFamily: "'Inter', sans-serif", color: '#0f172a', background: needs2FA ? 'linear-gradient(135deg, #8b5cf6, #a78bfa)' : 'linear-gradient(135deg, #06b6d4, #14b8a6)', border: 'none', borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 200ms ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: needs2FA ? '0 4px 16px rgba(139,92,246,0.3)' : '0 4px 16px rgba(6,182,212,0.3)', marginTop: '0.5rem', opacity: loading ? 0.7 : 1 }}
            onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; } }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}>
            {loading ? <><div className="loading-spinner sm" />Signing in...</> : needs2FA ? <><Shield size={18} />Verify</> : <><LogIn size={18} />Sign In</>}
          </button>
        </form>

        {needs2FA && (
          <button type="button" onClick={() => { setNeeds2FA(false); setTotpCode(''); setError(null); }}
            style={{ width: '100%', marginTop: '0.75rem', padding: '0.5rem', fontSize: '0.8125rem', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Back to login
          </button>
        )}

        {!needs2FA && (
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', margin: '0.75rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: '#334155' }} />
              <span style={{ padding: '0 0.75rem', fontSize: '0.75rem', color: '#64748b' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: '#334155' }} />
            </div>
            <button type="button" onClick={handleDemoLogin} disabled={loading}
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.875rem', fontWeight: '600', fontFamily: "'Inter', sans-serif", color: '#fbbf24', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 200ms ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: loading ? 0.7 : 1 }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = 'rgba(245,158,11,0.15)'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.4)'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.08)'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.25)'; }}>
              <Cpu size={16} />Try Demo — No Account Needed
            </button>
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#64748b' }}>
        Don't have an account?{' '}<Link to="/register" style={{ color: '#06b6d4', fontWeight: '600', textDecoration: 'none' }}>Create Account</Link>
      </div>
    </div>
  );
}
