import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Trash2, Layers, RotateCcw, Info, Copy, ChevronDown, Package, Box, AlertTriangle } from 'lucide-react';

const LAYER_COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

const INSTRUCTION_SIZES = {
  FROM: (arg) => {
    const sizes = { 'ubuntu:22.04': 77, 'python:3.11': 920, 'python:3.11-slim': 125, 'nvidia/cuda:12.1.0-devel-ubuntu22.04': 3500, 'alpine:3.18': 7, 'node:20': 1100, 'scratch': 0 };
    return sizes[arg] || 150;
  },
  RUN: (arg) => {
    if (arg.includes('apt-get') || arg.includes('yum')) return Math.floor(80 + Math.random() * 200);
    if (arg.includes('pip install')) {
      const pkgs = arg.split(/\s+/).length - 2;
      return Math.floor(50 + pkgs * 35);
    }
    if (arg.includes('rm -rf') || arg.includes('clean')) return -20;
    if (arg.includes('conda')) return Math.floor(200 + Math.random() * 300);
    if (arg.includes('cmake') || arg.includes('make')) return Math.floor(100 + Math.random() * 200);
    return Math.floor(5 + Math.random() * 50);
  },
  COPY: (arg) => {
    if (arg.includes('requirements')) return 1;
    if (arg.includes('.')) return Math.floor(5 + Math.random() * 50);
    return 10;
  },
  WORKDIR: () => 0,
  ENV: () => 0,
  CMD: () => 0,
  ENTRYPOINT: () => 0,
  EXPOSE: () => 0,
  ARG: () => 0,
  LABEL: () => 0,
};

const PRESETS = {
  python_ml: {
    label: 'Python ML Environment',
    dockerfile: [
      'FROM python:3.11',
      'WORKDIR /app',
      'RUN apt-get update && apt-get install -y libgl1-mesa-glx',
      'COPY requirements.txt .',
      'RUN pip install numpy pandas scikit-learn matplotlib jupyter',
      'RUN pip install tensorflow',
      'COPY . .',
      'CMD ["jupyter", "notebook", "--ip=0.0.0.0"]',
    ],
  },
  cuda_pytorch: {
    label: 'CUDA + PyTorch',
    dockerfile: [
      'FROM nvidia/cuda:12.1.0-devel-ubuntu22.04',
      'ENV DEBIAN_FRONTEND=noninteractive',
      'RUN apt-get update && apt-get install -y python3 python3-pip git',
      'RUN pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121',
      'RUN pip3 install transformers datasets accelerate',
      'WORKDIR /workspace',
      'COPY . .',
      'CMD ["python3", "train.py"]',
    ],
  },
  mpi_app: {
    label: 'MPI Application',
    dockerfile: [
      'FROM ubuntu:22.04',
      'RUN apt-get update && apt-get install -y build-essential libopenmpi-dev openmpi-bin',
      'RUN apt-get install -y cmake wget',
      'WORKDIR /app',
      'COPY src/ ./src/',
      'COPY CMakeLists.txt .',
      'RUN mkdir build && cd build && cmake .. && make -j$(nproc)',
      'CMD ["mpirun", "-np", "4", "./build/solver"]',
    ],
  },
  optimized: {
    label: 'Optimized Multi-stage',
    dockerfile: [
      'FROM python:3.11 AS builder',
      'WORKDIR /app',
      'COPY requirements.txt .',
      'RUN pip install --user --no-cache-dir -r requirements.txt',
      'FROM python:3.11-slim',
      'COPY --from=builder /root/.local /root/.local',
      'WORKDIR /app',
      'COPY . .',
      'ENV PATH=/root/.local/bin:$PATH',
      'CMD ["python", "app.py"]',
    ],
  },
};

const parseInstruction = (line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const match = trimmed.match(/^(\w+)\s+(.*)/);
  if (!match) return null;
  const cmd = match[1].toUpperCase();
  const args = match[2];
  return { cmd, args, raw: trimmed };
};

const DockerLayerVisualizer = ({ compact = false }) => {
  const [dockerfile, setDockerfile] = useState(PRESETS.python_ml.dockerfile.join('\n'));
  const [layers, setLayers] = useState([]);
  const [building, setBuilding] = useState(false);
  const [buildStep, setBuildStep] = useState(-1);
  const [showCOW, setShowCOW] = useState(false);
  const [cowWrites, setCowWrites] = useState([]);
  const [cacheInvalidIdx, setCacheInvalidIdx] = useState(-1);
  const [showSingularity, setShowSingularity] = useState(false);
  const [showOptComparison, setShowOptComparison] = useState(false);
  const [showTeaching, setShowTeaching] = useState(null);
  const [activePreset, setActivePreset] = useState('python_ml');
  const [multiStageView, setMultiStageView] = useState(false);
  const buildTimerRef = useRef(null);

  const parseDockerfile = useCallback((text) => {
    const lines = text.split('\n');
    const parsed = [];
    let stageIdx = 0;
    let stageName = '';

    lines.forEach((line, lineNum) => {
      const inst = parseInstruction(line);
      if (!inst) return;

      if (inst.cmd === 'FROM') {
        if (parsed.length > 0) stageIdx++;
        const asMatch = inst.args.match(/(.+)\s+AS\s+(\w+)/i);
        stageName = asMatch ? asMatch[2] : '';
        const baseImage = asMatch ? asMatch[1] : inst.args;
        const sizeMB = INSTRUCTION_SIZES.FROM(baseImage);
        parsed.push({
          lineNum, cmd: 'FROM', args: inst.args, raw: inst.raw,
          sizeMB, isBase: true, stage: stageIdx, stageName,
          cached: true, baseImage,
        });
      } else {
        const sizeCalc = INSTRUCTION_SIZES[inst.cmd];
        const sizeMB = sizeCalc ? Math.max(0, sizeCalc(inst.args)) : 0;
        const createsLayer = ['RUN', 'COPY', 'ADD'].includes(inst.cmd);
        parsed.push({
          lineNum, cmd: inst.cmd, args: inst.args, raw: inst.raw,
          sizeMB: createsLayer ? sizeMB : 0, isBase: false,
          stage: stageIdx, stageName, cached: true, createsLayer,
        });
      }
    });
    return parsed;
  }, []);

  const buildImage = useCallback(() => {
    const parsed = parseDockerfile(dockerfile);
    setLayers([]);
    setBuilding(true);
    setBuildStep(0);
    setCacheInvalidIdx(-1);

    let step = 0;
    const addNext = () => {
      if (step >= parsed.length) {
        setBuilding(false);
        return;
      }
      setBuildStep(step);
      setLayers(prev => [...prev, { ...parsed[step], built: true }]);
      step++;
      buildTimerRef.current = setTimeout(addNext, 350 + Math.random() * 200);
    };
    addNext();
  }, [dockerfile, parseDockerfile]);

  const stopBuild = useCallback(() => {
    if (buildTimerRef.current) clearTimeout(buildTimerRef.current);
    setBuilding(false);
  }, []);

  const resetBuild = useCallback(() => {
    stopBuild();
    setLayers([]);
    setBuildStep(-1);
    setCacheInvalidIdx(-1);
    setShowCOW(false);
    setCowWrites([]);
  }, [stopBuild]);

  const handlePreset = useCallback((key) => {
    setActivePreset(key);
    setDockerfile(PRESETS[key].dockerfile.join('\n'));
    resetBuild();
  }, [resetBuild]);

  const simulateCacheInvalidation = useCallback((lineIdx) => {
    setCacheInvalidIdx(lineIdx);
    setLayers(prev => prev.map((l, i) => ({
      ...l,
      cached: i < lineIdx,
    })));
  }, []);

  const addCOWWrite = useCallback(() => {
    const files = ['/var/log/app.log', '/tmp/output.dat', '/app/data/cache.db', '/root/.config/settings', '/app/results.json'];
    const file = files[Math.floor(Math.random() * files.length)];
    const size = Math.floor(1 + Math.random() * 20);
    setCowWrites(prev => [...prev, { file, sizeMB: size, id: Date.now() }]);
  }, []);

  useEffect(() => {
    return () => { if (buildTimerRef.current) clearTimeout(buildTimerRef.current); };
  }, []);

  // Compute totals
  const totalSize = layers.reduce((s, l) => s + l.sizeMB, 0);
  const stages = [...new Set(layers.map(l => l.stage))];
  const isMultiStage = stages.length > 1;
  const finalStage = Math.max(...stages, 0);
  const finalStageSize = layers.filter(l => l.stage === finalStage).reduce((s, l) => s + l.sizeMB, 0);
  const cowSize = cowWrites.reduce((s, w) => s + w.sizeMB, 0);

  // Optimized comparison data
  const naiveLines = [
    'FROM python:3.11',
    'RUN apt-get update && apt-get install -y build-essential',
    'RUN pip install numpy pandas scikit-learn',
    'RUN pip install tensorflow',
    'RUN pip install pytorch torchvision',
    'COPY . .',
  ];
  const optimizedLines = [
    'FROM python:3.11-slim AS builder',
    'COPY requirements.txt .',
    'RUN pip install --user --no-cache-dir -r requirements.txt',
    'FROM python:3.11-slim',
    'COPY --from=builder /root/.local /root/.local',
    'COPY . .',
  ];
  const naiveSize = 920 + 180 + 150 + 450 + 500 + 10; // ~2210 MB
  const optSize = 125 + 1 + 200 + 125 + 200 + 10; // ~661 MB

  const teachingContent = {
    layers: 'Each Docker instruction that modifies the filesystem creates a new layer. Layers are stacked using a union filesystem (OverlayFS). Read-only image layers are shared between containers — only the top writable layer is unique.',
    cache: 'Docker caches layers during builds. If an instruction hasn\'t changed, Docker reuses the cached layer. BUT: once a layer is invalidated, ALL subsequent layers must rebuild. This is why you should put rarely-changing instructions (apt-get) before frequently-changing ones (COPY . .).',
    multistage: 'Multi-stage builds use multiple FROM instructions. You can compile in a large "builder" stage, then copy only the final artifacts into a minimal runtime stage. This dramatically reduces image size.',
    cow: 'Containers use Copy-on-Write (CoW). The image layers are read-only. When a container writes a file, it\'s copied to the thin writable layer on top. This makes container startup fast — no need to copy the entire image.',
    singularity: 'Singularity/Apptainer (used in HPC) converts the layered Docker image into a single SIF file. Benefits: no runtime overhead of union filesystem, no root required, better for shared filesystems. Trade-off: no layer sharing between images.',
  };

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
    title: { fontSize: compact ? 18 : 22, fontWeight: 700 },
    subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
    grid: { display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 340px', gap: 20 },
    panel: { background: '#1e293b', borderRadius: 8, border: '1px solid #334155', padding: 16 },
    sectionTitle: {
      fontSize: 13, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase',
      letterSpacing: '0.05em', marginBottom: 10,
    },
    btn: (color, disabled) => ({
      padding: '7px 14px', borderRadius: 6, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
      background: disabled ? '#334155' : color, color: disabled ? '#64748b' : '#fff',
      fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
      opacity: disabled ? 0.5 : 1, transition: 'all 0.15s', whiteSpace: 'nowrap',
    }),
    textarea: {
      background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: 12,
      color: '#f1f5f9', fontSize: 12, fontFamily: 'monospace', width: '100%', resize: 'vertical',
      outline: 'none', lineHeight: 1.7, minHeight: compact ? 140 : 200,
    },
    layer: (idx, total, isBuilding, cached, isCacheInvalid) => ({
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
      borderRadius: 6, marginBottom: 4,
      background: isCacheInvalid ? '#ef444415' : isBuilding ? `${LAYER_COLORS[idx % LAYER_COLORS.length]}15` : '#0f172a',
      border: `1px solid ${isCacheInvalid ? '#ef444444' : cached ? '#334155' : LAYER_COLORS[idx % LAYER_COLORS.length] + '44'}`,
      transition: 'all 0.3s ease',
      animation: isBuilding ? 'none' : undefined,
    }),
    layerBar: (idx, pct) => ({
      height: 6, borderRadius: 3, background: LAYER_COLORS[idx % LAYER_COLORS.length],
      width: `${Math.max(2, pct)}%`, transition: 'width 0.3s', minWidth: 4,
    }),
    tag: (color) => ({
      display: 'inline-block', padding: '2px 6px', borderRadius: 3,
      background: color + '22', color: color, fontSize: 10, fontWeight: 600, fontFamily: 'monospace',
    }),
    tooltip: {
      background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 14,
      fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginTop: 8,
    },
    cowLayer: {
      background: '#ef444415', border: '1px dashed #ef4444', borderRadius: 6, padding: '8px 12px',
      fontSize: 12, color: '#fca5a5', marginBottom: 4,
    },
    compBar: (pct, color) => ({
      height: 20, borderRadius: 4, background: color, width: `${pct}%`,
      transition: 'width 0.5s', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
      paddingRight: 8, fontSize: 11, fontWeight: 600, color: '#fff', minWidth: 60,
    }),
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <Layers size={compact ? 20 : 24} color="#06b6d4" />
        <div>
          <div style={styles.title}>Docker Layer Visualizer</div>
          <div style={styles.subtitle}>Interactive container image layers and filesystem explorer</div>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Left: layer stack + comparisons */}
        <div>
          {/* Layer Stack */}
          <div style={{ ...styles.panel, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={styles.sectionTitle}>Image Layers ({layers.length})</div>
              <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#06b6d4' }}>
                Total: {totalSize >= 1024 ? `${(totalSize / 1024).toFixed(1)} GB` : `${totalSize} MB`}
                {isMultiStage && (
                  <span style={{ color: '#10b981', marginLeft: 8 }}>
                    Final: {finalStageSize >= 1024 ? `${(finalStageSize / 1024).toFixed(1)} GB` : `${finalStageSize} MB`}
                  </span>
                )}
              </div>
            </div>

            {layers.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: 12, textAlign: 'center', padding: 30 }}>
                Write a Dockerfile and click "Build" to see layers.
              </div>
            ) : (
              <div style={{ maxHeight: compact ? 240 : 360, overflowY: 'auto' }}>
                {/* CoW writable layer */}
                {showCOW && (
                  <div>
                    <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>
                      Writable Container Layer (CoW)
                    </div>
                    {cowWrites.map(w => (
                      <div key={w.id} style={styles.cowLayer}>
                        <span style={{ fontFamily: 'monospace' }}>{w.file}</span>
                        <span style={{ float: 'right', color: '#ef4444' }}>+{w.sizeMB} MB</span>
                      </div>
                    ))}
                    {cowWrites.length === 0 && (
                      <div style={{ ...styles.cowLayer, textAlign: 'center', color: '#64748b' }}>
                        Empty — click "Write File" to simulate writes
                      </div>
                    )}
                    <div style={{ borderTop: '2px dashed #ef444444', margin: '8px 0' }} />
                  </div>
                )}

                {/* Image layers (displayed top-to-bottom = newest first) */}
                {[...layers].reverse().map((layer, revIdx) => {
                  const idx = layers.length - 1 - revIdx;
                  const isCurrentBuild = building && idx === buildStep;
                  const isCacheInvalid = cacheInvalidIdx >= 0 && idx >= cacheInvalidIdx;
                  const maxSize = Math.max(...layers.map(l => l.sizeMB), 1);
                  const pct = (layer.sizeMB / maxSize) * 100;
                  const isDiscardedStage = isMultiStage && multiStageView && layer.stage < finalStage;

                  return (
                    <div
                      key={idx}
                      style={{
                        ...styles.layer(idx, layers.length, isCurrentBuild, layer.cached, isCacheInvalid),
                        opacity: isDiscardedStage ? 0.3 : 1,
                        textDecoration: isDiscardedStage ? 'line-through' : 'none',
                      }}
                      onClick={() => simulateCacheInvalidation(idx)}
                      title="Click to simulate cache invalidation from this layer"
                    >
                      <div style={{ minWidth: 44 }}>
                        <span style={styles.tag(
                          layer.isBase ? '#06b6d4' :
                          layer.cmd === 'RUN' ? '#8b5cf6' :
                          layer.cmd === 'COPY' ? '#10b981' :
                          '#64748b'
                        )}>
                          {layer.cmd}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {layer.args}
                        </div>
                        {layer.createsLayer && layer.sizeMB > 0 && (
                          <div style={styles.layerBar(idx, pct)} />
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        {isCacheInvalid && !layer.cached && (
                          <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 600 }}>REBUILD</span>
                        )}
                        {!isCacheInvalid && layer.cached && layers.length > 0 && !building && (
                          <span style={{ fontSize: 9, color: '#10b981' }}>CACHED</span>
                        )}
                        {isCurrentBuild && (
                          <span style={{ fontSize: 9, color: '#f59e0b', fontWeight: 600 }}>BUILDING...</span>
                        )}
                        <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#94a3b8', minWidth: 50, textAlign: 'right' }}>
                          {layer.sizeMB > 0 ? (layer.sizeMB >= 1024 ? `${(layer.sizeMB / 1024).toFixed(1)}G` : `${layer.sizeMB}M`) : '0'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Size Optimization Comparison */}
          {showOptComparison && (
            <div style={{ ...styles.panel, marginBottom: 16 }}>
              <div style={styles.sectionTitle}>Size Comparison: Naive vs Optimized</div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12, color: '#94a3b8' }}>
                  <span>Naive Dockerfile</span>
                  <span style={{ fontFamily: 'monospace', color: '#ef4444' }}>{(naiveSize / 1024).toFixed(1)} GB</span>
                </div>
                <div style={{ background: '#0f172a', borderRadius: 4, height: 24, overflow: 'hidden' }}>
                  <div style={styles.compBar(100, '#ef4444')}>
                    {(naiveSize / 1024).toFixed(1)} GB
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12, color: '#94a3b8' }}>
                  <span>Optimized (multi-stage + slim)</span>
                  <span style={{ fontFamily: 'monospace', color: '#10b981' }}>{optSize} MB</span>
                </div>
                <div style={{ background: '#0f172a', borderRadius: 4, height: 24, overflow: 'hidden' }}>
                  <div style={styles.compBar((optSize / naiveSize) * 100, '#10b981')}>
                    {optSize} MB
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>
                {Math.round((1 - optSize / naiveSize) * 100)}% reduction — {(naiveSize / 1024).toFixed(1)} GB → {(optSize / 1024).toFixed(2)} GB
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginBottom: 6 }}>Naive</div>
                  {naiveLines.map((l, i) => (
                    <div key={i} style={{ fontSize: 10, fontFamily: 'monospace', color: '#94a3b8', padding: '2px 0' }}>{l}</div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600, marginBottom: 6 }}>Optimized</div>
                  {optimizedLines.map((l, i) => (
                    <div key={i} style={{ fontSize: 10, fontFamily: 'monospace', color: '#94a3b8', padding: '2px 0' }}>{l}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Singularity Comparison */}
          {showSingularity && (
            <div style={{ ...styles.panel, marginBottom: 16 }}>
              <div style={styles.sectionTitle}>Docker vs Singularity/Apptainer</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: '#0f172a', borderRadius: 6, padding: 12, border: '1px solid #06b6d444' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#06b6d4', marginBottom: 10 }}>Docker</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {['Base OS Layer', 'Deps Layer', 'App Layer', 'Config Layer'].map((l, i) => (
                      <div key={i} style={{
                        background: LAYER_COLORS[i] + '33', border: `1px solid ${LAYER_COLORS[i]}44`,
                        borderRadius: 4, padding: '4px 8px', fontSize: 11, color: LAYER_COLORS[i],
                      }}>{l}</div>
                    ))}
                    <div style={{ borderTop: '1px dashed #334155', paddingTop: 6, marginTop: 4, fontSize: 10, color: '#64748b' }}>
                      Layered OverlayFS, shared layers, root daemon
                    </div>
                  </div>
                </div>
                <div style={{ background: '#0f172a', borderRadius: 6, padding: 12, border: '1px solid #8b5cf644' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#8b5cf6', marginBottom: 10 }}>Singularity/Apptainer</div>
                  <div style={{
                    background: 'linear-gradient(135deg, #8b5cf633, #06b6d433)',
                    border: '1px solid #8b5cf644', borderRadius: 4, padding: 16,
                    textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#e2e8f0',
                  }}>
                    <Package size={24} style={{ display: 'block', margin: '0 auto 8px' }} color="#8b5cf6" />
                    Single .sif file
                  </div>
                  <div style={{ borderTop: '1px dashed #334155', paddingTop: 6, marginTop: 8, fontSize: 10, color: '#64748b' }}>
                    Single squashfs image, no root, HPC-friendly
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: editor + controls */}
        <div>
          {/* Dockerfile editor */}
          <div style={{ ...styles.panel, marginBottom: 16 }}>
            <div style={styles.sectionTitle}>Dockerfile</div>
            <textarea
              value={dockerfile}
              onChange={e => { setDockerfile(e.target.value); resetBuild(); }}
              style={styles.textarea}
              spellCheck={false}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              <button onClick={building ? stopBuild : buildImage} style={styles.btn(building ? '#ef4444' : '#06b6d4', false)}>
                <Play size={13} /> {building ? 'Stop' : 'Build Image'}
              </button>
              <button onClick={resetBuild} style={styles.btn('#334155', false)}>
                <RotateCcw size={13} /> Reset
              </button>
            </div>
          </div>

          {/* Presets */}
          <div style={{ ...styles.panel, marginBottom: 16 }}>
            <div style={styles.sectionTitle}>Preset Dockerfiles</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(PRESETS).map(([k, p]) => (
                <button
                  key={k}
                  onClick={() => handlePreset(k)}
                  style={{
                    ...styles.btn(activePreset === k ? '#06b6d4' : '#0f172a', false),
                    border: `1px solid ${activePreset === k ? '#06b6d4' : '#334155'}`,
                    justifyContent: 'flex-start',
                  }}
                >
                  <Box size={12} /> {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Features */}
          <div style={{ ...styles.panel, marginBottom: 16 }}>
            <div style={styles.sectionTitle}>Interactive Features</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button
                onClick={() => { setShowCOW(!showCOW); setShowTeaching('cow'); }}
                style={styles.btn(showCOW ? '#ef4444' : '#1e293b', layers.length === 0)}
              >
                <Copy size={12} /> {showCOW ? 'Hide' : 'Show'} Copy-on-Write Layer
              </button>
              {showCOW && (
                <button onClick={addCOWWrite} style={styles.btn('#f59e0b', false)}>
                  <Layers size={12} /> Simulate File Write
                </button>
              )}
              <button
                onClick={() => { setShowOptComparison(!showOptComparison); }}
                style={styles.btn(showOptComparison ? '#10b981' : '#1e293b', false)}
              >
                <Info size={12} /> {showOptComparison ? 'Hide' : 'Show'} Size Comparison
              </button>
              {isMultiStage && (
                <button
                  onClick={() => { setMultiStageView(!multiStageView); setShowTeaching('multistage'); }}
                  style={styles.btn(multiStageView ? '#8b5cf6' : '#1e293b', false)}
                >
                  <Package size={12} /> {multiStageView ? 'Show All Stages' : 'Show Final Stage Only'}
                </button>
              )}
              <button
                onClick={() => { setShowSingularity(!showSingularity); setShowTeaching('singularity'); }}
                style={styles.btn(showSingularity ? '#8b5cf6' : '#1e293b', false)}
              >
                <Box size={12} /> {showSingularity ? 'Hide' : 'Show'} Singularity Comparison
              </button>
              <button
                onClick={() => setCacheInvalidIdx(-1)}
                style={styles.btn('#334155', cacheInvalidIdx < 0)}
              >
                <RotateCcw size={12} /> Reset Cache Simulation
              </button>
            </div>
            {cacheInvalidIdx >= 0 && (
              <div style={{ marginTop: 8, fontSize: 11, color: '#fca5a5', background: '#ef444415', borderRadius: 6, padding: 8 }}>
                <AlertTriangle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                Cache invalidated at layer {cacheInvalidIdx}. All {layers.length - cacheInvalidIdx} subsequent layers will rebuild.
                <br /><span style={{ color: '#64748b' }}>Click any layer to simulate changing it.</span>
              </div>
            )}
          </div>

          {/* Teaching */}
          <div style={styles.panel}>
            <div style={styles.sectionTitle}>Learn</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {Object.entries(teachingContent).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setShowTeaching(showTeaching === k ? null : k)}
                  style={{
                    ...styles.btn(showTeaching === k ? '#06b6d4' : '#0f172a', false),
                    border: `1px solid ${showTeaching === k ? '#06b6d4' : '#334155'}`,
                    fontSize: 10, padding: '4px 8px',
                  }}
                >
                  {k}
                </button>
              ))}
            </div>
            {showTeaching && teachingContent[showTeaching] && (
              <div style={styles.tooltip}>
                <Info size={14} color="#06b6d4" style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                {teachingContent[showTeaching]}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DockerLayerVisualizer;
