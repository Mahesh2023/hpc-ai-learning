import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Lock, Play, Circle, ArrowDown, Clock, Layers, Zap, Route as RouteIcon } from 'lucide-react';
import { getLearningPathAPI } from '../utils/api';
import ProgressBar from '../components/ProgressBar';

const levelColors = {
  beginner: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', glow: 'rgba(16,185,129,0.15)' },
  intermediate: { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.3)', glow: 'rgba(6,182,212,0.15)' },
  advanced: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)', glow: 'rgba(139,92,246,0.15)' },
  professional: { color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)', glow: 'rgba(249,115,22,0.15)' },
};

const statusConfig = {
  completed: { icon: CheckCircle2, color: '#10b981', label: 'Completed' },
  in_progress: { icon: Play, color: '#06b6d4', label: 'In Progress' },
  available: { icon: Circle, color: '#94a3b8', label: 'Available' },
  locked: { icon: Lock, color: '#475569', label: 'Locked' },
};

export default function LearningPath() {
  const navigate = useNavigate();
  const [pathData, setPathData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLearningPathAPI().then(setPathData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div className="loading-spinner" /></div>;

  const modules = pathData?.modules || [];
  const overall = pathData?.overall_progress || 0;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', animation: 'fadeIn 0.4s ease-out' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#f1f5f9', letterSpacing: '-0.025em', marginBottom: '0.5rem' }}>
          <RouteIcon size={32} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.75rem', color: '#06b6d4' }} />
          Learning Path
        </h1>
        <p style={{ fontSize: '1rem', color: '#94a3b8', marginBottom: '1.5rem' }}>Your journey from beginner to AI Platform Engineering professional</p>
      </div>

      {/* Overall Progress */}
      <div style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(139,92,246,0.08))', border: '1px solid rgba(6,182,212,0.15)', borderRadius: '16px', padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '3rem', maxWidth: '500px', margin: '0 auto 3rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#94a3b8', marginBottom: '0.5rem' }}>Overall Progress</div>
          <ProgressBar value={overall} size="md" color="cyan" showPercent={false} />
        </div>
        <div style={{ textAlign: 'center', minWidth: '70px' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#06b6d4' }}>{overall}%</div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative', paddingLeft: '3rem' }}>
        <div style={{ position: 'absolute', left: '23px', top: '40px', bottom: '40px', width: '2px', background: 'linear-gradient(180deg, #10b981 0%, #06b6d4 25%, #8b5cf6 60%, #f97316 100%)', opacity: 0.3 }} />

        {modules.map((mod, idx) => {
          const lc = levelColors[mod.level] || levelColors.beginner;
          const sc = statusConfig[mod.status] || statusConfig.available;
          const StatusIcon = sc.icon;
          const isClickable = mod.status !== 'locked';
          const isActive = mod.status === 'in_progress';

          return (
            <React.Fragment key={mod.id}>
              <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                {/* Node circle */}
                <div style={{
                  position: 'absolute', left: '-3rem', top: '50%', transform: 'translateY(-50%)',
                  width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, transition: 'all 300ms ease',
                  background: mod.status === 'completed' ? 'rgba(16,185,129,0.15)' : mod.status === 'in_progress' ? 'rgba(6,182,212,0.15)' : 'rgba(30,41,59,0.9)',
                  border: '2px solid ' + sc.color,
                  boxShadow: isActive ? '0 0 20px rgba(6,182,212,0.4)' : 'none',
                  animation: isActive ? 'pulseGlow 2s infinite' : 'none',
                }}>
                  <StatusIcon size={20} color={sc.color} />
                </div>

                {/* Card */}
                <div style={{
                  background: '#1e293b', border: '1px solid ' + (isActive ? lc.border : '#334155'), borderRadius: '16px', padding: '1.5rem', marginLeft: '1rem',
                  transition: 'all 250ms ease', cursor: isClickable ? 'pointer' : 'default',
                  opacity: mod.status === 'locked' ? 0.5 : 1,
                  boxShadow: isActive ? '0 0 24px ' + lc.glow : 'none',
                }}
                  onClick={() => isClickable && navigate('/modules/' + mod.id)}
                  onMouseEnter={(e) => { if (isClickable) { e.currentTarget.style.borderColor = lc.border; e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = '0 0 24px ' + lc.glow; } }}
                  onMouseLeave={(e) => { if (isClickable) { e.currentTarget.style.borderColor = isActive ? lc.border : '#334155'; e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = isActive ? '0 0 24px ' + lc.glow : 'none'; } }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span className={'badge badge-' + mod.level} style={{ fontSize: '0.625rem' }}>{mod.level}</span>
                    <span style={{ fontSize: '0.6875rem', fontWeight: '600', color: sc.color, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {isActive && <Zap size={12} />}{sc.label}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.0625rem', fontWeight: '700', color: '#f1f5f9', marginBottom: '0.375rem' }}>{mod.title}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={13} />{mod.estimated_hours}h</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Layers size={13} />{mod.lesson_count} lessons</span>
                  </div>
                  {(mod.status === 'in_progress' || mod.status === 'completed') && (
                    <ProgressBar value={mod.completion_percentage || 0} size="sm" color={mod.status === 'completed' ? 'green' : 'cyan'} />
                  )}
                </div>
              </div>

              {idx < modules.length - 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0', color: '#334155', marginLeft: '-1.5rem' }}>
                  <ArrowDown size={20} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
