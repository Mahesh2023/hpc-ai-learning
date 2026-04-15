/**
 * LabWorkspace — The primary interactive learning experience.
 *
 * Split-pane layout:
 *   Left:  Task panel with objectives, step-by-step tasks, tips
 *   Right: Full interactive visualizer (SLURM simulator, terminal, CUDA viz, etc.)
 *
 * This replaces the Q&A exercise pattern with hands-on labs where students
 * interact directly with the visualizers to learn.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  Circle,
  Target,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Trophy,
  ArrowRight,
  RotateCcw,
  Maximize2,
  Minimize2,
  Info,
  Zap,
} from 'lucide-react';
import { InteractiveComponent } from './InteractiveComponents';

/**
 * Individual task card within the task panel.
 */
function TaskCard({ task, index, isActive, isCompleted, onActivate, onComplete }) {
  const [showHint, setShowHint] = useState(false);
  const [expanded, setExpanded] = useState(isActive);

  useEffect(() => {
    setExpanded(isActive);
  }, [isActive]);

  return (
    <div
      style={{
        borderRadius: '10px',
        border: `1px solid ${isCompleted ? 'rgba(16,185,129,0.3)' : isActive ? 'rgba(6,182,212,0.3)' : '#1e293b'}`,
        background: isCompleted ? 'rgba(16,185,129,0.03)' : isActive ? 'rgba(6,182,212,0.03)' : '#0f172a',
        transition: 'all 250ms ease',
        overflow: 'hidden',
      }}
    >
      {/* Task header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          padding: '0.75rem 1rem',
          cursor: 'pointer',
        }}
        onClick={() => { setExpanded(!expanded); onActivate(); }}
      >
        {isCompleted ? (
          <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0 }} />
        ) : isActive ? (
          <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#06b6d4', animation: 'pulse 2s infinite' }} />
          </div>
        ) : (
          <Circle size={18} color="#334155" style={{ flexShrink: 0 }} />
        )}
        <div style={{ flex: 1 }}>
          <span style={{
            fontSize: '0.8125rem',
            fontWeight: '600',
            color: isCompleted ? '#10b981' : isActive ? '#f1f5f9' : '#64748b',
          }}>
            {index + 1}. {task.title}
          </span>
        </div>
        {expanded ? <ChevronUp size={14} color="#64748b" /> : <ChevronDown size={14} color="#64748b" />}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid rgba(51,65,85,0.5)' }}>
          <p style={{
            fontSize: '0.8125rem',
            color: '#94a3b8',
            lineHeight: '1.7',
            marginTop: '0.75rem',
            marginBottom: '0.75rem',
          }}>
            {task.instruction}
          </p>

          {/* Hint toggle */}
          {task.hint && (
            <div style={{ marginBottom: '0.5rem' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setShowHint(!showHint); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#f59e0b',
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                <Lightbulb size={12} />
                {showHint ? 'Hide Hint' : 'Need a Hint?'}
              </button>
              {showHint && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.625rem 0.875rem',
                  borderRadius: '8px',
                  background: 'rgba(245,158,11,0.05)',
                  border: '1px solid rgba(245,158,11,0.12)',
                  fontSize: '0.8125rem',
                  color: '#fbbf24',
                  lineHeight: '1.6',
                }}>
                  {task.hint}
                </div>
              )}
            </div>
          )}

          {/* Mark complete button (for interaction tasks without auto-detection) */}
          {!isCompleted && (
            <button
              onClick={(e) => { e.stopPropagation(); onComplete(); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.375rem 0.875rem',
                fontSize: '0.75rem',
                fontWeight: '700',
                color: '#0f172a',
                background: 'linear-gradient(135deg, #10b981, #14b8a6)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(16,185,129,0.25)',
              }}
            >
              <CheckCircle2 size={12} />
              Mark Complete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Main LabWorkspace component.
 *
 * Props:
 *   scenario - Lab scenario object with: component, config, title, tasks, tips, objectives
 *   lessonTitle - Title of the parent lesson
 *   onComplete - Called when all tasks are done
 */
export default function LabWorkspace({ scenario, lessonTitle, onComplete }) {
  const [completedTasks, setCompletedTasks] = useState(() => {
    // Restore from localStorage
    const key = `hpc_lab_${scenario?.title || ''}`;
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [activeTask, setActiveTask] = useState(0);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const tasks = scenario?.tasks || [];
  const completedCount = Object.keys(completedTasks).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;
  const allDone = completedCount === tasks.length && tasks.length > 0;

  // Save progress to localStorage
  useEffect(() => {
    if (scenario?.title) {
      localStorage.setItem(`hpc_lab_${scenario.title}`, JSON.stringify(completedTasks));
    }
  }, [completedTasks, scenario?.title]);

  // Notify parent when all tasks complete
  useEffect(() => {
    if (allDone && onComplete) {
      onComplete();
    }
  }, [allDone, onComplete]);

  const handleCompleteTask = useCallback((taskId) => {
    setCompletedTasks(prev => {
      if (prev[taskId]) return prev;
      const next = { ...prev, [taskId]: Date.now() };
      // Auto-advance to next incomplete task
      const nextIdx = tasks.findIndex((t, i) => i > activeTask && !next[t.id]);
      if (nextIdx >= 0) {
        setTimeout(() => setActiveTask(nextIdx), 300);
      }
      return next;
    });
  }, [tasks, activeTask]);

  const handleReset = useCallback(() => {
    setCompletedTasks({});
    setActiveTask(0);
    if (scenario?.title) {
      localStorage.removeItem(`hpc_lab_${scenario.title}`);
    }
  }, [scenario?.title]);

  if (!scenario) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        <Zap size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
        <h3 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>No Lab Available</h3>
        <p style={{ fontSize: '0.875rem' }}>This lesson does not have an interactive lab yet.</p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      gap: 0,
      height: fullscreen ? '100vh' : 'calc(100vh - 10rem)',
      position: fullscreen ? 'fixed' : 'relative',
      inset: fullscreen ? 0 : 'auto',
      zIndex: fullscreen ? 100 : 'auto',
      background: '#0f172a',
      borderRadius: fullscreen ? 0 : '16px',
      border: fullscreen ? 'none' : '1px solid #334155',
      overflow: 'hidden',
    }}>
      {/* ── Left Panel: Tasks ── */}
      {!panelCollapsed && (
        <div style={{
          width: '360px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #334155',
          background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
          overflow: 'hidden',
        }}>
          {/* Lab header */}
          <div style={{ padding: '1.25rem', borderBottom: '1px solid #334155' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.5rem',
            }}>
              <Zap size={18} color="#06b6d4" />
              <span style={{
                fontSize: '0.6875rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#06b6d4',
              }}>
                Interactive Lab
              </span>
            </div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#f1f5f9', lineHeight: 1.3 }}>
              {scenario.title}
            </h2>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.375rem', lineHeight: 1.5 }}>
              {scenario.description}
            </p>

            {/* Progress bar */}
            <div style={{ marginTop: '0.875rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.6875rem',
                fontWeight: '600',
                marginBottom: '0.375rem',
              }}>
                <span style={{ color: '#94a3b8' }}>Progress</span>
                <span style={{ color: allDone ? '#10b981' : '#06b6d4' }}>
                  {completedCount}/{tasks.length} tasks
                </span>
              </div>
              <div style={{
                height: '4px',
                borderRadius: '2px',
                background: '#1e293b',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: allDone
                    ? 'linear-gradient(90deg, #10b981, #14b8a6)'
                    : 'linear-gradient(90deg, #06b6d4, #8b5cf6)',
                  borderRadius: '2px',
                  transition: 'width 400ms ease',
                }} />
              </div>
            </div>
          </div>

          {/* Objectives */}
          {scenario.objectives && scenario.objectives.length > 0 && (
            <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                fontSize: '0.6875rem',
                fontWeight: '700',
                color: '#8b5cf6',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.5rem',
              }}>
                <Target size={12} />
                Objectives
              </div>
              {scenario.objectives.map((obj, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.375rem',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  lineHeight: 1.5,
                  padding: '0.125rem 0',
                }}>
                  <ArrowRight size={10} color="#8b5cf6" style={{ flexShrink: 0, marginTop: '3px' }} />
                  {obj}
                </div>
              ))}
            </div>
          )}

          {/* Task list — scrollable */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0.875rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}>
            {tasks.map((task, idx) => (
              <TaskCard
                key={task.id}
                task={task}
                index={idx}
                isActive={idx === activeTask}
                isCompleted={!!completedTasks[task.id]}
                onActivate={() => setActiveTask(idx)}
                onComplete={() => handleCompleteTask(task.id)}
              />
            ))}
          </div>

          {/* Tips or completion */}
          <div style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid #334155' }}>
            {allDone ? (
              <div style={{
                textAlign: 'center',
                padding: '0.75rem',
                borderRadius: '10px',
                background: 'rgba(16,185,129,0.05)',
                border: '1px solid rgba(16,185,129,0.2)',
              }}>
                <Trophy size={24} color="#f59e0b" style={{ margin: '0 auto 0.375rem' }} />
                <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#10b981' }}>
                  Lab Complete!
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  All tasks finished. Great work!
                </div>
                <button
                  onClick={handleReset}
                  style={{
                    marginTop: '0.5rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#94a3b8',
                    background: 'transparent',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={12} />
                  Reset Lab
                </button>
              </div>
            ) : scenario.tips && scenario.tips.length > 0 ? (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontSize: '0.6875rem',
                  fontWeight: '700',
                  color: '#f59e0b',
                  marginBottom: '0.375rem',
                }}>
                  <Info size={12} />
                  Tips
                </div>
                {scenario.tips.map((tip, i) => (
                  <div key={i} style={{
                    fontSize: '0.75rem',
                    color: '#94a3b8',
                    lineHeight: 1.5,
                    padding: '0.125rem 0',
                  }}>
                    {tip}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Right Panel: Interactive Visualizer ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem 1rem',
          borderBottom: '1px solid #334155',
          background: '#1e293b',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setPanelCollapsed(!panelCollapsed)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.375rem 0.625rem',
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#94a3b8',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid #334155',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {panelCollapsed ? '>' : '<'}
              {panelCollapsed ? 'Show Tasks' : 'Hide Tasks'}
            </button>
            <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#f1f5f9' }}>
              {scenario.component}
            </span>
          </div>
          <button
            onClick={() => setFullscreen(!fullscreen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.375rem 0.625rem',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#94a3b8',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid #334155',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        </div>

        {/* Visualizer area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
          <InteractiveComponent
            name={scenario.component}
            config={scenario.config || {}}
          />
        </div>
      </div>
    </div>
  );
}
