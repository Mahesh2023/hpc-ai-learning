import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, RotateCcw, HardDrive, AlertTriangle, Info, Zap, Server, ChevronDown } from 'lucide-react';

const OST_COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];
const STRIPE_SIZE_OPTIONS = [
  { value: 65536, label: '64 KB' },
  { value: 262144, label: '256 KB' },
  { value: 1048576, label: '1 MB' },
  { value: 4194304, label: '4 MB' },
];
const FILE_SIZE_OPTIONS = [
  { value: 1, label: '1 MB' },
  { value: 100, label: '100 MB' },
  { value: 1024, label: '1 GB' },
  { value: 10240, label: '10 GB' },
];
const SINGLE_OST_BW = 1.0; // GB/s

const formatBytes = (bytes) => {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

const formatBW = (gbps) => gbps >= 1 ? `${gbps.toFixed(1)} GB/s` : `${(gbps * 1024).toFixed(0)} MB/s`;

const StorageStripingSimulator = ({ compact = false }) => {
  const [numOSTs, setNumOSTs] = useState(8);
  const [stripeCount, setStripeCount] = useState(4);
  const [stripeSizeIdx, setStripeSizeIdx] = useState(2); // 1MB
  const [fileSizeIdx, setFileSizeIdx] = useState(2); // 1GB
  const [isAnimating, setIsAnimating] = useState(false);
  const [animProgress, setAnimProgress] = useState(0);
  const [chunks, setChunks] = useState([]);
  const [ostFailed, setOstFailed] = useState(-1);
  const [showPFL, setShowPFL] = useState(false);
  const [showMDS, setShowMDS] = useState(false);
  const [mdsStep, setMdsStep] = useState(0);
  const [compareMode, setCompareMode] = useState(false);
  const [showTeaching, setShowTeaching] = useState(null);
  const animRef = useRef(null);

  const stripeSize = STRIPE_SIZE_OPTIONS[stripeSizeIdx].value;
  const stripeSizeLabel = STRIPE_SIZE_OPTIONS[stripeSizeIdx].label;
  const fileSizeMB = FILE_SIZE_OPTIONS[fileSizeIdx].value;
  const fileSizeBytes = fileSizeMB * 1048576;
  const totalStripes = Math.ceil(fileSizeBytes / stripeSize);
  const effectiveStripeCount = Math.min(stripeCount, numOSTs);
  const aggBW = SINGLE_OST_BW * (ostFailed >= 0 && ostFailed < effectiveStripeCount ? effectiveStripeCount - 1 : effectiveStripeCount);
  const writeTime = fileSizeMB / 1024 / aggBW;

  // Calculate per-OST distribution
  const ostDistribution = useCallback(() => {
    const dist = Array(numOSTs).fill(0);
    for (let i = 0; i < totalStripes; i++) {
      const target = i % effectiveStripeCount;
      if (target !== ostFailed) {
        dist[target] += stripeSize;
      } else {
        // redistribute to next available OST
        dist[(target + 1) % effectiveStripeCount] += stripeSize;
      }
    }
    return dist;
  }, [numOSTs, totalStripes, effectiveStripeCount, stripeSize, ostFailed]);

  // Build chunks for visualization
  const buildChunks = useCallback((progress) => {
    const visibleStripes = Math.floor(totalStripes * progress);
    const maxDisplay = Math.min(visibleStripes, 80); // limit visual chunks
    const step = visibleStripes > 80 ? Math.floor(visibleStripes / 80) : 1;
    const result = [];
    for (let i = 0; i < visibleStripes && result.length < maxDisplay; i += step) {
      let target = i % effectiveStripeCount;
      if (target === ostFailed && ostFailed >= 0) target = (target + 1) % effectiveStripeCount;
      result.push({ idx: i, ost: target, offset: Math.floor(i / effectiveStripeCount) });
    }
    return result;
  }, [totalStripes, effectiveStripeCount, ostFailed]);

  const startAnimation = useCallback(() => {
    setIsAnimating(true);
    setAnimProgress(0);
    setChunks([]);
    const startTime = Date.now();
    const duration = Math.min(3000, Math.max(1000, totalStripes * 5));

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(1, elapsed / duration);
      setAnimProgress(p);
      setChunks(buildChunks(p));
      if (p < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        setIsAnimating(false);
      }
    };
    animRef.current = requestAnimationFrame(tick);
  }, [totalStripes, buildChunks]);

  const stopAnimation = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setIsAnimating(false);
  }, []);

  const resetSim = useCallback(() => {
    stopAnimation();
    setAnimProgress(0);
    setChunks([]);
    setOstFailed(-1);
    setShowMDS(false);
    setMdsStep(0);
  }, [stopAnimation]);

  const startMDSDemo = useCallback(() => {
    setShowMDS(true);
    setMdsStep(0);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setMdsStep(step);
      if (step >= 4) {
        clearInterval(interval);
        setTimeout(() => startAnimation(), 500);
      }
    }, 800);
  }, [startAnimation]);

  useEffect(() => {
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  // Generate lfs setstripe command
  const lfsCommand = `lfs setstripe -c ${effectiveStripeCount} -S ${stripeSizeLabel.replace(' ', '')} /lustre/project/myfile.dat`;
  const pflCommand = `lfs setstripe -E 1M -c 1 -S 256K -E 1G -c 4 -S 1M -E -1 -c ${numOSTs} -S 4M /lustre/project/`;

  const dist = ostDistribution();
  const maxOSTData = Math.max(...dist);

  const teachingContent = {
    striping: 'Lustre stripes files across multiple OSTs (Object Storage Targets) for parallel I/O. Wider striping = more aggregate bandwidth but more metadata overhead. Small files should use stripe_count=1.',
    pfl: 'Progressive File Layout (PFL) automatically assigns striping based on file size. Small files → narrow stripe (less overhead), large files → wide stripe (more bandwidth). Defined with composite layouts.',
    mds: 'The MDS (Metadata Server) handles file metadata (names, permissions, layout). On file open, the client queries the MDS for the file\'s striping layout, then talks directly to the OSSes for data.',
    failure: 'With data redundancy (RAID on OSTs), losing one OST means reduced bandwidth but no data loss. Without redundancy, stripes on the failed OST are unavailable until recovery.',
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
    grid: { display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 320px', gap: 20 },
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
    select: {
      background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '7px 10px',
      color: '#f1f5f9', fontSize: 13, outline: 'none', fontFamily: 'monospace', cursor: 'pointer',
    },
    slider: {
      width: '100%', accentColor: '#06b6d4', cursor: 'pointer',
    },
    tooltip: {
      background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 14,
      fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginTop: 8, marginBottom: 12,
    },
    ostColumn: (idx, failed) => ({
      flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
      opacity: failed ? 0.25 : 1, transition: 'opacity 0.3s',
    }),
    ostBar: (idx, pct, failed) => ({
      width: '100%', background: '#0f172a', borderRadius: 4, height: compact ? 140 : 200,
      border: `1px solid ${failed ? '#ef4444' : '#334155'}`, position: 'relative', overflow: 'hidden',
    }),
    ostFill: (idx, pct) => ({
      position: 'absolute', bottom: 0, left: 0, right: 0, height: `${pct}%`,
      background: `linear-gradient(to top, ${OST_COLORS[idx]}88, ${OST_COLORS[idx]}44)`,
      transition: 'height 0.3s ease',
      borderTop: `2px solid ${OST_COLORS[idx]}`,
    }),
    chunk: (ost) => ({
      width: compact ? 8 : 10, height: compact ? 8 : 10, borderRadius: 2,
      background: OST_COLORS[ost], opacity: 0.8,
    }),
    codeBlock: {
      background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: 10,
      fontFamily: 'monospace', fontSize: 11, color: '#06b6d4', wordBreak: 'break-all',
      lineHeight: 1.6,
    },
    mdsStep: (active) => ({
      padding: '8px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
      background: active ? '#06b6d420' : '#0f172a',
      border: `1px solid ${active ? '#06b6d4' : '#334155'}`,
      color: active ? '#06b6d4' : '#64748b',
      transition: 'all 0.3s',
    }),
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <HardDrive size={compact ? 20 : 24} color="#8b5cf6" />
        <div>
          <div style={styles.title}>Parallel Filesystem Striping Simulator</div>
          <div style={styles.subtitle}>Interactive Lustre/GPFS striping visualizer — {numOSTs} OSTs</div>
        </div>
      </div>

      {/* MDS Flow Animation */}
      {showMDS && (
        <div style={{ ...styles.panel, marginBottom: 16 }}>
          <div style={styles.sectionTitle}>Metadata Operation Flow</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['Client: open(/lustre/file)', 'MDS: lookup → layout info', 'MDS → Client: stripe map', 'Client → OSSes: parallel I/O'].map((label, i) => (
              <div key={i} style={styles.mdsStep(mdsStep >= i)}>
                {i > 0 && <span style={{ marginRight: 6 }}>→</span>}
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={styles.grid}>
        {/* Left: OST visualization */}
        <div>
          {/* OST Columns */}
          <div style={{ ...styles.panel, marginBottom: 16 }}>
            <div style={styles.sectionTitle}>
              Object Storage Targets (OSTs)
              {ostFailed >= 0 && (
                <span style={{ color: '#ef4444', marginLeft: 8, fontSize: 11, fontWeight: 400 }}>
                  — OST{ostFailed} FAILED
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: compact ? 4 : 8 }}>
              {Array.from({ length: numOSTs }).map((_, i) => {
                const isFailed = ostFailed === i;
                const isUsed = i < effectiveStripeCount;
                const pct = maxOSTData > 0 ? (dist[i] / maxOSTData) * 100 * animProgress : 0;
                return (
                  <div key={i} style={styles.ostColumn(i, isFailed)}>
                    <div style={{ fontSize: 10, color: isUsed ? OST_COLORS[i] : '#64748b', fontWeight: 600, marginBottom: 4 }}>
                      OST{i}
                    </div>
                    <div style={styles.ostBar(i, pct, isFailed)}>
                      {isUsed && !isFailed && <div style={styles.ostFill(i, Math.min(100, pct))} />}
                      {isFailed && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <AlertTriangle size={16} color="#ef4444" />
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 9, color: '#64748b', marginTop: 4, fontFamily: 'monospace' }}>
                      {isUsed && !isFailed ? formatBytes(Math.round(dist[i] * animProgress)) : isFailed ? 'DOWN' : 'idle'}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Stripe flow visualization */}
            {chunks.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 2, maxHeight: 60, overflow: 'hidden' }}>
                {chunks.map((c, i) => (
                  <div key={i} style={styles.chunk(c.ost)} title={`Stripe ${c.idx} → OST${c.ost}`} />
                ))}
              </div>
            )}
          </div>

          {/* Bandwidth comparison */}
          <div style={{ ...styles.panel, marginBottom: 16 }}>
            <div style={styles.sectionTitle}>Bandwidth Analysis</div>
            {compareMode ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[1, effectiveStripeCount].map(sc => {
                  const bw = SINGLE_OST_BW * sc;
                  const time = fileSizeMB / 1024 / bw;
                  return (
                    <div key={sc} style={{ background: '#0f172a', borderRadius: 6, padding: 12, border: '1px solid #334155' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>
                        stripe_count={sc}
                      </div>
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Aggregate BW</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: sc > 1 ? '#10b981' : '#f59e0b' }}>
                          {formatBW(bw)}
                        </div>
                      </div>
                      <div style={{
                        height: 8, borderRadius: 4, background: '#1e293b',
                        overflow: 'hidden', marginBottom: 6,
                      }}>
                        <div style={{
                          height: '100%', borderRadius: 4, width: `${(bw / (SINGLE_OST_BW * numOSTs)) * 100}%`,
                          background: sc > 1 ? '#10b981' : '#f59e0b',
                        }} />
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                        Write {FILE_SIZE_OPTIONS[fileSizeIdx].label}: {time < 1 ? `${(time * 1000).toFixed(0)}ms` : `${time.toFixed(1)}s`}
                      </div>
                      {sc > 1 && (
                        <div style={{ fontSize: 11, color: '#10b981', marginTop: 4, fontWeight: 600 }}>
                          {sc}× faster than single OST
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>Aggregate Bandwidth</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>{formatBW(aggBW)}</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: '#0f172a', overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{
                    height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, #06b6d4, #10b981)',
                    width: `${(aggBW / (SINGLE_OST_BW * numOSTs)) * 100}%`, transition: 'width 0.3s',
                  }} />
                </div>
                <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
                  {effectiveStripeCount} OST{effectiveStripeCount > 1 ? 's' : ''} × {formatBW(SINGLE_OST_BW)}/OST
                  {ostFailed >= 0 && <span style={{ color: '#ef4444' }}> (1 failed)</span>}
                  &nbsp;= {formatBW(aggBW)} | Write time: {writeTime < 1 ? `${(writeTime * 1000).toFixed(0)}ms` : `${writeTime.toFixed(2)}s`}
                </div>
              </div>
            )}
          </div>

          {/* Distribution summary */}
          <div style={{ ...styles.panel, marginBottom: 16 }}>
            <div style={styles.sectionTitle}>Data Distribution</div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8', lineHeight: 1.8 }}>
              Your <span style={{ color: '#06b6d4', fontWeight: 600 }}>{FILE_SIZE_OPTIONS[fileSizeIdx].label}</span> file
              with <span style={{ color: '#8b5cf6', fontWeight: 600 }}>stripe_count={effectiveStripeCount}</span>,{' '}
              <span style={{ color: '#10b981', fontWeight: 600 }}>stripe_size={stripeSizeLabel}</span>:
              <br />
              → <span style={{ color: '#f1f5f9' }}>{totalStripes.toLocaleString()}</span> stripes distributed across {effectiveStripeCount} OSTs
              <br />
              → ~<span style={{ color: '#f1f5f9' }}>{formatBytes(Math.round(fileSizeBytes / effectiveStripeCount))}</span> per OST
            </div>
          </div>

          {/* lfs command builder */}
          <div style={styles.panel}>
            <div style={styles.sectionTitle}>
              Command Builder
            </div>
            <div style={styles.codeBlock}>
              <span style={{ color: '#64748b' }}>$</span> {lfsCommand}
            </div>
            {showPFL && (
              <div style={{ ...styles.codeBlock, marginTop: 8 }}>
                <div style={{ color: '#64748b', marginBottom: 4 }}># Progressive File Layout (PFL):</div>
                <span style={{ color: '#64748b' }}>$</span> {pflCommand}
                <div style={{ color: '#64748b', marginTop: 6, fontSize: 10 }}>
                  Files &lt;1MB → stripe=1, 1MB-1GB → stripe=4, &gt;1GB → stripe={numOSTs}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: controls */}
        <div>
          {/* Striping controls */}
          <div style={{ ...styles.panel, marginBottom: 16 }}>
            <div style={styles.sectionTitle}>Striping Parameters</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label style={{ fontSize: 12, color: '#94a3b8' }}>Number of OSTs</label>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#06b6d4', fontFamily: 'monospace' }}>{numOSTs}</span>
                </div>
                <input type="range" min={2} max={8} value={numOSTs} onChange={e => { setNumOSTs(+e.target.value); resetSim(); }} style={styles.slider} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label style={{ fontSize: 12, color: '#94a3b8' }}>stripe_count</label>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#8b5cf6', fontFamily: 'monospace' }}>{stripeCount}</span>
                </div>
                <input type="range" min={1} max={numOSTs} value={Math.min(stripeCount, numOSTs)} onChange={e => { setStripeCount(+e.target.value); resetSim(); }} style={styles.slider} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>stripe_size</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {STRIPE_SIZE_OPTIONS.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => { setStripeSizeIdx(i); resetSim(); }}
                      style={{
                        ...styles.btn(stripeSizeIdx === i ? '#10b981' : '#0f172a', false),
                        border: `1px solid ${stripeSizeIdx === i ? '#10b981' : '#334155'}`,
                        fontSize: 11, padding: '5px 10px',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>File Size</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {FILE_SIZE_OPTIONS.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => { setFileSizeIdx(i); resetSim(); }}
                      style={{
                        ...styles.btn(fileSizeIdx === i ? '#f59e0b' : '#0f172a', false),
                        border: `1px solid ${fileSizeIdx === i ? '#f59e0b' : '#334155'}`,
                        fontSize: 11, padding: '5px 10px',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ ...styles.panel, marginBottom: 16 }}>
            <div style={styles.sectionTitle}>Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button onClick={isAnimating ? stopAnimation : startAnimation} style={styles.btn('#06b6d4', false)}>
                <Play size={13} /> {isAnimating ? 'Stop' : 'Write File'}
              </button>
              <button onClick={startMDSDemo} style={styles.btn('#8b5cf6', isAnimating)}>
                <Server size={13} /> MDS Lookup → Write
              </button>
              <button onClick={() => setCompareMode(!compareMode)} style={styles.btn(compareMode ? '#10b981' : '#1e293b', false)}>
                <Zap size={13} /> {compareMode ? 'Hide' : 'Show'} Comparison
              </button>
              <button onClick={resetSim} style={styles.btn('#334155', false)}>
                <RotateCcw size={13} /> Reset
              </button>
            </div>
          </div>

          {/* Failure simulation */}
          <div style={{ ...styles.panel, marginBottom: 16 }}>
            <div style={styles.sectionTitle}>Failure Simulation</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Array.from({ length: Math.min(effectiveStripeCount, numOSTs) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setOstFailed(ostFailed === i ? -1 : i); setShowTeaching('failure'); }}
                  style={{
                    ...styles.btn(ostFailed === i ? '#ef4444' : '#0f172a', false),
                    border: `1px solid ${ostFailed === i ? '#ef4444' : '#334155'}`,
                    fontSize: 11, padding: '4px 8px',
                  }}
                >
                  {ostFailed === i ? '✕' : ''} OST{i}
                </button>
              ))}
            </div>
            {ostFailed >= 0 && (
              <div style={{ marginTop: 8, fontSize: 11, color: '#fca5a5', lineHeight: 1.5 }}>
                OST{ostFailed} is down. Bandwidth reduced to {formatBW(aggBW)}.
                Data on OST{ostFailed} unavailable until recovery.
              </div>
            )}
          </div>

          {/* PFL toggle */}
          <div style={{ ...styles.panel, marginBottom: 16 }}>
            <div style={styles.sectionTitle}>Progressive File Layout</div>
            <button
              onClick={() => { setShowPFL(!showPFL); setShowTeaching('pfl'); }}
              style={styles.btn(showPFL ? '#f59e0b' : '#1e293b', false)}
            >
              <Info size={13} /> {showPFL ? 'Hide' : 'Show'} PFL Demo
            </button>
            {showPFL && (
              <div style={{ marginTop: 10, fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  {[
                    { range: '0 – 1 MB', stripe: '1', size: '256K', color: '#06b6d4' },
                    { range: '1 MB – 1 GB', stripe: '4', size: '1M', color: '#8b5cf6' },
                    { range: '> 1 GB', stripe: `${numOSTs}`, size: '4M', color: '#10b981' },
                  ].map((tier, i) => (
                    <div key={i} style={{ background: '#0f172a', borderRadius: 4, padding: '6px 10px', border: `1px solid ${tier.color}33` }}>
                      <div style={{ color: tier.color, fontWeight: 600 }}>{tier.range}</div>
                      <div style={{ color: '#64748b' }}>stripe={tier.stripe}, size={tier.size}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Teaching */}
          <div style={styles.panel}>
            <div style={styles.sectionTitle}>Learn</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(teachingContent).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setShowTeaching(showTeaching === k ? null : k)}
                  style={{
                    ...styles.btn(showTeaching === k ? '#06b6d4' : '#0f172a', false),
                    border: `1px solid ${showTeaching === k ? '#06b6d4' : '#334155'}`,
                    fontSize: 11, justifyContent: 'flex-start', textAlign: 'left',
                  }}
                >
                  <Info size={12} /> {k.charAt(0).toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
            {showTeaching && teachingContent[showTeaching] && (
              <div style={styles.tooltip}>
                {teachingContent[showTeaching]}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageStripingSimulator;
