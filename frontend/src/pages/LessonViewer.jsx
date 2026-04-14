import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ArrowLeft, ArrowRight, CheckCircle2, Target, ChevronRight, PanelRightOpen, PanelRightClose, BookOpen, Clock } from 'lucide-react';
import { getLessonAPI, getModuleAPI, completeLessonAPI } from '../utils/api';
import ExercisePanel from '../components/ExercisePanel';

function MarkdownRenderer({ content }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div"
                customStyle={{ background: '#0d1117', borderRadius: '10px', border: '1px solid #334155', padding: '1.25rem', fontSize: '0.875rem', lineHeight: '1.7', margin: '1rem 0' }}
                {...props}>{String(children).replace(/\n$/, '')}</SyntaxHighlighter>
            ) : (<code className={className} {...props}>{children}</code>);
          },
        }}
      >{content}</ReactMarkdown>
    </div>
  );
}

export default function LessonViewer() {
  const { id: moduleId, lessonId } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [mod, setMod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExercises, setShowExercises] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

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
    <div style={{ display: 'flex', gap: '1.5rem', maxWidth: '1400px', margin: '0 auto', animation: 'fadeIn 0.4s ease-out', minHeight: 'calc(100vh - 4rem)' }}>
      {/* Content Pane */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.8125rem', color: '#64748b', flexWrap: 'wrap' }}>
          <Link to="/modules" style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: '500' }}>Modules</Link>
          <ChevronRight size={14} />
          <Link to={'/modules/' + moduleId} style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: '500' }}>{mod?.title || 'Module'}</Link>
          <ChevronRight size={14} />
          <span style={{ color: '#f1f5f9', fontWeight: '600' }}>{lesson.title}</span>
        </div>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: '#64748b' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} />{lesson.estimated_minutes || 45} min</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><BookOpen size={14} />Lesson {currentIdx + 1} of {lessons.length}</span>
          </div>
          {completed && <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#10b981', fontSize: '0.8125rem', fontWeight: '600' }}><CheckCircle2 size={16} />Completed</span>}
        </div>

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

        {/* Content */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '2rem 2.5rem', marginBottom: '1.5rem' }}>
          <MarkdownRenderer content={lesson.content || ''} />
        </div>

        {/* Navigation Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1.25rem 0', borderTop: '1px solid #334155', marginTop: '1rem' }}>
          {prevLesson ? (
            <button style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', fontSize: '0.875rem', fontWeight: '600', borderRadius: '10px', border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', cursor: 'pointer', transition: 'all 150ms ease', textDecoration: 'none' }}
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

      {/* Exercise Pane */}
      <div style={{ width: showExercises ? '420px' : '0', flexShrink: 0, transition: 'width 250ms ease, opacity 250ms ease', overflow: 'hidden', opacity: showExercises ? 1 : 0 }}>
        {showExercises && (
          <div style={{ position: 'sticky', top: '1rem', maxHeight: 'calc(100vh - 6rem)', overflowY: 'auto', background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '1.25rem' }}>
            <ExercisePanel exercises={lesson.exercises || []} />
          </div>
        )}
      </div>

      {/* Toggle button */}
      <button style={{ position: 'fixed', right: '1.5rem', bottom: '1.5rem', width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(6,182,212,0.3)', transition: 'all 200ms ease', zIndex: 30 }}
        onClick={() => setShowExercises(!showExercises)} title={showExercises ? 'Hide exercises' : 'Show exercises'}>
        {showExercises ? <PanelRightClose size={22} /> : <PanelRightOpen size={22} />}
      </button>
    </div>
  );
}
