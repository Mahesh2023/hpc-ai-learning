import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle2, Flame, Trophy, ArrowRight, TrendingUp, Zap, Clock } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuth } from '../utils/auth';
import { getDashboardAPI } from '../utils/api';
import ProgressBar from '../components/ProgressBar';

const statConfigs = [
  { key: 'total_modules', label: 'Total Modules', icon: BookOpen, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  { key: 'completed_lessons', label: 'Lessons Done', icon: CheckCircle2, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { key: 'current_streak', label: 'Day Streak', icon: Flame, color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  { key: 'total_score', label: 'Total Score', icon: Trophy, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
];

const levelConfig = {
  beginner: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
  intermediate: { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.3)' },
  advanced: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)' },
  professional: { color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)' },
};

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.8125rem' }}>
        <span style={{ color: '#06b6d4', fontWeight: '600' }}>{payload[0].payload.skill}: {payload[0].value}%</span>
      </div>
    );
  }
  return null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardAPI().then(setDashboard).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div className="loading-spinner" /></div>;
  }

  const stats = dashboard?.stats || {};
  const skills = dashboard?.skills || {};
  const activity = dashboard?.recent_activity || [];
  const overallProgress = dashboard?.overall_progress || 0;
  const lc = levelConfig[stats.level] || levelConfig.intermediate;

  const radarData = [
    { skill: 'Linux', value: skills.linux || 0, fullMark: 100 },
    { skill: 'HPC', value: skills.hpc || 0, fullMark: 100 },
    { skill: 'Containers', value: skills.containers || 0, fullMark: 100 },
    { skill: 'AI/ML', value: skills.ai_ml || 0, fullMark: 100 },
    { skill: 'Platform Eng', value: skills.platform_eng || 0, fullMark: 100 },
    { skill: 'Cloud', value: skills.cloud || 0, fullMark: 100 },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.4s ease-out' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Welcome back</div>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#f1f5f9', letterSpacing: '-0.025em' }}>
          Hello, <span className="text-gradient">{user?.username || 'Engineer'}</span>
        </h1>
        <p style={{ fontSize: '1rem', color: '#94a3b8', marginTop: '0.5rem' }}>Continue your journey in HPC & AI Platform Engineering</p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.875rem', borderRadius: '9999px', fontSize: '0.8125rem', fontWeight: '600', marginTop: '0.75rem', color: lc.color, background: lc.bg, border: '1px solid ' + lc.border }}>
          <Zap size={14} />{(stats.level || 'intermediate').charAt(0).toUpperCase() + (stats.level || 'intermediate').slice(1)} Level
        </div>
      </div>

      {/* Overall Progress */}
      <div style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(139,92,246,0.1))', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '16px', padding: '1.5rem 2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#94a3b8', marginBottom: '0.5rem' }}>Overall Learning Progress</div>
          <ProgressBar value={overallProgress} size="lg" color="cyan" showPercent={false} />
        </div>
        <div style={{ textAlign: 'center', minWidth: '80px' }}>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#06b6d4' }}>{overallProgress}%</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Complete</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {statConfigs.map((config) => {
          const Icon = config.icon;
          return (
            <div key={config.key} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'all 250ms ease', cursor: 'default' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = config.color + '40'; e.currentTarget.style.boxShadow = '0 0 20px ' + config.color + '15'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: config.bg }}>
                <Icon size={24} color={config.color} />
              </div>
              <div>
                <div style={{ fontSize: '1.75rem', fontWeight: '800', lineHeight: 1, letterSpacing: '-0.025em', color: config.color }}>
                  {stats[config.key] !== undefined ? stats[config.key].toLocaleString() : '\u2014'}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: '500', marginTop: '0.25rem' }}>{config.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Skills Radar */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#f1f5f9', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} color="#06b6d4" />Skill Profile
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="skill" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Radar name="Skills" dataKey="value" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#f1f5f9', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={20} color="#8b5cf6" />Continue Learning
          </h3>
          {activity.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
              <BookOpen size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} /><p>No recent activity. Start a module!</p>
            </div>
          ) : (
            activity.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '12px', background: '#0f172a', marginBottom: '0.75rem', transition: 'all 200ms ease', cursor: 'pointer', border: '1px solid transparent' }}
                onClick={() => navigate('/modules/' + item.module_id)}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.background = '#1e293b'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = '#0f172a'; }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, background: item.progress > 0 ? '#06b6d4' : '#334155', boxShadow: item.progress > 0 ? '0 0 8px rgba(6,182,212,0.4)' : 'none' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#f1f5f9', marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.module_title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.lesson_title}</div>
                  <div style={{ marginTop: '0.5rem' }}><ProgressBar value={item.progress} size="sm" showPercent={false} label="" /></div>
                </div>
                <ArrowRight size={16} color="#64748b" />
              </div>
            ))
          )}
          <button onClick={() => navigate('/modules')} style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: '10px', color: '#06b6d4', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', transition: 'all 150ms ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(6,182,212,0.1)'; e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(6,182,212,0.05)'; e.currentTarget.style.borderColor = 'rgba(6,182,212,0.15)'; }}>
            View All Modules<ArrowRight size={16} />
          </button>
        </div>
      </div>

      <style>{`@media (max-width: 900px) { .content-grid-override { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
