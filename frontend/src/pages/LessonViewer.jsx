import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, BookOpen, Clock, Zap, FileText } from 'lucide-react';
import { getLessonAPI, getModuleAPI, completeLessonAPI } from '../utils/api';
import BookmarkButton from '../components/BookmarkButton';
import { InteractiveComponent, parseInteractiveContent } from '../components/InteractiveComponents';

const LabWorkspace = lazy(() => import('../components/LabWorkspace'));

// Import lab scenarios — falls back to empty if file doesn't exist
import { LAB_SCENARIOS } from '../data/labScenarios';

/**
 * Enhanced MarkdownRenderer that supports inline interactive components.
 * Lesson content can include:
 *   :::interactive{component="SlurmSimulator"}
 *   :::interactive{component="GuidedLab" config='{"preset":"linux-files"}'}
 */
function MarkdownRenderer({ content }) {
  const parts = parseInteractiveContent(content || '');

  return (
    <div className="markdown-content">
      {parts.map((part, idx) => {
        if (part.type === 'interactive') {
          return <InteractiveComponent key={`interactive-${idx}`} name={part.component} config={part.config} />;
        }
        return (
          <ReactMarkdown
            key={`md-${idx}`}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div"
                    customStyle={{ background: '#0d1117', borderRadius: '10px', border: '1px solid #334155', padding: '1.25rem', fontSize: '0.875rem', lineHeight: '1.7', margin: '1rem 0' }}
                    {...props}>{String(children).replace(/\n$/, '')}</SyntaxHighlighter>
                ) : (<code className={className} {...props}>{children}</code>);
              },
              table({ children }) {
                return (
                  <div style={{ overflowX: 'auto', margin: '1rem 0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>{children}</table>
                  </div>
                );
              },
              th({ children }) {
                return <th style={{ padding: '0.625rem 1rem', textAlign: 'left', borderBottom: '2px solid #334155', color: '#06b6d4', fontWeight: '700', fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{children}</th>;
              },
              td({ children }) {
                return <td style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #1e293b', color: '#94a3b8' }}>{children}</td>;
              },
              blockquote({ children }) {
                return (
                  <div style={{ margin: '1.25rem 0', padding: '1rem 1.25rem', borderLeft: '3px solid #8b5cf6', background: 'rgba(139,92,246,0.05)', borderRadius: '0 8px 8px 0', color: '#c4b5fd', fontSize: '0.875rem', lineHeight: '1.7' }}>
                    {children}
                  </div>
                );
              },
              h2({ children }) {
                return <h2 style={{ fontSize: '1.375rem', fontWeight: '800', color: '#f1f5f9', marginTop: '2.5rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #334155' }}>{children}</h2>;
              },
              h3({ children }) {
                return <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#e2e8f0', marginTop: '2rem', marginBottom: '0.75rem' }}>{children}</h3>;
              },
              li({ children }) {
                return <li style={{ color: '#94a3b8', lineHeight: '1.8', marginBottom: '0.25rem' }}>{children}</li>;
              },
              p({ children }) {
                return <p style={{ color: '#94a3b8', lineHeight: '1.8', marginBottom: '1rem' }}>{children}</p>;
              },
              strong({ children }) {
                return <strong style={{ color: '#f1f5f9', fontWeight: '700' }}>{children}</strong>;
              },
              em({ children }) {
                return <em style={{ color: '#c4b5fd' }}>{children}</em>;
              },
            }}
          >{part.content}</ReactMarkdown>
        );
      })}
    </div>
  );
}

const TAB_STYLES = {
  container: {
    display: 'flex',
    gap: '0.25rem',
    padding: '0.25rem',
    background: '#0f172a',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  tab: (active) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: active ? '700' : '500',
    color: active ? '#0f172a' : '#94a3b8',
    background: active ? 'linear-gradient(135deg, #06b6d4, #14b8a6)' : 'transparent',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 200ms ease',
    boxShadow: active ? '0 2px 8px rgba(6,182,212,0.3)' : 'none',
  }),
};

export default function LessonViewer() {
  const { id: moduleId, lessonId } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [mod, setMod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Lab is the default tab when a lab scenario exists
  const scenario = LAB_SCENARIOS[Number(lessonId)];
  const [activeTab, setActiveTab] = useState(scenario ? 'lab' : 'read');

  useEffect(() => {
    setLoading(true);
    Promise.all([getLessonAPI(moduleId, lessonId), getModuleAPI(moduleId)])
      .then(([lessonData, moduleData]) => {
        setLesson(lessonData);
        setMod(moduleData);
        const currentLesson = moduleData?.lessons?.find((l) => l.id === Number(lessonId));
        setCompleted(currentLesson?.completed || false);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [moduleId, lessonId]);

  // Reset tab when navigating between lessons
  useEffect(() => {
    const s = LAB_SCENARIOS[Number(lessonId)];
    setActiveTab(s ? 'lab' : 'read');
  }, [lessonId]);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div className="loading-spinner" /></div>;

  if (!lesson) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#94a3b8' }}>
        <BookOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#f1f5f9' }}>Lesson Not Found</h2>
        <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/modules/' + moduleId)}>Back to Module</button>
      </div>
    );
  }

  const lessons = mod?.lessons || [];
  const currentIdx = lessons.findIndex((l) => l.id === Number(lessonId));
  const prevLesson = currentIdx > 0 ? lessons[currentIdx - 1] : null;
  const nextLesson = currentIdx < lessons.length - 1 ? lessons[currentIdx + 1] : null;

  const handleComplete = async () => {
    setCompleting(true);
    try { await completeLessonAPI(moduleId, lessonId); setCompleted(true); }
    catch (err) { console.error(err); }
    finally { setCompleting(false); }
  };

  return (
    <div style={{ maxWidth: '1500px', margin: '0 auto', animation: 'fadeIn 0.4s ease-out' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.8125rem', color: '#64748b', flexWrap: 'wrap' }}>
        <Link to="/modules" style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: '500' }}>Modules</Link>
        <ChevronRight size={14} />
        <Link to={'/modules/' + moduleId} style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: '500' }}>{mod?.title || 'Module'}</Link>
        <ChevronRight size={14} />
        <span style={{ color: '#f1f5f9', fontWeight: '600' }}>{lesson.title}</span>
        <BookmarkButton moduleId={moduleId} lessonId={lessonId} lessonTitle={lesson.title} moduleName={mod?.title} />
        {completed && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#10b981', fontSize: '0.75rem', fontWeight: '600', marginLeft: '0.5rem' }}><CheckCircle2 size={14} />Completed</span>}
      </div>

      {/* Tab switcher — Lab is primary */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={TAB_STYLES.container}>
          {scenario && (
            <button style={TAB_STYLES.tab(activeTab === 'lab')} onClick={() => setActiveTab('lab')}>
              <Zap size={16} />
              Interactive Lab
            </button>
          )}
          <button style={TAB_STYLES.tab(activeTab === 'read')} onClick={() => setActiveTab('read')}>
            <FileText size={16} />
            Reading
          </button>

        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: '#64748b' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} />{lesson.estimated_minutes || 45} min</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><BookOpen size={14} />Lesson {currentIdx + 1}/{lessons.length}</span>
        </div>
      </div>

      {/* ── Tab Content ── */}

      {/* LAB TAB — Full-width interactive workspace */}
      {activeTab === 'lab' && scenario && (
        <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}><div className="loading-spinner" /></div>}>
          <LabWorkspace
            scenario={scenario}
            lessonTitle={lesson.title}
            onComplete={() => { if (!completed) handleComplete(); }}
          />
        </Suspense>
      )}

      {/* READING TAB — Lesson content with inline interactive components */}
      {activeTab === 'read' && (
        <div style={{ maxWidth: '900px' }}>
          {/* Objectives */}
          {lesson.objectives && lesson.objectives.length > 0 && (
            <div style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: '14px', padding: '1.25rem 1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '700', color: '#06b6d4', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Target size={16} />Learning Objectives
              </div>
              {lesson.objectives.map((obj, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8125rem', color: '#94a3b8', lineHeight: 1.7, padding: '0.25rem 0' }}>
                  <CheckCircle2 size={14} color="#06b6d4" style={{ flexShrink: 0, marginTop: '2px' }} />{obj}
                </div>
              ))}
            </div>
          )}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '2rem 2.5rem', marginBottom: '1.5rem' }}>
            <MarkdownRenderer content={lesson.content || ''} />
          </div>
        </div>
      )}


      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1.25rem 0', borderTop: '1px solid #334155', marginTop: '1.5rem' }}>
        {prevLesson ? (
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', fontSize: '0.875rem', fontWeight: '600', borderRadius: '10px', border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', cursor: 'pointer', transition: 'all 150ms ease' }}
            onClick={() => navigate('/modules/' + moduleId + '/lessons/' + prevLesson.id)}>
            <ArrowLeft size={16} />{prevLesson.title}
          </button>
        ) : <div />}

        {!completed && (
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.5rem', fontSize: '0.875rem', fontWeight: '700', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #10b981, #14b8a6)', color: '#0f172a', cursor: 'pointer', transition: 'all 150ms ease', boxShadow: '0 2px 8px rgba(16,185,129,0.3)', opacity: completing ? 0.7 : 1 }}
            onClick={handleComplete} disabled={completing}>
            <CheckCircle2 size={16} />{completing ? 'Marking...' : 'Mark as Complete'}
          </button>
        )}

        {nextLesson ? (
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', fontSize: '0.875rem', fontWeight: '600', borderRadius: '10px', border: '1px solid rgba(6,182,212,0.2)', background: 'rgba(6,182,212,0.05)', color: '#06b6d4', cursor: 'pointer', transition: 'all 150ms ease' }}
            onClick={() => navigate('/modules/' + moduleId + '/lessons/' + nextLesson.id)}>
            {nextLesson.title}<ArrowRight size={16} />
          </button>
        ) : (
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', fontSize: '0.875rem', fontWeight: '600', borderRadius: '10px', border: '1px solid rgba(139,92,246,0.2)', background: 'rgba(139,92,246,0.05)', color: '#8b5cf6', cursor: 'pointer' }}
            onClick={() => navigate('/modules/' + moduleId)}>
            Back to Module<ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
