import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Cpu, Zap, Info, Layers, Grid3x3, BarChart3, AlertTriangle, Play, RotateCcw, ChevronRight } from 'lucide-react';

/* ─── Theme constants matching project dark theme ─── */
const C = {
  bg: '#0f172a', card: '#1e293b', border: '#334155', text: '#f1f5f9', sub: '#e2e8f0',
  muted: '#94a3b8', dim: '#64748b', cyan: '#06b6d4', purple: '#8b5cf6',
  green: '#10b981', yellow: '#f59e0b', red: '#ef4444', pink: '#ec4899', orange: '#f97316',
};

const pill = (color) => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: 12,
  fontSize: 11, fontWeight: 600, background: color + '22', color,
});
const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 };
const btn = (active, clr = C.cyan) => ({
  padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500,
  border: `1px solid ${active ? clr : C.border}`, transition: 'all 0.15s',
  background: active ? clr + '22' : 'transparent', color: active ? clr : C.muted,
});
const sliderInput = (label, val, set, min, max, step = 1, color = C.cyan) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.muted }}>
    {label}
    <input type="range" min={min} max={max} step={step} value={val}
      onChange={e => set(+e.target.value)} style={{ accentColor: color, flex: 1 }} />
    <span style={{ color: C.text, fontWeight: 600, minWidth: 28, textAlign: 'right', fontFamily: 'monospace' }}>{val}</span>
  </label>
);

/* ─── Presets for common CUDA patterns ─── */
const CUDA_PRESETS = {
  'vector-add': { label: 'Vector Add', gridX: 4, gridY: 1, blockX: 8, blockY: 1, blockZ: 1,
    desc: '1D grid — one thread per element. Global idx = blockIdx.x * blockDim.x + threadIdx.x' },
  'matrix-multiply': { label: 'Matrix Multiply', gridX: 2, gridY: 2, blockX: 4, blockY: 4, blockZ: 1,
    desc: '2D grid maps to matrix rows/cols. Each thread computes one element of the output matrix C = A × B' },
  'image-conv': { label: 'Image Convolution', gridX: 3, gridY: 3, blockX: 4, blockY: 4, blockZ: 1,
    desc: '2D blocks tile the image. Each block loads a tile + halo into shared memory for the convolution kernel' },
  'reduction': { label: 'Reduction', gridX: 2, gridY: 1, blockX: 8, blockY: 1, blockZ: 1,
    desc: 'Parallel reduction within each block. Threads cooperate to sum elements, halving active threads each step' },
};

/* ─── GPU specs for occupancy calc ─── */
const GPU_SPECS = {
  sm_80: { name: 'A100', maxThreads: 2048, maxBlocks: 32, maxWarps: 64, regs: 65536, shmem: 49152 },
  sm_89: { name: 'RTX 4090', maxThreads: 1536, maxBlocks: 24, maxWarps: 48, regs: 65536, shmem: 49152 },
  sm_90: { name: 'H100', maxThreads: 2048, maxBlocks: 32, maxWarps: 64, regs: 65536, shmem: 49152 },
};

const MEMORY_LEVELS = [
  { name: 'Registers', latency: '~1 cycle', size: '256 KB/SM', color: C.green, width: 120 },
  { name: 'Shared Memory', latency: '~20 cycles', size: '48–228 KB/SM', color: C.cyan, width: 180 },
  { name: 'L1/L2 Cache', latency: '~30–200 cycles', size: '128 KB + 40 MB', color: C.yellow, width: 260 },
  { name: 'Global Memory', latency: '~400 cycles', size: '16–80 GB (VRAM)', color: C.red, width: 360 },
];

const WARP_COLORS = [C.cyan, C.purple, C.green, C.yellow, C.red, C.pink, C.orange, '#06b6d4'];

/* ──────────────────────────────────────────────────────────
   1. CUDA Grid Visualization
   ────────────────────────────────────────────────────────── */
function GridVisualization({ compact }) {
  const [gridX, setGridX] = useState(2);
  const [gridY, setGridY] = useState(2);
  const [blockX, setBlockX] = useState(4);
  const [blockY, setBlockY] = useState(4);
  const [selected, setSelected] = useState(null); // { bx, by, tx, ty }
  const [presetKey, setPresetKey] = useState(null);

  const applyPreset = useCallback((key) => {
    const p = CUDA_PRESETS[key];
    setGridX(p.gridX); setGridY(p.gridY);
    setBlockX(p.blockX); setBlockY(p.blockY);
    setPresetKey(key); setSelected(null);
  }, []);

  const threadsPerBlock = blockX * blockY;
  const totalThreads = threadsPerBlock * gridX * gridY;
  const globalIdx = selected
    ? (selected.by * gridX + selected.bx) * threadsPerBlock + selected.ty * blockX + selected.tx
    : null;

  const threadSize = compact ? 14 : 18;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Preset buttons */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <Layers size={14} color={C.cyan} />
        <span style={{ fontSize: 12, color: C.muted, marginRight: 4 }}>Presets:</span>
        {Object.entries(CUDA_PRESETS).map(([k, p]) => (
          <button key={k} onClick={() => applyPreset(k)} style={btn(presetKey === k)}>{p.label}</button>
        ))}
      </div>
      {presetKey && (
        <div style={{ fontSize: 12, color: C.cyan, padding: '6px 10px', background: C.cyan + '11', borderRadius: 6 }}>
          <Info size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          {CUDA_PRESETS[presetKey].desc}
        </div>
      )}
      {/* Dimension sliders */}
      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 8 }}>
        {sliderInput('gridDim.x', gridX, setGridX, 1, 4)}
        {sliderInput('gridDim.y', gridY, setGridY, 1, 4)}
        {sliderInput('blockDim.x', blockX, setBlockX, 1, 8)}
        {sliderInput('blockDim.y', blockY, setBlockY, 1, 8)}
      </div>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11 }}>
        <span style={pill(C.cyan)}>Threads/Block: {threadsPerBlock}</span>
        <span style={pill(C.purple)}>Warps/Block: {Math.ceil(threadsPerBlock / 32)}</span>
        <span style={pill(C.green)}>Total Threads: {totalThreads}</span>
        <span style={pill(C.yellow)}>Blocks: {gridX * gridY}</span>
      </div>
      {/* Grid of blocks */}
      <div style={{ ...card, overflow: 'auto' }}>
        <div style={{ fontSize: 11, color: C.dim, marginBottom: 6 }}>
          Grid ({gridX}×{gridY}) — click any thread to inspect
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridX}, auto)`, gap: 8, justifyContent: 'start' }}>
          {Array.from({ length: gridY }).map((_, by) =>
            Array.from({ length: gridX }).map((_, bx) => (
              <div key={`${bx}-${by}`} style={{
                background: C.bg, borderRadius: 6, padding: 6,
                border: `1px solid ${selected && selected.bx === bx && selected.by === by ? C.cyan : C.border}`,
              }}>
                <div style={{ fontSize: 10, color: C.dim, marginBottom: 3 }}>block({bx},{by})</div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${blockX}, ${threadSize}px)`, gap: 2 }}>
                  {Array.from({ length: blockY }).map((_, ty) =>
                    Array.from({ length: blockX }).map((_, tx) => {
                      const tid = ty * blockX + tx;
                      const warpId = Math.floor(tid / 32);
                      const isSel = selected && selected.bx === bx && selected.by === by && selected.tx === tx && selected.ty === ty;
                      return (
                        <div key={`${tx}-${ty}`}
                          onClick={() => setSelected({ bx, by, tx, ty })}
                          title={`threadIdx(${tx},${ty}) blockIdx(${bx},${by}) warp ${warpId}`}
                          style={{
                            width: threadSize, height: threadSize, borderRadius: 2, cursor: 'pointer',
                            background: isSel ? C.cyan : (WARP_COLORS[warpId % WARP_COLORS.length] + '44'),
                            border: `1px solid ${isSel ? C.cyan : C.border}`,
                            transition: 'all 0.15s', transform: isSel ? 'scale(1.3)' : 'scale(1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 7, color: isSel ? C.bg : C.dim,
                          }}>
                          {threadSize >= 16 ? tid : ''}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {/* Selected thread info */}
      {selected && (
        <div style={{ ...card, borderColor: C.cyan + '66', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
            <Zap size={13} color={C.cyan} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            Thread Inspector
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 12, color: C.sub, lineHeight: 1.7 }}>
            <div>threadIdx = ({selected.tx}, {selected.ty}, 0)</div>
            <div>blockIdx&nbsp; = ({selected.bx}, {selected.by})</div>
            <div>blockDim&nbsp; = ({blockX}, {blockY}, 1)</div>
            <div style={{ color: C.cyan, fontWeight: 600 }}>
              globalIdx = ({selected.by}×{gridX} + {selected.bx}) × {threadsPerBlock} + {selected.ty}×{blockX} + {selected.tx} = <span style={{ fontSize: 14 }}>{globalIdx}</span>
            </div>
            <div style={{ color: C.dim }}>warp {Math.floor((selected.ty * blockX + selected.tx) / 32)}, lane {(selected.ty * blockX + selected.tx) % 32}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   2. Warp Visualization with Divergence
   ────────────────────────────────────────────────────────── */
function WarpVisualization({ compact }) {
  const [showDivergence, setShowDivergence] = useState(false);
  const [animStep, setAnimStep] = useState(-1);
  const [blockDimX, setBlockDimX] = useState(8);
  const [blockDimY, setBlockDimY] = useState(4);
  const timerRef = useRef(null);

  const threadsPerBlock = blockDimX * blockDimY;
  const numWarps = Math.ceil(threadsPerBlock / 32);

  const animate = useCallback(() => {
    let step = 0;
    if (timerRef.current) clearInterval(timerRef.current);
    setAnimStep(0);
    timerRef.current = setInterval(() => {
      step++;
      if (step >= numWarps * (showDivergence ? 3 : 2)) {
        clearInterval(timerRef.current); setAnimStep(-1); return;
      }
      setAnimStep(step);
    }, 600);
  }, [numWarps, showDivergence]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const activeWarp = animStep >= 0 ? Math.floor(animStep / (showDivergence ? 3 : 2)) : -1;
  const phase = animStep >= 0 ? animStep % (showDivergence ? 3 : 2) : -1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {sliderInput('blockDim.x', blockDimX, setBlockDimX, 1, 16, 1, C.purple)}
        {sliderInput('blockDim.y', blockDimY, setBlockDimY, 1, 8, 1, C.purple)}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 11, alignItems: 'center' }}>
        <span style={pill(C.purple)}>Threads: {threadsPerBlock}</span>
        <span style={pill(C.cyan)}>Warps: {numWarps}</span>
        {threadsPerBlock % 32 !== 0 && (
          <span style={pill(C.yellow)}>⚠ {32 - (threadsPerBlock % 32)} threads wasted (not multiple of 32)</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={animate} style={btn(false, C.green)}>
          <Play size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} /> Animate Warps
        </button>
        <button onClick={() => setShowDivergence(d => !d)} style={btn(showDivergence, C.yellow)}>
          <AlertTriangle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
          {showDivergence ? '✓' : '○'} Warp Divergence
        </button>
      </div>
      {/* Thread grid colored by warp */}
      <div style={{ ...card }}>
        <div style={{ fontSize: 11, color: C.dim, marginBottom: 6 }}>Threads colored by warp assignment (32 threads/warp)</div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${blockDimX}, 1fr)`, gap: 2 }}>
          {Array.from({ length: threadsPerBlock }).map((_, tid) => {
            const warpId = Math.floor(tid / 32);
            const lane = tid % 32;
            const isActive = activeWarp === warpId;
            const warpColor = WARP_COLORS[warpId % WARP_COLORS.length];
            let bg = warpColor + '33';
            let borderClr = C.border;
            if (isActive) {
              if (showDivergence) {
                const evenThread = lane % 2 === 0;
                if (phase === 0) { bg = evenThread ? C.green + '88' : C.dim + '33'; borderClr = evenThread ? C.green : C.dim; }
                else if (phase === 1) { bg = !evenThread ? C.yellow + '88' : C.dim + '33'; borderClr = !evenThread ? C.yellow : C.dim; }
                else { bg = C.cyan + '55'; borderClr = C.cyan; }
              } else {
                bg = phase === 0 ? C.green + '88' : C.cyan + '55';
                borderClr = phase === 0 ? C.green : C.cyan;
              }
            }
            return (
              <div key={tid} title={`tid=${tid} warp=${warpId} lane=${lane}`}
                style={{ aspectRatio: '1', borderRadius: 2, background: bg,
                  border: `1px solid ${borderClr}`, transition: 'all 0.2s',
                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: compact ? 7 : 8, color: C.dim }}>
                {!compact && tid}
              </div>
            );
          })}
        </div>
        {/* Warp legend */}
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {Array.from({ length: numWarps }).map((_, w) => (
            <span key={w} style={{ fontSize: 10, color: WARP_COLORS[w % WARP_COLORS.length], fontWeight: activeWarp === w ? 700 : 400 }}>
              ■ Warp {w} (tids {w * 32}–{Math.min((w + 1) * 32, threadsPerBlock) - 1})
            </span>
          ))}
        </div>
      </div>
      {/* Divergence code example */}
      {showDivergence && (
        <div style={{ ...card, borderColor: C.yellow + '44' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.yellow, marginBottom: 6 }}>
            <AlertTriangle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            Warp Divergence Example
          </div>
          <pre style={{ margin: 0, fontSize: 11, lineHeight: 1.6, color: C.sub, background: C.bg, padding: 8, borderRadius: 4, overflow: 'auto' }}>
{`__global__ void kernel(float* data) {
    int tid = threadIdx.x;
    if (tid % 2 == 0) {        // Even threads → `}<span style={{ color: C.green }}>if-branch</span>{`
        data[tid] *= 2.0f;      // Pass 1: evens execute
    } else {                    // Odd threads  → `}<span style={{ color: C.yellow }}>else-branch</span>{`
        data[tid] += 1.0f;      // Pass 2: odds execute
    }
    // Both paths serialize → 2× execution time!`}
          </pre>
          <div style={{ fontSize: 11, color: C.yellow, marginTop: 6 }}>
            ⚠ Within a warp, divergent branches are serialized. Threads not on the active path are masked.
            This halves throughput. Minimize divergence within warps for best performance.
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   3. Memory Hierarchy Diagram with Animated Access
   ────────────────────────────────────────────────────────── */
function MemoryHierarchy({ compact }) {
  const [accessType, setAccessType] = useState('coalesced');
  const [animActive, setAnimActive] = useState(false);
  const [animPos, setAnimPos] = useState(0);
  const animRef = useRef(null);
  const SEGMENTS = 8;

  const startAnim = useCallback(() => {
    setAnimActive(true); setAnimPos(0);
    let pos = 0;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const step = () => {
      pos += 0.02;
      if (pos > 1) { setAnimActive(false); setAnimPos(0); return; }
      setAnimPos(pos);
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Pyramid diagram */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        {MEMORY_LEVELS.map((lvl, i) => (
          <div key={lvl.name} style={{
            width: compact ? lvl.width * 0.7 : lvl.width, maxWidth: '100%',
            ...card, textAlign: 'center', padding: '8px 12px', position: 'relative',
            borderColor: C.border, background: C.card,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: lvl.color }}>{lvl.name}</span>
              <span style={{ fontSize: 10, color: C.dim }}>{lvl.size}</span>
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
              Latency: {lvl.latency}
            </div>
            {/* Latency bar */}
            <div style={{ height: 4, borderRadius: 2, background: C.bg, marginTop: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${((i + 1) / MEMORY_LEVELS.length) * 100}%`,
                background: lvl.color + '88', borderRadius: 2 }} />
            </div>
            {i < MEMORY_LEVELS.length - 1 && (
              <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', color: C.dim, fontSize: 10 }}>▼</div>
            )}
          </div>
        ))}
      </div>

      {/* Coalesced vs uncoalesced access animation */}
      <div style={{ ...card }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>
          <Zap size={13} color={C.cyan} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          Memory Access Pattern
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
          {['coalesced', 'uncoalesced'].map(t => (
            <button key={t} onClick={() => setAccessType(t)} style={btn(accessType === t, t === 'coalesced' ? C.green : C.red)}>
              {t === 'coalesced' ? '✓ Coalesced' : '✗ Uncoalesced'}
            </button>
          ))}
          <button onClick={startAnim} style={btn(false, C.cyan)}>
            <Play size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} /> Animate
          </button>
        </div>
        {/* Threads row */}
        <div style={{ fontSize: 10, color: C.dim, marginBottom: 4 }}>Warp threads (0–7)</div>
        <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
          {Array.from({ length: SEGMENTS }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 28, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: animActive && animPos > i / SEGMENTS ? C.cyan + '66' : C.cyan + '22',
              border: `1px solid ${C.cyan + '44'}`, fontSize: 10, color: C.text, transition: 'background 0.2s',
            }}>T{i}</div>
          ))}
        </div>
        {/* Arrow indicators */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 6, justifyContent: 'center' }}>
          {Array.from({ length: SEGMENTS }).map((_, i) => {
            const target = accessType === 'coalesced' ? i : (i * 3) % SEGMENTS;
            return (
              <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: accessType === 'coalesced' ? C.green : C.red }}>
                ↓ [{target}]
              </div>
            );
          })}
        </div>
        {/* Memory segments */}
        <div style={{ fontSize: 10, color: C.dim, marginBottom: 4 }}>Global memory segments (128-byte each)</div>
        <div style={{ display: 'flex', gap: 3 }}>
          {Array.from({ length: SEGMENTS }).map((_, i) => {
            const hits = accessType === 'coalesced'
              ? (i < SEGMENTS ? 1 : 0)
              : Array.from({ length: SEGMENTS }).filter((_, t) => (t * 3) % SEGMENTS === i).length;
            const accessColor = accessType === 'coalesced' ? C.green : C.red;
            return (
              <div key={i} style={{
                flex: 1, height: 28, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: hits > 0 ? (animActive && animPos > 0.5 ? accessColor + '77' : accessColor + '33') : C.bg,
                border: `1px solid ${hits > 0 ? accessColor + '66' : C.border}`,
                fontSize: 10, color: C.text, transition: 'background 0.3s',
              }}>
                M{i}
              </div>
            );
          })}
        </div>
        {/* Summary */}
        <div style={{ marginTop: 8, display: 'flex', gap: 10, fontSize: 11 }}>
          <span style={{ color: accessType === 'coalesced' ? C.green : C.red, fontWeight: 600 }}>
            {accessType === 'coalesced' ? '1 transaction (optimal)' : `${new Set(Array.from({ length: SEGMENTS }, (_, i) => (i * 3) % SEGMENTS)).size} transactions (wasted bandwidth)`}
          </span>
        </div>
      </div>

      {/* Teaching callout */}
      {!compact && (
        <div style={{ ...card, borderColor: C.yellow + '33', background: C.yellow + '08' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.yellow, marginBottom: 4 }}>
            <Info size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            Why Access Patterns Matter
          </div>
          <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
            <strong style={{ color: C.green }}>Coalesced:</strong> Consecutive threads access consecutive memory addresses → merged into one 128-byte transaction.
            <br /><strong style={{ color: C.red }}>Uncoalesced:</strong> Scattered accesses trigger multiple transactions, wasting bandwidth.
            A single warp's uncoalesced access can be 8–32× slower than coalesced.
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   4. Occupancy Calculator
   ────────────────────────────────────────────────────────── */
function OccupancyCalc({ compact }) {
  const [gpu, setGpu] = useState('sm_90');
  const [tpb, setTpb] = useState(256);
  const [rpt, setRpt] = useState(32);
  const [smem, setSmem] = useState(8192);

  const spec = GPU_SPECS[gpu];
  const warpsPerBlock = Math.ceil(tpb / 32);
  const blkByWarps = Math.floor(spec.maxWarps / warpsPerBlock);
  const blkByRegs = rpt > 0 ? Math.floor(spec.regs / (rpt * tpb)) : spec.maxBlocks;
  const blkBySmem = smem > 0 ? Math.floor(spec.shmem / smem) : spec.maxBlocks;
  const activeBlocks = Math.max(0, Math.min(blkByWarps, blkByRegs, blkBySmem, spec.maxBlocks));
  const activeWarps = activeBlocks * warpsPerBlock;
  const occupancy = spec.maxWarps > 0 ? Math.min(100, (activeWarps / spec.maxWarps) * 100).toFixed(1) : 0;
  const bottleneck = activeBlocks === 0 ? 'No blocks fit'
    : activeBlocks <= blkByRegs && blkByRegs <= blkByWarps && blkByRegs <= blkBySmem ? 'Registers'
    : activeBlocks <= blkBySmem && blkBySmem <= blkByWarps ? 'Shared Memory'
    : 'Warps/Blocks';

  const occColor = +occupancy >= 75 ? C.green : +occupancy >= 50 ? C.yellow : C.red;

  const resources = [
    { name: 'Warps', used: activeWarps, max: spec.maxWarps, color: C.cyan },
    { name: 'Registers', used: activeBlocks * tpb * rpt, max: spec.regs, color: C.green },
    { name: 'Shared Mem', used: activeBlocks * smem, max: spec.shmem, color: C.yellow },
    { name: 'Blocks', used: activeBlocks, max: spec.maxBlocks, color: C.purple },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {Object.entries(GPU_SPECS).map(([k, s]) => (
          <button key={k} onClick={() => setGpu(k)} style={btn(gpu === k)}>{s.name}</button>
        ))}
      </div>
      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sliderInput('Threads/Block', tpb, setTpb, 32, 1024, 32)}
        {sliderInput('Regs/Thread', rpt, setRpt, 8, 255, 1, C.green)}
        {sliderInput('SharedMem/Block (B)', smem, setSmem, 0, spec.shmem, 1024, C.yellow)}
      </div>
      {/* Occupancy metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr 1fr' : '1fr 1fr 1fr', gap: 8 }}>
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: occColor }}>{occupancy}%</div>
          <div style={{ fontSize: 11, color: C.muted }}>Occupancy</div>
        </div>
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: C.cyan }}>{activeBlocks}</div>
          <div style={{ fontSize: 11, color: C.muted }}>Active Blocks/SM</div>
        </div>
        {!compact && (
          <div style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.red, marginTop: 6 }}>{bottleneck}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Bottleneck</div>
          </div>
        )}
      </div>
      {/* Resource bars */}
      <div style={{ ...card }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 8 }}>
          <BarChart3 size={13} color={C.cyan} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          Resource Utilization
        </div>
        {resources.map(r => {
          const pct = r.max > 0 ? Math.min(100, (r.used / r.max) * 100) : 0;
          return (
            <div key={r.name} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                <span style={{ color: r.color }}>{r.name}</span>
                <span style={{ color: C.dim }}>{r.used.toLocaleString()} / {r.max.toLocaleString()}</span>
              </div>
              <div style={{ height: 12, background: C.bg, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: r.color + '66', borderRadius: 3, transition: 'width 0.3s' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Teaching tips */}
      {!compact && (
        <div style={{ ...card, borderColor: C.purple + '33', background: C.purple + '08' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.purple, marginBottom: 4 }}>
            <Info size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            Occupancy Tips
          </div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: C.muted, lineHeight: 1.7 }}>
            <li><strong style={{ color: C.text }}>Block size multiple of 32</strong> — matches warp size, no threads wasted.</li>
            <li><strong style={{ color: C.text }}>Too few threads/block</strong> — can't fill the SM's warp slots, low occupancy.</li>
            <li><strong style={{ color: C.text }}>Too many threads/block</strong> — high register/smem usage may limit active blocks.</li>
            <li><strong style={{ color: C.text }}>Balance resources</strong> — reduce regs (compiler flags) or smem to fit more blocks.</li>
          </ul>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   5. Teaching Callouts panel
   ────────────────────────────────────────────────────────── */
function TeachingPanel() {
  const [expanded, setExpanded] = useState(null);
  const topics = [
    { key: 'warp-size', title: 'Why block size should be a multiple of 32',
      icon: <Grid3x3 size={13} color={C.cyan} />, color: C.cyan,
      body: `The GPU schedules threads in groups of 32 called warps. If your block has, say, 100 threads, that's 4 warps = 128 thread slots, wasting 28. Always use multiples of 32 (e.g., 128, 256, 512) to avoid paying for idle threads. Common choices: 128 for register-heavy kernels, 256 for balanced workloads, 512 for simple kernels.` },
    { key: 'too-few', title: 'What happens with too few threads/block',
      icon: <AlertTriangle size={13} color={C.yellow} />, color: C.yellow,
      body: `With too few threads per block (e.g., 32), you need many blocks to fill the SM. But SMs have a max block limit (e.g., 32 on H100). With only 32 threads/block you'd need 64 blocks to reach 2048 threads, but only 32 fit → only 1024 active threads → 50% occupancy. The SM's execution resources sit idle.` },
    { key: 'too-many', title: 'What happens with too many threads/block',
      icon: <AlertTriangle size={13} color={C.red} />, color: C.red,
      body: `Using 1024 threads/block means each block needs 1024 × (regs/thread) registers. If each thread uses 64 registers, that's 65,536 per block — the entire SM register file! Only one block can be active, reducing occupancy and hiding latency. Reduce registers via compiler flags (-maxrregcount) or use fewer threads.` },
    { key: 'coalescing', title: 'Memory coalescing: why access pattern matters',
      icon: <Zap size={13} color={C.green} />, color: C.green,
      body: `When threads in a warp access consecutive memory addresses (thread 0 → addr 0, thread 1 → addr 4, ...), the GPU coalesces these into a single 128-byte transaction. Strided or random access causes multiple transactions, wasting bandwidth. For row-major matrices, access along columns (stride = width) is uncoalesced — transpose or use shared memory to fix this.` },
    { key: 'bank-conflicts', title: 'Bank conflicts in shared memory',
      icon: <Layers size={13} color={C.purple} />, color: C.purple,
      body: `Shared memory is divided into 32 banks. If multiple threads in a warp access the same bank (but different addresses), accesses serialize — this is a bank conflict. Stride-1 access has no conflicts (each thread hits a different bank). Stride-32 access is worst-case (all threads same bank). Pad shared memory arrays (+1 column) to avoid conflicts: __shared__ float tile[32][33].` },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {topics.map(t => (
        <div key={t.key} style={{ ...card, cursor: 'pointer', borderColor: expanded === t.key ? t.color + '66' : C.border }}
          onClick={() => setExpanded(expanded === t.key ? null : t.key)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {t.icon}
            <span style={{ fontSize: 12, fontWeight: 600, color: C.text, flex: 1 }}>{t.title}</span>
            <ChevronRight size={14} color={C.dim}
              style={{ transform: expanded === t.key ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
          </div>
          {expanded === t.key && (
            <div style={{ marginTop: 8, fontSize: 11, color: C.muted, lineHeight: 1.7, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
              {t.body}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Main CUDAVisualizer Component
   ────────────────────────────────────────────────────────── */
const TABS = [
  { key: 'grid', label: 'Grid / Threads', icon: <Grid3x3 size={13} /> },
  { key: 'warps', label: 'Warps', icon: <Cpu size={13} /> },
  { key: 'memory', label: 'Memory Hierarchy', icon: <Layers size={13} /> },
  { key: 'occupancy', label: 'Occupancy', icon: <BarChart3 size={13} /> },
  { key: 'learn', label: 'Key Concepts', icon: <Info size={13} /> },
];

export default function CUDAVisualizer({ compact = false, preset, config = {} }) {
  const initialTab = preset || config.preset || 'grid';
  const [activeTab, setActiveTab] = useState(TABS.find(t => t.key === initialTab) ? initialTab : 'grid');

  const renderTab = () => {
    switch (activeTab) {
      case 'grid': return <GridVisualization compact={compact} />;
      case 'warps': return <WarpVisualization compact={compact} />;
      case 'memory': return <MemoryHierarchy compact={compact} />;
      case 'occupancy': return <OccupancyCalc compact={compact} />;
      case 'learn': return <TeachingPanel />;
      default: return <GridVisualization compact={compact} />;
    }
  };

  return (
    <div style={{
      background: C.bg, color: C.text, borderRadius: 12, border: `1px solid ${C.border}`,
      padding: compact ? 12 : 16, fontFamily: 'system-ui, sans-serif', minHeight: compact ? 300 : 400,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: compact ? 8 : 12 }}>
        <Cpu size={compact ? 18 : 22} color={C.cyan} />
        <div>
          <h2 style={{ margin: 0, fontSize: compact ? 16 : 20, fontWeight: 700, color: C.text }}>
            CUDA Visualizer
          </h2>
          {!compact && <p style={{ margin: 0, fontSize: 12, color: C.muted }}>Interactive GPU thread, memory & occupancy explorer</p>}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: compact ? 8 : 12, flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              ...btn(activeTab === tab.key),
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
            {React.cloneElement(tab.icon, { color: activeTab === tab.key ? C.cyan : C.dim })}
            {(!compact || activeTab === tab.key) && tab.label}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      {renderTab()}
    </div>
  );
}
