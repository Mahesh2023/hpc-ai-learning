import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Layers, CheckCircle2, Play, Lock, ChevronDown, ChevronUp, BookOpen, Award } from 'lucide-react';
import { getModuleAPI } from '../utils/api';
import ProgressBar from '../components/ProgressBar';

const levelColors = {
  beginner: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
  intermediate: { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.3)' },
  advanced: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)' },
  professional: { color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)' },
};

export default function ModuleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mod, setMod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedLesson, setExpandedLesson] = useState(null);

  useEffect(() => {
    getModuleAPI(id).then(setMod).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div className="loading-spinner" /></div>;

  if (!mod) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#94a3b8' }}>
        <BookOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#f1f5f9', marginBottom: '0.5rem' }}>Module Not Found</h2>
        <p>The module you are looking for does not exist.</p>
        <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/modules')}>Browse Modules</button>
      </div>
    );
  }

  const lc = levelColors[mod.level] || levelColors.beginner;
  const completion = mod.completion_percentage || 0;
  const nextLesson = mod.lessons?.find((l) => !l.completed);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', animation: 'fadeIn 0.4s ease-out' }}>
      <button style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.875rem', fontWeight: '500', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 0', marginBottom: '1.5rem', transition: 'color 150ms ease' }}
        onClick={() => navigate('/modules')}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#f1f5f9'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}>
        <ArrowLeft size={18} />Back to Modules
      </button>

      {/* Header */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span className={'badge badge-' + mod.level}>{mod.level}</span>
          <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Module {mod.order_index} of 6</div>
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#f1f5f9', letterSpacing: '-0.025em', marginBottom: '0.75rem' }}>{mod.title}</h1>
        <p style={{ fontSize: '0.9375rem', color: '#94a3b8', lineHeight: 1.7, marginBottom: '1.25rem' }}>{mod.description}</p>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '1.25rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: '#64748b' }}><Clock size={16} color="#06b6d4" />{mod.estimated_hours} hours</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: '#64748b' }}><Layers size={16} color="#8b5cf6" />{mod.lessons?.length || 0} lessons</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: '#64748b' }}><Award size={16} color="#f59e0b" />{completion}% complete</span>
        </div>

        <ProgressBar value={completion} size="md" color="cyan" label="Module Progress" />

        {mod.prerequisites && mod.prerequisites.length > 0 && (
          <div style={{ marginTop: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prerequisites</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {mod.prerequisites.map((p) => (
                <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.75rem', fontSize: '0.75rem', fontWeight: '500', borderRadius: '8px', background: 'rgba(139,92,246,0.08)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.15)' }}>
                  <Lock size={12} />{p}
                </span>
              ))}
            </div>
          </div>
        )}

        {mod.skills && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
            {mod.skills.map((skill) => (<span key={skill} className="skill-tag">{skill}</span>))}
          </div>
        )}
      </div>

      {/* Lessons */}
      <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#f1f5f9', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <BookOpen size={20} color="#06b6d4" />Lessons
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {mod.lessons?.map((lesson, idx) => {
          const isExpanded = expandedLesson === lesson.id;
          const isCompleted = lesson.completed;
          return (
            <div key={lesson.id} style={{ background: '#1e293b', border: '1px solid ' + (isExpanded ? lc.color + '40' : '#334155'), borderRadius: '14px', overflow: 'hidden', transition: 'all 200ms ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.5rem', cursor: 'pointer', transition: 'background 150ms ease', background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                onClick={() => setExpandedLesson(isExpanded ? null : lesson.id)}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8125rem', fontWeight: '700', flexShrink: 0, background: isCompleted ? 'rgba(16,185,129,0.15)' : lc.bg, color: isCompleted ? '#10b981' : lc.color }}>
                  {isCompleted ? <CheckCircle2 size={18} /> : idx + 1}
                </div>
                <span style={{ fontSize: '0.9375rem', fontWeight: '600', color: '#f1f5f9', flex: 1 }}>{lesson.title}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: '#64748b' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12} />{lesson.estimated_minutes}m</span>
                </div>
                {isExpanded ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
              </div>
              {isExpanded && (
                <div style={{ padding: '0 1.5rem 1.25rem', borderTop: '1px solid #334155' }}>
                  {lesson.objectives && (
                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Learning Objectives</div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0' }}>
                        {lesson.objectives.map((obj, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.375rem 0', fontSize: '0.8125rem', color: '#94a3b8', lineHeight: 1.6 }}>
                            <Target size={14} color="#06b6d4" style={{ flexShrink: 0, marginTop: '2px' }} />{obj}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <button className="btn btn-primary" style={{ marginTop: '0.75rem' }}
                    onClick={(e) => { e.stopPropagation(); navigate('/modules/' + mod.id + '/lessons/' + lesson.id); }}>
                    <Play size={16} />{isCompleted ? 'Review Lesson' : 'Start Lesson'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {nextLesson && (
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', padding: '0.875rem 2rem', fontSize: '1rem', fontWeight: '700', color: '#0f172a', background: 'linear-gradient(135deg, #06b6d4, #14b8a6)', border: 'none', borderRadius: '14px', cursor: 'pointer', transition: 'all 200ms ease', boxShadow: '0 4px 16px rgba(6,182,212,0.3)' }}
            onClick={() => navigate('/modules/' + mod.id + '/lessons/' + nextLesson.id)}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(6,182,212,0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(6,182,212,0.3)'; }}>
            <Play size={20} />Start Next Lesson: {nextLesson.title}
          </button>
        </div>
      )}
    </div>
  );
}
