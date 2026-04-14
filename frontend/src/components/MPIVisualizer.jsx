import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Zap, ArrowRight } from 'lucide-react';

const RANK_COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];

const PATTERNS = [
  {
    id: 'p2p', label: 'Point-to-Point',
    desc: 'MPI_Send / MPI_Recv between two ranks',
    ranks: 4, steps: [
      { from: 0, to: 1, label: 'Send(data, 1)', tag: 'MPI_Send' },
      { from: 1, to: 0, label: 'Send(ack, 0)', tag: 'MPI_Recv' },
    ]
  },
  {
    id: 'bcast', label: 'Broadcast',
    desc: 'MPI_Bcast — root sends data to all ranks',
    ranks: 6, steps: [
      { from: 0, to: 1, label: 'Bcast', tag: 'MPI_Bcast' },
      { from: 0, to: 2, label: 'Bcast', tag: 'MPI_Bcast' },
      { from: 0, to: 3, label: 'Bcast', tag: 'MPI_Bcast' },
      { from: 0, to: 4, label: 'Bcast', tag: 'MPI_Bcast' },
      { from: 0, to: 5, label: 'Bcast', tag: 'MPI_Bcast' },
    ]
  },
  {
    id: 'scatter', label: 'Scatter',
    desc: 'MPI_Scatter — root distributes chunks to each rank',
    ranks: 4, steps: [
      { from: 0, to: 0, label: 'chunk[0]', tag: 'local' },
      { from: 0, to: 1, label: 'chunk[1]', tag: 'MPI_Scatter' },
      { from: 0, to: 2, label: 'chunk[2]', tag: 'MPI_Scatter' },
      { from: 0, to: 3, label: 'chunk[3]', tag: 'MPI_Scatter' },
    ]
  },
  {
    id: 'gather', label: 'Gather',
    desc: 'MPI_Gather — all ranks send results to root',
    ranks: 4, steps: [
      { from: 1, to: 0, label: 'result[1]', tag: 'MPI_Gather' },
      { from: 2, to: 0, label: 'result[2]', tag: 'MPI_Gather' },
      { from: 3, to: 0, label: 'result[3]', tag: 'MPI_Gather' },
    ]
  },
  {
    id: 'allreduce', label: 'AllReduce',
    desc: 'MPI_Allreduce — reduce + broadcast (ring algorithm)',
    ranks: 4, steps: [
      { from: 0, to: 1, label: 'partial_sum', tag: 'Ring step 1' },
      { from: 1, to: 2, label: 'partial_sum', tag: 'Ring step 1' },
      { from: 2, to: 3, label: 'partial_sum', tag: 'Ring step 1' },
      { from: 3, to: 0, label: 'partial_sum', tag: 'Ring step 1' },
      { from: 0, to: 1, label: 'result', tag: 'Ring step 2' },
      { from: 1, to: 2, label: 'result', tag: 'Ring step 2' },
      { from: 2, to: 3, label: 'result', tag: 'Ring step 2' },
      { from: 3, to: 0, label: 'result', tag: 'Ring step 2' },
    ]
  },
  {
    id: 'alltoall', label: 'All-to-All',
    desc: 'MPI_Alltoall — every rank sends to every other',
    ranks: 4, steps: [
      { from: 0, to: 1, label: 'd01', tag: 'MPI_Alltoall' },
      { from: 0, to: 2, label: 'd02', tag: 'MPI_Alltoall' },
      { from: 0, to: 3, label: 'd03', tag: 'MPI_Alltoall' },
      { from: 1, to: 0, label: 'd10', tag: 'MPI_Alltoall' },
      { from: 1, to: 2, label: 'd12', tag: 'MPI_Alltoall' },
      { from: 1, to: 3, label: 'd13', tag: 'MPI_Alltoall' },
      { from: 2, to: 0, label: 'd20', tag: 'MPI_Alltoall' },
      { from: 2, to: 1, label: 'd21', tag: 'MPI_Alltoall' },
      { from: 2, to: 3, label: 'd23', tag: 'MPI_Alltoall' },
      { from: 3, to: 0, label: 'd30', tag: 'MPI_Alltoall' },
      { from: 3, to: 1, label: 'd31', tag: 'MPI_Alltoall' },
      { from: 3, to: 2, label: 'd32', tag: 'MPI_Alltoall' },
    ]
  },
];

function RankNode({ x, y, rank, active, receiving, size = 40 }) {
  const color = RANK_COLORS[rank % RANK_COLORS.length];
  return (
    <g>
      <circle cx={x} cy={y} r={size / 2} fill={active ? color : '#1e293b'} stroke={color} strokeWidth={receiving ? 3 : 2}
        style={{ transition: 'all 300ms ease', filter: active ? `drop-shadow(0 0 8px ${color}66)` : 'none' }} />
      <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle"
        fill={active ? '#0f172a' : color} fontSize="12" fontWeight="700" fontFamily="monospace">
        R{rank}
      </text>
    </g>
  );
}

function MessageArrow({ x1, y1, x2, y2, label, progress, color }) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = dx / len, ny = dy / len;
  const offset = 24;
  const sx = x1 + nx * offset, sy = y1 + ny * offset;
  const ex = x2 - nx * offset, ey = y2 - ny * offset;
  // Current position of the "packet"
  const px = sx + (ex - sx) * progress, py = sy + (ey - sy) * progress;
  return (
    <g>
      <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={color} strokeWidth={1} strokeDasharray="4,4" opacity={0.3} />
      {progress < 1 && (
        <circle cx={px} cy={py} r={5} fill={color} style={{ filter: `drop-shadow(0 0 6px ${color})` }}>
          <animate attributeName="r" values="4;6;4" dur="0.5s" repeatCount="indefinite" />
        </circle>
      )}
      {progress >= 0.4 && progress <= 0.6 && (
        <text x={px} y={py - 10} textAnchor="middle" fill={color} fontSize="9" fontWeight="600" fontFamily="monospace">{label}</text>
      )}
      {progress >= 1 && (
        <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={color} strokeWidth={2} opacity={0.5} markerEnd="url(#arrowhead)" />
      )}
    </g>
  );
}

export default function MPIVisualizer({ compact = false }) {
  const [pattern, setPattern] = useState(PATTERNS[0]);
  const [stepIdx, setStepIdx] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const animRef = useRef(null);

  const width = compact ? 320 : 440;
  const height = compact ? 240 : 300;
  const cx = width / 2, cy = height / 2;
  const radius = Math.min(width, height) * 0.35;

  const rankPositions = Array.from({ length: pattern.ranks }, (_, i) => {
    const angle = (2 * Math.PI * i) / pattern.ranks - Math.PI / 2;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });

  const reset = useCallback(() => {
    setRunning(false);
    setStepIdx(-1);
    setProgress(0);
  }, []);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 1) {
          setStepIdx(si => {
            if (si + 1 >= pattern.steps.length) { setRunning(false); return si; }
            return si + 1;
          });
          return 0;
        }
        return prev + 0.05 * speed;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [running, pattern, speed]);

  const startAnim = () => {
    setStepIdx(0);
    setProgress(0);
    setRunning(true);
  };

  const activeStep = stepIdx >= 0 && stepIdx < pattern.steps.length ? pattern.steps[stepIdx] : null;
  const completedSteps = stepIdx >= 0 ? pattern.steps.slice(0, stepIdx) : [];

  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(6,182,212,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={16} color="#06b6d4" />
          <span style={{ fontWeight: '700', fontSize: '0.9375rem', color: '#f1f5f9' }}>MPI Communication Visualizer</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={running ? () => setRunning(false) : startAnim} style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid #334155', background: running ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: running ? '#ef4444' : '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: '600' }}>
            {running ? <><Pause size={12} />Pause</> : <><Play size={12} />Animate</>}
          </button>
          <button onClick={reset} style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid #334155', background: 'rgba(100,116,139,0.1)', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {/* Pattern selector */}
      <div style={{ padding: '0.5rem 0.75rem', display: 'flex', gap: '0.375rem', flexWrap: 'wrap', borderBottom: '1px solid #334155' }}>
        {PATTERNS.map(p => (
          <button key={p.id} onClick={() => { reset(); setPattern(p); }}
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.6875rem', borderRadius: '4px', border: '1px solid #334155', background: pattern.id === p.id ? 'rgba(6,182,212,0.15)' : '#0f172a', color: pattern.id === p.id ? '#06b6d4' : '#64748b', cursor: 'pointer' }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* SVG visualization */}
      <div style={{ padding: '0.5rem', display: 'flex', justifyContent: 'center' }}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
            </marker>
          </defs>
          {/* Completed arrows */}
          {completedSteps.map((step, i) => {
            const from = rankPositions[step.from], to = rankPositions[step.to];
            if (step.from === step.to) return null;
            return <MessageArrow key={`done-${i}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} label={step.label} progress={1} color={RANK_COLORS[step.from % RANK_COLORS.length]} />;
          })}
          {/* Active arrow */}
          {activeStep && activeStep.from !== activeStep.to && (
            <MessageArrow x1={rankPositions[activeStep.from].x} y1={rankPositions[activeStep.from].y} x2={rankPositions[activeStep.to].x} y2={rankPositions[activeStep.to].y}
              label={activeStep.label} progress={progress} color={RANK_COLORS[activeStep.from % RANK_COLORS.length]} />
          )}
          {/* Rank nodes */}
          {rankPositions.map((pos, i) => (
            <RankNode key={i} x={pos.x} y={pos.y} rank={i}
              active={activeStep && (activeStep.from === i)}
              receiving={activeStep && activeStep.to === i && progress > 0.8}
              size={compact ? 36 : 44} />
          ))}
        </svg>
      </div>

      {/* Info bar */}
      <div style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid #334155', background: '#0d1117' }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: '700', color: '#f1f5f9', marginBottom: '0.25rem' }}>{pattern.label}</div>
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>{pattern.desc}</div>
        {activeStep && (
          <div style={{ fontSize: '0.75rem', color: '#06b6d4', fontFamily: 'monospace' }}>
            Step {stepIdx + 1}/{pattern.steps.length}: Rank {activeStep.from} → Rank {activeStep.to} [{activeStep.tag}]
          </div>
        )}
        {!running && stepIdx >= pattern.steps.length - 1 && stepIdx >= 0 && (
          <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>Communication complete! All {pattern.steps.length} messages delivered.</div>
        )}
      </div>
    </div>
  );
}
