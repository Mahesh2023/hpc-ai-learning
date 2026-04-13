import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/auth';
import {
  LayoutDashboard,
  BookOpen,
  Route,
  LogOut,
  Menu,
  X,
  Cpu,
  ChevronRight,
  FlaskConical,
  LogIn,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/modules', label: 'Modules', icon: BookOpen },
  { path: '/learning-path', label: 'Learning Path', icon: Route },
  { path: '/sandbox', label: 'Sandbox Lab', icon: FlaskConical },
];

const styles = {
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: '260px',
    background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
    borderRight: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 50,
    transition: 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1.5rem 1.25rem',
    borderBottom: '1px solid #334155',
  },
  logoIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)',
  },
  logoText: {
    fontSize: '1.25rem',
    fontWeight: '800',
    letterSpacing: '-0.025em',
  },
  nav: {
    flex: 1,
    padding: '1rem 0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    color: '#94a3b8',
    fontSize: '0.9375rem',
    fontWeight: '500',
    textDecoration: 'none',
    transition: 'all 150ms ease',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
  },
  navItemActive: {
    background: 'rgba(6, 182, 212, 0.1)',
    color: '#06b6d4',
    fontWeight: '600',
  },
  navItemHover: {
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#f1f5f9',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: '3px',
    height: '60%',
    borderRadius: '0 4px 4px 0',
    background: '#06b6d4',
  },
  sectionLabel: {
    padding: '1.5rem 1rem 0.5rem',
    fontSize: '0.6875rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#64748b',
  },
  userSection: {
    padding: '1rem 0.75rem',
    borderTop: '1px solid #334155',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    borderRadius: '10px',
    background: 'rgba(255, 255, 255, 0.03)',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #06b6d4, #14b8a6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.875rem',
    fontWeight: '700',
    color: '#0f172a',
    flexShrink: 0,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#f1f5f9',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userEmail: {
    fontSize: '0.75rem',
    color: '#64748b',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    flexShrink: 0,
  },
  mobileToggle: {
    position: 'fixed',
    top: '1rem',
    left: '1rem',
    zIndex: 60,
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    border: '1px solid #334155',
    background: '#1e293b',
    color: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },
  demoLabel: {
    margin: '0 0.75rem 0.75rem',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    background: 'rgba(249, 115, 22, 0.1)',
    border: '1px solid rgba(249, 115, 22, 0.2)',
    fontSize: '0.6875rem',
    color: '#f97316',
    textAlign: 'center',
    fontWeight: '600',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    zIndex: 40,
    backdropFilter: 'blur(4px)',
  },
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(/[_\s]/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const isGuestMode = user?.is_guest === true;

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="mobile-sidebar-toggle"
        style={{ ...styles.mobileToggle, display: 'none' }}
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {mobileOpen && (
        <div style={styles.overlay} onClick={() => setMobileOpen(false)} />
      )}

      <div style={styles.sidebar} className="sidebar-main">
        {/* Logo */}
        <div style={styles.logo}>
          <div style={styles.logoIcon}>
            <Cpu size={22} color="#0f172a" strokeWidth={2.5} />
          </div>
          <div>
            <div style={styles.logoText}>
              <span style={{ color: '#06b6d4' }}>HPC</span>{' '}
              <span style={{ color: '#8b5cf6' }}>AI</span>
            </div>
            <div style={{ fontSize: '0.625rem', color: '#64748b', fontWeight: '500', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Learning Platform
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={styles.nav}>
          <div style={styles.sectionLabel}>Main Menu</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);
            const isHovered = hoveredItem === item.path;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={{
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                  ...(isHovered && !isActive ? styles.navItemHover : {}),
                }}
                onClick={() => setMobileOpen(false)}
                onMouseEnter={() => setHoveredItem(item.path)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                {isActive && <div style={styles.activeIndicator} />}
                <Icon size={20} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {isActive && <ChevronRight size={16} style={{ opacity: 0.5 }} />}
              </NavLink>
            );
          })}
        </nav>

        {/* Guest mode indicator */}
        {isGuestMode && (
          <div style={styles.demoLabel}>
            Guest Mode — <span
              style={{ textDecoration: 'underline', cursor: 'pointer' }}
              onClick={() => { logout(); navigate('/login'); }}
            >Sign in</span> to save progress
          </div>
        )}

        {/* User section */}
        <div style={styles.userSection}>
          <div style={styles.userCard}>
            <div style={{ ...styles.avatar, background: isGuestMode ? 'linear-gradient(135deg, #f97316, #f59e0b)' : 'linear-gradient(135deg, #06b6d4, #14b8a6)' }}>
              {getInitials(user?.username)}
            </div>
            <div style={styles.userInfo}>
              <div style={styles.userName}>{user?.username || 'User'}</div>
              <div style={styles.userEmail}>{isGuestMode ? 'Guest Mode' : (user?.email || '')}</div>
            </div>
            {isGuestMode ? (
              <button
                style={styles.logoutBtn}
                onClick={() => { logout(); navigate('/login'); }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(6, 182, 212, 0.1)';
                  e.currentTarget.style.color = '#06b6d4';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#64748b';
                }}
                title="Sign In"
              >
                <LogIn size={16} />
              </button>
            ) : (
              <button
                style={styles.logoutBtn}
                onClick={logout}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                  e.currentTarget.style.color = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#64748b';
                }}
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .sidebar-main { transform: translateX(-100%); }
          .sidebar-main.open { transform: translateX(0); }
          .mobile-sidebar-toggle { display: flex !important; }
        }
      `}</style>
    </>
  );
}
