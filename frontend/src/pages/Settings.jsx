import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../utils/auth';
import { changePasswordAPI, getSessionsAPI, revokeSessionAPI, revokeAllSessionsAPI } from '../utils/api';
import {
  User,
  Shield,
  Settings as SettingsIcon,
  Monitor,
  Key,
  Keyboard,
  Info,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Trash2,
  RefreshCw,
  Sun,
  Moon,
  Bell,
  LogOut,
} from 'lucide-react';

// ── Styles ──

const styles = {
  container: {
    minHeight: '100vh',
    background: '#0f172a',
    padding: '2rem',
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#f1f5f9',
    maxWidth: '900px',
    margin: '0 auto',
  },
  pageHeader: {
    marginBottom: '2rem',
  },
  pageTitle: {
    fontSize: '1.75rem',
    fontWeight: '800',
    letterSpacing: '-0.025em',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.5rem',
  },
  pageSubtitle: {
    color: '#94a3b8',
    fontSize: '0.9375rem',
  },
  card: {
    background: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.25rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #334155',
  },
  cardIconWrap: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: '1.125rem',
    fontWeight: '700',
  },
  cardDescription: {
    fontSize: '0.8125rem',
    color: '#94a3b8',
    marginTop: '0.125rem',
  },
  avatar: {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #06b6d4, #14b8a6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: '800',
    color: '#0f172a',
    flexShrink: 0,
  },
  profileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#f1f5f9',
  },
  profileEmail: {
    fontSize: '0.875rem',
    color: '#94a3b8',
    marginTop: '0.25rem',
  },
  profileBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.25rem 0.625rem',
    borderRadius: '6px',
    fontSize: '0.6875rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: '0.5rem',
  },
  label: {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: '0.375rem',
  },
  input: {
    width: '100%',
    padding: '0.625rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid #334155',
    background: '#0f172a',
    color: '#f1f5f9',
    fontSize: '0.875rem',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 150ms ease',
    boxSizing: 'border-box',
  },
  inputFocused: {
    borderColor: '#06b6d4',
  },
  inputGroup: {
    marginBottom: '1rem',
    position: 'relative',
  },
  passwordToggle: {
    position: 'absolute',
    right: '0.625rem',
    top: '2rem',
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    padding: '0.25rem',
    display: 'flex',
    alignItems: 'center',
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1.25rem',
    borderRadius: '8px',
    border: 'none',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    fontFamily: 'inherit',
  },
  buttonPrimary: {
    background: '#06b6d4',
    color: '#0f172a',
  },
  buttonSecondary: {
    background: 'rgba(255, 255, 255, 0.06)',
    color: '#f1f5f9',
    border: '1px solid #334155',
  },
  buttonDanger: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.375rem 0.75rem',
    borderRadius: '8px',
    fontSize: '0.8125rem',
    fontWeight: '600',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.875rem 0',
    borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
  },
  slider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    appearance: 'none',
    background: '#334155',
    outline: 'none',
    cursor: 'pointer',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 0',
    cursor: 'pointer',
  },
  checkboxInput: {
    width: '18px',
    height: '18px',
    borderRadius: '4px',
    border: '2px solid #334155',
    background: '#0f172a',
    cursor: 'pointer',
    accentColor: '#06b6d4',
  },
  alert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.875rem 1rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
  alertSuccess: {
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    color: '#10b981',
  },
  alertError: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
  },
  alertInfo: {
    background: 'rgba(6, 182, 212, 0.1)',
    border: '1px solid rgba(6, 182, 212, 0.2)',
    color: '#06b6d4',
  },
  guestOverlay: {
    textAlign: 'center',
    padding: '2.5rem 1.5rem',
  },
  guestIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background: 'rgba(249, 115, 22, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem',
  },
  sessionTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.8125rem',
  },
  th: {
    textAlign: 'left',
    padding: '0.625rem 0.75rem',
    color: '#64748b',
    fontWeight: '600',
    fontSize: '0.6875rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #334155',
  },
  td: {
    padding: '0.75rem',
    borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
    color: '#cbd5e1',
  },
  kbd: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.125rem 0.5rem',
    borderRadius: '4px',
    background: '#0f172a',
    border: '1px solid #334155',
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    color: '#94a3b8',
    minWidth: '1.5rem',
  },
  shortcutRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
  },
};

// ── Component ──

export default function Settings() {
  const { user } = useAuth();
  const isGuest = user?.is_guest === true;

  // Change password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState(null); // { type: 'success' | 'error', text }

  // Preferences
  const [theme, setTheme] = useState(() => localStorage.getItem('hpc_theme') || 'dark');
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('hpc_editor_font_size') || '16', 10));
  const [notifications, setNotifications] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hpc_notifications') || '{}');
    } catch {
      return {};
    }
  });

  // Sessions
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // 2FA state
  const [twoFAEnabled] = useState(user?.two_factor_enabled || false);

  // Persist preferences
  useEffect(() => {
    localStorage.setItem('hpc_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('hpc_editor_font_size', String(fontSize));
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('hpc_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Load sessions for authenticated users
  useEffect(() => {
    if (!isGuest && user) {
      loadSessions();
    }
  }, [isGuest, user]);

  async function loadSessions() {
    setSessionsLoading(true);
    try {
      const data = await getSessionsAPI();
      setSessions(Array.isArray(data) ? data : []);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwMessage(null);

    if (newPassword !== confirmPassword) {
      setPwMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 8) {
      setPwMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }

    setPwLoading(true);
    try {
      await changePasswordAPI(currentPassword, newPassword);
      setPwMessage({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwMessage({ type: 'error', text: err.message || 'Failed to change password.' });
    } finally {
      setPwLoading(false);
    }
  }

  async function handleRevokeSession(sessionId) {
    try {
      await revokeSessionAPI(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      // silently fail
    }
  }

  async function handleRevokeAll() {
    try {
      await revokeAllSessionsAPI();
      await loadSessions();
    } catch {
      // silently fail
    }
  }

  function toggleNotification(key) {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function getInitials(name) {
    if (!name) return 'U';
    return name.split(/[_\s]/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  }

  // ── Render ──

  return (
    <div style={styles.container}>
      {/* Page Header */}
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>
          <SettingsIcon size={28} style={{ color: '#06b6d4' }} />
          Settings
        </h1>
        <p style={styles.pageSubtitle}>Manage your profile, security, and preferences</p>
      </div>

      {/* ── Profile Section ── */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={{ ...styles.cardIconWrap, background: 'rgba(6, 182, 212, 0.1)' }}>
            <User size={20} style={{ color: '#06b6d4' }} />
          </div>
          <div>
            <div style={styles.cardTitle}>Profile</div>
            <div style={styles.cardDescription}>Your personal information</div>
          </div>
        </div>

        {isGuest ? (
          <div style={styles.guestOverlay}>
            <div style={styles.guestIcon}>
              <User size={28} style={{ color: '#f97316' }} />
            </div>
            <div style={{ fontSize: '1.0625rem', fontWeight: '700', marginBottom: '0.5rem' }}>
              Guest Mode
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: '1.6' }}>
              Sign in to access your profile settings, change your password, and manage security options.
            </p>
            <Link
              to="/login"
              style={{
                ...styles.button,
                ...styles.buttonPrimary,
                textDecoration: 'none',
                display: 'inline-flex',
              }}
            >
              Sign in to access settings
            </Link>
          </div>
        ) : (
          <div style={styles.profileRow}>
            <div style={styles.avatar}>
              {getInitials(user?.username)}
            </div>
            <div style={styles.profileInfo}>
              <div style={styles.profileName}>{user?.username || 'User'}</div>
              <div style={styles.profileEmail}>{user?.email || ''}</div>
              <div
                style={{
                  ...styles.profileBadge,
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                }}
              >
                <Check size={12} />
                Authenticated
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Account Security Section ── (authenticated users only) */}
      {!isGuest && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={{ ...styles.cardIconWrap, background: 'rgba(139, 92, 246, 0.1)' }}>
              <Shield size={20} style={{ color: '#8b5cf6' }} />
            </div>
            <div>
              <div style={styles.cardTitle}>Account Security</div>
              <div style={styles.cardDescription}>Password and two-factor authentication</div>
            </div>
          </div>

          {/* Change Password */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Key size={16} style={{ color: '#94a3b8' }} />
              <span style={{ fontSize: '0.9375rem', fontWeight: '600' }}>Change Password</span>
            </div>

            {pwMessage && (
              <div
                style={{
                  ...styles.alert,
                  ...(pwMessage.type === 'success' ? styles.alertSuccess : styles.alertError),
                }}
              >
                {pwMessage.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                {pwMessage.text}
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={styles.input}
                    placeholder="Enter current password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    style={{ ...styles.passwordToggle, top: '50%', transform: 'translateY(-50%)' }}
                  >
                    {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={styles.input}
                    placeholder="Enter new password (min 8 characters)"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    style={{ ...styles.passwordToggle, top: '50%', transform: 'translateY(-50%)' }}
                  >
                    {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={styles.input}
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={pwLoading}
                style={{
                  ...styles.button,
                  ...styles.buttonPrimary,
                  opacity: pwLoading ? 0.6 : 1,
                  cursor: pwLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {pwLoading ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Key size={16} />}
                {pwLoading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>

          {/* 2FA Status */}
          <div style={{ borderTop: '1px solid #334155', paddingTop: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Shield size={16} style={{ color: '#94a3b8' }} />
              <span style={{ fontSize: '0.9375rem', fontWeight: '600' }}>Two-Factor Authentication</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    ...styles.statusBadge,
                    background: twoFAEnabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    color: twoFAEnabled ? '#10b981' : '#f59e0b',
                    border: `1px solid ${twoFAEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                  }}
                >
                  {twoFAEnabled ? <Check size={14} /> : <AlertCircle size={14} />}
                  {twoFAEnabled ? 'Enabled' : 'Not Enabled'}
                </div>
                <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                  {twoFAEnabled
                    ? 'Your account is protected with 2FA.'
                    : 'Add an extra layer of security to your account.'}
                </span>
              </div>
              <button
                style={{
                  ...styles.button,
                  ...(twoFAEnabled ? styles.buttonDanger : styles.buttonSecondary),
                }}
                onClick={() => {/* placeholder — 2FA setup flow would go here */}}
              >
                {twoFAEnabled ? 'Disable 2FA' : 'Setup 2FA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Preferences Section ── */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={{ ...styles.cardIconWrap, background: 'rgba(249, 115, 22, 0.1)' }}>
            <Monitor size={20} style={{ color: '#f97316' }} />
          </div>
          <div>
            <div style={styles.cardTitle}>Preferences</div>
            <div style={styles.cardDescription}>Customize your experience</div>
          </div>
        </div>

        {/* Theme Toggle */}
        <div style={styles.row}>
          <div>
            <div style={{ fontSize: '0.9375rem', fontWeight: '600' }}>Theme</div>
            <div style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '0.125rem' }}>
              Choose your preferred appearance
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              style={{
                ...styles.button,
                ...(theme === 'dark'
                  ? { background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.3)' }
                  : styles.buttonSecondary),
                padding: '0.5rem 0.875rem',
                fontSize: '0.8125rem',
              }}
              onClick={() => setTheme('dark')}
            >
              <Moon size={14} />
              Dark
            </button>
            <button
              style={{
                ...styles.button,
                ...(theme === 'light'
                  ? { background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.3)' }
                  : styles.buttonSecondary),
                padding: '0.5rem 0.875rem',
                fontSize: '0.8125rem',
              }}
              onClick={() => setTheme('light')}
            >
              <Sun size={14} />
              Light
            </button>
          </div>
        </div>

        {/* Font Size Slider */}
        <div style={{ ...styles.row, flexDirection: 'column', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.9375rem', fontWeight: '600' }}>Code Editor Font Size</div>
              <div style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '0.125rem' }}>
                Adjust the font size for code editors
              </div>
            </div>
            <span
              style={{
                padding: '0.25rem 0.625rem',
                borderRadius: '6px',
                background: '#0f172a',
                border: '1px solid #334155',
                fontSize: '0.875rem',
                fontWeight: '600',
                fontFamily: 'monospace',
                color: '#06b6d4',
                minWidth: '3rem',
                textAlign: 'center',
              }}
            >
              {fontSize}px
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>14px</span>
            <input
              type="range"
              min={14}
              max={24}
              step={1}
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
              style={styles.slider}
            />
            <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>24px</span>
          </div>
        </div>

        {/* Notification Preferences */}
        <div style={{ paddingTop: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Bell size={16} style={{ color: '#94a3b8' }} />
            <span style={{ fontSize: '0.9375rem', fontWeight: '600' }}>Notifications</span>
          </div>

          {[
            { key: 'lesson_complete', label: 'Lesson completion reminders', desc: 'Get notified when you have unfinished lessons' },
            { key: 'new_content', label: 'New content alerts', desc: 'Be notified when new modules or lessons are added' },
            { key: 'achievements', label: 'Achievement notifications', desc: 'Celebrate milestones and badges earned' },
          ].map((item) => (
            <label key={item.key} style={styles.checkbox}>
              <input
                type="checkbox"
                checked={!!notifications[item.key]}
                onChange={() => toggleNotification(item.key)}
                style={styles.checkboxInput}
              />
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#f1f5f9' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>
                  {item.desc}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* ── Active Sessions Section ── (authenticated users only) */}
      {!isGuest && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={{ ...styles.cardIconWrap, background: 'rgba(16, 185, 129, 0.1)' }}>
              <Monitor size={20} style={{ color: '#10b981' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={styles.cardTitle}>Active Sessions</div>
              <div style={styles.cardDescription}>Manage your active sessions across devices</div>
            </div>
            <button
              style={{ ...styles.button, ...styles.buttonDanger, padding: '0.5rem 0.875rem', fontSize: '0.8125rem' }}
              onClick={handleRevokeAll}
            >
              <LogOut size={14} />
              Revoke All
            </button>
          </div>

          {sessionsLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
              <div>Loading sessions...</div>
            </div>
          ) : sessions.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.sessionTable}>
                <thead>
                  <tr>
                    <th style={styles.th}>Device / Browser</th>
                    <th style={styles.th}>IP Address</th>
                    <th style={styles.th}>Last Active</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: '600', color: '#f1f5f9' }}>{session.device || 'Unknown Device'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{session.browser || ''}</div>
                      </td>
                      <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                        {session.ip_address || '—'}
                      </td>
                      <td style={styles.td}>{session.last_active || '—'}</td>
                      <td style={styles.td}>
                        {session.is_current ? (
                          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>Current</span>
                        ) : (
                          <button
                            style={{
                              ...styles.button,
                              ...styles.buttonDanger,
                              padding: '0.375rem 0.625rem',
                              fontSize: '0.75rem',
                            }}
                            onClick={() => handleRevokeSession(session.id)}
                          >
                            <Trash2 size={12} />
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ ...styles.alert, ...styles.alertInfo }}>
              <Info size={16} />
              No active session data available. Session management requires a connected backend.
            </div>
          )}
        </div>
      )}

      {/* ── About Section ── */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={{ ...styles.cardIconWrap, background: 'rgba(99, 102, 241, 0.1)' }}>
            <Info size={20} style={{ color: '#6366f1' }} />
          </div>
          <div>
            <div style={styles.cardTitle}>About</div>
            <div style={styles.cardDescription}>Platform information and shortcuts</div>
          </div>
        </div>

        <div style={styles.row}>
          <span style={{ color: '#94a3b8' }}>Platform Version</span>
          <span style={{ fontWeight: '600', fontFamily: 'monospace', color: '#06b6d4' }}>v1.0.0</span>
        </div>
        <div style={styles.row}>
          <span style={{ color: '#94a3b8' }}>Frontend Framework</span>
          <span style={{ fontWeight: '600', color: '#f1f5f9' }}>React 18</span>
        </div>
        <div style={styles.row}>
          <span style={{ color: '#94a3b8' }}>Theme Engine</span>
          <span style={{ fontWeight: '600', color: '#f1f5f9' }}>Custom (inline styles)</span>
        </div>

        {/* Keyboard Shortcuts */}
        <div style={{ borderTop: '1px solid #334155', marginTop: '1rem', paddingTop: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Keyboard size={16} style={{ color: '#94a3b8' }} />
            <span style={{ fontSize: '0.9375rem', fontWeight: '600' }}>Keyboard Shortcuts</span>
          </div>

          {[
            { keys: ['Ctrl', '/'], desc: 'Toggle sidebar' },
            { keys: ['Ctrl', 'K'], desc: 'Quick search' },
            { keys: ['Ctrl', 'Enter'], desc: 'Run code in sandbox' },
            { keys: ['Ctrl', 'S'], desc: 'Save progress' },
            { keys: ['Esc'], desc: 'Close modal / overlay' },
          ].map((shortcut, idx) => (
            <div key={idx} style={styles.shortcutRow}>
              <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>{shortcut.desc}</span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {shortcut.keys.map((k, i) => (
                  <React.Fragment key={i}>
                    <span style={styles.kbd}>{k}</span>
                    {i < shortcut.keys.length - 1 && (
                      <span style={{ color: '#475569', fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>+</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #06b6d4;
          cursor: pointer;
          border: 2px solid #0f172a;
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #06b6d4;
          cursor: pointer;
          border: 2px solid #0f172a;
        }
        input[type="checkbox"] {
          accent-color: #06b6d4;
        }
      `}</style>
    </div>
  );
}
