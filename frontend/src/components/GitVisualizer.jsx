import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GitBranch, GitCommit, GitMerge, RotateCcw, Play, Info, AlertTriangle, ChevronDown, Copy, CheckCircle, ArrowRight, BookOpen } from 'lucide-react';

/* ── colour palette (Tailwind slate) ─────────────────────────── */
const C = {
  bg: '#0f172a', surface: '#1e293b', border: '#334155',
  text: '#f1f5f9', muted: '#94a3b8', dim: '#64748b',
  cyan: '#06b6d4', green: '#34d399', red: '#f87171',
  yellow: '#fbbf24', purple: '#a78bfa', orange: '#fb923c',
  pink: '#f472b6', blue: '#60a5fa',
};
const BRANCH_COLORS = [C.cyan, C.green, C.purple, C.orange, C.pink, C.yellow, C.blue, C.red];

/* ── simulated diffs per-commit type ─────────────────────────── */
const DIFF_TEMPLATES = [
  { file: 'src/model.py', add: ['+  layer = nn.Linear(512, 256)', '+  self.dropout = nn.Dropout(0.3)'], del: ['-  layer = nn.Linear(512, 512)'] },
  { file: 'slurm/train.sbatch', add: ['+  #SBATCH --gres=gpu:4', '+  #SBATCH --time=48:00:00'], del: ['-  #SBATCH --gres=gpu:1'] },
  { file: 'config.yaml', add: ['+  batch_size: 128', '+  learning_rate: 0.0003'], del: ['-  batch_size: 64'] },
  { file: 'utils/data_loader.py', add: ['+  num_workers = os.cpu_count()', '+  prefetch_factor = 4'], del: [] },
  { file: 'tests/test_model.py', add: ['+  assert acc > 0.92, "Accuracy regression"'], del: ['-  assert acc > 0.85'] },
];

let _uid = 100;
const uid = () => `c${_uid++}`;

/* ── preset scenarios ────────────────────────────────────────── */
const PRESETS = {
  'feature-branch': {
    label: 'Feature Branch Workflow',
    desc: 'Create a feature branch, add commits, and merge back into main.',
    build: () => {
      const c1 = { id: uid(), msg: 'Initial commit', branch: 'main', parents: [], ts: 1 };
      const c2 = { id: uid(), msg: 'Add training script', branch: 'main', parents: [c1.id], ts: 2 };
      const c3 = { id: uid(), msg: 'Add GPU kernels', branch: 'feature/gpu', parents: [c2.id], ts: 3 };
      const c4 = { id: uid(), msg: 'Optimise memory', branch: 'feature/gpu', parents: [c3.id], ts: 4 };
      const c5 = { id: uid(), msg: 'Update README', branch: 'main', parents: [c2.id], ts: 5 };
      const c6 = { id: uid(), msg: 'Merge feature/gpu', branch: 'main', parents: [c5.id, c4.id], ts: 6, merge: true };
      return {
        commits: [c1, c2, c3, c4, c5, c6],
        branches: [{ name: 'main', color: C.cyan }, { name: 'feature/gpu', color: C.green }],
        head: { branch: 'main', commitId: c6.id },
      };
    },
  },
  'gitflow': {
    label: 'GitFlow',
    desc: 'Full GitFlow with main, develop, feature, release and hotfix branches.',
    build: () => {
      const c1 = { id: uid(), msg: 'v1.0 release', branch: 'main', parents: [], ts: 1 };
      const c2 = { id: uid(), msg: 'Start develop', branch: 'develop', parents: [c1.id], ts: 2 };
      const c3 = { id: uid(), msg: 'Feature: multi-GPU', branch: 'feature/multi-gpu', parents: [c2.id], ts: 3 };
      const c4 = { id: uid(), msg: 'Fix data loader', branch: 'develop', parents: [c2.id], ts: 4 };
      const c5 = { id: uid(), msg: 'Merge feature', branch: 'develop', parents: [c4.id, c3.id], ts: 5, merge: true };
      const c6 = { id: uid(), msg: 'Release 1.1 prep', branch: 'release/1.1', parents: [c5.id], ts: 6 };
      const c7 = { id: uid(), msg: 'Hotfix: OOM crash', branch: 'hotfix/oom', parents: [c1.id], ts: 7 };
      const c8 = { id: uid(), msg: 'Merge hotfix', branch: 'main', parents: [c1.id, c7.id], ts: 8, merge: true };
      return {
        commits: [c1, c2, c3, c4, c5, c6, c7, c8],
        branches: [
          { name: 'main', color: C.cyan }, { name: 'develop', color: C.green },
          { name: 'feature/multi-gpu', color: C.purple }, { name: 'release/1.1', color: C.orange },
          { name: 'hotfix/oom', color: C.red },
        ],
        head: { branch: 'main', commitId: c8.id },
      };
    },
  },
  'rebase-vs-merge': {
    label: 'Rebase vs Merge',
    desc: 'Compare merge commits with a linear rebase history side by side.',
    build: () => {
      const c1 = { id: uid(), msg: 'Base commit', branch: 'main', parents: [], ts: 1 };
      const c2 = { id: uid(), msg: 'Main work', branch: 'main', parents: [c1.id], ts: 2 };
      const c3 = { id: uid(), msg: 'Feature A', branch: 'feature', parents: [c1.id], ts: 3 };
      const c4 = { id: uid(), msg: 'Feature B', branch: 'feature', parents: [c3.id], ts: 4 };
      const c5 = { id: uid(), msg: 'Merge feature', branch: 'main', parents: [c2.id, c4.id], ts: 5, merge: true };
      return {
        commits: [c1, c2, c3, c4, c5],
        branches: [{ name: 'main', color: C.cyan }, { name: 'feature', color: C.purple }],
        head: { branch: 'main', commitId: c5.id },
      };
    },
  },
  'conflict': {
    label: 'Conflict Resolution',
    desc: 'Two branches edit the same file - experience a merge conflict.',
    build: () => {
      const c1 = { id: uid(), msg: 'Shared base', branch: 'main', parents: [], ts: 1 };
      const c2 = { id: uid(), msg: 'Edit config (ours)', branch: 'main', parents: [c1.id], ts: 2, diff: { file: 'config.yaml', add: ['+  gpus: 4'], del: ['-  gpus: 1'] } };
      const c3 = { id: uid(), msg: 'Edit config (theirs)', branch: 'experiment', parents: [c1.id], ts: 3, diff: { file: 'config.yaml', add: ['+  gpus: 8'], del: ['-  gpus: 1'] } };
      return {
        commits: [c1, c2, c3],
        branches: [{ name: 'main', color: C.cyan }, { name: 'experiment', color: C.orange }],
        head: { branch: 'main', commitId: c2.id },
      };
    },
  },
};

/* ── teaching tips ───────────────────────────────────────────── */
const TIPS = {
  branch: { title: 'Why use branches?', body: 'Branches let HPC teams work on GPU kernels, job scripts, and model architecture in parallel without breaking the shared codebase.' },
  merge: { title: 'Merge vs Rebase', body: 'Merge preserves full history with a merge commit. Rebase replays commits for a linear history - cleaner but rewrites SHAs. On shared HPC repos, prefer merge to avoid confusion.' },
  practices: { title: 'HPC Best Practices', body: 'Keep Slurm scripts on main. Use feature branches for experiments. Tag releases that match published results for reproducibility.' },
};

const TUTORIAL_STEPS = [
  { cmd: null, text: 'Welcome! This tutorial walks you through a complete Git workflow for an HPC project. Click Next to begin.' },
  { cmd: 'commit', text: 'First, create a commit. This saves a snapshot of your code. Click "git commit" or press Next.' },
  { cmd: 'branch', text: 'Now create a branch called "feature" to work on a GPU optimisation without affecting main.' },
  { cmd: 'commit', text: 'Add a commit on your feature branch to record your changes.' },
  { cmd: 'checkout', text: 'Switch back to "main" to prepare for integration.' },
  { cmd: 'merge', text: 'Merge your feature branch into main. If no conflicts exist, a merge commit is created!' },
  { cmd: null, text: 'Congratulations! You completed a feature branch workflow. Explore other presets or try your own commands.' },
];

/* ================================================================
   Component
   ================================================================ */
const GitVisualizer = ({ compact = false, preset: presetProp, config = {} }) => {
  const initialPreset = presetProp || config.preset || 'feature-branch';
  const [activePreset, setActivePreset] = useState(initialPreset);
  const [commits, setCommits] = useState([]);
  const [branches, setBranches] = useState([]);
  const [head, setHead] = useState({ branch: 'main', commitId: null });
  const [selectedCommit, setSelectedCommit] = useState(null);
  const [cmdInput, setCmdInput] = useState('');
  const [log, setLog] = useState([]);
  const [conflict, setConflict] = useState(null);
  const [showTip, setShowTip] = useState(null);
  const [tutorialStep, setTutorialStep] = useState(-1);
  const [animatingId, setAnimatingId] = useState(null);
  const svgRef = useRef(null);
  const animTimer = useRef(null);

  /* ── load preset ────────────────────────────────────────────── */
  const loadPreset = useCallback((key) => {
    const p = PRESETS[key];
    if (!p) return;
    const data = p.build();
    setCommits(data.commits);
    setBranches(data.branches);
    setHead(data.head);
    setSelectedCommit(null);
    setConflict(null);
    setLog([`Loaded preset: ${p.label}`]);
    setTutorialStep(-1);
    setActivePreset(key);
  }, []);

  useEffect(() => { loadPreset(activePreset); }, []);

  /* ── helpers ────────────────────────────────────────────────── */
  const branchColor = useCallback((name) => {
    const b = branches.find(br => br.name === name);
    return b ? b.color : C.dim;
  }, [branches]);

  const branchRow = useCallback((name) => {
    const idx = branches.findIndex(br => br.name === name);
    return idx >= 0 ? idx : 0;
  }, [branches]);

  const headCommit = useCallback(() => commits.find(c => c.id === head.commitId), [commits, head]);

  const appendLog = (msg) => setLog(prev => [...prev.slice(-19), msg]);

  const randomDiff = () => DIFF_TEMPLATES[Math.floor(Math.random() * DIFF_TEMPLATES.length)];

  const animateCommit = (id) => {
    setAnimatingId(id);
    clearTimeout(animTimer.current);
    animTimer.current = setTimeout(() => setAnimatingId(null), 500);
  };

  /* ── git operations ─────────────────────────────────────────── */
  const doCommit = useCallback(() => {
    const diff = randomDiff();
    const newC = { id: uid(), msg: `Update ${diff.file.split('/').pop()}`, branch: head.branch, parents: [head.commitId], ts: commits.length + 1, diff };
    setCommits(prev => [...prev, newC]);
    setHead(h => ({ ...h, commitId: newC.id }));
    animateCommit(newC.id);
    appendLog(`[${head.branch}] new commit ${newC.id.slice(0, 7)}`);
  }, [head, commits]);

  const doBranch = useCallback((name) => {
    if (!name || branches.find(b => b.name === name)) { appendLog(`Branch "${name}" already exists`); return; }
    const color = BRANCH_COLORS[branches.length % BRANCH_COLORS.length];
    setBranches(prev => [...prev, { name, color }]);
    appendLog(`Created branch "${name}" at ${head.commitId?.slice(0, 7)}`);
  }, [branches, head]);

  const doCheckout = useCallback((name) => {
    const b = branches.find(br => br.name === name);
    if (!b) { appendLog(`Branch "${name}" not found`); return; }
    const latest = [...commits].reverse().find(c => c.branch === name);
    if (latest) setHead({ branch: name, commitId: latest.id });
    else setHead(h => ({ ...h, branch: name }));
    appendLog(`Switched to branch "${name}"`);
  }, [branches, commits]);

  const doMerge = useCallback((srcName) => {
    const srcLatest = [...commits].reverse().find(c => c.branch === srcName);
    if (!srcLatest) { appendLog(`Nothing to merge from "${srcName}"`); return; }
    /* conflict check: both branches edit same file */
    const hc = headCommit();
    if (hc?.diff && srcLatest.diff && hc.diff.file === srcLatest.diff.file) {
      setConflict({ ours: hc, theirs: srcLatest, file: hc.diff.file });
      appendLog(`CONFLICT in ${hc.diff.file} — resolve before merging`);
      return;
    }
    const mc = { id: uid(), msg: `Merge ${srcName} into ${head.branch}`, branch: head.branch, parents: [head.commitId, srcLatest.id], ts: commits.length + 1, merge: true };
    setCommits(prev => [...prev, mc]);
    setHead(h => ({ ...h, commitId: mc.id }));
    animateCommit(mc.id);
    appendLog(`Merged "${srcName}" into "${head.branch}"`);
  }, [commits, head, headCommit]);

  const doRebase = useCallback((onto) => {
    const currentBranchCommits = commits.filter(c => c.branch === head.branch && c.parents[0] !== undefined);
    const ontoLatest = [...commits].reverse().find(c => c.branch === onto);
    if (!ontoLatest || currentBranchCommits.length === 0) { appendLog('Nothing to rebase'); return; }
    const rebased = currentBranchCommits.map((c, i) => ({
      ...c, id: uid(), parents: [i === 0 ? ontoLatest.id : undefined].filter(Boolean), ts: commits.length + i + 1,
    }));
    setCommits(prev => [...prev.filter(c => c.branch !== head.branch), ...rebased]);
    setHead(h => ({ ...h, commitId: rebased[rebased.length - 1].id }));
    appendLog(`Rebased "${head.branch}" onto "${onto}"`);
  }, [commits, head]);

  const doReset = useCallback(() => {
    const hc = headCommit();
    if (!hc || hc.parents.length === 0) { appendLog('Nothing to reset'); return; }
    setHead(h => ({ ...h, commitId: hc.parents[0] }));
    appendLog(`HEAD reset to ${hc.parents[0]?.slice(0, 7)}`);
  }, [headCommit]);

  const doCherryPick = useCallback((cid) => {
    const src = commits.find(c => c.id === cid);
    if (!src) return;
    const cp = { id: uid(), msg: `Cherry-pick: ${src.msg}`, branch: head.branch, parents: [head.commitId], ts: commits.length + 1, diff: src.diff };
    setCommits(prev => [...prev, cp]);
    setHead(h => ({ ...h, commitId: cp.id }));
    animateCommit(cp.id);
    appendLog(`Cherry-picked ${cid.slice(0, 7)} onto "${head.branch}"`);
  }, [commits, head]);

  const resolveConflict = useCallback((choice) => {
    if (!conflict) return;
    const winner = choice === 'ours' ? conflict.ours : conflict.theirs;
    const mc = { id: uid(), msg: `Resolve conflict (${choice}) & merge`, branch: head.branch, parents: [conflict.ours.id, conflict.theirs.id], ts: commits.length + 1, merge: true, diff: winner.diff };
    setCommits(prev => [...prev, mc]);
    setHead(h => ({ ...h, commitId: mc.id }));
    setConflict(null);
    animateCommit(mc.id);
    appendLog(`Conflict resolved (${choice}), merge commit created`);
  }, [conflict, head, commits]);

  /* ── command parser ─────────────────────────────────────────── */
  const runCmd = (raw) => {
    const parts = raw.trim().split(/\s+/);
    if (parts[0] === 'git') parts.shift();
    const cmd = parts[0];
    const arg = parts.slice(1).join(' ');
    switch (cmd) {
      case 'commit': doCommit(); break;
      case 'branch': doBranch(arg || 'feature'); break;
      case 'checkout': doCheckout(arg || 'main'); break;
      case 'merge': doMerge(arg || branches.find(b => b.name !== head.branch)?.name || ''); break;
      case 'rebase': doRebase(arg || 'main'); break;
      case 'reset': doReset(); break;
      case 'cherry-pick': doCherryPick(arg); break;
      default: appendLog(`Unknown command: ${cmd}`);
    }
    setCmdInput('');
  };

  /* ── tutorial ───────────────────────────────────────────────── */
  const advanceTutorial = () => {
    const next = tutorialStep + 1;
    if (next >= TUTORIAL_STEPS.length) { setTutorialStep(-1); return; }
    setTutorialStep(next);
    const step = TUTORIAL_STEPS[next];
    if (step.cmd === 'commit') doCommit();
    else if (step.cmd === 'branch') doBranch('feature');
    else if (step.cmd === 'checkout') doCheckout('main');
    else if (step.cmd === 'merge') doMerge('feature');
  };

  /* ── SVG layout ─────────────────────────────────────────────── */
  const NODE_R = compact ? 10 : 14;
  const X_STEP = compact ? 70 : 100;
  const Y_STEP = compact ? 40 : 55;
  const PAD = 40;
  const svgW = Math.max(400, commits.length * X_STEP + PAD * 2 + 60);
  const svgH = Math.max(160, branches.length * Y_STEP + PAD * 2);

  const posOf = (c) => {
    const idx = commits.indexOf(c);
    return { x: PAD + idx * X_STEP + 30, y: PAD + branchRow(c.branch) * Y_STEP + 20 };
  };

  /* ── styles (compact-aware) ─────────────────────────────────── */
  const s = {
    wrap: { background: C.bg, borderRadius: 12, border: `1px solid ${C.border}`, padding: compact ? 16 : 24, fontFamily: "'Inter',system-ui,sans-serif", color: C.text, minWidth: 0 },
    title: { fontSize: compact ? 18 : 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, marginBottom: compact ? 10 : 16 },
    grid: { display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 320px', gap: compact ? 12 : 20 },
    panel: { background: C.surface, borderRadius: 8, border: `1px solid ${C.border}`, padding: compact ? 10 : 16 },
    btn: (clr, active) => ({ padding: '5px 12px', borderRadius: 6, border: `1px solid ${active ? clr : C.border}`, background: active ? clr + '22' : 'transparent', color: active ? clr : C.muted, cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all .15s', whiteSpace: 'nowrap' }),
    input: { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, padding: '6px 10px', fontSize: 13, fontFamily: "'JetBrains Mono',monospace", flex: 1, outline: 'none' },
    tag: (clr) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: clr + '22', color: clr, border: `1px solid ${clr}44` }),
    label: { fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
    logLine: { fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: C.dim, padding: '2px 0' },
    tipBox: { background: C.cyan + '11', border: `1px solid ${C.cyan}44`, borderRadius: 8, padding: 12, marginBottom: 12 },
  };

  /* ── render ─────────────────────────────────────────────────── */
  return (
    <div style={s.wrap}>
      {/* Header */}
      <div style={s.title}>
        <GitBranch size={compact ? 20 : 24} color={C.cyan} />
        Git DAG Visualizer
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Object.entries(PRESETS).map(([k, v]) => (
            <button key={k} style={s.btn(C.cyan, activePreset === k)} onClick={() => loadPreset(k)}>{v.label}</button>
          ))}
          <button style={s.btn(C.yellow, tutorialStep >= 0)} onClick={() => { if (tutorialStep >= 0) setTutorialStep(-1); else { loadPreset('feature-branch'); setTutorialStep(0); } }}>
            <BookOpen size={12} style={{ marginRight: 4, verticalAlign: -2 }} />{tutorialStep >= 0 ? 'Exit Tutorial' : 'Tutorial'}
          </button>
        </div>
      </div>

      {/* Tutorial banner */}
      {tutorialStep >= 0 && tutorialStep < TUTORIAL_STEPS.length && (
        <div style={{ ...s.tipBox, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Info size={18} color={C.cyan} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, flex: 1 }}>
            <strong>Step {tutorialStep + 1}/{TUTORIAL_STEPS.length}:</strong>{' '}
            {TUTORIAL_STEPS[tutorialStep].text}
          </span>
          <button style={s.btn(C.cyan, true)} onClick={advanceTutorial}>
            {tutorialStep === TUTORIAL_STEPS.length - 1 ? 'Finish' : 'Next'} <ArrowRight size={12} style={{ verticalAlign: -2 }} />
          </button>
        </div>
      )}

      <div style={s.grid}>
        {/* ─── LEFT: DAG + controls ───────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 10 : 16 }}>
          {/* SVG DAG */}
          <div style={{ ...s.panel, overflow: 'auto', maxHeight: compact ? 260 : 380 }}>
            <div style={s.label}>Commit Graph</div>
            <svg ref={svgRef} width={svgW} height={svgH} style={{ display: 'block' }}>
              <defs>
                <filter id="glow"><feGaussianBlur stdDeviation="3" result="g" /><feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill={C.dim} /></marker>
              </defs>

              {/* branch lanes */}
              {branches.map((b, i) => {
                const y = PAD + i * Y_STEP + 20;
                return <line key={b.name} x1={PAD - 10} y1={y} x2={svgW - 10} y2={y} stroke={b.color + '22'} strokeWidth={2} strokeDasharray="6 4" />;
              })}

              {/* edges */}
              {commits.map(c => c.parents.map(pid => {
                const parent = commits.find(x => x.id === pid);
                if (!parent) return null;
                const from = posOf(parent);
                const to = posOf(c);
                const mx = (from.x + to.x) / 2;
                return (
                  <path key={`${pid}-${c.id}`} d={`M${from.x},${from.y} C${mx},${from.y} ${mx},${to.y} ${to.x},${to.y}`}
                    fill="none" stroke={branchColor(c.branch)} strokeWidth={2} opacity={0.6} markerEnd="url(#arrowhead)"
                    style={{ transition: 'all .4s' }} />
                );
              }))}

              {/* branch labels */}
              {branches.map((b, i) => {
                const y = PAD + i * Y_STEP + 20;
                return (
                  <g key={`lbl-${b.name}`}>
                    <rect x={2} y={y - 10} width={Math.max(50, b.name.length * 7 + 12)} height={20} rx={4} fill={b.color + '22'} stroke={b.color + '55'} />
                    <text x={8} y={y + 4} fontSize={10} fontWeight={600} fill={b.color} fontFamily="Inter,sans-serif">{b.name}</text>
                  </g>
                );
              })}

              {/* commit nodes */}
              {commits.map(c => {
                const p = posOf(c);
                const isHead = c.id === head.commitId;
                const isNew = c.id === animatingId;
                const isSel = selectedCommit?.id === c.id;
                const clr = branchColor(c.branch);
                return (
                  <g key={c.id} style={{ cursor: 'pointer', transition: 'all .35s' }} onClick={() => setSelectedCommit(c)}>
                    {/* pulse animation for new commits */}
                    {isNew && <circle cx={p.x} cy={p.y} r={NODE_R + 8} fill="none" stroke={clr} strokeWidth={2} opacity={0.5}>
                      <animate attributeName="r" from={NODE_R} to={NODE_R + 18} dur="0.5s" fill="freeze" />
                      <animate attributeName="opacity" from="0.7" to="0" dur="0.5s" fill="freeze" />
                    </circle>}
                    {/* selection ring */}
                    {isSel && <circle cx={p.x} cy={p.y} r={NODE_R + 4} fill="none" stroke={C.yellow} strokeWidth={2} strokeDasharray="4 2" />}
                    {/* HEAD indicator */}
                    {isHead && <circle cx={p.x} cy={p.y} r={NODE_R + 6} fill="none" stroke={C.yellow} strokeWidth={2} filter="url(#glow)" />}
                    {/* node */}
                    <circle cx={p.x} cy={p.y} r={NODE_R} fill={c.merge ? C.surface : clr + '33'} stroke={clr} strokeWidth={c.merge ? 3 : 2} />
                    {c.merge && <GitMerge x={p.x - 6} y={p.y - 6} size={12} color={clr} />}
                    {/* SHA label */}
                    <text x={p.x} y={p.y + NODE_R + 14} textAnchor="middle" fontSize={9} fill={C.dim} fontFamily="JetBrains Mono,monospace">
                      {c.id.slice(0, 7)}
                    </text>
                    {/* HEAD text */}
                    {isHead && (
                      <text x={p.x} y={p.y - NODE_R - 8} textAnchor="middle" fontSize={10} fontWeight={700} fill={C.yellow}>HEAD</text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Command bar */}
          <div style={{ ...s.panel, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={s.label}>Git Commands</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { label: 'commit', icon: <GitCommit size={12} />, fn: doCommit, tip: 'Record changes as a new snapshot' },
                { label: 'branch feature', icon: <GitBranch size={12} />, fn: () => doBranch('feature'), tip: 'Create a new pointer to the current commit' },
                { label: 'checkout', icon: <ArrowRight size={12} />, fn: () => {
                  const other = branches.find(b => b.name !== head.branch);
                  if (other) doCheckout(other.name);
                }, tip: 'Move HEAD to another branch' },
                { label: 'merge', icon: <GitMerge size={12} />, fn: () => {
                  const other = branches.find(b => b.name !== head.branch);
                  if (other) doMerge(other.name);
                }, tip: 'Combine two branches with a merge commit' },
                { label: 'rebase', icon: <Copy size={12} />, fn: () => doRebase('main'), tip: 'Replay commits onto another branch for linear history' },
                { label: 'reset', icon: <RotateCcw size={12} />, fn: doReset, tip: 'Move HEAD back one commit' },
              ].map(b => (
                <button key={b.label} style={s.btn(C.green, false)} title={b.tip}
                  onClick={b.fn}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.green; e.currentTarget.style.background = C.green + '22'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = 'transparent'; }}>
                  {b.icon} <span style={{ marginLeft: 4 }}>git {b.label}</span>
                </button>
              ))}
            </div>

            {/* free input */}
            <form style={{ display: 'flex', gap: 6 }} onSubmit={e => { e.preventDefault(); if (cmdInput.trim()) runCmd(cmdInput); }}>
              <span style={{ color: C.green, fontSize: 13, fontWeight: 700, lineHeight: '30px' }}>$</span>
              <input style={s.input} value={cmdInput} onChange={e => setCmdInput(e.target.value)} placeholder="git commit / branch / checkout / merge ..." />
              <button type="submit" style={s.btn(C.cyan, true)}><Play size={12} /> Run</button>
            </form>

            {/* Log */}
            <div style={{ maxHeight: 80, overflow: 'auto' }}>
              {log.map((l, i) => (
                <div key={i} style={s.logLine}>{l.includes('CONFLICT') ? <AlertTriangle size={10} color={C.red} style={{ marginRight: 4, verticalAlign: -1 }} /> : null}{l}</div>
              ))}
            </div>
          </div>

          {/* Teaching tips */}
          {!compact && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(TIPS).map(([k, t]) => (
                <button key={k} style={s.btn(showTip === k ? C.cyan : C.dim, showTip === k)} onClick={() => setShowTip(showTip === k ? null : k)}>
                  <Info size={11} style={{ marginRight: 4, verticalAlign: -1 }} />{t.title}
                </button>
              ))}
            </div>
          )}
          {showTip && TIPS[showTip] && (
            <div style={s.tipBox}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: C.cyan }}>{TIPS[showTip].title}</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{TIPS[showTip].body}</div>
            </div>
          )}
        </div>

        {/* ─── RIGHT: Diff / Conflict panel ───────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 10 : 16 }}>
          {/* Conflict panel */}
          {conflict && (
            <div style={{ ...s.panel, borderColor: C.red + '88' }}>
              <div style={{ ...s.label, color: C.red }}><AlertTriangle size={12} style={{ verticalAlign: -2, marginRight: 4 }} />Merge Conflict</div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>File: <strong style={{ color: C.text }}>{conflict.file}</strong></div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                {[{ label: 'Ours', data: conflict.ours, clr: C.cyan }, { label: 'Theirs', data: conflict.theirs, clr: C.orange }].map(side => (
                  <div key={side.label} style={{ background: C.bg, borderRadius: 6, padding: 8, border: `1px solid ${side.clr}44` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: side.clr, marginBottom: 4 }}>{side.label} ({side.data.branch})</div>
                    {side.data.diff?.del?.map((l, i) => <div key={`d${i}`} style={{ fontSize: 11, fontFamily: 'monospace', color: C.red }}>{l}</div>)}
                    {side.data.diff?.add?.map((l, i) => <div key={`a${i}`} style={{ fontSize: 11, fontFamily: 'monospace', color: C.green }}>{l}</div>)}
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 11, color: C.dim, marginBottom: 8, fontStyle: 'italic' }}>
                {'<<<<<<< HEAD (ours)  |  >>>>>>> theirs — choose a resolution:'}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={s.btn(C.cyan, true)} onClick={() => resolveConflict('ours')}>
                  <CheckCircle size={12} style={{ marginRight: 4, verticalAlign: -2 }} />Accept Ours
                </button>
                <button style={s.btn(C.orange, true)} onClick={() => resolveConflict('theirs')}>
                  <CheckCircle size={12} style={{ marginRight: 4, verticalAlign: -2 }} />Accept Theirs
                </button>
              </div>
            </div>
          )}

          {/* Diff panel */}
          <div style={s.panel}>
            <div style={s.label}>Commit Details</div>
            {selectedCommit ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={s.tag(branchColor(selectedCommit.branch))}>{selectedCommit.branch}</span>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: C.dim }}>{selectedCommit.id.slice(0, 7)}</span>
                  {selectedCommit.merge && <span style={s.tag(C.yellow)}>merge</span>}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{selectedCommit.msg}</div>
                <div style={{ fontSize: 11, color: C.dim, marginBottom: 10 }}>Author: hpc-dev &middot; {new Date(Date.now() - (commits.length - selectedCommit.ts) * 3600000).toLocaleTimeString()}</div>

                {/* diff content */}
                {(() => {
                  const diff = selectedCommit.diff || randomDiff();
                  return (
                    <div style={{ background: C.bg, borderRadius: 6, padding: 10, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, lineHeight: 1.7 }}>
                      <div style={{ color: C.muted, marginBottom: 4 }}>--- a/{diff.file}</div>
                      <div style={{ color: C.muted, marginBottom: 6 }}>+++ b/{diff.file}</div>
                      {diff.del?.map((l, i) => <div key={`d${i}`} style={{ color: C.red, background: C.red + '11', borderRadius: 2, padding: '0 4px' }}>{l}</div>)}
                      {diff.add?.map((l, i) => <div key={`a${i}`} style={{ color: C.green, background: C.green + '11', borderRadius: 2, padding: '0 4px' }}>{l}</div>)}
                    </div>
                  );
                })()}

                {/* cherry-pick button */}
                {selectedCommit.branch !== head.branch && (
                  <button style={{ ...s.btn(C.purple, false), marginTop: 8, width: '100%' }} onClick={() => doCherryPick(selectedCommit.id)}>
                    <Copy size={12} style={{ marginRight: 4, verticalAlign: -2 }} />Cherry-pick to {head.branch}
                  </button>
                )}
              </div>
            ) : (
              <div style={{ color: C.dim, fontSize: 13, padding: 20, textAlign: 'center' }}>
                Click a commit node in the graph to view its diff and details.
              </div>
            )}
          </div>

          {/* Branch info */}
          <div style={s.panel}>
            <div style={s.label}>Branches</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {branches.map(b => {
                const isActive = b.name === head.branch;
                return (
                  <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 6, background: isActive ? b.color + '15' : 'transparent', cursor: 'pointer', transition: 'all .15s' }}
                    onClick={() => doCheckout(b.name)}>
                    {isActive && <ChevronDown size={12} color={C.yellow} style={{ transform: 'rotate(-90deg)' }} />}
                    <span style={s.tag(b.color)}>{b.name}</span>
                    <span style={{ fontSize: 11, color: C.dim, marginLeft: 'auto' }}>{commits.filter(c => c.branch === b.name).length} commits</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preset description */}
          {!compact && PRESETS[activePreset] && (
            <div style={{ ...s.panel, borderColor: C.cyan + '44' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.cyan, marginBottom: 4 }}>{PRESETS[activePreset].label}</div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{PRESETS[activePreset].desc}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GitVisualizer;
