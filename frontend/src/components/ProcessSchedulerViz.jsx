import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Cpu, Zap, Info, AlertTriangle, Clock, Plus } from 'lucide-react';

const C = { bg: '#0f172a', card: '#1e293b', border: '#334155', text: '#f1f5f9', muted: '#94a3b8', dim: '#64748b', cyan: '#06b6d4', purple: '#8b5cf6', green: '#10b981', yellow: '#f59e0b', red: '#ef4444' };
const STATE_COLORS = { running: C.green, ready: C.yellow, blocked: C.red, completed: C.cyan, idle: C.border };
const STATE_LABELS = { running: 'Running', ready: 'Ready', blocked: 'Blocked/IO', completed: 'Done' };

const POLICIES = [
  { id: 'fifo', label: 'FIFO', desc: 'First-In First-Out: processes run in arrival order, no preemption.' },
  { id: 'rr', label: 'Round-Robin', desc: 'Each process gets a time quantum then yields. Quantum adjustable.' },
  { id: 'sjf', label: 'Shortest Job', desc: 'Shortest Job First: minimizes avg wait time but requires knowing durations.' },
  { id: 'cfs', label: 'CFS', desc: 'Completely Fair Scheduler (Linux): assigns CPU proportionally via virtual runtime.' },
];

const PRESETS = [
  { id: 'cpu', label: 'CPU-bound Batch', procs: [{ name: 'MatMul-A', threads: 1, type: 'cpu', duration: 8 }, { name: 'MatMul-B', threads: 1, type: 'cpu', duration: 6 }, { name: 'MatMul-C', threads: 1, type: 'cpu', duration: 10 }, { name: 'MatMul-D', threads: 1, type: 'cpu', duration: 7 }] },
  { id: 'mixed', label: 'Mixed I/O', procs: [{ name: 'Compiler', threads: 1, type: 'cpu', duration: 6 }, { name: 'WebServer', threads: 1, type: 'io', duration: 10 }, { name: 'DB-Query', threads: 1, type: 'io', duration: 8 }, { name: 'Render', threads: 1, type: 'cpu', duration: 5 }] },
  { id: 'omp', label: 'OpenMP (4 threads)', procs: [{ name: 'OMP-T0', threads: 4, type: 'cpu', duration: 6, group: 'omp' }, { name: 'Serial', threads: 1, type: 'cpu', duration: 4 }] },
  { id: 'mpi', label: 'MPI+OpenMP Hybrid', procs: [{ name: 'Rank0', threads: 2, type: 'cpu', duration: 7, group: 'mpi0' }, { name: 'Rank1', threads: 2, type: 'cpu', duration: 7, group: 'mpi1' }] },
  { id: 'race', label: 'Race Condition', procs: [{ name: 'Writer-A', threads: 1, type: 'cpu', duration: 4, group: 'race' }, { name: 'Writer-B', threads: 1, type: 'cpu', duration: 4, group: 'race' }] },
];

const NUM_CORES = 6;
const PROC_COLORS = [C.cyan, C.purple, C.green, C.yellow, C.red, '#ec4899', '#14b8a6', '#f97316'];

let pid = 0;
const mkProc = (cfg, arrival = 0) => {
  const tasks = [];
  for (let t = 0; t < (cfg.threads || 1); t++) {
    tasks.push({ id: ++pid, name: cfg.threads > 1 ? `${cfg.name}:T${t}` : cfg.name, type: cfg.type, duration: cfg.duration, remaining: cfg.duration, state: 'ready', core: -1, arrival, waited: 0, turnaround: 0, group: cfg.group || null, color: PROC_COLORS[pid % PROC_COLORS.length] });
  }
  return tasks;
};

export default function ProcessSchedulerViz({ compact = false }) {
  const [policy, setPolicy] = useState('fifo');
  const [quantum, setQuantum] = useState(2);
  const [speed, setSpeed] = useState(1);
  const [tasks, setTasks] = useState([]);
  const [cores, setCores] = useState(Array(NUM_CORES).fill(null));
  const [timeline, setTimeline] = useState([]);
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [info, setInfo] = useState('Choose a preset scenario or add processes, then press Play.');
  const [raceResult, setRaceResult] = useState(null);
  const [lockDemo, setLockDemo] = useState(false);
  const timerRef = useRef(null);

  const reset = useCallback(() => {
    pid = 0; setTasks([]); setCores(Array(NUM_CORES).fill(null)); setTimeline([]); setTick(0); setPlaying(false); setRaceResult(null); setLockDemo(false);
    setInfo('Reset. Choose a scenario to begin.');
  }, []);

  const loadPreset = useCallback((preset) => {
    pid = 0;
    const allTasks = preset.procs.flatMap((p, i) => mkProc(p, i * 1));
    setTasks(allTasks); setCores(Array(NUM_CORES).fill(null)); setTimeline([]); setTick(0); setPlaying(false); setRaceResult(null);
    setLockDemo(false);
    if (preset.id === 'race') {
      setInfo('Race Condition: Two writers to shared variable. Non-deterministic result depends on scheduling. Run multiple times to see different outcomes!');
      setLockDemo(false);
    } else if (preset.id === 'omp') {
      setInfo('OpenMP fork-join: master thread forks 4 worker threads, all run in parallel, then synchronize at a barrier before continuing.');
    } else if (preset.id === 'mpi') {
      setInfo('MPI+OpenMP hybrid: Each MPI rank is a separate process (own memory). Within each rank, OpenMP threads share memory. Best of both worlds.');
    } else {
      setInfo(POLICIES.find(p => p.id === policy).desc);
    }
  }, [policy]);

  const addCustomProc = useCallback(() => {
    const p = mkProc({ name: `Proc${pid + 1}`, threads: 1, type: 'cpu', duration: 4 + Math.floor(Math.random() * 5) }, tick);
    setTasks(prev => [...prev, ...p]);
  }, [tick]);

  const schedule = useCallback((readyList, coreArr) => {
    let sorted = [...readyList];
    if (policy === 'sjf') sorted.sort((a, b) => a.remaining - b.remaining);
    else if (policy === 'cfs') sorted.sort((a, b) => (a.duration - a.remaining) - (b.duration - b.remaining));
    const newCores = [...coreArr];
    for (let c = 0; c < NUM_CORES; c++) {
      if (!newCores[c] && sorted.length > 0) {
        const t = sorted.shift();
        t.state = 'running'; t.core = c; t.quantumLeft = quantum;
        newCores[c] = t;
      }
    }
    return newCores;
  }, [policy, quantum]);

  useEffect(() => {
    if (!playing) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setTick(prev => prev + 1);
      setTasks(prev => {
        const ts = prev.map(t => ({ ...t }));
        const coreArr = Array(NUM_CORES).fill(null);

        // Execute running tasks
        ts.forEach(t => {
          if (t.state === 'running' && t.core >= 0) {
            coreArr[t.core] = t;
          }
        });

        // Simulate tick
        for (let c = 0; c < NUM_CORES; c++) {
          const t = coreArr[c];
          if (t) {
            t.remaining -= 1;
            if (t.type === 'io' && Math.random() < 0.3) {
              t.state = 'blocked'; t.core = -1; coreArr[c] = null;
            } else if (t.remaining <= 0) {
              t.state = 'completed'; t.core = -1; coreArr[c] = null;
              t.turnaround = tick + 1 - t.arrival;
            } else if (policy === 'rr') {
              t.quantumLeft = (t.quantumLeft || quantum) - 1;
              if (t.quantumLeft <= 0) { t.state = 'ready'; t.core = -1; coreArr[c] = null; }
            }
          }
        }

        // Unblock IO tasks with some probability
        ts.forEach(t => { if (t.state === 'blocked' && Math.random() < 0.5) t.state = 'ready'; });

        // Advance waiting time
        ts.forEach(t => { if (t.state === 'ready') t.waited++; });

        // Schedule ready tasks onto free cores
        const readyQueue = ts.filter(t => t.state === 'ready' && t.arrival <= tick);
        const newCores = schedule(readyQueue, coreArr);
        newCores.forEach((t, c) => { if (t) { t.core = c; t.state = 'running'; } });

        setCores(newCores.map(t => t ? t.id : null));
        setTimeline(tl => [...tl, newCores.map(t => t ? { id: t.id, name: t.name, color: t.color, state: 'running' } : null)]);

        // Race condition check
        const raceWriters = ts.filter(t => t.group === 'race' && t.state === 'completed');
        if (raceWriters.length === 2 && !raceResult) {
          const val = Math.random() > 0.5 ? 'Writer-A' : 'Writer-B';
          setRaceResult(`shared_var = ${Math.floor(Math.random() * 100)} (last write by ${val}) — Non-deterministic!`);
        }

        if (ts.every(t => t.state === 'completed' || t.arrival > tick + 20)) setPlaying(false);
        return ts;
      });
    }, 600 / speed);
    return () => clearInterval(timerRef.current);
  }, [playing, policy, quantum, speed, schedule, tick, raceResult]);

  const activeTasks = tasks.filter(t => t.state !== 'completed');
  const doneTasks = tasks.filter(t => t.state === 'completed');
  const cpuUtil = timeline.length > 0 ? Math.round(timeline.reduce((s, snap) => s + snap.filter(Boolean).length, 0) / (timeline.length * NUM_CORES) * 100) : 0;
  const avgWait = doneTasks.length > 0 ? (doneTasks.reduce((s, t) => s + t.waited, 0) / doneTasks.length).toFixed(1) : '-';
  const avgTurn = doneTasks.length > 0 ? (doneTasks.reduce((s, t) => s + t.turnaround, 0) / doneTasks.length).toFixed(1) : '-';

  const ganttStart = Math.max(0, timeline.length - 30);
  const ganttSlice = timeline.slice(ganttStart);
  const cellW = compact ? 18 : 22, cellH = compact ? 16 : 20, labelW = 52;
  const ganttW = labelW + ganttSlice.length * cellW + 10;
  const ganttH = NUM_CORES * cellH + 30;

  const s = {
    wrap: { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: compact ? 12 : 16, fontFamily: 'system-ui, sans-serif', color: C.text, maxWidth: 860 },
    row: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' },
    btn: (a) => ({ padding: '5px 12px', borderRadius: 6, border: `1px solid ${a ? C.cyan : C.border}`, background: a ? C.cyan + '22' : C.card, color: a ? C.cyan : C.muted, cursor: 'pointer', fontSize: 13, fontWeight: a ? 600 : 400 }),
    playBtn: { padding: '5px 14px', borderRadius: 6, border: `1px solid ${C.green}`, background: C.green + '22', color: C.green, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 },
    svg: { background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, width: '100%', display: 'block' },
    info: { background: C.card, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: C.muted, border: `1px solid ${C.border}`, marginTop: 8, lineHeight: 1.5 },
    metric: { display: 'inline-block', background: C.bg, borderRadius: 6, padding: '3px 10px', fontSize: 11, color: C.cyan, marginRight: 6, border: `1px solid ${C.border}` },
    badge: (color) => ({ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: color, marginRight: 4 }),
    title: { fontSize: 15, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: 6 },
  };

  return (
    <div style={s.wrap}>
      <div style={{ ...s.row, justifyContent: 'space-between' }}>
        <span style={s.title}><Cpu size={16} color={C.cyan} /> Process Scheduler Visualizer</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setPlaying(p => !p)} style={s.playBtn}>{playing ? <Pause size={13}/> : <Play size={13}/>} {playing ? 'Pause' : 'Play'}</button>
          <button onClick={reset} style={s.btn(false)}><RotateCcw size={13} /></button>
        </div>
      </div>

      {/* Policy selector */}
      <div style={s.row}>
        {POLICIES.map(p => <button key={p.id} style={s.btn(policy === p.id)} onClick={() => { setPolicy(p.id); setInfo(p.desc); }}>{p.label}</button>)}
        {policy === 'rr' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: C.muted }}>
            Q=<input type="range" min={1} max={5} value={quantum} onChange={e => setQuantum(+e.target.value)} style={{ width: 60, accentColor: C.cyan }} />{quantum}
          </span>
        )}
        <span style={{ color: C.dim, fontSize: 11 }}>│</span>
        <span style={{ fontSize: 12, color: C.muted }}>Speed:</span>
        {[1, 2, 4].map(sp => <button key={sp} style={s.btn(speed === sp)} onClick={() => setSpeed(sp)}>{sp}x</button>)}
      </div>

      {/* Presets */}
      <div style={s.row}>
        {PRESETS.map(p => <button key={p.id} style={s.btn(false)} onClick={() => loadPreset(p)}>{p.label}</button>)}
        <button style={{ ...s.btn(false), display: 'flex', alignItems: 'center', gap: 3 }} onClick={addCustomProc}><Plus size={12}/> Add Process</button>
        {tasks.some(t => t.group === 'race') && (
          <button style={s.btn(lockDemo)} onClick={() => { setLockDemo(l => !l); setInfo(lockDemo ? 'Mutex disabled — race condition possible!' : 'Mutex enabled: Writers acquire lock sequentially. Serialized access prevents data races, but adds contention overhead.'); }}>
            {lockDemo ? '🔒 Mutex ON' : '🔓 No Lock'}
          </button>
        )}
      </div>

      {/* Task status bar */}
      <div style={{ ...s.row, gap: 12 }}>
        {tasks.slice(0, 10).map(t => (
          <span key={t.id} style={{ fontSize: 11, color: STATE_COLORS[t.state], display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={s.badge(t.color)} />{t.name}: {STATE_LABELS[t.state] || t.state}
          </span>
        ))}
      </div>

      {/* Gantt Chart */}
      <svg viewBox={`0 0 ${ganttW} ${ganttH}`} style={s.svg}>
        {Array.from({ length: NUM_CORES }).map((_, c) => (
          <g key={c}>
            <text x={4} y={18 + c * cellH} fill={C.muted} fontSize={10}>Core {c}</text>
            <rect x={labelW} y={6 + c * cellH} width={ganttSlice.length * cellW} height={cellH - 2} rx={3} fill={C.bg} opacity={0.5} />
            {ganttSlice.map((snap, ti) => {
              const entry = snap[c];
              return entry ? (
                <rect key={ti} x={labelW + ti * cellW} y={6 + c * cellH} width={cellW - 1} height={cellH - 2} rx={2} fill={entry.color} opacity={0.85}>
                  <title>{entry.name}</title>
                </rect>
              ) : null;
            })}
          </g>
        ))}
        {/* Time axis */}
        {ganttSlice.map((_, ti) => ti % 5 === 0 ? (
          <text key={ti} x={labelW + ti * cellW + 2} y={ganttH - 2} fill={C.dim} fontSize={8}>{ganttStart + ti}</text>
        ) : null)}
        <text x={ganttW - 5} y={ganttH - 2} textAnchor="end" fill={C.dim} fontSize={8}>t={tick}</text>
      </svg>

      {/* Legend */}
      <div style={{ ...s.row, marginTop: 6, gap: 14 }}>
        {Object.entries(STATE_COLORS).filter(([k]) => k !== 'idle').map(([k, v]) => (
          <span key={k} style={{ fontSize: 11, color: v, display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ ...s.badge(v), width: 10, height: 10, borderRadius: 3 }} />{STATE_LABELS[k] || k}
          </span>
        ))}
      </div>

      {/* Metrics */}
      <div style={{ ...s.row, marginTop: 4 }}>
        <span style={s.metric}>CPU Util: {cpuUtil}%</span>
        <span style={s.metric}>Avg Wait: {avgWait} ticks</span>
        <span style={s.metric}>Avg Turnaround: {avgTurn} ticks</span>
        <span style={s.metric}>Throughput: {timeline.length > 0 ? (doneTasks.length / (timeline.length || 1)).toFixed(2) : '-'} proc/tick</span>
        <span style={s.metric}>Tick: {tick}</span>
      </div>

      {/* Race result */}
      {raceResult && (
        <div style={{ ...s.info, borderColor: C.red, color: C.red }}>
          <AlertTriangle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          <strong>Race Result: </strong>{raceResult}
          {lockDemo && <span style={{ color: C.green }}> — With mutex: access serialized, result deterministic.</span>}
        </div>
      )}

      {/* Info */}
      <div style={s.info}>
        <Info size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} color={C.cyan} />
        {info}
      </div>

      {!compact && (
        <div style={{ ...s.info, marginTop: 6 }}>
          <Zap size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} color={C.yellow} />
          <strong style={{ color: C.yellow }}>Concepts: </strong>
          <span><b>Context switch</b> ~1-10μs overhead (RR). <b>CFS</b> uses red-black tree of virtual runtimes (Linux default). <b>OpenMP</b> fork-join: master forks threads at <code>#pragma omp parallel</code>, barrier syncs at end. <b>MPI</b> ranks have separate address spaces — communicate via message passing (Send/Recv). <b>Hybrid MPI+OpenMP</b>: MPI across nodes, OpenMP within node for shared-memory parallelism.</span>
        </div>
      )}
    </div>
  );
}
