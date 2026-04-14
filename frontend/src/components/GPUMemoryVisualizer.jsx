import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Trash2, Zap, AlertTriangle, RotateCcw, ChevronDown, Info, Cpu, BarChart3, Settings } from 'lucide-react';

const TOTAL_VRAM_MB = 8192;
const BLOCK_SIZE_MB = 32;
const TOTAL_BLOCKS = TOTAL_VRAM_MB / BLOCK_SIZE_MB;

const DTYPE_BYTES = { float32: 4, float16: 2, bfloat16: 2, int8: 1, int4: 0.5 };
const DTYPE_LABELS = { float32: 'FP32', float16: 'FP16', bfloat16: 'BF16', int8: 'INT8', int4: 'INT4' };

const CATEGORY_COLORS = {
  weights: '#8b5cf6',
  activations: '#06b6d4',
  gradients: '#10b981',
  optimizer: '#f59e0b',
  workspace: '#ec4899',
  custom: '#f97316',
  free: '#1e293b',
};

const CATEGORY_LABELS = {
  weights: 'Model Weights',
  activations: 'Activations',
  gradients: 'Gradients',
  optimizer: 'Optimizer States',
  workspace: 'Workspace/Temp',
  custom: 'Custom Tensor',
};

const calcTensorMB = (shape, dtype) => {
  const elements = shape.reduce((a, b) => a * b, 1);
  return (elements * DTYPE_BYTES[dtype]) / (1024 * 1024);
};

const PRESETS = {
  resnet50: {
    label: 'Train ResNet-50 (batch=32)',
    desc: 'Classic CNN training — moderate memory, heavy activations',
    allocs: [
      { name: 'ResNet-50 Weights', category: 'weights', sizeMB: 98, dtype: 'float32' },
      { name: 'Activations (batch=32)', category: 'activations', sizeMB: 1200, dtype: 'float32' },
      { name: 'Gradients', category: 'gradients', sizeMB: 98, dtype: 'float32' },
      { name: 'Adam Optimizer (m)', category: 'optimizer', sizeMB: 98, dtype: 'float32' },
      { name: 'Adam Optimizer (v)', category: 'optimizer', sizeMB: 98, dtype: 'float32' },
      { name: 'CuDNN Workspace', category: 'workspace', sizeMB: 256, dtype: 'float32' },
    ],
  },
  gpt2: {
    label: 'Train GPT-2 Small',
    desc: '124M params — optimizer states dominate memory',
    allocs: [
      { name: 'GPT-2 Weights (124M)', category: 'weights', sizeMB: 474, dtype: 'float32' },
      { name: 'Activations (seq=1024)', category: 'activations', sizeMB: 2048, dtype: 'float32' },
      { name: 'Gradients', category: 'gradients', sizeMB: 474, dtype: 'float32' },
      { name: 'Adam m (momentum)', category: 'optimizer', sizeMB: 474, dtype: 'float32' },
      { name: 'Adam v (variance)', category: 'optimizer', sizeMB: 474, dtype: 'float32' },
      { name: 'Attention Workspace', category: 'workspace', sizeMB: 512, dtype: 'float32' },
    ],
  },
  inference: {
    label: 'Inference Only (GPT-2)',
    desc: 'No gradients or optimizer — just weights + activations',
    allocs: [
      { name: 'GPT-2 Weights', category: 'weights', sizeMB: 474, dtype: 'float32' },
      { name: 'KV Cache', category: 'activations', sizeMB: 256, dtype: 'float32' },
      { name: 'Attention Workspace', category: 'workspace', sizeMB: 128, dtype: 'float32' },
    ],
  },
};

let allocIdCounter = 0;

const GPUMemoryVisualizer = ({ compact = false }) => {
  const [allocations, setAllocations] = useState([]);
  const [timeline, setTimeline] = useState([{ time: 0, usedMB: 0 }]);
  const [shapeInput, setShapeInput] = useState('1024, 1024');
  const [dtypeInput, setDtypeInput] = useState('float32');
  const [nameInput, setNameInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('custom');
  const [mixedPrecision, setMixedPrecision] = useState(false);
  const [gradCheckpoint, setGradCheckpoint] = useState(false);
  const [oomMessage, setOomMessage] = useState('');
  const [activePreset, setActivePreset] = useState(null);
  const [showTeaching, setShowTeaching] = useState(null);
  const [animatingAlloc, setAnimatingAlloc] = useState(null);
  const [stepIndex, setStepIndex] = useState(-1);
  const timeRef = useRef(1);
  const canvasRef = useRef(null);

  const usedMB = allocations.reduce((s, a) => s + a.sizeMB, 0);
  const freeMB = TOTAL_VRAM_MB - usedMB;
  const usedPct = (usedMB / TOTAL_VRAM_MB) * 100;

  const addToTimeline = useCallback((used) => {
    setTimeline(prev => {
      const next = [...prev, { time: timeRef.current++, usedMB: used }];
      return next.length > 60 ? next.slice(-60) : next;
    });
  }, []);

  const allocate = useCallback((name, category, sizeMB, dtype, skipTimeline) => {
    const effSize = mixedPrecision && dtype === 'float32' && category !== 'optimizer'
      ? sizeMB / 2 : sizeMB;
    const cpSize = gradCheckpoint && category === 'activations' ? effSize * 0.3 : effSize;
    const finalSize = Math.round(cpSize * 100) / 100;

    setAllocations(prev => {
      const newUsed = prev.reduce((s, a) => s + a.sizeMB, 0) + finalSize;
      if (newUsed > TOTAL_VRAM_MB) {
        setOomMessage(
          `CUDA out of memory. Tried to allocate ${finalSize.toFixed(0)} MiB ` +
          `(GPU 0; ${TOTAL_VRAM_MB} MiB total capacity; ${(newUsed - finalSize).toFixed(0)} MiB already allocated; ` +
          `${(TOTAL_VRAM_MB - (newUsed - finalSize)).toFixed(0)} MiB free; requested ${finalSize.toFixed(0)} MiB)`
        );
        return prev;
      }
      const alloc = {
        id: ++allocIdCounter,
        name: name || `Tensor_${allocIdCounter}`,
        category,
        sizeMB: finalSize,
        dtype: mixedPrecision && dtype === 'float32' && category !== 'optimizer' ? 'float16' : dtype,
        blocks: Math.ceil(finalSize / BLOCK_SIZE_MB),
        timestamp: Date.now(),
      };
      setAnimatingAlloc(alloc.id);
      setTimeout(() => setAnimatingAlloc(null), 500);
      const next = [...prev, alloc];
      if (!skipTimeline) addToTimeline(next.reduce((s, a) => s + a.sizeMB, 0));
      return next;
    });
  }, [mixedPrecision, gradCheckpoint, addToTimeline]);

  const freeAlloc = useCallback((id) => {
    setAllocations(prev => {
      const next = prev.filter(a => a.id !== id);
      addToTimeline(next.reduce((s, a) => s + a.sizeMB, 0));
      return next;
    });
  }, [addToTimeline]);

  const resetAll = useCallback(() => {
    setAllocations([]);
    setTimeline([{ time: 0, usedMB: 0 }]);
    timeRef.current = 1;
    setOomMessage('');
    setActivePreset(null);
    setStepIndex(-1);
    allocIdCounter = 0;
  }, []);

  const handleAllocateCustom = useCallback(() => {
    try {
      const shape = shapeInput.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);
      if (shape.length === 0) return;
      const sizeMB = calcTensorMB(shape, dtypeInput);
      allocate(nameInput || `[${shape.join('×')}] ${DTYPE_LABELS[dtypeInput]}`, selectedCategory, sizeMB, dtypeInput);
    } catch (e) { /* ignore parse errors */ }
  }, [shapeInput, dtypeInput, nameInput, selectedCategory, allocate]);

  const runPreset = useCallback((key) => {
    resetAll();
    setActivePreset(key);
    const preset = PRESETS[key];
    setStepIndex(0);
    let delay = 0;
    preset.allocs.forEach((a, i) => {
      setTimeout(() => {
        allocate(a.name, a.category, a.sizeMB, a.dtype);
        setStepIndex(i + 1);
      }, delay);
      delay += 400;
    });
  }, [allocate, resetAll]);

  const triggerOOM = useCallback(() => {
    allocate('HUGE_TENSOR', 'custom', TOTAL_VRAM_MB + 1000, 'float32');
  }, [allocate]);

  const runForwardPass = useCallback(() => {
    allocate('Conv/Linear Output', 'activations', 512, 'float32');
    setTimeout(() => allocate('BatchNorm Buffers', 'activations', 64, 'float32'), 200);
    setTimeout(() => allocate('ReLU Masks', 'workspace', 128, 'float32'), 400);
  }, [allocate]);

  const runBackwardPass = useCallback(() => {
    allocate('Weight Gradients', 'gradients', 256, 'float32');
    setTimeout(() => allocate('Activation Gradients', 'gradients', 512, 'float32'), 200);
  }, [allocate]);

  const runOptimizerStep = useCallback(() => {
    allocate('Adam 1st moment (m)', 'optimizer', 256, 'float32');
    setTimeout(() => allocate('Adam 2nd moment (v)', 'optimizer', 256, 'float32'), 200);
  }, [allocate]);

  // Draw timeline canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (H / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // OOM line
    const oomY = 4;
    ctx.strokeStyle = '#ef4444';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, oomY);
    ctx.lineTo(W, oomY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = '9px monospace';
    ctx.fillStyle = '#ef4444';
    ctx.fillText(`${TOTAL_VRAM_MB}MB (OOM)`, W - 80, oomY + 12);

    if (timeline.length < 2) return;

    // Draw area fill
    const maxT = Math.max(timeline.length - 1, 1);
    ctx.beginPath();
    ctx.moveTo(0, H);
    timeline.forEach((pt, i) => {
      const x = (i / maxT) * W;
      const y = H - (pt.usedMB / TOTAL_VRAM_MB) * H;
      if (i === 0) ctx.lineTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(W, H);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(6,182,212,0.3)');
    grad.addColorStop(1, 'rgba(6,182,212,0.02)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    timeline.forEach((pt, i) => {
      const x = (i / maxT) * W;
      const y = H - (pt.usedMB / TOTAL_VRAM_MB) * H;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.fillText('0 MB', 4, H - 4);
    ctx.fillText(`${Math.round(TOTAL_VRAM_MB / 2)} MB`, 4, H / 2 + 4);
  }, [timeline]);

  const styles = {
    container: {
      background: '#0f172a', borderRadius: 12, border: '1px solid #334155',
      padding: compact ? 16 : 24, fontFamily: "'Inter', system-ui, sans-serif",
      color: '#f1f5f9', maxWidth: 1100, margin: '0 auto',
    },
    header: {
      display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
      borderBottom: '1px solid #334155', paddingBottom: 16,
    },
    title: { fontSize: compact ? 18 : 22, fontWeight: 700, color: '#f1f5f9' },
    subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
    grid: { display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 320px', gap: 20 },
    panel: {
      background: '#1e293b', borderRadius: 8, border: '1px solid #334155', padding: 16,
    },
    sectionTitle: {
      fontSize: 13, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase',
      letterSpacing: '0.05em', marginBottom: 10,
    },
    btn: (color, disabled) => ({
      padding: '7px 14px', borderRadius: 6, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
      background: disabled ? '#334155' : color, color: disabled ? '#64748b' : '#fff',
      fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
      opacity: disabled ? 0.5 : 1, transition: 'all 0.15s',
    }),
    input: {
      background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '7px 10px',
      color: '#f1f5f9', fontSize: 13, width: '100%', outline: 'none', fontFamily: 'monospace',
    },
    select: {
      background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '7px 10px',
      color: '#f1f5f9', fontSize: 13, outline: 'none', fontFamily: 'monospace', cursor: 'pointer',
    },
    memBar: {
      background: '#0f172a', borderRadius: 6, height: 36, border: '1px solid #334155',
      overflow: 'hidden', display: 'flex', position: 'relative',
    },
    allocRow: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 8px', borderRadius: 4, marginBottom: 4, fontSize: 12,
      transition: 'all 0.3s',
    },
    tag: (color) => ({
      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
      background: color + '22', color: color, fontSize: 11, fontWeight: 600,
    }),
    tooltip: {
      background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 14,
      fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginTop: 8,
    },
    toggle: (active) => ({
      width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
      background: active ? '#06b6d4' : '#334155', transition: 'background 0.2s',
      position: 'relative', border: 'none', flexShrink: 0,
    }),
    toggleDot: (active) => ({
      width: 16, height: 16, borderRadius: 8, background: '#fff',
      position: 'absolute', top: 2, left: active ? 18 : 2,
      transition: 'left 0.2s',
    }),
  };

  const memBlocks = [];
  let blockIdx = 0;
  allocations.forEach(a => {
    for (let b = 0; b < a.blocks && blockIdx < TOTAL_BLOCKS; b++) {
      memBlocks.push({ allocId: a.id, category: a.category, name: a.name });
      blockIdx++;
    }
  });
  while (blockIdx < TOTAL_BLOCKS) {
    memBlocks.push({ allocId: null, category: 'free' });
    blockIdx++;
  }

  const teachingContent = {
    weights: 'Model weights are the learned parameters. For a 124M parameter model in FP32: 124M × 4 bytes = ~474 MB. In FP16: ~237 MB.',
    activations: 'Activations are intermediate outputs saved for backprop. They scale with batch size × sequence length. Often the largest memory consumer during training.',
    gradients: 'Gradients have the same size as weights (one gradient per parameter). During backward pass, memory peaks because both activations and gradients exist.',
    optimizer: 'Adam optimizer stores 2 extra copies per parameter (momentum m and variance v). Total optimizer memory = 2× model weights. This is why Adam needs 3× the weight memory!',
    checkpoint: 'Gradient checkpointing trades compute for memory. Instead of storing all activations, recompute them during backward pass. Saves ~60-70% activation memory but adds ~30% compute time.',
    mixed: 'Mixed precision (FP16/BF16) halves the memory for weights, activations, and gradients. Optimizer states stay in FP32 for numerical stability. Net savings: ~30-40% total.',
  };

  const parseShape = () => {
    try {
      const shape = shapeInput.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);
      if (shape.length === 0) return null;
      const elements = shape.reduce((a, b) => a * b, 1);
      const sizeMB = calcTensorMB(shape, dtypeInput);
      return { shape, elements, sizeMB };
    } catch { return null; }
  };
  const parsed = parseShape();

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <Cpu size={compact ? 20 : 24} color="#06b6d4" />
        <div>
          <div style={styles.title}>GPU Memory Visualizer</div>
          <div style={styles.subtitle}>Interactive CUDA memory allocation simulator — 8 GB VRAM</div>
        </div>
      </div>

      {/* OOM Error */}
      {oomMessage && (
        <div style={{ background: '#ef444420', border: '1px solid #ef4444', borderRadius: 8, padding: 14, marginBottom: 16, fontFamily: 'monospace', fontSize: 12, color: '#fca5a5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <AlertTriangle size={16} color="#ef4444" />
            <span style={{ fontWeight: 700, color: '#ef4444' }}>RuntimeError:</span>
          </div>
          {oomMessage}
          <button onClick={() => setOomMessage('')} style={{ ...styles.btn('#334155', false), marginTop: 8, fontSize: 11 }}>Dismiss</button>
        </div>
      )}

      {/* Memory Bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: '#94a3b8' }}>
          <span>GPU Memory Usage</span>
          <span style={{ fontFamily: 'monospace' }}>
            <span style={{ color: usedPct > 90 ? '#ef4444' : usedPct > 70 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
              {usedMB.toFixed(0)} MB
            </span> / {TOTAL_VRAM_MB} MB ({usedPct.toFixed(1)}%)
          </span>
        </div>
        <div style={styles.memBar}>
          {allocations.map(a => (
            <div
              key={a.id}
              title={`${a.name}: ${a.sizeMB.toFixed(1)} MB`}
              style={{
                width: `${(a.sizeMB / TOTAL_VRAM_MB) * 100}%`,
                background: CATEGORY_COLORS[a.category],
                opacity: animatingAlloc === a.id ? 0.5 : 0.85,
                transition: 'all 0.3s ease',
                borderRight: '1px solid #0f172a',
                minWidth: 2,
              }}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20, fontSize: 11 }}>
        {Object.entries(CATEGORY_COLORS).filter(([k]) => k !== 'free').map(([k, c]) => (
          <div
            key={k}
            style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', opacity: showTeaching === k ? 1 : 0.8 }}
            onClick={() => setShowTeaching(showTeaching === k ? null : k)}
          >
            <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
            <span style={{ color: '#94a3b8' }}>{CATEGORY_LABELS[k]}</span>
            {teachingContent[k] && <Info size={10} color="#64748b" />}
          </div>
        ))}
      </div>

      {/* Teaching callout */}
      {showTeaching && teachingContent[showTeaching] && (
        <div style={styles.tooltip}>
          <Info size={14} color="#06b6d4" style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
          {teachingContent[showTeaching]}
        </div>
      )}

      <div style={styles.grid}>
        {/* Left: allocations list + timeline */}
        <div>
          {/* Memory Grid */}
          <div style={{ ...styles.panel, marginBottom: 16 }}>
            <div style={styles.sectionTitle}>Memory Blocks ({BLOCK_SIZE_MB}MB each)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {memBlocks.slice(0, compact ? 128 : TOTAL_BLOCKS).map((b, i) => (
                <div
                  key={i}
                  title={b.name || 'Free'}
                  style={{
                    width: compact ? 6 : 8, height: compact ? 6 : 8, borderRadius: 1,
                    background: CATEGORY_COLORS[b.category] || '#1e293b',
                    opacity: b.allocId && animatingAlloc === b.allocId ? 0.4 : b.allocId ? 0.8 : 0.3,
                    transition: 'all 0.3s',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Allocations list */}
          <div style={{ ...styles.panel, marginBottom: 16 }}>
            <div style={styles.sectionTitle}>Active Allocations ({allocations.length})</div>
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {allocations.length === 0 && (
                <div style={{ color: '#64748b', fontSize: 12, textAlign: 'center', padding: 20 }}>
                  No allocations yet. Use the controls to allocate tensors.
                </div>
              )}
              {allocations.map(a => (
                <div
                  key={a.id}
                  style={{
                    ...styles.allocRow,
                    background: animatingAlloc === a.id ? CATEGORY_COLORS[a.category] + '30' : '#0f172a',
                    border: `1px solid ${CATEGORY_COLORS[a.category]}33`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: CATEGORY_COLORS[a.category] }} />
                    <span style={{ color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11 }}>{a.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={styles.tag(CATEGORY_COLORS[a.category])}>{DTYPE_LABELS[a.dtype]}</span>
                    <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 11, minWidth: 60, textAlign: 'right' }}>
                      {a.sizeMB >= 1024 ? `${(a.sizeMB / 1024).toFixed(1)} GB` : `${a.sizeMB.toFixed(0)} MB`}
                    </span>
                    <button onClick={() => freeAlloc(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                      <Trash2 size={13} color="#ef4444" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div style={styles.panel}>
            <div style={styles.sectionTitle}>
              <BarChart3 size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              Memory Timeline
            </div>
            <canvas ref={canvasRef} width={500} height={compact ? 80 : 120} style={{ width: '100%', borderRadius: 4 }} />
          </div>
        </div>

        {/* Right: controls */}
        <div>
          {/* Custom allocator */}
          <div style={{ ...styles.panel, marginBottom: 16 }}>
            <div style={styles.sectionTitle}>Allocate Tensor</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                placeholder="Name (optional)"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                style={styles.input}
              />
              <div>
                <label style={{ fontSize: 11, color: '#64748b', marginBottom: 3, display: 'block' }}>Shape (comma-separated)</label>
                <input
                  value={shapeInput}
                  onChange={e => setShapeInput(e.target.value)}
                  style={styles.input}
                  placeholder="1024, 1024"
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: '#64748b', marginBottom: 3, display: 'block' }}>dtype</label>
                  <select value={dtypeInput} onChange={e => setDtypeInput(e.target.value)} style={{ ...styles.select, width: '100%' }}>
                    {Object.entries(DTYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v} ({DTYPE_BYTES[k]}B)</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: '#64748b', marginBottom: 3, display: 'block' }}>Category</label>
                  <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} style={{ ...styles.select, width: '100%' }}>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              {parsed && (
                <div style={{ background: '#0f172a', borderRadius: 6, padding: 8, fontSize: 11, fontFamily: 'monospace', color: '#94a3b8' }}>
                  [{parsed.shape.join(' × ')}] × {DTYPE_BYTES[dtypeInput]}B = <span style={{ color: '#06b6d4', fontWeight: 600 }}>
                    {parsed.sizeMB >= 1024 ? `${(parsed.sizeMB / 1024).toFixed(2)} GB` : `${parsed.sizeMB.toFixed(2)} MB`}
                  </span>
                  <br />({parsed.elements.toLocaleString()} elements)
                </div>
              )}
              <button onClick={handleAllocateCustom} style={styles.btn('#8b5cf6', !parsed)}>
                <Zap size={13} /> cudaMalloc
              </button>
            </div>
          </div>

          {/* Operations */}
          <div style={{ ...styles.panel, marginBottom: 16 }}>
            <div style={styles.sectionTitle}>Training Operations</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button onClick={runForwardPass} style={styles.btn('#06b6d4', false)}>
                <Play size={13} /> Forward Pass
              </button>
              <button onClick={runBackwardPass} style={styles.btn('#10b981', false)}>
                <Play size={13} /> Backward Pass
              </button>
              <button onClick={runOptimizerStep} style={styles.btn('#f59e0b', false)}>
                <Settings size={13} /> Optimizer Step
              </button>
              <button onClick={triggerOOM} style={styles.btn('#ef4444', false)}>
                <AlertTriangle size={13} /> Simulate OOM
              </button>
              <button onClick={resetAll} style={styles.btn('#334155', false)}>
                <RotateCcw size={13} /> Reset
              </button>
            </div>
          </div>

          {/* Toggles */}
          <div style={{ ...styles.panel, marginBottom: 16 }}>
            <div style={styles.sectionTitle}>Optimizations</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>Mixed Precision (FP16)</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Halves non-optimizer memory</div>
              </div>
              <button style={styles.toggle(mixedPrecision)} onClick={() => { setMixedPrecision(!mixedPrecision); setShowTeaching('mixed'); }}>
                <div style={styles.toggleDot(mixedPrecision)} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>Gradient Checkpointing</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>~70% less activation memory</div>
              </div>
              <button style={styles.toggle(gradCheckpoint)} onClick={() => { setGradCheckpoint(!gradCheckpoint); setShowTeaching('checkpoint'); }}>
                <div style={styles.toggleDot(gradCheckpoint)} />
              </button>
            </div>
          </div>

          {/* Presets */}
          <div style={styles.panel}>
            <div style={styles.sectionTitle}>Preset Scenarios</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(PRESETS).map(([k, p]) => (
                <button
                  key={k}
                  onClick={() => runPreset(k)}
                  style={{
                    ...styles.btn(activePreset === k ? '#06b6d4' : '#1e293b', false),
                    border: '1px solid ' + (activePreset === k ? '#06b6d4' : '#334155'),
                    justifyContent: 'flex-start', textAlign: 'left', flexDirection: 'column', alignItems: 'flex-start',
                    padding: '8px 12px',
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{p.label}</span>
                  <span style={{ fontSize: 10, color: activePreset === k ? '#e2e8f0' : '#64748b', fontWeight: 400 }}>{p.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GPUMemoryVisualizer;
