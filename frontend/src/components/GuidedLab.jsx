import React, { useState, useCallback } from 'react';
import { CheckCircle2, Circle, ChevronRight, Terminal, Play, Copy, AlertTriangle, Lightbulb, RotateCcw } from 'lucide-react';
import { runCodeAPI } from '../utils/api';

/**
 * GuidedLab — Step-by-step interactive lab that walks users through commands,
 * validates their output, and tracks completion. Each step can run code in the
 * sandbox and verify the result.
 *
 * Props:
 *   steps: [{ title, instruction, command, language, expected_output, validation, hint, explanation }]
 *   onComplete: () => void
 */

const STATUS = { LOCKED: 'locked', ACTIVE: 'active', DONE: 'done', FAILED: 'failed' };

export default function GuidedLab({ steps = [], title = 'Guided Lab', onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepResults, setStepResults] = useState({});
  const [userCode, setUserCode] = useState({});
  const [running, setRunning] = useState(false);
  const [showExplanation, setShowExplanation] = useState({});

  const getStepStatus = (idx) => {
    if (stepResults[idx]?.passed) return STATUS.DONE;
    if (stepResults[idx]?.failed) return STATUS.FAILED;
    if (idx === currentStep) return STATUS.ACTIVE;
    if (idx < currentStep) return STATUS.DONE;
    return STATUS.LOCKED;
  };

  const completedCount = Object.values(stepResults).filter(r => r?.passed).length;
  const allDone = completedCount === steps.length;

  const runStep = useCallback(async (idx) => {
    const step = steps[idx];
    const code = userCode[idx] || step.command || '';
    if (!code.trim()) return;

    setRunning(true);
    try {
      const result = await runCodeAPI(step.language || 'python', code);

      // Validate output
      let passed = false;
      if (step.validation === 'any_output') {
        passed = result && result.stdout && result.stdout.trim().length > 0 && result.exit_code === 0;
      } else if (step.validation === 'no_error') {
        passed = result && result.exit_code === 0;
      } else if (step.expected_output) {
        const actual = (result?.stdout || '').trim().toLowerCase();
        const expected = step.expected_output.trim().toLowerCase();
        passed = actual.includes(expected) || expected.includes(actual);
      } else if (step.validation_fn) {
        // Custom validation function (string) — evaluated against output
        try {
          const fn = new Function('stdout', 'stderr', 'exit_code', step.validation_fn);
          passed = fn(result?.stdout || '', result?.stderr || '', result?.exit_code || 0);
        } catch { passed = false; }
      } else {
        passed = result && result.exit_code === 0;
      }

      setStepResults(prev => ({ ...prev, [idx]: { ...result, passed, failed: !passed } }));

      if (passed && idx === currentStep && idx < steps.length - 1) {
        setTimeout(() => setCurrentStep(idx + 1), 500);
      }
      if (passed && idx === steps.length - 1 && onComplete) {
        setTimeout(onComplete, 800);
      }
    } catch (err) {
      setStepResults(prev => ({ ...prev, [idx]: { stdout: '', stderr: err.message, exit_code: 1, passed: false, failed: true } }));
    } finally {
      setRunning(false);
    }
  }, [steps, userCode, currentStep, onComplete]);

  // Fallback for demo mode (no backend)
  const runStepDemo = useCallback((idx) => {
    const step = steps[idx];
    const code = userCode[idx] || step.command || '';
    // Simulate output for demo mode
    const demoOutput = step.demo_output || `$ ${code.split('\n')[0]}\n[simulated output]`;
    setStepResults(prev => ({ ...prev, [idx]: { stdout: demoOutput, stderr: '', exit_code: 0, passed: true, failed: false, demo: true } }));
    if (idx === currentStep && idx < steps.length - 1) {
      setTimeout(() => setCurrentStep(idx + 1), 500);
    }
    if (idx === steps.length - 1 && onComplete) {
      setTimeout(onComplete, 800);
    }
  }, [steps, userCode, currentStep, onComplete]);

  const handleRun = async (idx) => {
    try {
      await runStep(idx);
    } catch {
      runStepDemo(idx);
    }
  };

  const retryStep = (idx) => {
    setStepResults(prev => { const n = { ...prev }; delete n[idx]; return n; });
    setCurrentStep(idx);
  };

  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(16,185,129,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Terminal size={16} color="#10b981" />
          <span style={{ fontWeight: '700', fontSize: '0.9375rem', color: '#f1f5f9' }}>{title}</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
          {completedCount}/{steps.length} steps {allDone && <span style={{ color: '#10b981', fontWeight: '700' }}>COMPLETE</span>}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '3px', background: '#0f172a' }}>
        <div style={{ height: '100%', width: `${(completedCount / steps.length) * 100}%`, background: 'linear-gradient(90deg, #10b981, #06b6d4)', transition: 'width 500ms ease' }} />
      </div>

      {/* Steps */}
      <div style={{ padding: '0.5rem' }}>
        {steps.map((step, idx) => {
          const status = getStepStatus(idx);
          const result = stepResults[idx];
          const isActive = idx === currentStep || status === STATUS.DONE || status === STATUS.FAILED;
          const code = userCode[idx] !== undefined ? userCode[idx] : (step.command || '');

          return (
            <div key={idx} style={{ marginBottom: '0.5rem', borderRadius: '8px', border: `1px solid ${status === STATUS.DONE ? 'rgba(16,185,129,0.3)' : status === STATUS.FAILED ? 'rgba(239,68,68,0.3)' : status === STATUS.ACTIVE ? 'rgba(6,182,212,0.3)' : '#1e293b'}`, background: status === STATUS.LOCKED ? '#0f172a' : '#0f172a', opacity: status === STATUS.LOCKED ? 0.5 : 1, transition: 'all 300ms' }}>
              {/* Step header */}
              <div style={{ padding: '0.625rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isActive ? 'pointer' : 'default' }}
                onClick={() => isActive && setCurrentStep(idx)}>
                {status === STATUS.DONE ? <CheckCircle2 size={16} color="#10b981" /> : status === STATUS.FAILED ? <AlertTriangle size={16} color="#ef4444" /> : status === STATUS.ACTIVE ? <ChevronRight size={16} color="#06b6d4" /> : <Circle size={14} color="#334155" />}
                <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: status === STATUS.DONE ? '#10b981' : status === STATUS.ACTIVE ? '#f1f5f9' : '#64748b' }}>
                  Step {idx + 1}: {step.title}
                </span>
              </div>

              {/* Step body (expanded when active) */}
              {isActive && (
                <div style={{ padding: '0 0.75rem 0.75rem' }}>
                  {/* Instruction */}
                  <div style={{ fontSize: '0.8125rem', color: '#94a3b8', lineHeight: '1.7', marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>
                    {step.instruction}
                  </div>

                  {/* Code editor */}
                  {step.editable !== false && (
                    <textarea
                      value={code}
                      onChange={(e) => setUserCode(prev => ({ ...prev, [idx]: e.target.value }))}
                      spellCheck={false}
                      disabled={status === STATUS.DONE}
                      style={{ width: '100%', minHeight: '60px', padding: '0.5rem', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', lineHeight: '1.5', color: '#e2e8f0', background: '#0d1117', border: '1px solid #1e293b', borderRadius: '6px', resize: 'vertical', outline: 'none' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab') { e.preventDefault(); const s = e.target.selectionStart; const v = code; setUserCode(prev => ({ ...prev, [idx]: v.substring(0, s) + '    ' + v.substring(e.target.selectionEnd) })); }
                      }}
                    />
                  )}

                  {/* Non-editable command display */}
                  {step.editable === false && step.command && (
                    <div style={{ position: 'relative', background: '#0d1117', border: '1px solid #1e293b', borderRadius: '6px', padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#e2e8f0', marginBottom: '0.25rem' }}>
                      <span style={{ color: '#10b981' }}>$ </span>{step.command}
                      <button onClick={() => navigator.clipboard?.writeText(step.command)}
                        style={{ position: 'absolute', top: '0.25rem', right: '0.25rem', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.125rem' }}>
                        <Copy size={12} />
                      </button>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                    {status !== STATUS.DONE && (
                      <button onClick={() => handleRun(idx)} disabled={running}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.75rem', fontSize: '0.8125rem', fontWeight: '600', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', cursor: running ? 'not-allowed' : 'pointer', opacity: running ? 0.6 : 1 }}>
                        {running ? <><div className="loading-spinner sm" />Running...</> : <><Play size={14} />Run &amp; Verify</>}
                      </button>
                    )}
                    {status === STATUS.FAILED && (
                      <button onClick={() => retryStep(idx)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.75rem', fontSize: '0.8125rem', fontWeight: '600', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', cursor: 'pointer' }}>
                        <RotateCcw size={14} />Retry
                      </button>
                    )}
                    {step.hint && (
                      <button onClick={() => setShowExplanation(prev => ({ ...prev, [`hint_${idx}`]: !prev[`hint_${idx}`] }))}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.75rem', fontSize: '0.75rem', background: 'rgba(245,158,11,0.05)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '6px', cursor: 'pointer' }}>
                        <Lightbulb size={12} />Hint
                      </button>
                    )}
                  </div>

                  {/* Hint */}
                  {showExplanation[`hint_${idx}`] && step.hint && (
                    <div style={{ marginTop: '0.375rem', padding: '0.5rem', borderRadius: '6px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', fontSize: '0.75rem', color: '#fbbf24', lineHeight: '1.5' }}>
                      <Lightbulb size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />{step.hint}
                    </div>
                  )}

                  {/* Output */}
                  {result && (
                    <div style={{ marginTop: '0.375rem' }}>
                      <pre style={{ padding: '0.5rem', background: '#0d1117', border: `1px solid ${result.passed ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.6875rem', lineHeight: '1.4', color: '#e2e8f0', whiteSpace: 'pre-wrap', maxHeight: '120px', overflow: 'auto' }}>
                        {result.stdout}{result.stderr && <span style={{ color: '#fca5a5' }}>{result.stderr}</span>}
                      </pre>
                      {result.passed && (
                        <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#10b981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <CheckCircle2 size={14} />Step passed!
                        </div>
                      )}
                      {result.failed && (
                        <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <AlertTriangle size={14} />Output doesn't match expected result. Try again.
                        </div>
                      )}
                      {result.demo && (
                        <div style={{ marginTop: '0.25rem', fontSize: '0.625rem', color: '#64748b', fontStyle: 'italic' }}>
                          (Simulated output — connect a backend for real execution)
                        </div>
                      )}
                    </div>
                  )}

                  {/* Explanation (shown after completion) */}
                  {result?.passed && step.explanation && (
                    <div style={{ marginTop: '0.375rem', padding: '0.5rem', borderRadius: '6px', background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)', fontSize: '0.75rem', color: '#67e8f9', lineHeight: '1.6' }}>
                      {step.explanation}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Completion */}
      {allDone && (
        <div style={{ padding: '1rem', borderTop: '1px solid #334155', textAlign: 'center', background: 'rgba(16,185,129,0.05)' }}>
          <CheckCircle2 size={24} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
          <div style={{ fontSize: '0.9375rem', fontWeight: '700', color: '#10b981' }}>Lab Complete!</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>You've completed all {steps.length} steps. The skills you practiced here apply directly to production HPC systems.</div>
        </div>
      )}
    </div>
  );
}
