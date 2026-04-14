import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Lightbulb,
  Send,
  Code,
  HelpCircle,
  Award,
  ChevronDown,
  ChevronUp,
  Terminal,
  Play,
} from 'lucide-react';
import { submitExerciseAPI, runCodeAPI } from '../utils/api';
import CodeEditor from './CodeEditor';

const styles = {
  panel: { display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' },
  exerciseCard: { background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden', transition: 'all 250ms ease' },
  exerciseHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', cursor: 'pointer', transition: 'background 150ms ease' },
  exerciseHeaderLeft: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  exerciseType: { display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.6875rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' },
  exerciseTitle: { fontSize: '0.9375rem', fontWeight: '600', color: '#f1f5f9' },
  points: { display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', fontWeight: '600', color: '#f59e0b' },
  exerciseBody: { padding: '0 1.25rem 1.25rem', borderTop: '1px solid #334155' },
  question: { fontSize: '0.9375rem', color: '#94a3b8', margin: '1rem 0', lineHeight: '1.7' },
  optionsList: { display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '1rem 0' },
  option: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #334155', background: '#0f172a', cursor: 'pointer', transition: 'all 150ms ease', fontSize: '0.875rem', color: '#94a3b8' },
  optionSelected: { borderColor: '#06b6d4', background: 'rgba(6, 182, 212, 0.08)', color: '#f1f5f9' },
  optionCorrect: { borderColor: '#10b981', background: 'rgba(16, 185, 129, 0.08)', color: '#10b981' },
  optionIncorrect: { borderColor: '#ef4444', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444' },
  radio: { width: '18px', height: '18px', borderRadius: '50%', border: '2px solid #475569', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 150ms ease' },
  radioSelected: { borderColor: '#06b6d4' },
  radioDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#06b6d4' },
  codeArea: { width: '100%', minHeight: '120px', padding: '1rem', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem', lineHeight: '1.6', color: '#f1f5f9', background: '#0d1117', border: '1px solid #334155', borderRadius: '10px', resize: 'vertical', outline: 'none', transition: 'border-color 150ms ease' },
  feedback: { display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem', borderRadius: '10px', margin: '1rem 0 0', fontSize: '0.875rem', lineHeight: '1.6' },
  feedbackCorrect: { background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#34d399' },
  feedbackIncorrect: { background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#fca5a5' },
  hintBtn: { display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem', fontSize: '0.8125rem', fontWeight: '500', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px', cursor: 'pointer', transition: 'all 150ms ease' },
  hint: { padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.15)', fontSize: '0.8125rem', color: '#fbbf24', marginTop: '0.5rem', lineHeight: '1.6' },
  actions: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' },
  submitBtn: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', fontSize: '0.875rem', fontWeight: '600', color: '#0f172a', background: 'linear-gradient(135deg, #06b6d4, #14b8a6)', border: 'none', borderRadius: '10px', cursor: 'pointer', transition: 'all 150ms ease', boxShadow: '0 2px 8px rgba(6, 182, 212, 0.3)' },
};

function getTypeConfig(type) {
  switch (type) {
    case 'quiz': return { color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)', icon: HelpCircle, label: 'Quiz' };
    case 'coding': return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', icon: Code, label: 'Coding' };
    case 'lab': return { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', icon: Terminal, label: 'Lab' };
    default: return { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', icon: HelpCircle, label: type };
  }
}

function ExerciseItem({ exercise }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [codeAnswer, setCodeAnswer] = useState(exercise.starter_code || '');
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [codeOutput, setCodeOutput] = useState(null);
  const [codeRunning, setCodeRunning] = useState(false);

  const typeConfig = getTypeConfig(exercise.type);
  const TypeIcon = typeConfig.icon;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const answer = exercise.type === 'quiz' ? selectedOption : codeAnswer;
      const res = await submitExerciseAPI(exercise.id, answer);
      if (exercise.type === 'quiz' && exercise.correct_answer !== undefined) {
        const isCorrect = selectedOption === exercise.correct_answer;
        setResult({ correct: isCorrect, score: isCorrect ? exercise.points : 0, feedback: isCorrect ? 'Correct! Well done!' : 'Not quite right. Review the material and try again.' });
      } else {
        setResult(res);
      }
      setSubmitted(true);
    } catch (err) {
      setResult({ correct: false, score: 0, feedback: 'Error: ' + err.message });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const showHint = () => {
    if (exercise.hints && hintsShown < exercise.hints.length) setHintsShown((p) => p + 1);
  };

  return (
    <div style={styles.exerciseCard}>
      <div style={{ ...styles.exerciseHeader, background: expanded ? 'rgba(255,255,255,0.02)' : 'transparent' }} onClick={() => setExpanded(!expanded)}>
        <div style={styles.exerciseHeaderLeft}>
          <div style={{ ...styles.exerciseType, color: typeConfig.color, background: typeConfig.bg }}>
            <TypeIcon size={12} />
            {typeConfig.label}
          </div>
          <span style={styles.exerciseTitle}>{exercise.title}</span>
          {submitted && result?.correct && <CheckCircle2 size={18} color="#10b981" />}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={styles.points}><Award size={14} />{exercise.points} pts</div>
          {expanded ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
        </div>
      </div>

      {expanded && (
        <div style={styles.exerciseBody}>
          {exercise.description && <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.75rem' }}>{exercise.description}</p>}

          {exercise.type === 'quiz' && (
            <>
              <p style={styles.question}>{exercise.question}</p>
              <div style={styles.optionsList}>
                {exercise.options?.map((option, idx) => {
                  let optStyle = { ...styles.option };
                  if (submitted && result) {
                    if (idx === exercise.correct_answer) optStyle = { ...optStyle, ...styles.optionCorrect };
                    else if (idx === selectedOption && !result.correct) optStyle = { ...optStyle, ...styles.optionIncorrect };
                  } else if (idx === selectedOption) {
                    optStyle = { ...optStyle, ...styles.optionSelected };
                  }
                  return (
                    <div key={idx} style={optStyle} onClick={() => !submitted && setSelectedOption(idx)}>
                      <div style={{ ...styles.radio, ...(idx === selectedOption ? styles.radioSelected : {}), ...(submitted && idx === exercise.correct_answer ? { borderColor: '#10b981' } : {}) }}>
                        {idx === selectedOption && <div style={{ ...styles.radioDot, background: submitted ? (result?.correct ? '#10b981' : '#ef4444') : '#06b6d4' }} />}
                      </div>
                      <span style={{ flex: 1 }}>{option}</span>
                      {submitted && idx === exercise.correct_answer && <CheckCircle2 size={16} color="#10b981" />}
                      {submitted && idx === selectedOption && !result?.correct && idx !== exercise.correct_answer && <XCircle size={16} color="#ef4444" />}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {exercise.type === 'coding' && (
            <>
              <p style={styles.question}>{exercise.description}</p>
              {/* Test cases preview */}
              {exercise.test_cases && exercise.test_cases.length > 0 && (
                <div style={{ marginBottom: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.1)', fontSize: '0.75rem' }}>
                  <span style={{ color: '#06b6d4', fontWeight: '600' }}>Test Cases ({exercise.test_cases.filter(t => !t.hidden).length} visible, {exercise.test_cases.filter(t => t.hidden).length} hidden):</span>
                  {exercise.test_cases.filter(t => !t.hidden).slice(0, 3).map((tc, i) => (
                    <div key={i} style={{ marginTop: '0.25rem', color: '#64748b', fontFamily: 'monospace' }}>
                      {tc.label}: <span style={{ color: '#94a3b8' }}>{tc.input ? `input="${tc.input}"` : ''} → expected: "{tc.expected_output}"</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #334155' }}>
                <CodeEditor value={codeAnswer} onChange={setCodeAnswer} language="python" readOnly={submitted} height="180px" />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  onClick={async () => {
                    setCodeRunning(true);
                    try {
                      const res = await runCodeAPI('python', codeAnswer);
                      setCodeOutput(res);
                    } catch (e) {
                      setCodeOutput({ stdout: '', stderr: e.message, exit_code: 1 });
                    } finally {
                      setCodeRunning(false);
                    }
                  }}
                  disabled={codeRunning || !codeAnswer.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', fontSize: '0.8125rem', fontWeight: '600', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', cursor: codeRunning ? 'not-allowed' : 'pointer', transition: 'all 150ms' }}
                >
                  {codeRunning ? <><div className="loading-spinner sm" />Running...</> : <><Play size={14} />Run</>}
                </button>
              </div>
              {codeOutput && (
                <pre style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#0d1117', border: '1px solid #1e293b', borderRadius: '8px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8125rem', lineHeight: '1.5', color: '#e2e8f0', whiteSpace: 'pre-wrap', maxHeight: '150px', overflow: 'auto' }}>
                  {codeOutput.stdout}{codeOutput.stderr && <span style={{ color: '#fca5a5' }}>{codeOutput.stderr}</span>}
                </pre>
              )}
            </>
          )}

          {exercise.type === 'lab' && (
            <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', fontSize: '0.875rem', color: '#94a3b8', lineHeight: '1.7' }}>
              <p style={{ marginBottom: '0.5rem', fontWeight: '600', color: '#a78bfa' }}>Lab Instructions:</p>
              <p>{exercise.description}</p>
            </div>
          )}

          {submitted && result && (
            <div style={{ ...styles.feedback, ...(result.correct ? styles.feedbackCorrect : styles.feedbackIncorrect) }}>
              {result.correct ? <CheckCircle2 size={20} style={{ flexShrink: 0, marginTop: '1px' }} /> : <XCircle size={20} style={{ flexShrink: 0, marginTop: '1px' }} />}
              <div>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{result.correct ? 'Correct! +' + result.score + ' points' : 'Incorrect'}</div>
                <div style={{ opacity: 0.8 }}>{result.feedback}</div>
              </div>
            </div>
          )}

          {exercise.hints && hintsShown > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              {exercise.hints.slice(0, hintsShown).map((hint, idx) => (
                <div key={idx} style={styles.hint}>
                  <Lightbulb size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
                  {hint}
                </div>
              ))}
            </div>
          )}

          <div style={styles.actions}>
            {!submitted && (
              <button style={{ ...styles.submitBtn, opacity: (exercise.type === 'quiz' && selectedOption === null) || submitting ? 0.5 : 1, cursor: (exercise.type === 'quiz' && selectedOption === null) || submitting ? 'not-allowed' : 'pointer' }}
                onClick={handleSubmit} disabled={(exercise.type === 'quiz' && selectedOption === null) || submitting}>
                {submitting ? <><div className="loading-spinner sm" />Submitting...</> : <><Send size={16} />Submit Answer</>}
              </button>
            )}
            {exercise.hints && hintsShown < exercise.hints.length && !submitted && (
              <button style={styles.hintBtn} onClick={showHint}>
                <Lightbulb size={14} />Show Hint ({hintsShown}/{exercise.hints.length})
              </button>
            )}
            {submitted && !result?.correct && (
              <button style={{ ...styles.submitBtn, background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}
                onClick={() => { setSubmitted(false); setResult(null); setSelectedOption(null); }}>
                Try Again
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExercisePanel({ exercises = [] }) {
  if (exercises.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
        <Code size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
        <p>No exercises for this lesson yet.</p>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#f1f5f9' }}>Exercises ({exercises.length})</h3>
        <div style={{ fontSize: '0.75rem', color: '#64748b', background: '#0f172a', padding: '0.25rem 0.625rem', borderRadius: '6px' }}>
          {exercises.reduce((sum, e) => sum + (e.points || 0), 0)} pts total
        </div>
      </div>
      {exercises.map((exercise) => (
        <ExerciseItem key={exercise.id} exercise={exercise} />
      ))}
    </div>
  );
}
