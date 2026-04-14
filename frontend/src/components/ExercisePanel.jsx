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
  ArrowRight,
  RotateCcw,
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

function LabExercise({ exercise, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepResults, setStepResults] = useState({});
  const [userCode, setUserCode] = useState({});
  const [running, setRunning] = useState(false);
  const [showHints, setShowHints] = useState({});

  const steps = exercise.steps || [];
  const completedCount = Object.values(stepResults).filter(r => r?.passed).length;
  const allDone = completedCount === steps.length;

  const runStep = async (idx) => {
    const step = steps[idx];
    const code = userCode[idx] !== undefined ? userCode[idx] : (step.command || '');
    if (!code.trim()) return;
    setRunning(true);
    try {
      const result = await runCodeAPI(step.language || 'bash', code);
      let passed = false;
      if (step.validation === 'any_output') {
        passed = result && (result.stdout || '').trim().length > 0 && result.exit_code === 0;
      } else if (step.validation === 'no_error') {
        passed = result && result.exit_code === 0;
      } else if (step.expected_output) {
        const actual = (result?.stdout || '').trim().toLowerCase();
        passed = actual.includes(step.expected_output.trim().toLowerCase());
      } else {
        passed = result && result.exit_code === 0;
      }
      setStepResults(prev => ({ ...prev, [idx]: { ...result, passed, failed: !passed } }));
      if (passed && idx === currentStep && idx < steps.length - 1) {
        setTimeout(() => setCurrentStep(idx + 1), 400);
      }
      if (passed && completedCount + 1 === steps.length && onComplete) {
        setTimeout(() => onComplete(exercise.points), 600);
      }
    } catch {
      // Demo fallback
      const demoOut = step.demo_output || `$ ${code.split('\n')[0]}\n[simulated output]`;
      setStepResults(prev => ({ ...prev, [idx]: { stdout: demoOut, stderr: '', exit_code: 0, passed: true, failed: false, demo: true } }));
      if (idx === currentStep && idx < steps.length - 1) {
        setTimeout(() => setCurrentStep(idx + 1), 400);
      }
      if (completedCount + 1 === steps.length && onComplete) {
        setTimeout(() => onComplete(exercise.points), 600);
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ marginTop: '0.75rem' }}>
      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <Terminal size={14} color="#8b5cf6" />
        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#a78bfa' }}>{completedCount}/{steps.length} steps</span>
        <div style={{ flex: 1, height: '3px', background: '#1e293b', borderRadius: '2px' }}>
          <div style={{ height: '100%', width: `${(completedCount / Math.max(steps.length, 1)) * 100}%`, background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)', borderRadius: '2px', transition: 'width 400ms ease' }} />
        </div>
        {allDone && <CheckCircle2 size={14} color="#10b981" />}
      </div>

      {/* Steps */}
      {steps.map((step, idx) => {
        const result = stepResults[idx];
        const isDone = result?.passed;
        const isFailed = result?.failed;
        const isActive = idx <= currentStep;
        const code = userCode[idx] !== undefined ? userCode[idx] : (step.command || '');

        return (
          <div key={idx} style={{ marginBottom: '0.5rem', borderRadius: '8px', border: `1px solid ${isDone ? 'rgba(16,185,129,0.25)' : isFailed ? 'rgba(239,68,68,0.25)' : idx === currentStep ? 'rgba(139,92,246,0.3)' : '#1e293b'}`, background: '#0f172a', opacity: isActive ? 1 : 0.4, transition: 'all 250ms' }}>
            {/* Step header */}
            <div style={{ padding: '0.5rem 0.625rem', display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: isActive ? 'pointer' : 'default' }}
              onClick={() => isActive && setCurrentStep(idx)}>
              {isDone ? <CheckCircle2 size={14} color="#10b981" /> : <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${idx === currentStep ? '#8b5cf6' : '#334155'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', color: '#64748b', fontWeight: '700' }}>{idx + 1}</div>}
              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: isDone ? '#10b981' : idx === currentStep ? '#f1f5f9' : '#64748b' }}>{step.title}</span>
            </div>

            {/* Expanded step */}
            {idx === currentStep && (
              <div style={{ padding: '0 0.625rem 0.625rem' }}>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: '1.6', marginBottom: '0.375rem' }}>{step.instruction}</p>

                <textarea
                  value={code}
                  onChange={(e) => setUserCode(prev => ({ ...prev, [idx]: e.target.value }))}
                  spellCheck={false}
                  disabled={isDone}
                  style={{ width: '100%', minHeight: '50px', padding: '0.375rem 0.5rem', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6875rem', lineHeight: '1.4', color: '#e2e8f0', background: '#0d1117', border: '1px solid #1e293b', borderRadius: '6px', resize: 'vertical', outline: 'none' }}
                />

                <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.375rem', alignItems: 'center' }}>
                  {!isDone && (
                    <button onClick={() => runStep(idx)} disabled={running}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.625rem', fontSize: '0.75rem', fontWeight: '600', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '6px', cursor: running ? 'not-allowed' : 'pointer', opacity: running ? 0.6 : 1 }}>
                      {running ? 'Running...' : <><Play size={12} />Run & Verify</>}
                    </button>
                  )}
                  {isFailed && (
                    <button onClick={() => { setStepResults(prev => { const n = { ...prev }; delete n[idx]; return n; }); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.625rem', fontSize: '0.75rem', fontWeight: '600', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '6px', cursor: 'pointer' }}>
                      <RotateCcw size={12} />Retry
                    </button>
                  )}
                  {step.hint && (
                    <button onClick={() => setShowHints(prev => ({ ...prev, [idx]: !prev[idx] }))}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', fontSize: '0.6875rem', background: 'transparent', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '6px', cursor: 'pointer' }}>
                      <Lightbulb size={10} />Hint
                    </button>
                  )}
                </div>

                {showHints[idx] && step.hint && (
                  <div style={{ marginTop: '0.25rem', padding: '0.375rem 0.5rem', borderRadius: '6px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.1)', fontSize: '0.6875rem', color: '#fbbf24', lineHeight: '1.5' }}>
                    {step.hint}
                  </div>
                )}

                {result && (
                  <div style={{ marginTop: '0.25rem' }}>
                    <pre style={{ padding: '0.375rem 0.5rem', background: '#0d1117', border: `1px solid ${result.passed ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`, borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.625rem', lineHeight: '1.3', color: '#e2e8f0', whiteSpace: 'pre-wrap', maxHeight: '100px', overflow: 'auto' }}>
                      {result.stdout}{result.stderr && <span style={{ color: '#fca5a5' }}>{result.stderr}</span>}
                    </pre>
                    {result.passed && step.explanation && (
                      <div style={{ marginTop: '0.25rem', padding: '0.375rem 0.5rem', borderRadius: '6px', background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.1)', fontSize: '0.625rem', color: '#67e8f9', lineHeight: '1.5' }}>
                        {step.explanation}
                      </div>
                    )}
                    {result.demo && (
                      <div style={{ fontSize: '0.5625rem', color: '#475569', fontStyle: 'italic', marginTop: '0.125rem' }}>(simulated output)</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {allDone && (
        <div style={{ marginTop: '0.5rem', padding: '0.625rem', borderRadius: '8px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', textAlign: 'center' }}>
          <CheckCircle2 size={18} color="#10b981" style={{ margin: '0 auto 0.25rem' }} />
          <div style={{ fontSize: '0.8125rem', fontWeight: '700', color: '#10b981' }}>Lab Complete!</div>
          <div style={{ fontSize: '0.625rem', color: '#64748b', marginTop: '0.125rem' }}>+{exercise.points} points earned</div>
        </div>
      )}
    </div>
  );
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

          {exercise.type === 'lab' && exercise.steps && (
            <LabExercise exercise={exercise} onComplete={(score) => { setResult({ correct: true, score, feedback: 'Lab completed!' }); setSubmitted(true); }} />
          )}
          {exercise.type === 'lab' && !exercise.steps && (
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
