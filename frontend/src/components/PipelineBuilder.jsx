import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Play, RotateCcw, Plus, Code, Eye, Cpu, Database, FlaskConical, Rocket,
  Server, Activity, CheckCircle2, XCircle, Clock, Loader2, GitBranch,
  Trash2, Layers, BarChart3, FileCode, SkipForward
} from 'lucide-react';

const COLORS = {
  bg: '#0f172a', card: '#1e293b', border: '#334155', text: '#f1f5f9',
  muted: '#94a3b8', dim: '#64748b', cyan: '#06b6d4', purple: '#8b5cf6',
  green: '#10b981', yellow: '#f59e0b', red: '#ef4444', blue: '#3b82f6',
  orange: '#f97316',
};

const STAGE_CATEGORIES = {
  data: {
    label: 'Data', color: COLORS.cyan, icon: Database,
    stages: ['Fetch Data', 'Preprocess', 'Feature Engineering', 'Data Validation'],
    dur: [2, 5], resources: { cpu: 45, gpu: 0, memory: 62 },
    logs: ['[INFO] Connecting to data source...', '[INFO] Reading 50,000 rows...', '[INFO] Schema validation passed', '[INFO] Data loaded successfully'],
    artifacts: ['dataset_v2.parquet (2.3 GB)', 'schema.json (4 KB)', 'stats_report.html'],
  },
  training: {
    label: 'Training', color: COLORS.purple, icon: FlaskConical,
    stages: ['Train Model', 'Hyperparameter Tuning', 'Distributed Training'],
    dur: [10, 30], resources: { cpu: 85, gpu: 95, memory: 78 },
    logs: ['[INFO] Initializing model weights...', '[INFO] Epoch 1/100 - loss: 0.682', '[INFO] Epoch 50/100 - loss: 0.234', '[INFO] Training complete - final loss: 0.089'],
    artifacts: ['model_weights.pt (450 MB)', 'training_log.csv', 'loss_curve.png'],
  },
  evaluation: {
    label: 'Evaluation', color: COLORS.yellow, icon: BarChart3,
    stages: ['Evaluate', 'Compare Models', 'A/B Test'],
    dur: [2, 5], resources: { cpu: 60, gpu: 40, memory: 55 },
    logs: ['[INFO] Running evaluation on test set...', '[INFO] Accuracy: 0.943', '[INFO] F1 Score: 0.931', '[INFO] AUC-ROC: 0.967'],
    artifacts: ['metrics.json', 'confusion_matrix.png', 'roc_curve.png'],
  },
  deployment: {
    label: 'Deploy', color: COLORS.green, icon: Rocket,
    stages: ['Build Container', 'Push Registry', 'Deploy to K8s', 'Health Check'],
    dur: [2, 6], resources: { cpu: 30, gpu: 0, memory: 40 },
    logs: ['[INFO] Building Docker image...', '[INFO] Pushing to registry...', '[INFO] Deploying to cluster...', '[INFO] Rollout complete'],
    artifacts: ['app:v2.1.0 (Docker image)', 'deployment.yaml', 'service_endpoint.txt'],
  },
  infra: {
    label: 'Infra', color: COLORS.orange, icon: Server,
    stages: ['Provision GPU Cluster', 'Scale Workers', 'Teardown'],
    dur: [3, 10], resources: { cpu: 20, gpu: 0, memory: 25 },
    logs: ['[INFO] Requesting GPU nodes...', '[INFO] Provisioning 4x A100 instances...', '[INFO] Cluster ready', '[INFO] Health checks passed'],
    artifacts: ['cluster_config.yaml', 'node_inventory.json', 'cost_estimate.txt'],
  },
};

const PRESETS = {
  'ml-training': {
    title: 'ML Training Pipeline',
    stages: [
      { id: 's1', name: 'Fetch Data', cat: 'data' },
      { id: 's2', name: 'Preprocess', cat: 'data' },
      { id: 's3', name: 'Train Model', cat: 'training' },
      { id: 's4', name: 'Evaluate', cat: 'evaluation' },
      { id: 's5', name: 'Deploy to K8s', cat: 'deployment' },
    ],
    connections: [[0,1],[1,2],[2,3],[3,4]],
  },
  'cicd': {
    title: 'CI/CD Pipeline',
    stages: [
      { id: 's1', name: 'Data Validation', cat: 'data' },
      { id: 's2', name: 'Preprocess', cat: 'data' },
      { id: 's3', name: 'Build Container', cat: 'deployment' },
      { id: 's4', name: 'Push Registry', cat: 'deployment' },
      { id: 's5', name: 'Deploy to K8s', cat: 'deployment' },
      { id: 's6', name: 'Health Check', cat: 'deployment' },
    ],
    connections: [[0,1],[1,2],[2,3],[3,4],[4,5]],
  },
  'distributed': {
    title: 'Distributed Training',
    stages: [
      { id: 's1', name: 'Provision GPU Cluster', cat: 'infra' },
      { id: 's2', name: 'Fetch Data', cat: 'data' },
      { id: 's3', name: 'Train Model', cat: 'training', label: 'Worker 1' },
      { id: 's4', name: 'Train Model', cat: 'training', label: 'Worker 2' },
      { id: 's5', name: 'Train Model', cat: 'training', label: 'Worker 3' },
      { id: 's6', name: 'Train Model', cat: 'training', label: 'Worker 4' },
      { id: 's7', name: 'Evaluate', cat: 'evaluation' },
    ],
    connections: [[0,1],[1,2],[1,3],[1,4],[1,5],[2,6],[3,6],[4,6],[5,6]],
  },
  'mlops': {
    title: 'MLOps Full',
    stages: [
      { id: 's1', name: 'Data Validation', cat: 'data' },
      { id: 's2', name: 'Feature Engineering', cat: 'data' },
      { id: 's3', name: 'Train Model', cat: 'training' },
      { id: 's4', name: 'Evaluate', cat: 'evaluation' },
      { id: 's5', name: 'Compare Models', cat: 'evaluation' },
      { id: 's6', name: 'A/B Test', cat: 'evaluation' },
      { id: 's7', name: 'Deploy to K8s', cat: 'deployment' },
    ],
    connections: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]],
  },
};

function getCatForStage(name) {
  for (const [cat, d] of Object.entries(STAGE_CATEGORIES)) {
    if (d.stages.includes(name)) return cat;
  }
  return 'data';
}

function getDuration(name) {
  for (const d of Object.values(STAGE_CATEGORIES)) {
    if (d.stages.includes(name)) return d.dur[0] + Math.random() * (d.dur[1] - d.dur[0]);
  }
  return 3;
}

let nextId = 100;

function computeLayout(stages, connections, compact) {
  const nodeW = compact ? 130 : 160, nodeH = compact ? 50 : 60;
  const gapX = compact ? 50 : 70, gapY = compact ? 18 : 24;
  const padX = 20, padY = 20;

  const adj = {}, inDeg = {};
  stages.forEach((_, i) => { adj[i] = []; inDeg[i] = 0; });
  connections.forEach(([a, b]) => { adj[a].push(b); inDeg[b] = (inDeg[b] || 0) + 1; });

  const columns = [];
  const visited = new Set();
  let queue = stages.map((_, i) => i).filter(i => !inDeg[i]);
  while (queue.length > 0) {
    columns.push([...queue]);
    queue.forEach(n => visited.add(n));
    const next = [];
    queue.forEach(n => adj[n].forEach(m => {
      inDeg[m]--;
      if (inDeg[m] === 0 && !visited.has(m)) next.push(m);
    }));
    queue = next;
  }

  const maxRows = columns.reduce((m, c) => Math.max(m, c.length), 0);
  const positions = {};
  columns.forEach((nodes, ci) => {
    const totalH = nodes.length * nodeH + (nodes.length - 1) * gapY;
    const offsetY = (maxRows * (nodeH + gapY) - totalH) / 2;
    nodes.forEach((n, ri) => {
      positions[n] = {
        x: padX + ci * (nodeW + gapX),
        y: padY + ri * (nodeH + gapY) + offsetY,
      };
    });
  });

  return {
    positions, nodeW, nodeH,
    svgW: padX * 2 + columns.length * nodeW + (columns.length - 1) * gapX,
    svgH: padY * 2 + maxRows * nodeH + (maxRows - 1) * gapY,
  };
}

function generateYAML(stages, connections) {
  let y = 'apiVersion: argoproj.io/v1alpha1\nkind: Workflow\nmetadata:\n  name: ml-pipeline\nspec:\n  entrypoint: pipeline\n  templates:\n    - name: pipeline\n      dag:\n        tasks:\n';
  stages.forEach((s, i) => {
    const deps = connections.filter(([, b]) => b === i).map(([a]) => stages[a].name.toLowerCase().replace(/\s+/g, '-'));
    const slug = (s.label || s.name).toLowerCase().replace(/\s+/g, '-');
    y += `          - name: ${slug}\n            template: ${s.cat}-task\n`;
    if (deps.length) y += `            dependencies: [${deps.join(', ')}]\n`;
  });
  const seen = new Set();
  stages.forEach(s => {
    if (seen.has(s.cat)) return;
    seen.add(s.cat);
    const r = STAGE_CATEGORIES[s.cat]?.resources || {};
    y += `\n    - name: ${s.cat}-task\n      container:\n        image: ml-pipeline/${s.cat}:latest\n        resources:\n          limits:\n            cpu: "${r.cpu || 50}m"\n            memory: "${r.memory || 50}Mi"\n`;
  });
  return y;
}

const PipelineBuilder = ({ compact = false, preset: presetProp, config = {} }) => {
  const initialPreset = presetProp || config.preset || 'ml-training';
  const [activePreset, setActivePreset] = useState(initialPreset);
  const [stages, setStages] = useState([]);
  const [connections, setConnections] = useState([]);
  const [stageStatus, setStageStatus] = useState({});
  const [stageTimes, setStageTimes] = useState({});
  const [running, setRunning] = useState(false);
  const [selectedStage, setSelectedStage] = useState(null);
  const [viewMode, setViewMode] = useState('visual');
  const [showLibrary, setShowLibrary] = useState(false);
  const [animPhase, setAnimPhase] = useState(0);
  const cancelRef = useRef(null);

  const loadPreset = useCallback((key) => {
    const p = PRESETS[key];
    if (!p) return;
    setStages(p.stages.map(s => ({ ...s, cat: s.cat || getCatForStage(s.name) })));
    setConnections([...p.connections]);
    setStageStatus({}); setStageTimes({}); setRunning(false); setSelectedStage(null);
    setActivePreset(key);
  }, []);

  useEffect(() => { loadPreset(initialPreset); }, [initialPreset, loadPreset]);
  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setAnimPhase(p => p + 1), 60);
    return () => clearInterval(iv);
  }, [running]);

  const layout = useMemo(() => computeLayout(stages, connections, compact), [stages, connections, compact]);

  const addStage = useCallback((name, cat) => {
    const id = `s${nextId++}`;
    const n = stages.length;
    setStages(prev => [...prev, { id, name, cat }]);
    if (n > 0) setConnections(prev => [...prev, [n - 1, n]]);
    setShowLibrary(false);
  }, [stages.length]);

  const removeStage = useCallback((idx) => {
    setStages(prev => prev.filter((_, i) => i !== idx));
    setConnections(prev => prev.filter(([a, b]) => a !== idx && b !== idx)
      .map(([a, b]) => [a > idx ? a - 1 : a, b > idx ? b - 1 : b]));
    setSelectedStage(null);
  }, []);

  const executePipeline = useCallback((initialStatuses = null) => {
    if (stages.length === 0) return;
    setRunning(true);
    const statuses = initialStatuses || {};
    if (!initialStatuses) {
      stages.forEach(s => { statuses[s.id] = 'pending'; });
      setStageStatus({ ...statuses }); setStageTimes({});
    }

    const adj = {};
    stages.forEach((_, i) => { adj[i] = []; });
    connections.forEach(([a, b]) => { adj[a].push(b); });

    const completed = new Set();
    const failed = new Set();
    stages.forEach((s, i) => { if (statuses[s.id] === 'success') completed.add(i); });
    let cancelled = false;
    const failIdx = !initialStatuses && stages.length >= 5 ? 3 : -1;

    function tick() {
      if (cancelled) return;
      const ready = stages.map((_, i) => i).filter(i =>
        !completed.has(i) && !failed.has(i) && statuses[stages[i].id] === 'pending' &&
        connections.filter(([, b]) => b === i).every(([a]) => completed.has(a))
      );
      if (ready.length === 0 && !Object.values(statuses).includes('running')) {
        setRunning(false); return;
      }
      ready.forEach(i => {
        statuses[stages[i].id] = 'running';
        setStageStatus({ ...statuses });
        const dur = getDuration(stages[i].name);
        setTimeout(() => {
          if (cancelled) return;
          if (i === failIdx) {
            statuses[stages[i].id] = 'failed'; failed.add(i);
            const markSkipped = (m) => { statuses[stages[m].id] = 'skipped'; adj[m].forEach(markSkipped); };
            adj[i].forEach(markSkipped);
            setStageTimes(prev => ({ ...prev, [stages[i].id]: dur.toFixed(1) }));
            setStageStatus({ ...statuses });
            if (stages.every((s, idx) => completed.has(idx) || failed.has(idx) || statuses[s.id] === 'skipped'))
              setRunning(false);
          } else {
            statuses[stages[i].id] = 'success'; completed.add(i);
            setStageTimes(prev => ({ ...prev, [stages[i].id]: dur.toFixed(1) }));
            setStageStatus({ ...statuses }); tick();
          }
        }, dur * 200);
      });
    }
    tick();
    cancelRef.current = () => { cancelled = true; };
  }, [stages, connections]);

  const retryFailed = useCallback(() => {
    const newStatus = { ...stageStatus };
    Object.entries(newStatus).forEach(([id, s]) => {
      if (s === 'failed' || s === 'skipped') newStatus[id] = 'pending';
    });
    setStageStatus(newStatus);
    executePipeline(newStatus);
  }, [stageStatus, executePipeline]);

  const resetPipeline = useCallback(() => {
    if (cancelRef.current) cancelRef.current();
    setRunning(false); setStageStatus({}); setStageTimes({}); setSelectedStage(null);
  }, []);

  const hasFailed = Object.values(stageStatus).includes('failed');
  const yamlCode = useMemo(() => generateYAML(stages, connections), [stages, connections]);
  const selData = selectedStage !== null ? stages[selectedStage] : null;

  const s = {
    container: {
      background: COLORS.bg, borderRadius: 12, border: `1px solid ${COLORS.border}`,
      padding: compact ? 16 : 24, fontFamily: "'Inter', system-ui, sans-serif",
      color: COLORS.text, maxWidth: compact ? 700 : 1100, margin: '0 auto',
    },
    header: {
      display: 'flex', alignItems: 'center', gap: 10, marginBottom: compact ? 14 : 20,
      borderBottom: `1px solid ${COLORS.border}`, paddingBottom: compact ? 12 : 16,
    },
    panel: { background: COLORS.card, borderRadius: 8, border: `1px solid ${COLORS.border}`, padding: compact ? 12 : 16 },
    secTitle: { fontSize: 13, fontWeight: 600, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 },
    btn: (clr, off) => ({
      padding: '7px 14px', borderRadius: 6, border: 'none', cursor: off ? 'not-allowed' : 'pointer',
      background: off ? COLORS.border : clr, color: off ? COLORS.dim : '#fff',
      fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
      opacity: off ? 0.5 : 1, transition: 'all 0.15s',
    }),
  };

  const stColor = (st) => ({ success: COLORS.green, failed: COLORS.red, running: COLORS.blue, skipped: COLORS.dim }[st] || COLORS.border);
  const stIcon = (st) => {
    const m = { success: [CheckCircle2, COLORS.green], failed: [XCircle, COLORS.red], running: [Loader2, COLORS.blue], skipped: [SkipForward, COLORS.dim] };
    const [Icon, clr] = m[st] || [Clock, COLORS.dim];
    return <Icon size={14} color={clr} style={st === 'running' ? { animation: 'spin 1s linear infinite' } : {}} />;
  };

  /* ── SVG DAG Canvas ── */
  const renderDAG = () => {
    const { positions, svgW, svgH, nodeW, nodeH } = layout;
    return (
      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: compact ? 280 : 400 }}>
        <svg width={svgW} height={svgH} style={{ display: 'block', minWidth: svgW }}>
          <defs>
            <marker id="ah" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={COLORS.muted} />
            </marker>
            <marker id="ah-a" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={COLORS.cyan} />
            </marker>
          </defs>

          {connections.map(([a, b], ci) => {
            if (!positions[a] || !positions[b]) return null;
            const x1 = positions[a].x + nodeW, y1 = positions[a].y + nodeH / 2;
            const x2 = positions[b].x, y2 = positions[b].y + nodeH / 2;
            const mx = (x1 + x2) / 2;
            const sA = stageStatus[stages[a]?.id], sB = stageStatus[stages[b]?.id];
            const active = sA === 'success' && sB === 'running';
            const done = sA === 'success' && sB === 'success';
            const lc = active ? COLORS.cyan : done ? COLORS.green : COLORS.border;
            const pathD = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
            return (
              <g key={ci}>
                <path d={pathD} fill="none" stroke={lc} strokeWidth={2} markerEnd={active ? 'url(#ah-a)' : 'url(#ah)'} />
                {(active || (running && sA === 'running')) && (
                  <circle r={4} fill={COLORS.cyan}>
                    <animateMotion dur="1.2s" repeatCount="indefinite" path={pathD} />
                  </circle>
                )}
              </g>
            );
          })}

          {stages.map((stage, idx) => {
            const pos = positions[idx];
            if (!pos) return null;
            const cat = stage.cat, color = STAGE_CATEGORIES[cat]?.color || COLORS.cyan;
            const status = stageStatus[stage.id] || 'pending';
            const sc = stColor(status), isSel = selectedStage === idx;
            return (
              <g key={stage.id} onClick={() => setSelectedStage(isSel ? null : idx)} style={{ cursor: 'pointer' }}>
                <rect x={pos.x} y={pos.y} width={nodeW} height={nodeH} rx={8}
                  fill={COLORS.card} stroke={isSel ? COLORS.cyan : sc}
                  strokeWidth={isSel ? 2.5 : 1.5} style={{ transition: 'all 0.2s' }} />
                {status === 'running' && (
                  <rect x={pos.x} y={pos.y} width={nodeW} height={nodeH} rx={8}
                    fill="none" stroke={COLORS.blue} strokeWidth={2}
                    opacity={0.4 + 0.3 * Math.sin(animPhase * 0.15)} />
                )}
                <rect x={pos.x} y={pos.y} width={4} height={nodeH} rx={2} fill={color} />
                <text x={pos.x + 14} y={pos.y + (compact ? 20 : 24)} fill={COLORS.text}
                  fontSize={compact ? 11 : 12} fontWeight={600} fontFamily="Inter, system-ui, sans-serif">
                  {stage.label || stage.name}
                </text>
                <text x={pos.x + 14} y={pos.y + (compact ? 35 : 42)} fill={COLORS.dim}
                  fontSize={10} fontFamily="Inter, system-ui, sans-serif">
                  {stageTimes[stage.id] ? `${stageTimes[stage.id]}s` : status}
                </text>
                {status !== 'pending' && (
                  <g transform={`translate(${pos.x + nodeW - 22}, ${pos.y + 6})`}>
                    <circle cx={7} cy={7} r={7} fill={stColor(status)} opacity={0.2} />
                    <circle cx={7} cy={7} r={3} fill={stColor(status)} />
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  /* ── Stage Library Panel ── */
  const renderLibrary = () => (
    <div style={{ ...s.panel, marginBottom: 14 }}>
      <div style={s.secTitle}>Stage Library — click to add</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {Object.entries(STAGE_CATEGORIES).map(([cat, d]) => (
          <div key={cat} style={{ flex: compact ? '1 1 100%' : '1 1 180px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: d.color, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <d.icon size={12} /> {d.label}
            </div>
            {d.stages.map(name => (
              <button key={name} onClick={() => addStage(name, cat)} disabled={running}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '5px 8px',
                  marginBottom: 3, borderRadius: 4, background: COLORS.bg,
                  border: `1px solid ${COLORS.border}`, color: COLORS.text, fontSize: 11,
                  cursor: running ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                }}>
                <Plus size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} /> {name}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  /* ── Stage Detail Panel ── */
  const renderDetail = () => {
    if (!selData) return null;
    const cat = selData.cat, catData = STAGE_CATEGORIES[cat] || STAGE_CATEGORIES.data;
    const status = stageStatus[selData.id] || 'pending';
    const CatIcon = catData.icon;

    const ResBar = ({ label, val, clr }) => (
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
          <span style={{ color: COLORS.muted }}>{label}</span>
          <span style={{ color: clr, fontFamily: 'monospace' }}>{val}%</span>
        </div>
        <div style={{ height: 6, background: COLORS.bg, borderRadius: 3 }}>
          <div style={{ height: '100%', width: `${val}%`, background: clr, borderRadius: 3, transition: 'width 0.4s' }} />
        </div>
      </div>
    );

    return (
      <div style={{ ...s.panel, marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CatIcon size={18} color={catData.color} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{selData.label || selData.name}</div>
              <div style={{ fontSize: 11, color: COLORS.dim }}>{cat} stage</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {stIcon(status)}
            <span style={{ fontSize: 11, color: stColor(status), fontWeight: 600 }}>{status}</span>
            {!running && (
              <button onClick={() => removeStage(selectedStage)}
                style={{ ...s.btn(COLORS.red, false), padding: '4px 8px', marginLeft: 8 }}>
                <Trash2 size={12} /> Remove
              </button>
            )}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <div style={s.secTitle}>Resources</div>
            <ResBar label="CPU" val={catData.resources.cpu} clr={COLORS.cyan} />
            <ResBar label="GPU" val={catData.resources.gpu} clr={COLORS.purple} />
            <ResBar label="Memory" val={catData.resources.memory} clr={COLORS.green} />
          </div>
          <div>
            <div style={s.secTitle}>Artifacts</div>
            {catData.artifacts.map((a, i) => (
              <div key={i} style={{ fontSize: 11, color: COLORS.muted, padding: '3px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                <FileCode size={10} color={COLORS.cyan} /> {a}
              </div>
            ))}
          </div>
          <div>
            <div style={s.secTitle}>Logs</div>
            <div style={{ background: '#0a0e14', borderRadius: 6, padding: 8, maxHeight: 120, overflowY: 'auto', fontFamily: 'monospace', fontSize: 10, lineHeight: 1.6 }}>
              {['success', 'failed', 'running'].includes(status)
                ? catData.logs.map((l, i) => <div key={i} style={{ color: COLORS.muted }}>{l}</div>)
                : <div style={{ color: COLORS.dim }}>Awaiting execution...</div>}
            </div>
          </div>
        </div>
        {stageTimes[selData.id] && (
          <div style={{ marginTop: 10, fontSize: 11, color: COLORS.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={12} /> Completed in {stageTimes[selData.id]}s
          </div>
        )}
      </div>
    );
  };

  /* ── YAML Code View ── */
  const renderCode = () => {
    const lines = yamlCode.split('\n');
    return (
      <div style={{ ...s.panel, marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Code size={14} color={COLORS.cyan} />
          <span style={s.secTitle}>Pipeline YAML (Argo Workflows)</span>
        </div>
        <div style={{
          background: '#0a0e14', borderRadius: 8, padding: 14, overflowX: 'auto',
          maxHeight: compact ? 200 : 350, overflowY: 'auto',
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 11, lineHeight: 1.7,
        }}>
          {lines.map((line, i) => {
            const kv = line.match(/^(\s*)(\w[\w.-]*)(:)(.*)/);
            const dash = !kv && line.match(/^(\s*)(-)(.*)/);
            const parts = kv ? [
              <span key="s" style={{ color: 'transparent' }}>{kv[1]}</span>,
              <span key="k" style={{ color: COLORS.cyan }}>{kv[2]}</span>,
              <span key="c" style={{ color: COLORS.muted }}>:</span>,
              kv[4].trim() && <span key="v" style={{ color: kv[4].includes('[') ? COLORS.yellow : kv[4].includes('"') ? COLORS.green : COLORS.orange }}> {kv[4]}</span>,
            ] : dash ? [
              <span key="s" style={{ color: 'transparent' }}>{dash[1]}</span>,
              <span key="d" style={{ color: COLORS.purple }}>-</span>,
              <span key="r" style={{ color: COLORS.text }}>{dash[3]}</span>,
            ] : [<span key="l" style={{ color: COLORS.dim }}>{line}</span>];
            return (
              <div key={i} style={{ display: 'flex' }}>
                <span style={{ color: COLORS.dim, width: 35, textAlign: 'right', marginRight: 14, userSelect: 'none', opacity: 0.4 }}>{i + 1}</span>
                <span>{parts}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ── Main Render ── */
  return (
    <div style={s.container}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <div style={s.header}>
        <GitBranch size={compact ? 20 : 24} color={COLORS.cyan} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: compact ? 18 : 22, fontWeight: 700 }}>Pipeline Builder</div>
          <div style={{ fontSize: 13, color: COLORS.dim, marginTop: 2 }}>Visual ML / CI-CD pipeline constructor and simulator</div>
        </div>
      </div>

      {/* Presets */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {Object.entries(PRESETS).map(([key, p]) => (
          <button key={key} onClick={() => loadPreset(key)} disabled={running}
            style={{
              ...s.btn(key === activePreset ? COLORS.cyan : COLORS.card, running),
              border: `1px solid ${key === activePreset ? COLORS.cyan : COLORS.border}`,
              background: key === activePreset ? COLORS.cyan : COLORS.card,
              color: key === activePreset ? '#fff' : COLORS.muted,
            }}>
            {p.title}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14, alignItems: 'center' }}>
        <button onClick={() => executePipeline()} disabled={running || !stages.length}
          style={s.btn(COLORS.green, running || !stages.length)}>
          <Play size={12} /> Run Pipeline
        </button>
        {hasFailed && (
          <button onClick={retryFailed} style={s.btn(COLORS.yellow, false)}>
            <RotateCcw size={12} /> Retry Failed
          </button>
        )}
        <button onClick={resetPipeline} style={s.btn(COLORS.card, false)}>
          <RotateCcw size={12} /> Reset
        </button>
        <button onClick={() => setShowLibrary(!showLibrary)} disabled={running}
          style={s.btn(showLibrary ? COLORS.purple : COLORS.card, running)}>
          <Plus size={12} /> Add Stage
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {['visual', 'code'].map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              style={{
                ...s.btn(viewMode === m ? COLORS.cyan : COLORS.card, false),
                border: `1px solid ${viewMode === m ? COLORS.cyan : COLORS.border}`,
              }}>
              {m === 'visual' ? <Eye size={12} /> : <Code size={12} />} {m === 'visual' ? 'Visual' : 'YAML'}
            </button>
          ))}
        </div>
      </div>

      {showLibrary && renderLibrary()}

      {/* Status summary */}
      {Object.keys(stageStatus).length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          {[
            ['Total', stages.length, COLORS.muted],
            ['Success', Object.values(stageStatus).filter(x => x === 'success').length, COLORS.green],
            ['Running', Object.values(stageStatus).filter(x => x === 'running').length, COLORS.blue],
            ['Failed', Object.values(stageStatus).filter(x => x === 'failed').length, COLORS.red],
            ['Skipped', Object.values(stageStatus).filter(x => x === 'skipped').length, COLORS.dim],
          ].map(([label, count, clr]) => (
            <div key={label} style={{
              background: COLORS.card, borderRadius: 6, padding: '6px 14px',
              border: `1px solid ${COLORS.border}`, textAlign: 'center', minWidth: 70,
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: clr }}>{count}</div>
              <div style={{ fontSize: 10, color: COLORS.dim }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* DAG or Code */}
      {viewMode === 'visual' ? (
        <div style={s.panel}>
          <div style={{ ...s.secTitle, marginBottom: 8 }}>Pipeline DAG</div>
          {!stages.length ? (
            <div style={{ textAlign: 'center', padding: 40, color: COLORS.dim }}>
              <Layers size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
              <div style={{ fontSize: 13 }}>No stages yet — select a preset or add stages from the library</div>
            </div>
          ) : renderDAG()}
        </div>
      ) : renderCode()}

      {viewMode === 'visual' && renderDetail()}

      {!compact && !running && stages.length > 0 && selectedStage === null && (
        <div style={{
          marginTop: 14, background: `${COLORS.cyan}10`, border: `1px solid ${COLORS.cyan}30`,
          borderRadius: 8, padding: 12, fontSize: 11, color: COLORS.muted,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Activity size={14} color={COLORS.cyan} />
          Click a stage to inspect details • Run Pipeline to simulate execution • Switch to YAML view to see the code
        </div>
      )}
    </div>
  );
};

export default PipelineBuilder;
