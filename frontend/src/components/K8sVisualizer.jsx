import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Server, Cpu, Database, Network, Play, Square, RotateCcw, Plus, Minus, Zap,
  AlertTriangle, CheckCircle, Clock, Box, Layers, ArrowRight, Settings, Code,
  Activity, Wifi, Globe, ChevronDown, ChevronRight, Trash2, Info } from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────────
const COLORS = {
  bg: '#0f172a', surface: '#1e293b', border: '#334155',
  text: '#f1f5f9', muted: '#94a3b8', dim: '#64748b',
  cyan: '#06b6d4', purple: '#8b5cf6', green: '#10b981',
  yellow: '#f59e0b', red: '#ef4444', pink: '#ec4899',
  orange: '#f97316', teal: '#14b8a6', blue: '#3b82f6',
};

const POD_STATES = ['Pending', 'ContainerCreating', 'Running', 'Terminating', 'Terminated'];
const POD_STATE_COLORS = {
  Pending: COLORS.yellow, ContainerCreating: COLORS.cyan,
  Running: COLORS.green, Terminating: COLORS.orange,
  Terminated: COLORS.dim, CrashLoopBackOff: COLORS.red,
};

const COMPONENT_INFO = {
  'API Server': 'The front-end for the Kubernetes control plane. All cluster operations go through the API Server via RESTful calls.',
  'etcd': 'Consistent and highly-available key-value store used as the backing store for all Kubernetes cluster data.',
  'Scheduler': 'Watches for newly created Pods with no assigned node, and selects a node for them based on resource requirements and constraints.',
  'Controller Manager': 'Runs controller processes: Node controller, Job controller, EndpointSlice controller, and ServiceAccount controller.',
  'kubelet': 'Agent that runs on each node. Ensures containers described in PodSpecs are running and healthy.',
  'kube-proxy': 'Network proxy that maintains network rules on nodes, enabling Service abstraction and pod-to-pod communication.',
  'Container Runtime': 'Software responsible for running containers (containerd, CRI-O). Pulls images and manages container lifecycle.',
};

const INITIAL_NODES = [
  { id: 'node-1', name: 'worker-1', cpu: 4000, memory: 8192, gpus: 0, pods: [], usedCpu: 0, usedMem: 0 },
  { id: 'node-2', name: 'worker-2', cpu: 4000, memory: 8192, gpus: 2, pods: [], usedCpu: 0, usedMem: 0, label: 'gpu=true' },
  { id: 'node-3', name: 'worker-3', cpu: 8000, memory: 16384, gpus: 0, pods: [], usedCpu: 0, usedMem: 0 },
];

const PRESETS = {
  'ml-training': { title: 'ML Training Job', icon: Zap, color: COLORS.purple,
    desc: 'GPU-accelerated training job scheduled to GPU node',
    yaml: `apiVersion: batch/v1\nkind: Job\nmetadata:\n  name: ml-training\nspec:\n  template:\n    spec:\n      containers:\n      - name: trainer\n        image: pytorch/pytorch:2.1-cuda12\n        resources:\n          requests:\n            cpu: "2000m"\n            memory: "4096Mi"\n            nvidia.com/gpu: "1"\n          limits:\n            cpu: "4000m"\n            memory: "8192Mi"`,
    pods: [{ name: 'ml-training-pod', cpu: 2000, memory: 4096, gpu: true, replicas: 1 }] },
  'web-app': { title: 'Web Application', icon: Globe, color: COLORS.cyan,
    desc: '3-replica deployment with ClusterIP service and load balancing',
    yaml: `apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: web-app\nspec:\n  replicas: 3\n  selector:\n    matchLabels:\n      app: web\n  template:\n    spec:\n      containers:\n      - name: nginx\n        image: nginx:1.25\n        resources:\n          requests:\n            cpu: "250m"\n            memory: "256Mi"`,
    pods: [{ name: 'web-app', cpu: 250, memory: 256, gpu: false, replicas: 3 }] },
  'batch-job': { title: 'Batch Processing', icon: Layers, color: COLORS.orange,
    desc: 'Kubernetes Job with completions=5, pods cycle through execution',
    yaml: `apiVersion: batch/v1\nkind: Job\nmetadata:\n  name: batch-processor\nspec:\n  completions: 5\n  parallelism: 2\n  template:\n    spec:\n      containers:\n      - name: worker\n        image: python:3.11\n        resources:\n          requests:\n            cpu: "500m"\n            memory: "512Mi"`,
    pods: [{ name: 'batch-proc', cpu: 500, memory: 512, gpu: false, replicas: 5 }] },
  'daemonset': { title: 'DaemonSet', icon: Network, color: COLORS.teal,
    desc: 'One pod per node — monitoring agent deployed everywhere',
    yaml: `apiVersion: apps/v1\nkind: DaemonSet\nmetadata:\n  name: monitoring-agent\nspec:\n  selector:\n    matchLabels:\n      app: monitor\n  template:\n    spec:\n      containers:\n      - name: agent\n        image: prom/node-exporter\n        resources:\n          requests:\n            cpu: "100m"\n            memory: "128Mi"`,
    pods: [{ name: 'monitor-agent', cpu: 100, memory: 128, gpu: false, replicas: 'all-nodes' }] },
};

let podIdCounter = 0;

// ── Helpers ────────────────────────────────────────────────────────────────────
const mkPod = (name, cpu, mem, gpu = false) => ({
  id: `pod-${++podIdCounter}`, name: `${name}-${podIdCounter}`,
  cpu, memory: mem, gpu, state: 'Pending', stateIdx: 0, crashCount: 0,
});

const fmtRes = (v, unit) => v >= 1000 ? `${(v / 1000).toFixed(1)}${unit === 'm' ? '' : 'G'}` : `${v}${unit}`;

// ── Component ──────────────────────────────────────────────────────────────────
const K8sVisualizer = ({ compact = false, preset, config = {} }) => {
  const [activeTab, setActiveTab] = useState('cluster');
  const [nodes, setNodes] = useState(JSON.parse(JSON.stringify(INITIAL_NODES)));
  const [lifecycleLog, setLifecycleLog] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [activePreset, setActivePreset] = useState(preset || config.preset || null);
  const [yamlText, setYamlText] = useState(PRESETS['web-app'].yaml);
  const [animatingPod, setAnimatingPod] = useState(null);
  const [animStep, setAnimStep] = useState(-1);
  const [networkView, setNetworkView] = useState('clusterip');
  const [showYaml, setShowYaml] = useState(false);
  const timerRef = useRef(null);

  // ── Styles ─────────────────────────────────────────────────────────────────
  const s = {
    wrap: { background: COLORS.bg, borderRadius: 12, border: `1px solid ${COLORS.border}`,
      padding: compact ? 16 : 24, fontFamily: "'Inter', system-ui, sans-serif",
      color: COLORS.text, maxWidth: 1200, margin: '0 auto' },
    header: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
      borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 14 },
    title: { fontSize: compact ? 18 : 22, fontWeight: 700 },
    tabs: { display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' },
    tab: (a) => ({ padding: '7px 14px', borderRadius: 6, border: `1px solid ${a ? COLORS.cyan : COLORS.border}`,
      background: a ? COLORS.cyan + '22' : 'transparent', color: a ? COLORS.cyan : COLORS.muted,
      cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all .15s' }),
    panel: { background: COLORS.surface, borderRadius: 8, border: `1px solid ${COLORS.border}`, padding: 16, marginBottom: 12 },
    label: { fontSize: 11, fontWeight: 600, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 },
    btn: (clr, dis) => ({ padding: '7px 14px', borderRadius: 6, border: 'none',
      cursor: dis ? 'not-allowed' : 'pointer', background: dis ? COLORS.border : clr,
      color: dis ? COLORS.dim : '#fff', fontSize: 12, fontWeight: 600,
      display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all .15s' }),
    badge: (clr) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 12,
      fontSize: 10, fontWeight: 700, background: clr + '22', color: clr }),
    nodeBox: (hl) => ({ background: COLORS.bg, borderRadius: 8, border: `2px solid ${hl ? COLORS.cyan : COLORS.border}`,
      padding: 12, minWidth: compact ? 160 : 200, transition: 'border-color .3s' }),
    podBox: (clr) => ({ background: clr + '22', border: `1px solid ${clr}55`, borderRadius: 6,
      padding: '4px 8px', fontSize: 11, fontWeight: 600, color: clr, display: 'inline-flex',
      alignItems: 'center', gap: 4, margin: 2 }),
    bar: (pct, clr) => ({ height: 8, borderRadius: 4, background: COLORS.bg, overflow: 'hidden', marginTop: 4,
      position: 'relative', width: '100%', border: `1px solid ${COLORS.border}`,
      _fill: { height: '100%', width: `${Math.min(pct, 100)}%`, background: pct > 90 ? COLORS.red : pct > 70 ? COLORS.yellow : clr,
        borderRadius: 4, transition: 'width .5s ease' } }),
    textarea: { width: '100%', minHeight: 180, background: COLORS.bg, border: `1px solid ${COLORS.border}`,
      borderRadius: 6, padding: 10, color: COLORS.text, fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
      resize: 'vertical', outline: 'none', lineHeight: 1.5 },
    grid: { display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
    row: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
    infoBox: { background: COLORS.cyan + '11', border: `1px solid ${COLORS.cyan}33`, borderRadius: 8,
      padding: 12, fontSize: 13, color: COLORS.cyan, marginBottom: 12, display: 'flex', gap: 8, alignItems: 'flex-start' },
  };

  // ── Scheduling logic ───────────────────────────────────────────────────────
  const schedulePod = useCallback((pod, targetNodes) => {
    const ns = [...targetNodes];
    for (const n of ns) {
      const hasCap = n.usedCpu + pod.cpu <= n.cpu && n.usedMem + pod.memory <= n.memory;
      const gpuOk = !pod.gpu || n.gpus > 0;
      if (hasCap && gpuOk) {
        n.usedCpu += pod.cpu;
        n.usedMem += pod.memory;
        n.pods.push({ ...pod, state: 'Running', stateIdx: 2 });
        return { nodes: ns, placed: n.name };
      }
    }
    return { nodes: ns, placed: null };
  }, []);

  // ── Pod lifecycle animation ────────────────────────────────────────────────
  const ANIM_STEPS = [
    { label: 'kubectl apply', icon: Code, desc: 'User submits manifest to API Server' },
    { label: 'API Server', icon: Server, desc: 'Validates and persists to etcd' },
    { label: 'etcd write', icon: Database, desc: 'Pod spec stored in cluster state' },
    { label: 'Scheduler', icon: Activity, desc: 'Finds best node based on resources & constraints' },
    { label: 'kubelet', icon: Cpu, desc: 'Node agent pulls image and starts container' },
    { label: 'Running ✓', icon: CheckCircle, desc: 'Container is running and healthy' },
  ];

  const runLifecycle = useCallback((pod) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setAnimatingPod(pod);
    setAnimStep(0);
    setLifecycleLog([]);
    let step = 0;
    timerRef.current = setInterval(() => {
      step++;
      if (step >= ANIM_STEPS.length) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setNodes(prev => {
          const { nodes: ns, placed } = schedulePod(pod, JSON.parse(JSON.stringify(prev)));
          if (placed) {
            setLifecycleLog(l => [...l, { text: `Pod ${pod.name} running on ${placed}`, color: COLORS.green }]);
          } else {
            setLifecycleLog(l => [...l, { text: `Pod ${pod.name}: Insufficient resources`, color: COLORS.red }]);
          }
          return ns;
        });
      } else {
        setLifecycleLog(l => [...l, { text: ANIM_STEPS[step].desc, color: COLORS.cyan }]);
      }
      setAnimStep(step);
    }, 800);
  }, [schedulePod]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // ── Preset deployment ──────────────────────────────────────────────────────
  const deployPreset = useCallback((key) => {
    setActivePreset(key);
    const p = PRESETS[key];
    setYamlText(p.yaml);
    setNodes(JSON.parse(JSON.stringify(INITIAL_NODES)));
    podIdCounter = 0;
    const spec = p.pods[0];
    const count = spec.replicas === 'all-nodes' ? INITIAL_NODES.length : spec.replicas;

    let updatedNodes = JSON.parse(JSON.stringify(INITIAL_NODES));
    const logs = [];
    for (let i = 0; i < count; i++) {
      const pod = mkPod(spec.name, spec.cpu, spec.memory, spec.gpu);
      if (spec.replicas === 'all-nodes') {
        // DaemonSet: one per node
        updatedNodes[i].pods.push({ ...pod, state: 'Running', stateIdx: 2 });
        updatedNodes[i].usedCpu += pod.cpu;
        updatedNodes[i].usedMem += pod.memory;
        logs.push({ text: `${pod.name} → ${updatedNodes[i].name}`, color: COLORS.green });
      } else {
        const { nodes: ns, placed } = schedulePod(pod, updatedNodes);
        updatedNodes = ns;
        logs.push({ text: placed ? `${pod.name} → ${placed}` : `${pod.name}: no capacity`, color: placed ? COLORS.green : COLORS.red });
      }
    }
    setNodes(updatedNodes);
    setLifecycleLog(logs);
    setActiveTab('scheduling');
  }, [schedulePod]);

  // ── Reset ──────────────────────────────────────────────────────────────────
  const reset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setNodes(JSON.parse(JSON.stringify(INITIAL_NODES)));
    setLifecycleLog([]);
    setAnimatingPod(null);
    setAnimStep(-1);
    setActivePreset(null);
    podIdCounter = 0;
  };

  // Apply YAML (simple parser)
  const applyYaml = () => {
    const lines = yamlText.split('\n');
    let cpu = 250, mem = 256, replicas = 1, gpu = false, name = 'custom-pod';
    for (const line of lines) {
      const t = line.trim();
      if (t.startsWith('replicas:')) replicas = parseInt(t.split(':')[1]) || 1;
      if (t.startsWith('cpu:')) cpu = parseInt(t.split('"')[1]) || 250;
      if (t.startsWith('memory:')) mem = parseInt(t.split('"')[1]) || 256;
      if (t.startsWith('name:') && !t.includes('nvidia')) name = t.split(':')[1].trim();
      if (t.includes('nvidia.com/gpu')) gpu = true;
    }
    let updatedNodes = JSON.parse(JSON.stringify(nodes));
    const logs = [];
    for (let i = 0; i < replicas; i++) {
      const pod = mkPod(name, cpu, mem, gpu);
      const { nodes: ns, placed } = schedulePod(pod, updatedNodes);
      updatedNodes = ns;
      logs.push({ text: placed ? `${pod.name} scheduled → ${placed}` : `${pod.name}: insufficient resources`, color: placed ? COLORS.green : COLORS.red });
    }
    setNodes(updatedNodes);
    setLifecycleLog(prev => [...prev, ...logs]);
  };

  // Crash simulation
  const simulateCrash = () => {
    setNodes(prev => {
      const ns = JSON.parse(JSON.stringify(prev));
      for (const n of ns) {
        if (n.pods.length > 0) {
          const pod = n.pods[0];
          pod.state = 'CrashLoopBackOff';
          pod.crashCount = (pod.crashCount || 0) + 1;
          setLifecycleLog(l => [...l,
            { text: `${pod.name} crashed! Backoff: ${Math.min(300, 10 * Math.pow(2, pod.crashCount))}s`, color: COLORS.red },
          ]);
          return ns;
        }
      }
      return ns;
    });
  };

  // ── Render: Cluster Architecture ───────────────────────────────────────────
  const renderCluster = () => (
    <div>
      {selectedComponent && (
        <div style={s.infoBox}>
          <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <div><strong>{selectedComponent}</strong>: {COMPONENT_INFO[selectedComponent]}</div>
        </div>
      )}
      {/* Control Plane */}
      <div style={s.panel}>
        <div style={{ ...s.label, color: COLORS.purple }}>⬡ Control Plane</div>
        <div style={{ ...s.grid, gridTemplateColumns: compact ? 'repeat(2,1fr)' : 'repeat(4,1fr)' }}>
          {['API Server', 'etcd', 'Scheduler', 'Controller Manager'].map(c => (
            <div key={c} onClick={() => setSelectedComponent(c === selectedComponent ? null : c)}
              style={{ background: COLORS.bg, borderRadius: 8, padding: 12, cursor: 'pointer',
                border: `1px solid ${selectedComponent === c ? COLORS.purple : COLORS.border}`,
                transition: 'all .2s', textAlign: 'center' }}>
              {c === 'API Server' && <Server size={20} color={COLORS.purple} />}
              {c === 'etcd' && <Database size={20} color={COLORS.yellow} />}
              {c === 'Scheduler' && <Activity size={20} color={COLORS.cyan} />}
              {c === 'Controller Manager' && <Settings size={20} color={COLORS.green} />}
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>{c}</div>
            </div>
          ))}
        </div>
        {/* Connection arrows */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0', gap: 6, flexWrap: 'wrap' }}>
          {['kubectl → API', 'API ↔ etcd', 'Scheduler → API', 'Controller → API'].map(a => (
            <span key={a} style={{ fontSize: 10, color: COLORS.dim, background: COLORS.bg, padding: '2px 8px', borderRadius: 4 }}>{a}</span>
          ))}
        </div>
      </div>

      {/* Worker Nodes */}
      <div style={s.label}>Worker Nodes</div>
      <div style={s.grid}>
        {nodes.map(n => (
          <div key={n.id} style={s.nodeBox(false)}>
            <div style={{ ...s.row, marginBottom: 8 }}>
              <Server size={14} color={COLORS.cyan} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>{n.name}</span>
              {n.gpus > 0 && <span style={s.badge(COLORS.purple)}>GPU×{n.gpus}</span>}
            </div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
              {['kubelet', 'kube-proxy', 'Container Runtime'].map(c => (
                <span key={c} onClick={() => setSelectedComponent(c === selectedComponent ? null : c)}
                  style={{ ...s.badge(COLORS.dim), cursor: 'pointer',
                    borderColor: selectedComponent === c ? COLORS.cyan : 'transparent',
                    border: `1px solid ${selectedComponent === c ? COLORS.cyan : 'transparent'}` }}>{c}</span>
              ))}
            </div>
            {/* Resource bars */}
            <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 2 }}>
              CPU {fmtRes(n.usedCpu, 'm')}/{fmtRes(n.cpu, 'm')}
            </div>
            <div style={s.bar(n.usedCpu / n.cpu * 100, COLORS.cyan)}>
              <div style={s.bar(n.usedCpu / n.cpu * 100, COLORS.cyan)._fill} />
            </div>
            <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 6, marginBottom: 2 }}>
              Mem {fmtRes(n.usedMem, 'Mi')}/{fmtRes(n.memory, 'Mi')}
            </div>
            <div style={s.bar(n.usedMem / n.memory * 100, COLORS.purple)}>
              <div style={s.bar(n.usedMem / n.memory * 100, COLORS.purple)._fill} />
            </div>
            {/* Pods */}
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {n.pods.map(p => (
                <span key={p.id} style={s.podBox(POD_STATE_COLORS[p.state] || COLORS.dim)}>
                  <Box size={10} /> {p.name.slice(0, 14)} <span style={{ fontSize: 9 }}>({p.state})</span>
                </span>
              ))}
              {n.pods.length === 0 && <span style={{ fontSize: 11, color: COLORS.dim }}>No pods</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Render: Pod Lifecycle ──────────────────────────────────────────────────
  const renderLifecycle = () => (
    <div>
      <div style={{ ...s.row, marginBottom: 12 }}>
        <button style={s.btn(COLORS.green, !!animatingPod)} onClick={() => {
          if (!animatingPod) runLifecycle(mkPod('demo-pod', 250, 256));
        }}><Play size={13} /> Deploy Pod</button>
        <button style={s.btn(COLORS.red, false)} onClick={simulateCrash}>
          <AlertTriangle size={13} /> Simulate Crash</button>
        <button style={s.btn(COLORS.border, false)} onClick={reset}><RotateCcw size={13} /> Reset</button>
      </div>

      {/* Animation pipeline */}
      <div style={s.panel}>
        <div style={s.label}>Pod Deployment Pipeline</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: 8 }}>
          {ANIM_STEPS.map((step, i) => {
            const Icon = step.icon;
            const active = animStep >= i;
            const current = animStep === i;
            return (
              <React.Fragment key={i}>
                {i > 0 && <ArrowRight size={16} color={active ? COLORS.cyan : COLORS.dim}
                  style={{ flexShrink: 0, transition: 'color .3s' }} />}
                <div style={{ textAlign: 'center', minWidth: 80, padding: '8px 6px', borderRadius: 8,
                  background: current ? COLORS.cyan + '22' : 'transparent',
                  border: `1px solid ${current ? COLORS.cyan : active ? COLORS.cyan + '44' : COLORS.border}`,
                  transition: 'all .4s', flexShrink: 0 }}>
                  <Icon size={18} color={active ? COLORS.cyan : COLORS.dim}
                    style={{ transition: 'color .3s' }} />
                  <div style={{ fontSize: 10, fontWeight: 600, marginTop: 4,
                    color: active ? COLORS.text : COLORS.dim }}>{step.label}</div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
        {animStep >= 0 && animStep < ANIM_STEPS.length && (
          <div style={{ fontSize: 12, color: COLORS.cyan, marginTop: 8, fontStyle: 'italic' }}>
            ▸ {ANIM_STEPS[animStep].desc}
          </div>
        )}
      </div>

      {/* Pod state machine */}
      <div style={s.panel}>
        <div style={s.label}>Pod State Machine</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {POD_STATES.map((st, i) => (
            <React.Fragment key={st}>
              {i > 0 && <ArrowRight size={12} color={COLORS.dim} />}
              <span style={s.badge(POD_STATE_COLORS[st])}>{st}</span>
            </React.Fragment>
          ))}
          <span style={{ fontSize: 10, color: COLORS.dim, margin: '0 4px' }}>|</span>
          <span style={s.badge(COLORS.red)}>CrashLoopBackOff</span>
          <span style={{ fontSize: 10, color: COLORS.dim }}>(backoff: 10s → 20s → 40s → 80s → 160s → 300s max)</span>
        </div>
      </div>

      {/* Event log */}
      <div style={s.panel}>
        <div style={s.label}>Events</div>
        <div style={{ maxHeight: 160, overflowY: 'auto', fontSize: 12, fontFamily: 'monospace' }}>
          {lifecycleLog.length === 0 && <span style={{ color: COLORS.dim }}>No events yet. Click "Deploy Pod" to begin.</span>}
          {lifecycleLog.map((e, i) => (
            <div key={i} style={{ color: e.color, padding: '2px 0' }}>
              <Clock size={10} style={{ marginRight: 4 }} />{e.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Render: Resource Scheduling ────────────────────────────────────────────
  const [schedCpu, setSchedCpu] = useState(500);
  const [schedMem, setSchedMem] = useState(512);
  const [schedGpu, setSchedGpu] = useState(false);

  const renderScheduling = () => (
    <div>
      {/* Quick deploy controls */}
      <div style={{ ...s.panel, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <div style={s.label}>CPU (millicores)</div>
          <div style={s.row}>
            {[100, 250, 500, 1000, 2000].map(v => (
              <button key={v} style={s.tab(schedCpu === v)} onClick={() => setSchedCpu(v)}>{v}m</button>
            ))}
          </div>
        </div>
        <div>
          <div style={s.label}>Memory (Mi)</div>
          <div style={s.row}>
            {[128, 256, 512, 1024, 4096].map(v => (
              <button key={v} style={s.tab(schedMem === v)} onClick={() => setSchedMem(v)}>{v}</button>
            ))}
          </div>
        </div>
        <label style={{ fontSize: 12, color: COLORS.muted, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input type="checkbox" checked={schedGpu} onChange={e => setSchedGpu(e.target.checked)} /> Requires GPU
        </label>
        <button style={s.btn(COLORS.green, false)} onClick={() => {
          const pod = mkPod('sched-pod', schedCpu, schedMem, schedGpu);
          setNodes(prev => {
            const { nodes: ns, placed } = schedulePod(pod, JSON.parse(JSON.stringify(prev)));
            setLifecycleLog(l => [...l, {
              text: placed ? `${pod.name} (${schedCpu}m CPU, ${schedMem}Mi) → ${placed}` : `${pod.name}: Insufficient resources!`,
              color: placed ? COLORS.green : COLORS.red }]);
            return ns;
          });
        }}><Plus size={13} /> Schedule Pod</button>
        <button style={s.btn(COLORS.border, false)} onClick={reset}><RotateCcw size={13} /> Reset</button>
      </div>

      {/* Node capacity view */}
      <div style={s.grid}>
        {nodes.map(n => {
          const cpuPct = n.usedCpu / n.cpu * 100;
          const memPct = n.usedMem / n.memory * 100;
          return (
            <div key={n.id} style={s.nodeBox(false)}>
              <div style={{ ...s.row, marginBottom: 6 }}>
                <Server size={14} color={COLORS.cyan} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>{n.name}</span>
                {n.gpus > 0 && <span style={s.badge(COLORS.purple)}>GPU×{n.gpus}</span>}
                {n.label && <span style={s.badge(COLORS.teal)}>{n.label}</span>}
              </div>
              <div style={{ fontSize: 10, color: COLORS.muted }}>CPU {fmtRes(n.usedCpu, 'm')}/{fmtRes(n.cpu, 'm')} ({cpuPct.toFixed(0)}%)</div>
              <div style={s.bar(cpuPct, COLORS.cyan)}><div style={s.bar(cpuPct, COLORS.cyan)._fill} /></div>
              <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 6 }}>Memory {fmtRes(n.usedMem, 'Mi')}/{fmtRes(n.memory, 'Mi')} ({memPct.toFixed(0)}%)</div>
              <div style={s.bar(memPct, COLORS.purple)}><div style={s.bar(memPct, COLORS.purple)._fill} /></div>
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {n.pods.map(p => (
                  <div key={p.id} style={s.podBox(POD_STATE_COLORS[p.state] || COLORS.green)}>
                    <Box size={10} />
                    <span>{p.name.slice(0, 12)}</span>
                    <span style={{ fontSize: 9, color: COLORS.dim }}>{p.cpu}m/{p.memory}Mi</span>
                  </div>
                ))}
              </div>
              {cpuPct > 90 || memPct > 90 ? (
                <div style={{ fontSize: 10, color: COLORS.red, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertTriangle size={10} /> Node under pressure
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Event log */}
      <div style={{ ...s.panel, marginTop: 12 }}>
        <div style={s.label}>Scheduler Events</div>
        <div style={{ maxHeight: 120, overflowY: 'auto', fontSize: 12, fontFamily: 'monospace' }}>
          {lifecycleLog.length === 0 && <span style={{ color: COLORS.dim }}>Schedule pods to see events here.</span>}
          {lifecycleLog.slice(-15).map((e, i) => (
            <div key={i} style={{ color: e.color, padding: '2px 0' }}>{e.text}</div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Render: Network Visualization ──────────────────────────────────────────
  const renderNetwork = () => {
    const svcTypes = [
      { key: 'clusterip', label: 'ClusterIP', desc: 'Internal-only service. Pods access via service-name.namespace.svc.cluster.local' },
      { key: 'nodeport', label: 'NodePort', desc: 'Exposes service on each node IP at a static port (30000-32767)' },
      { key: 'pod2pod', label: 'Pod-to-Pod', desc: 'Direct pod communication across nodes via CNI overlay network' },
    ];
    const activeSvc = svcTypes.find(t => t.key === networkView);
    const runningPods = nodes.flatMap(n => n.pods.filter(p => p.state === 'Running'));

    return (
      <div>
        <div style={{ ...s.row, marginBottom: 12 }}>
          {svcTypes.map(t => (
            <button key={t.key} style={s.tab(networkView === t.key)} onClick={() => setNetworkView(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={s.infoBox}>
          <Wifi size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>{activeSvc.desc}</div>
        </div>

        <div style={s.panel}>
          {networkView === 'clusterip' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ ...s.badge(COLORS.blue), fontSize: 12, padding: '6px 16px', marginBottom: 12 }}>
                <Globe size={12} style={{ marginRight: 4 }} /> web-svc.default.svc.cluster.local (ClusterIP: 10.96.0.1)
              </div>
              <div style={{ fontSize: 11, color: COLORS.dim, marginBottom: 8 }}>↓ round-robin load balancing ↓</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                {(runningPods.length > 0 ? runningPods.slice(0, 4) : [{ id: 'ex1', name: 'web-app-1' }, { id: 'ex2', name: 'web-app-2' }, { id: 'ex3', name: 'web-app-3' }]).map(p => (
                  <div key={p.id} style={s.podBox(COLORS.green)}>
                    <Box size={10} /> {p.name.slice(0, 14)}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, fontSize: 11, color: COLORS.muted, fontFamily: 'monospace', background: COLORS.bg,
                padding: 10, borderRadius: 6, textAlign: 'left' }}>
                $ kubectl get svc web-svc{'\n'}
                NAME      TYPE        CLUSTER-IP   PORT(S)   AGE{'\n'}
                web-svc   ClusterIP   10.96.0.1    80/TCP    5m{'\n\n'}
                # DNS resolution:{'\n'}
                $ nslookup web-svc.default.svc.cluster.local{'\n'}
                Address: 10.96.0.1
              </div>
            </div>
          )}
          {networkView === 'nodeport' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ ...s.badge(COLORS.orange), fontSize: 12, padding: '6px 16px', marginBottom: 8 }}>
                <Globe size={12} style={{ marginRight: 4 }} /> External Traffic → :31080
              </div>
              <div style={{ fontSize: 11, color: COLORS.dim, marginBottom: 12 }}>↓ any node IP:31080 ↓</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
                {nodes.map(n => (
                  <div key={n.id} style={{ ...s.nodeBox(false), textAlign: 'center', minWidth: 140 }}>
                    <Server size={14} color={COLORS.cyan} />
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{n.name}</div>
                    <div style={{ fontSize: 10, color: COLORS.orange }}>:31080 open</div>
                    <div style={{ fontSize: 10, color: COLORS.dim, marginTop: 4 }}>→ kube-proxy → pod</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {networkView === 'pod2pod' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ ...s.badge(COLORS.teal), fontSize: 12, padding: '6px 16px', marginBottom: 12 }}>
                Pod-to-Pod via CNI Overlay (e.g., Flannel / Calico)
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={s.nodeBox(false)}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Node A</div>
                  <div style={s.podBox(COLORS.green)}><Box size={10} /> pod-a (10.244.1.5)</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <ArrowRight size={20} color={COLORS.teal} />
                  <span style={{ fontSize: 9, color: COLORS.dim }}>VXLAN tunnel</span>
                </div>
                <div style={s.nodeBox(false)}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Node B</div>
                  <div style={s.podBox(COLORS.cyan)}><Box size={10} /> pod-b (10.244.2.8)</div>
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: COLORS.muted }}>
                Every pod gets a unique IP. No NAT between pods — flat network model.
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Render: YAML Editor ────────────────────────────────────────────────────
  const renderYaml = () => (
    <div>
      <div style={s.panel}>
        <div style={{ ...s.label, marginBottom: 6 }}>Manifest Editor</div>
        <div style={{ fontSize: 11, color: COLORS.dim, marginBottom: 8 }}>
          Edit fields like <code style={{ color: COLORS.cyan }}>replicas</code>,{' '}
          <code style={{ color: COLORS.cyan }}>cpu</code>,{' '}
          <code style={{ color: COLORS.cyan }}>memory</code>, and{' '}
          <code style={{ color: COLORS.cyan }}>image</code> then click Apply.
        </div>
        <textarea style={s.textarea} value={yamlText} onChange={e => setYamlText(e.target.value)}
          spellCheck={false} />
        <div style={{ ...s.row, marginTop: 10 }}>
          <button style={s.btn(COLORS.green, false)} onClick={applyYaml}>
            <CheckCircle size={13} /> kubectl apply
          </button>
          <button style={s.btn(COLORS.border, false)} onClick={() => setYamlText(PRESETS[activePreset || 'web-app'].yaml)}>
            <RotateCcw size={13} /> Reset YAML
          </button>
        </div>
      </div>
      {/* YAML ↔ Visual field mapping */}
      <div style={s.panel}>
        <div style={s.label}>Field → Visual Mapping</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
          {[
            ['spec.replicas', 'Number of pod boxes shown'],
            ['resources.requests.cpu', 'Pod width & node CPU bar fill'],
            ['resources.requests.memory', 'Pod label & node memory bar'],
            ['nvidia.com/gpu', 'Pod scheduled to GPU-labeled node'],
            ['metadata.name', 'Pod name label text'],
            ['spec.template.spec.image', 'Shown in pod tooltip'],
          ].map(([k, v]) => (
            <React.Fragment key={k}>
              <code style={{ color: COLORS.cyan, fontFamily: 'monospace', fontSize: 11 }}>{k}</code>
              <span style={{ color: COLORS.muted }}>{v}</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Presets panel ──────────────────────────────────────────────────────────
  const renderPresets = () => (
    <div style={{ ...s.grid, marginBottom: 16 }}>
      {Object.entries(PRESETS).map(([key, p]) => {
        const Icon = p.icon;
        const active = activePreset === key;
        return (
          <div key={key} onClick={() => deployPreset(key)}
            style={{ ...s.panel, cursor: 'pointer', borderColor: active ? p.color : COLORS.border,
              background: active ? p.color + '11' : COLORS.surface, transition: 'all .2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Icon size={16} color={p.color} />
              <span style={{ fontSize: 13, fontWeight: 700, color: active ? p.color : COLORS.text }}>{p.title}</span>
            </div>
            <div style={{ fontSize: 11, color: COLORS.muted, lineHeight: 1.4 }}>{p.desc}</div>
          </div>
        );
      })}
    </div>
  );

  // ── Main ───────────────────────────────────────────────────────────────────
  const TABS = [
    { key: 'cluster', label: 'Cluster', icon: Server },
    { key: 'lifecycle', label: 'Pod Lifecycle', icon: Activity },
    { key: 'scheduling', label: 'Scheduling', icon: Cpu },
    { key: 'network', label: 'Network', icon: Wifi },
    { key: 'yaml', label: 'YAML Editor', icon: Code },
  ];

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <Box size={compact ? 20 : 24} color={COLORS.cyan} />
        <span style={s.title}>Kubernetes Cluster Visualizer</span>
        <span style={{ ...s.badge(COLORS.green), marginLeft: 'auto' }}>Interactive</span>
      </div>

      {/* Preset cards */}
      <div style={s.label}>Workload Presets</div>
      {renderPresets()}

      {/* Tab bar */}
      <div style={s.tabs}>
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} style={s.tab(activeTab === t.key)} onClick={() => setActiveTab(t.key)}>
              <Icon size={12} style={{ marginRight: 4 }} /> {t.label}
            </button>
          );
        })}
        <button style={{ ...s.tab(showYaml), marginLeft: 'auto' }} onClick={() => setShowYaml(!showYaml)}>
          {showYaml ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <span style={{ marginLeft: 4 }}>YAML Panel</span>
        </button>
      </div>

      {/* Content */}
      <div style={{ display: 'grid', gridTemplateColumns: showYaml && !compact ? '1fr 360px' : '1fr', gap: 16 }}>
        <div>
          {activeTab === 'cluster' && renderCluster()}
          {activeTab === 'lifecycle' && renderLifecycle()}
          {activeTab === 'scheduling' && renderScheduling()}
          {activeTab === 'network' && renderNetwork()}
          {activeTab === 'yaml' && renderYaml()}
        </div>
        {showYaml && !compact && (
          <div style={s.panel}>
            <div style={s.label}>Live YAML</div>
            <textarea style={{ ...s.textarea, minHeight: 320 }} value={yamlText}
              onChange={e => setYamlText(e.target.value)} spellCheck={false} />
            <button style={{ ...s.btn(COLORS.green, false), marginTop: 8, width: '100%', justifyContent: 'center' }}
              onClick={applyYaml}><CheckCircle size={13} /> Apply</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default K8sVisualizer;
