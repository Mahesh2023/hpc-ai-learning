import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Network, Zap, Info, AlertTriangle, Cpu, ArrowRight } from 'lucide-react';

const COLORS = { bg: '#0f172a', card: '#1e293b', border: '#334155', text: '#f1f5f9', muted: '#94a3b8', dim: '#64748b', cyan: '#06b6d4', purple: '#8b5cf6', green: '#10b981', yellow: '#f59e0b', red: '#ef4444' };

const TOPOLOGIES = [
  { id: 'fat-tree', label: 'Fat-Tree', desc: 'Summit uses fat-tree with HDR InfiniBand (200 Gb/s). High bisection bandwidth via multi-level switching.' },
  { id: 'dragonfly', label: 'Dragonfly', desc: 'Frontier uses HPE Slingshot dragonfly. Groups connected via global links — low diameter, cost-efficient.' },
  { id: 'torus', label: '3D Torus', desc: 'Fugaku uses 6D torus (TofuD). Wrap-around links reduce diameter. Great for nearest-neighbor stencils.' },
];

const PRESETS = [
  { id: 'route', label: 'Packet Routing', desc: 'Click source → destination to route a packet' },
  { id: 'congest', label: 'Congestion Sim', desc: 'Flood traffic to see links congest (turns red)' },
  { id: 'job', label: 'Job Placement', desc: 'See topology-aware vs random scheduling' },
];

const buildFatTree = () => {
  const nodes = [], links = [];
  const spineY = 40, leafY = 130, compY = 220;
  for (let i = 0; i < 4; i++) nodes.push({ id: `s${i}`, x: 140 + i * 160, y: spineY, type: 'spine', label: `Spine ${i}` });
  for (let i = 0; i < 8; i++) nodes.push({ id: `l${i}`, x: 60 + i * 90, y: leafY, type: 'leaf', label: `Leaf ${i}` });
  for (let i = 0; i < 16; i++) nodes.push({ id: `c${i}`, x: 30 + i * 50, y: compY, type: 'compute', label: `N${i}` });
  for (let li = 0; li < 8; li++) for (let si = 0; si < 4; si++) links.push({ from: `l${li}`, to: `s${si}`, bw: 200 });
  for (let ci = 0; ci < 16; ci++) { links.push({ from: `c${ci}`, to: `l${Math.floor(ci / 2)}`, bw: 100 }); }
  return { nodes, links, metrics: { bisection: '3.2 Tb/s', diameter: 4, hopLatency: '~100ns/hop' } };
};

const buildDragonfly = () => {
  const nodes = [], links = [];
  const groups = 4, perGroup = 4, cx = 400, cy = 140, gr = 110;
  for (let g = 0; g < groups; g++) {
    const ga = (g / groups) * 2 * Math.PI - Math.PI / 2;
    const gx = cx + Math.cos(ga) * gr, gy = cy + Math.sin(ga) * gr;
    for (let n = 0; n < perGroup; n++) {
      const a = ga + ((n - 1.5) / perGroup) * 1.2;
      const nx = gx + Math.cos(a) * 50, ny = gy + Math.sin(a) * 50;
      const id = `d${g}_${n}`;
      nodes.push({ id, x: nx, y: ny, type: n === 0 ? 'router' : 'compute', label: n === 0 ? `R${g}` : `G${g}N${n}`, group: g });
      if (n > 0) links.push({ from: id, to: `d${g}_0`, bw: 200 });
    }
  }
  for (let g = 0; g < groups; g++) for (let g2 = g + 1; g2 < groups; g2++) links.push({ from: `d${g}_0`, to: `d${g2}_0`, bw: 100, global: true });
  return { nodes, links, metrics: { bisection: '1.6 Tb/s', diameter: 3, hopLatency: '~100ns/hop' } };
};

const buildTorus = () => {
  const nodes = [], links = [];
  const rows = 4, cols = 4, ox = 150, oy = 40, sx = 130, sy = 55;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    nodes.push({ id: `t${r}_${c}`, x: ox + c * sx, y: oy + r * sy, type: 'compute', label: `(${r},${c})` });
    if (c < cols - 1) links.push({ from: `t${r}_${c}`, to: `t${r}_${c + 1}`, bw: 200 });
    if (r < rows - 1) links.push({ from: `t${r}_${c}`, to: `t${r + 1}_${c}`, bw: 200 });
  }
  for (let r = 0; r < rows; r++) links.push({ from: `t${r}_0`, to: `t${r}_${cols - 1}`, bw: 100, wrap: true });
  for (let c = 0; c < cols; c++) links.push({ from: `t0_${c}`, to: `t${rows - 1}_${c}`, bw: 100, wrap: true });
  return { nodes, links, metrics: { bisection: '1.6 Tb/s', diameter: 4, hopLatency: '~100ns/hop' } };
};

const getNodeById = (nodes, id) => nodes.find(n => n.id === id);

const findPath = (nodes, links, srcId, dstId) => {
  const adj = {};
  nodes.forEach(n => (adj[n.id] = []));
  links.forEach(l => { adj[l.from].push(l.to); adj[l.to].push(l.from); });
  const queue = [[srcId]], visited = new Set([srcId]);
  while (queue.length) {
    const path = queue.shift();
    if (path[path.length - 1] === dstId) return path;
    for (const nb of adj[path[path.length - 1]] || []) {
      if (!visited.has(nb)) { visited.add(nb); queue.push([...path, nb]); }
    }
  }
  return [srcId];
};

export default function NetworkTopologyViewer({ compact = false }) {
  const [topo, setTopo] = useState('fat-tree');
  const [mode, setMode] = useState('route');
  const [graph, setGraph] = useState(() => buildFatTree());
  const [selected, setSelected] = useState([]);
  const [packets, setPackets] = useState([]);
  const [congestion, setCongestion] = useState({});
  const [jobNodes, setJobNodes] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [info, setInfo] = useState('Select a topology and interaction mode above, then click nodes in the SVG.');
  const animRef = useRef(null);
  const tickRef = useRef(0);

  useEffect(() => {
    const g = topo === 'fat-tree' ? buildFatTree() : topo === 'dragonfly' ? buildDragonfly() : buildTorus();
    setGraph(g); setSelected([]); setPackets([]); setCongestion({}); setJobNodes([]); setPlaying(false);
    setInfo(TOPOLOGIES.find(t => t.id === topo).desc);
  }, [topo]);

  useEffect(() => { setSelected([]); setPackets([]); setCongestion({}); setJobNodes([]); }, [mode]);

  const launchPacket = useCallback((src, dst) => {
    const path = findPath(graph.nodes, graph.links, src, dst);
    if (path.length < 2) return;
    setPackets(prev => [...prev, { id: Date.now(), path, pos: 0, progress: 0, done: false }]);
    setInfo(`Routing: ${path.length - 1} hops, est. latency ~${(path.length - 1) * 100}ns (IB HDR ~100ns/hop). ${path.length > 3 ? 'ECMP could pick alternate equal-cost paths.' : ''}`);
    setPlaying(true);
  }, [graph]);

  const floodPackets = useCallback(() => {
    const computes = graph.nodes.filter(n => n.type === 'compute');
    const batch = [];
    for (let i = 0; i < 12; i++) {
      const s = computes[Math.floor(Math.random() * computes.length)];
      let d = s;
      while (d.id === s.id) d = computes[Math.floor(Math.random() * computes.length)];
      const path = findPath(graph.nodes, graph.links, s.id, d.id);
      batch.push({ id: Date.now() + i, path, pos: 0, progress: 0, done: false });
    }
    setPackets(prev => [...prev, ...batch]);
    setInfo('Congestion simulation: links carrying multiple packets turn orange→red. Adaptive routing or ECMP can balance load across equal-cost paths.');
    setPlaying(true);
  }, [graph]);

  const runJobPlacement = useCallback(() => {
    const computes = graph.nodes.filter(n => n.type === 'compute');
    const aware = computes.slice(0, 4).map(n => n.id);
    setJobNodes(aware);
    setInfo('Job Placement: 4 MPI ranks on nearby nodes (green). Topology-aware scheduling reduces max hop count and tail latency vs. random scatter.');
  }, [graph]);

  useEffect(() => {
    if (!playing) { cancelAnimationFrame(animRef.current); return; }
    const step = () => {
      tickRef.current++;
      setPackets(prev => {
        const cMap = {};
        const next = prev.map(p => {
          if (p.done) return p;
          let prog = p.progress + 0.04;
          let pos = p.pos;
          if (prog >= 1) { prog = 0; pos++; }
          if (pos >= p.path.length - 1) return { ...p, done: true };
          const key = [p.path[pos], p.path[pos + 1]].sort().join('-');
          cMap[key] = (cMap[key] || 0) + 1;
          return { ...p, pos, progress: prog };
        });
        setCongestion(cMap);
        if (next.every(p => p.done)) { setPlaying(false); }
        return next;
      });
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [playing]);

  const handleNodeClick = (nodeId) => {
    if (mode === 'route') {
      if (selected.length === 0) { setSelected([nodeId]); setInfo(`Source: ${nodeId}. Now click a destination node.`); }
      else if (selected.length === 1 && selected[0] !== nodeId) { launchPacket(selected[0], nodeId); setSelected([]); }
    } else if (mode === 'congest') { floodPackets(); }
    else if (mode === 'job') { runJobPlacement(); }
  };

  const reset = () => { setPackets([]); setCongestion({}); setJobNodes([]); setSelected([]); setPlaying(false); setInfo('Reset. Click nodes to interact.'); };

  const svgW = compact ? 700 : 800, svgH = compact ? 250 : 280;

  const linkColor = (l) => {
    const key = [l.from, l.to].sort().join('-');
    const c = congestion[key] || 0;
    if (c >= 3) return COLORS.red;
    if (c >= 2) return COLORS.yellow;
    if (c >= 1) return '#fb923c';
    if (l.global) return COLORS.purple;
    if (l.wrap) return COLORS.cyan;
    return COLORS.border;
  };

  const nodeColor = (n) => {
    if (jobNodes.includes(n.id)) return COLORS.green;
    if (selected.includes(n.id)) return COLORS.yellow;
    if (n.type === 'spine') return COLORS.purple;
    if (n.type === 'leaf' || n.type === 'router') return COLORS.cyan;
    return COLORS.dim;
  };

  const renderPackets = () => packets.filter(p => !p.done && p.pos < p.path.length - 1).map(p => {
    const src = getNodeById(graph.nodes, p.path[p.pos]);
    const dst = getNodeById(graph.nodes, p.path[p.pos + 1]);
    if (!src || !dst) return null;
    const x = src.x + (dst.x - src.x) * p.progress;
    const y = src.y + (dst.y - src.y) * p.progress;
    return <circle key={p.id} cx={x} cy={y} r={5} fill={COLORS.yellow} opacity={0.95}><animate attributeName="r" values="4;6;4" dur="0.5s" repeatCount="indefinite" /></circle>;
  });

  const s = { wrap: { background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: compact ? 12 : 16, fontFamily: 'system-ui, sans-serif', color: COLORS.text, maxWidth: 860 },
    row: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' },
    btn: (active) => ({ padding: '5px 12px', borderRadius: 6, border: `1px solid ${active ? COLORS.cyan : COLORS.border}`, background: active ? COLORS.cyan + '22' : COLORS.card, color: active ? COLORS.cyan : COLORS.muted, cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, transition: 'all .15s' }),
    svg: { background: COLORS.card, borderRadius: 8, border: `1px solid ${COLORS.border}`, width: '100%' },
    info: { background: COLORS.card, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: COLORS.muted, border: `1px solid ${COLORS.border}`, marginTop: 8, lineHeight: 1.5 },
    metric: { display: 'inline-block', background: COLORS.bg, borderRadius: 6, padding: '3px 10px', fontSize: 11, color: COLORS.cyan, marginRight: 6, border: `1px solid ${COLORS.border}` },
    title: { fontSize: 15, fontWeight: 700, color: COLORS.text, display: 'flex', alignItems: 'center', gap: 6 },
  };

  return (
    <div style={s.wrap}>
      <div style={{ ...s.row, justifyContent: 'space-between' }}>
        <span style={s.title}><Network size={16} color={COLORS.cyan} /> Network Topology Viewer</span>
        <button onClick={reset} style={{ ...s.btn(false), display: 'flex', alignItems: 'center', gap: 4 }}><RotateCcw size={13} /> Reset</button>
      </div>
      <div style={s.row}>
        {TOPOLOGIES.map(t => <button key={t.id} style={s.btn(topo === t.id)} onClick={() => setTopo(t.id)}>{t.label}</button>)}
        <span style={{ color: COLORS.dim, fontSize: 11, margin: '0 4px' }}>│</span>
        {PRESETS.map(p => <button key={p.id} style={s.btn(mode === p.id)} onClick={() => setMode(p.id)}>{p.label}</button>)}
        {playing && <span style={{ color: COLORS.yellow, fontSize: 12, display: 'flex', alignItems: 'center', gap: 3 }}><Zap size={12} /> Animating…</span>}
      </div>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} style={s.svg}>
        <defs>
          <marker id="pkt" markerWidth="6" markerHeight="6" refX="3" refY="3"><circle cx="3" cy="3" r="2" fill={COLORS.yellow} /></marker>
        </defs>
        {graph.links.map((l, i) => {
          const a = getNodeById(graph.nodes, l.from), b = getNodeById(graph.nodes, l.to);
          if (!a || !b) return null;
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={linkColor(l)} strokeWidth={l.wrap || l.global ? 1.5 : 1} strokeDasharray={l.wrap ? '4 3' : 'none'} opacity={0.6} />;
        })}
        {graph.nodes.map(n => (
          <g key={n.id} onClick={() => handleNodeClick(n.id)} style={{ cursor: 'pointer' }}>
            {n.type === 'compute' ? <rect x={n.x - 8} y={n.y - 8} width={16} height={16} rx={3} fill={nodeColor(n)} opacity={0.9} stroke={selected.includes(n.id) ? COLORS.yellow : 'none'} strokeWidth={2} />
              : <circle cx={n.x} cy={n.y} r={n.type === 'spine' ? 12 : 10} fill={nodeColor(n)} opacity={0.85} stroke={selected.includes(n.id) ? COLORS.yellow : 'none'} strokeWidth={2} />}
            <text x={n.x} y={n.y + (n.type === 'compute' ? 24 : -16)} textAnchor="middle" fill={COLORS.dim} fontSize={9}>{n.label}</text>
          </g>
        ))}
        {renderPackets()}
        {topo === 'fat-tree' && <>
          <text x={15} y={45} fill={COLORS.purple} fontSize={10} fontWeight={600}>Spine (L2)</text>
          <text x={15} y={135} fill={COLORS.cyan} fontSize={10} fontWeight={600}>Leaf (L1)</text>
          <text x={15} y={225} fill={COLORS.dim} fontSize={10} fontWeight={600}>Compute</text>
          <text x={svgW - 15} y={90} textAnchor="end" fill={COLORS.muted} fontSize={9}>200 Gb/s HDR IB</text>
          <text x={svgW - 15} y={180} textAnchor="end" fill={COLORS.muted} fontSize={9}>100 Gb/s per link</text>
        </>}
      </svg>
      <div style={s.row}>
        <span style={s.metric}>Bisection BW: {graph.metrics.bisection}</span>
        <span style={s.metric}>Diameter: {graph.metrics.diameter} hops</span>
        <span style={s.metric}>Hop Latency: {graph.metrics.hopLatency}</span>
        {packets.length > 0 && <span style={s.metric}>Packets: {packets.filter(p => p.done).length}/{packets.length} delivered</span>}
      </div>
      <div style={s.info}>
        <Info size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} color={COLORS.cyan} />
        {info}
      </div>
      {!compact && (
        <div style={{ ...s.info, marginTop: 6 }}>
          <AlertTriangle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} color={COLORS.yellow} />
          <strong style={{ color: COLORS.yellow }}>Key Concepts: </strong>
          <span><b>Switches</b> aggregate traffic at each level. <b>ECMP</b> (Equal-Cost Multi-Path) spreads flows across equal paths. <b>Adaptive routing</b> reacts to congestion in real-time. <b>Bisection bandwidth</b> is the total BW across the network's narrowest cut — determines worst-case all-to-all throughput.</span>
        </div>
      )}
    </div>
  );
}
