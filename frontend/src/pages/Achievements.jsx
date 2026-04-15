import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Lock, Star, Zap, Award, Target, Crown } from 'lucide-react';
import { useAuth } from '../utils/auth';

// ── Achievement Definitions ──────────────────────────────────────────
const ACHIEVEMENTS = [
  // Learning Progress
  { id: 'first_lesson',    name: 'First Steps',       description: 'Complete your very first lesson',                  icon: '📖', category: 'Learning Progress', points: 10,  requirement: 'Complete 1 lesson' },
  { id: 'ten_lessons',     name: 'Bookworm',          description: 'Complete 10 lessons across any modules',           icon: '📚', category: 'Learning Progress', points: 25,  requirement: 'Complete 10 lessons' },
  { id: 'module_complete', name: 'Module Graduate',    description: 'Finish all lessons in a single module',            icon: '🎓', category: 'Learning Progress', points: 50,  requirement: 'Complete 1 full module' },
  { id: 'three_modules',   name: 'Triple Threat',      description: 'Complete three full modules',                      icon: '🏅', category: 'Learning Progress', points: 75,  requirement: 'Complete 3 modules' },
  { id: 'all_modules',     name: 'Curriculum Master',  description: 'Complete every module in the platform',            icon: '👑', category: 'Learning Progress', points: 200, requirement: 'Complete all modules' },
  { id: 'halfway',         name: 'Halfway There',      description: 'Reach 50% overall learning progress',             icon: '⚡', category: 'Learning Progress', points: 40,  requirement: 'Reach 50% progress' },

  // Lab Mastery
  { id: 'first_lab',        name: 'Lab Rookie',         description: 'Complete your first interactive lab',             icon: '🔬', category: 'Lab Mastery',       points: 10,  requirement: 'Complete 1 lab' },
  { id: 'five_labs',        name: 'Lab Enthusiast',     description: 'Complete 5 interactive labs',                     icon: '🧪', category: 'Lab Mastery',       points: 30,  requirement: 'Complete 5 labs' },
  { id: 'ten_labs',         name: 'Lab Veteran',        description: 'Complete 10 interactive labs',                    icon: '🧠', category: 'Lab Mastery',       points: 50,  requirement: 'Complete 10 labs' },
  { id: 'all_tasks',        name: 'Task Master',        description: 'Finish all tasks in a single lab',               icon: '💯', category: 'Lab Mastery',       points: 40,  requirement: 'All tasks in 1 lab' },
  { id: 'twenty_labs',      name: 'Lab Master',         description: 'Complete 20 interactive labs',                    icon: '💻', category: 'Lab Mastery',       points: 75,  requirement: 'Complete 20 labs' },
  { id: 'all_labs',         name: 'Lab Legend',         description: 'Complete all 25 interactive labs',                icon: '🏆', category: 'Lab Mastery',       points: 200, requirement: 'Complete all 25 labs' },

  // Engagement
  { id: 'streak_3',        name: 'Getting Warm',       description: 'Maintain a 3-day learning streak',                icon: '🔥', category: 'Engagement',        points: 15,  requirement: '3-day streak' },
  { id: 'streak_7',        name: 'On Fire',            description: 'Maintain a 7-day learning streak',                icon: '🔥', category: 'Engagement',        points: 35,  requirement: '7-day streak' },
  { id: 'streak_30',       name: 'Unstoppable',        description: 'Maintain a 30-day learning streak',               icon: '☄️', category: 'Engagement',        points: 100, requirement: '30-day streak' },
  { id: 'explorer',        name: 'Explorer',           description: 'Visit every page in the platform',                icon: '🧭', category: 'Engagement',        points: 20,  requirement: 'Visit all pages' },
  { id: 'night_owl',       name: 'Night Owl',          description: 'Study after midnight',                            icon: '🦉', category: 'Engagement',        points: 10,  requirement: 'Study after midnight' },
  { id: 'early_bird',      name: 'Early Bird',         description: 'Start a lesson before 7 AM',                      icon: '🐦', category: 'Engagement',        points: 10,  requirement: 'Study before 7 AM' },

  // HPC Skills
  { id: 'linux_master',    name: 'Linux Master',       description: 'Complete all Linux fundamentals content',          icon: '🐧', category: 'HPC Skills',        points: 60,  requirement: 'Finish Linux module' },
  { id: 'slurm_expert',    name: 'SLURM Expert',       description: 'Master SLURM job scheduling and management',      icon: '📊', category: 'HPC Skills',        points: 60,  requirement: 'Finish SLURM module' },
  { id: 'gpu_wizard',      name: 'GPU Wizard',         description: 'Complete GPU computing and CUDA training',        icon: '⚡', category: 'HPC Skills',        points: 75,  requirement: 'Finish GPU module' },
  { id: 'k8s_captain',     name: 'K8s Captain',        description: 'Master Kubernetes orchestration',                 icon: '☸️', category: 'HPC Skills',        points: 75,  requirement: 'Finish K8s module' },
  { id: 'container_hero',  name: 'Container Hero',     description: 'Complete all containerization content',           icon: '🐳', category: 'HPC Skills',        points: 60,  requirement: 'Finish containers module' },
  { id: 'network_ninja',   name: 'Network Ninja',      description: 'Master HPC networking and interconnects',         icon: '🌐', category: 'HPC Skills',        points: 60,  requirement: 'Finish networking module' },
];

const CATEGORIES = ['All', 'Learning Progress', 'Lab Mastery', 'Engagement', 'HPC Skills'];

const CATEGORY_ICONS = {
  'Learning Progress': Star,
  'Lab Mastery': Target,
  'Engagement':       Zap,
  'HPC Skills':       Crown,
};

const STORAGE_KEY = 'hpc_achievements';

// ── Helpers ──────────────────────────────────────────────────────────

function loadEarnedIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEarnedIds(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

/** Derive which achievements are earned from whatever user / stats we have. */
function deriveEarned(user) {
  const earned = new Set(loadEarnedIds());

  // Track page visits
  const visitedPages = JSON.parse(localStorage.getItem('hpc_visited_pages') || '[]');
  const currentPath = window.location.pathname;
  if (!visitedPages.includes(currentPath)) {
    visitedPages.push(currentPath);
    localStorage.setItem('hpc_visited_pages', JSON.stringify(visitedPages));
  }

  // Auto-award the explorer badge if user has visited enough pages
  const requiredPages = ['/', '/modules', '/learning-path', '/sandbox', '/achievements'];
  if (requiredPages.every((p) => visitedPages.includes(p))) {
    earned.add('explorer');
  }

  // Time-based badges
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 5) earned.add('night_owl');
  if (hour >= 5 && hour < 7) earned.add('early_bird');

  // Stats-based badges (from dashboard / localStorage progress)
  const completedLessons = parseInt(localStorage.getItem('hpc_completed_lessons') || '0', 10);
  const completedModules = parseInt(localStorage.getItem('hpc_completed_modules') || '0', 10);
  const totalModules     = parseInt(localStorage.getItem('hpc_total_modules') || '0', 10);
  const completedLabs     = parseInt(localStorage.getItem('hpc_completed_labs') || '0', 10);
  const hasAllTasks       = localStorage.getItem('hpc_all_tasks_in_lab') === 'true';
  const currentStreak    = parseInt(localStorage.getItem('hpc_current_streak') || '0', 10);
  const overallProgress  = parseInt(localStorage.getItem('hpc_overall_progress') || '0', 10);

  // Learning Progress
  if (completedLessons >= 1)  earned.add('first_lesson');
  if (completedLessons >= 10) earned.add('ten_lessons');
  if (completedModules >= 1)  earned.add('module_complete');
  if (completedModules >= 3)  earned.add('three_modules');
  if (totalModules > 0 && completedModules >= totalModules) earned.add('all_modules');
  if (overallProgress >= 50)  earned.add('halfway');

  // Lab Mastery
  if (completedLabs >= 1)  earned.add('first_lab');
  if (completedLabs >= 5)  earned.add('five_labs');
  if (completedLabs >= 10) earned.add('ten_labs');
  if (hasAllTasks)         earned.add('all_tasks');
  if (completedLabs >= 20) earned.add('twenty_labs');
  if (completedLabs >= 25) earned.add('all_labs');

  // Engagement
  if (currentStreak >= 3)  earned.add('streak_3');
  if (currentStreak >= 7)  earned.add('streak_7');
  if (currentStreak >= 30) earned.add('streak_30');

  // HPC Skills — keyed off localStorage flags other pages can set
  if (localStorage.getItem('hpc_badge_linux_master')   === 'true') earned.add('linux_master');
  if (localStorage.getItem('hpc_badge_slurm_expert')   === 'true') earned.add('slurm_expert');
  if (localStorage.getItem('hpc_badge_gpu_wizard')     === 'true') earned.add('gpu_wizard');
  if (localStorage.getItem('hpc_badge_k8s_captain')    === 'true') earned.add('k8s_captain');
  if (localStorage.getItem('hpc_badge_container_hero') === 'true') earned.add('container_hero');
  if (localStorage.getItem('hpc_badge_network_ninja')  === 'true') earned.add('network_ninja');

  // Persist
  const ids = Array.from(earned);
  saveEarnedIds(ids);
  return ids;
}

// ── Styles ───────────────────────────────────────────────────────────

const styles = {
  page: {
    maxWidth: '1200px',
    margin: '0 auto',
    animation: 'fadeIn 0.4s ease-out',
  },
  header: {
    marginBottom: '2rem',
  },
  headerSub: {
    fontSize: '0.875rem',
    color: '#64748b',
    fontWeight: '500',
    marginBottom: '0.25rem',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  headerTitle: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#f1f5f9',
    letterSpacing: '-0.025em',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  // ── Summary banner ──
  summaryBanner: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  summaryCard: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '16px',
    padding: '1.25rem 1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    transition: 'all 250ms ease',
  },
  summaryIconBox: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  summaryValue: {
    fontSize: '1.75rem',
    fontWeight: '800',
    lineHeight: 1,
    letterSpacing: '-0.025em',
  },
  summaryLabel: {
    fontSize: '0.8125rem',
    color: '#64748b',
    fontWeight: '500',
    marginTop: '0.25rem',
  },
  // ── Category progress ──
  categorySection: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '2rem',
  },
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem',
    marginTop: '1rem',
  },
  categoryCard: {
    background: '#0f172a',
    borderRadius: '12px',
    padding: '1rem 1.25rem',
    border: '1px solid #334155',
    transition: 'all 200ms ease',
  },
  categoryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.75rem',
  },
  categoryName: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#f1f5f9',
  },
  progressBarOuter: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    background: '#334155',
    overflow: 'hidden',
  },
  progressBarInner: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 600ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  categoryPct: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginTop: '0.375rem',
    textAlign: 'right',
  },
  // ── Filter tabs ──
  filterRow: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
  },
  filterBtn: {
    padding: '0.5rem 1rem',
    borderRadius: '9999px',
    border: '1px solid #334155',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: '0.8125rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 150ms ease',
  },
  filterBtnActive: {
    background: 'rgba(6, 182, 212, 0.15)',
    borderColor: 'rgba(6, 182, 212, 0.4)',
    color: '#06b6d4',
  },
  // ── Badge grid ──
  badgeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '1rem',
  },
  badgeCard: {
    position: 'relative',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '16px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    transition: 'all 300ms ease',
    cursor: 'default',
    overflow: 'hidden',
  },
  badgeCardEarned: {
    borderColor: 'rgba(245, 158, 11, 0.35)',
    boxShadow: '0 0 24px rgba(245, 158, 11, 0.12), inset 0 0 24px rgba(245, 158, 11, 0.04)',
  },
  badgeCardLocked: {
    opacity: 0.55,
    filter: 'grayscale(0.7)',
  },
  badgeIconWrap: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    marginBottom: '0.75rem',
    position: 'relative',
    transition: 'all 300ms ease',
  },
  badgeIconEarned: {
    background: 'rgba(245, 158, 11, 0.12)',
    border: '2px solid rgba(245, 158, 11, 0.3)',
    boxShadow: '0 0 20px rgba(245, 158, 11, 0.15)',
  },
  badgeIconLocked: {
    background: 'rgba(51, 65, 85, 0.5)',
    border: '2px solid #334155',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: '-2px',
    right: '-2px',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: '#334155',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #1e293b',
  },
  earnedCheck: {
    position: 'absolute',
    bottom: '-2px',
    right: '-2px',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: '#f59e0b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #1e293b',
    fontSize: '0.75rem',
    color: '#0f172a',
    fontWeight: '800',
  },
  badgeName: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: '0.25rem',
  },
  badgeDesc: {
    fontSize: '0.8125rem',
    color: '#94a3b8',
    lineHeight: 1.4,
    marginBottom: '0.75rem',
  },
  badgeReq: {
    fontSize: '0.6875rem',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    background: '#0f172a',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
  },
  badgePoints: {
    position: 'absolute',
    top: '0.75rem',
    right: '0.75rem',
    fontSize: '0.6875rem',
    fontWeight: '700',
    color: '#f59e0b',
    background: 'rgba(245, 158, 11, 0.1)',
    padding: '0.2rem 0.5rem',
    borderRadius: '9999px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.2rem',
  },
};

// ── Component ────────────────────────────────────────────────────────

export default function Achievements() {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('All');
  const [hoveredBadge, setHoveredBadge] = useState(null);

  // Derive earned achievements on mount and whenever user changes
  const [earnedIds, setEarnedIds] = useState([]);
  useEffect(() => {
    setEarnedIds(deriveEarned(user));
  }, [user]);

  const earnedSet = useMemo(() => new Set(earnedIds), [earnedIds]);

  // Augment achievements with earned status
  const achievements = useMemo(
    () => ACHIEVEMENTS.map((a) => ({ ...a, earned: earnedSet.has(a.id) })),
    [earnedSet],
  );

  // Stats
  const totalPoints    = achievements.reduce((s, a) => s + (a.earned ? a.points : 0), 0);
  const maxPoints      = achievements.reduce((s, a) => s + a.points, 0);
  const earnedCount    = achievements.filter((a) => a.earned).length;
  const totalCount     = achievements.length;
  const completionPct  = totalCount ? Math.round((earnedCount / totalCount) * 100) : 0;

  // Per-category breakdown
  const categoryBreakdown = useMemo(() => {
    const map = {};
    CATEGORIES.filter((c) => c !== 'All').forEach((cat) => {
      const inCat = achievements.filter((a) => a.category === cat);
      const earned = inCat.filter((a) => a.earned).length;
      map[cat] = { total: inCat.length, earned, pct: inCat.length ? Math.round((earned / inCat.length) * 100) : 0 };
    });
    return map;
  }, [achievements]);

  // Filtered list
  const visible = activeCategory === 'All'
    ? achievements
    : achievements.filter((a) => a.category === activeCategory);

  // Sort: earned first, then by points descending
  const sorted = [...visible].sort((a, b) => {
    if (a.earned !== b.earned) return a.earned ? -1 : 1;
    return b.points - a.points;
  });

  const catColors = {
    'Learning Progress': '#06b6d4',
    'Lab Mastery':       '#8b5cf6',
    'Engagement':        '#f97316',
    'HPC Skills':        '#10b981',
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerSub}>Your Progress</div>
        <h1 style={styles.headerTitle}>
          <Trophy size={28} color="#f59e0b" />
          <span>
            <span style={{ color: '#f59e0b' }}>Achievements</span>{' '}
            <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '1.25rem' }}>& Badges</span>
          </span>
        </h1>
      </div>

      {/* Summary Stats */}
      <div style={styles.summaryBanner}>
        {[
          { icon: Trophy, label: 'Total Points',  value: totalPoints.toLocaleString(), color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
          { icon: Award,  label: 'Badges Earned',  value: `${earnedCount} / ${totalCount}`, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
          { icon: Target, label: 'Completion',      value: `${completionPct}%`, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
          { icon: Star,   label: 'Max Possible',    value: maxPoints.toLocaleString(), color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              style={styles.summaryCard}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = s.color + '40'; e.currentTarget.style.boxShadow = '0 0 20px ' + s.color + '15'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ ...styles.summaryIconBox, background: s.bg }}>
                <Icon size={24} color={s.color} />
              </div>
              <div>
                <div style={{ ...styles.summaryValue, color: s.color }}>{s.value}</div>
                <div style={styles.summaryLabel}>{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Category Breakdown */}
      <div style={styles.categorySection}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award size={20} color="#06b6d4" />
          Category Breakdown
        </h3>
        <div style={styles.categoryGrid}>
          {CATEGORIES.filter((c) => c !== 'All').map((cat) => {
            const info = categoryBreakdown[cat];
            const CatIcon = CATEGORY_ICONS[cat] || Star;
            const color = catColors[cat] || '#06b6d4';
            return (
              <div
                key={cat}
                style={styles.categoryCard}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = color + '40'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#334155'; }}
              >
                <div style={styles.categoryHeader}>
                  <CatIcon size={16} color={color} />
                  <span style={styles.categoryName}>{cat}</span>
                </div>
                <div style={styles.progressBarOuter}>
                  <div style={{ ...styles.progressBarInner, width: `${info.pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }} />
                </div>
                <div style={styles.categoryPct}>
                  {info.earned} / {info.total} — {info.pct}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={styles.filterRow}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            style={{
              ...styles.filterBtn,
              ...(activeCategory === cat ? styles.filterBtnActive : {}),
            }}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Badge Grid */}
      <div style={styles.badgeGrid}>
        {sorted.map((badge) => {
          const isHovered = hoveredBadge === badge.id;
          const cardStyle = {
            ...styles.badgeCard,
            ...(badge.earned ? styles.badgeCardEarned : styles.badgeCardLocked),
            ...(isHovered && badge.earned
              ? { transform: 'translateY(-4px)', boxShadow: '0 0 32px rgba(245,158,11,0.2), inset 0 0 32px rgba(245,158,11,0.05)' }
              : {}),
            ...(isHovered && !badge.earned
              ? { opacity: 0.7, filter: 'grayscale(0.4)' }
              : {}),
          };

          return (
            <div
              key={badge.id}
              style={cardStyle}
              onMouseEnter={() => setHoveredBadge(badge.id)}
              onMouseLeave={() => setHoveredBadge(null)}
            >
              {/* Points chip */}
              <div style={{ ...styles.badgePoints, ...(badge.earned ? {} : { color: '#64748b', background: 'rgba(100,116,139,0.1)' }) }}>
                <Zap size={10} /> {badge.points} pts
              </div>

              {/* Icon circle */}
              <div style={{ ...styles.badgeIconWrap, ...(badge.earned ? styles.badgeIconEarned : styles.badgeIconLocked) }}>
                <span>{badge.icon}</span>
                {badge.earned
                  ? <div style={styles.earnedCheck}>✓</div>
                  : <div style={styles.lockOverlay}><Lock size={12} color="#94a3b8" /></div>
                }
              </div>

              {/* Text */}
              <div style={{ ...styles.badgeName, ...(badge.earned ? {} : { color: '#94a3b8' }) }}>{badge.name}</div>
              <div style={styles.badgeDesc}>{badge.description}</div>
              <div style={{ ...styles.badgeReq, ...(badge.earned ? { color: '#f59e0b', background: 'rgba(245,158,11,0.08)' } : {}) }}>
                {badge.earned ? '✓ Earned' : badge.requirement}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {sorted.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
          <Trophy size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <p style={{ fontSize: '1rem' }}>No badges in this category yet.</p>
        </div>
      )}
    </div>
  );
}
