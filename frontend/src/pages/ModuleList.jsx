import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, Layers, ChevronRight, Search, GraduationCap } from 'lucide-react';
import { getModulesAPI } from '../utils/api';
import ProgressBar from '../components/ProgressBar';

const levels = ['all', 'beginner', 'intermediate', 'advanced', 'professional'];
const levelColors = {
  beginner: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: '#10b981' },
  intermediate: { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', border: '#06b6d4' },
  advanced: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', border: '#8b5cf6' },
  professional: { color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: '#f97316' },
};

export default function ModuleList() {
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getModulesAPI().then(setModules).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = modules.filter((m) => {
    if (activeLevel !== 'all' && m.level !== activeLevel) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return m.title.toLowerCase().includes(q) || m.description.toLowerCase().includes(q) || m.skills?.some((s) => s.toLowerCase().includes(q));
    }
    return true;
  });

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div className="loading-spinner" /></div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.4s ease-out' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#f1f5f9', letterSpacing: '-0.025em', marginBottom: '0.5rem' }}>
          <GraduationCap size={32} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.75rem', color: '#06b6d4' }} />
          Learning Modules
        </h1>
        <p style={{ fontSize: '1rem', color: '#94a3b8' }}>Master HPC and AI Platform Engineering from fundamentals to production</p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1.5rem', maxWidth: '400px' }}>
        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
        <input type="text" placeholder="Search modules or skills..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="form-input" style={{ paddingLeft: '2.75rem' }} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {levels.map((level) => {
          const isActive = activeLevel === level;
          const lc = levelColors[level];
          return (
            <button key={level} onClick={() => setActiveLevel(level)}
              style={{
                padding: '0.5rem 1rem', fontSize: '0.8125rem', fontWeight: '600', border: '1px solid ' + (isActive && lc ? lc.color + '40' : '#334155'),
                borderRadius: '9999px', background: isActive && lc ? lc.bg : (isActive ? 'rgba(6,182,212,0.1)' : 'transparent'),
                color: isActive && lc ? lc.color : (isActive ? '#06b6d4' : '#94a3b8'), cursor: 'pointer', transition: 'all 150ms ease', textTransform: 'capitalize',
              }}>
              {level === 'all' ? 'All (' + modules.length + ')' : level}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.25rem' }}>
        {filtered.map((mod, idx) => {
          const lc = levelColors[mod.level] || levelColors.beginner;
          const lessonCount = mod.lessons?.length || 0;
          const completion = mod.completion_percentage || 0;
          const statusCfg = { completed: { label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.1)' }, in_progress: { label: 'In Progress', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' }, available: { label: 'Available', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' }, locked: { label: 'Locked', color: '#64748b', bg: 'rgba(100,116,139,0.1)' } };
          const sc = statusCfg[mod.status] || statusCfg.available;
          return (
            <div key={mod.id}
              style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '1.5rem', cursor: mod.status === 'locked' ? 'default' : 'pointer', transition: 'all 250ms ease', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', opacity: mod.status === 'locked' ? 0.6 : 1, animation: 'fadeInUp 0.5s ease-out', animationDelay: (idx * 0.05) + 's', animationFillMode: 'both' }}
              onClick={() => mod.status !== 'locked' && navigate('/modules/' + mod.id)}
              onMouseEnter={(e) => { if (mod.status !== 'locked') { e.currentTarget.style.borderColor = lc.color + '40'; e.currentTarget.style.boxShadow = '0 0 24px ' + lc.color + '10'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', borderRadius: '16px 0 0 16px', background: lc.color }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.0625rem', fontWeight: '700', color: '#f1f5f9', lineHeight: 1.4, paddingRight: '0.5rem' }}>{mod.title}</span>
                <span className={'badge badge-' + mod.level} style={{ flexShrink: 0 }}>{mod.level}</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.6, marginBottom: '1rem', flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{mod.description}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Clock size={14} />{mod.estimated_hours}h</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Layers size={14} />{lessonCount} lessons</span>
                <span style={{ fontSize: '0.6875rem', fontWeight: '600', padding: '0.2rem 0.5rem', borderRadius: '6px', color: sc.color, background: sc.bg }}>{sc.label}</span>
              </div>
              {mod.skills && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '1rem' }}>
                  {mod.skills.slice(0, 4).map((skill) => (
                    <span key={skill} style={{ padding: '0.2rem 0.5rem', fontSize: '0.6875rem', fontWeight: '500', background: 'rgba(6,182,212,0.08)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.15)', borderRadius: '6px' }}>{skill}</span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid #334155' }}>
                <div style={{ flex: 1, marginRight: '1rem' }}><ProgressBar value={completion} size="sm" showPercent={false} /></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#64748b', fontSize: '0.8125rem', fontWeight: '600' }}>{completion}%<ChevronRight size={16} /></div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <Search size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <p style={{ fontSize: '1rem', fontWeight: '600' }}>No modules found</p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Try adjusting your filters or search query</p>
        </div>
      )}
    </div>
  );
}
