import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Server, Cpu, Clock, Zap, AlertTriangle } from 'lucide-react';

const JOB_STATES = { PENDING: 'PD', RUNNING: 'R', COMPLETED: 'CD', FAILED: 'F', CANCELLED: 'CA' };
const STATE_COLORS = { PD: '#f59e0b', R: '#10b981', CD: '#06b6d4', F: '#ef4444', CA: '#64748b' };
const STATE_LABELS = { PD: 'Pending', R: 'Running', CD: 'Completed', F: 'Failed', CA: 'Cancelled' };

const DEFAULT_CLUSTER = {
  nodes: [
    { id: 'node001', cpus: 4, mem: 16, gpus: 1, used_cpus: 0, used_mem: 0, used_gpus: 0, partition: 'gpu' },
    { id: 'node002', cpus: 4, mem: 16, gpus: 1, used_cpus: 0, used_mem: 0, used_gpus: 0, partition: 'gpu' },
    { id: 'node003', cpus: 8, mem: 32, gpus: 0, used_cpus: 0, used_mem: 0, used_gpus: 0, partition: 'cpu' },
    { id: 'node004', cpus: 8, mem: 32, gpus: 0, used_cpus: 0, used_mem: 0, used_gpus: 0, partition: 'cpu' },
    { id: 'node005', cpus: 16, mem: 64, gpus: 2, used_cpus: 0, used_mem: 0, used_gpus: 0, partition: 'highmem' },
    { id: 'node006', cpus: 16, mem: 64, gpus: 2, used_cpus: 0, used_mem: 0, used_gpus: 0, partition: 'highmem' },
  ],
  partitions: ['gpu', 'cpu', 'highmem'],
};

const SAMPLE_SCRIPTS = [
  { label: 'Simple CPU job', script: '#!/bin/bash\n#SBATCH --job-name=hello\n#SBATCH --ntasks=1\n#SBATCH --cpus-per-task=2\n#SBATCH --mem=4G\n#SBATCH --time=00:05:00\n#SBATCH --partition=cpu\n\necho "Hello from $(hostname)"\nsleep 3\necho "Done!"' },
  { label: 'GPU training job', script: '#!/bin/bash\n#SBATCH --job-name=train_model\n#SBATCH --ntasks=1\n#SBATCH --cpus-per-task=4\n#SBATCH --mem=12G\n#SBATCH --gres=gpu:1\n#SBATCH --time=00:10:00\n#SBATCH --partition=gpu\n\npython3 train.py --epochs=50 --batch-size=64' },
  { label: 'MPI parallel job', script: '#!/bin/bash\n#SBATCH --job-name=mpi_sim\n#SBATCH --ntasks=4\n#SBATCH --cpus-per-task=2\n#SBATCH --mem=8G\n#SBATCH --time=00:15:00\n#SBATCH --partition=cpu\n\nmpirun -np 4 ./simulation --steps=1000' },
  { label: 'Multi-GPU job', script: '#!/bin/bash\n#SBATCH --job-name=multi_gpu\n#SBATCH --ntasks=1\n#SBATCH --cpus-per-task=8\n#SBATCH --mem=32G\n#SBATCH --gres=gpu:2\n#SBATCH --time=01:00:00\n#SBATCH --partition=highmem\n\ntorchrun --nproc_per_node=2 train.py' },
  { label: 'Overcommit (will queue)', script: '#!/bin/bash\n#SBATCH --job-name=big_job\n#SBATCH --ntasks=1\n#SBATCH --cpus-per-task=32\n#SBATCH --mem=128G\n#SBATCH --time=02:00:00\n#SBATCH --partition=cpu\n\n# This requests more resources than available!' },
];

function parseSbatch(script) {
  const opts = { job_name: 'unnamed', ntasks: 1, cpus_per_task: 1, mem_gb: 1, gpus: 0, time_min: 5, partition: 'cpu' };
  for (const line of script.split('\n')) {
    const m = line.match(/^#SBATCH\s+--(\S+?)=(.+)/);
    if (!m) continue;
    const [, key, val] = m;
    if (key === 'job-name') opts.job_name = val;
    if (key === 'ntasks') opts.ntasks = parseInt(val) || 1;
    if (key === 'cpus-per-task') opts.cpus_per_task = parseInt(val) || 1;
    if (key === 'mem') opts.mem_gb = parseInt(val) || 1;
    if (key === 'gres' && val.includes('gpu:')) opts.gpus = parseInt(val.split(':')[1]) || 0;
    if (key === 'time') {
      const parts = val.split(':').map(Number);
      opts.time_min = parts.length === 3 ? parts[0] * 60 + parts[1] + parts[2] / 60 : parts[0];
    }
    if (key === 'partition') opts.partition = val;
  }
  opts.total_cpus = opts.ntasks * opts.cpus_per_task;
  return opts;
}

function NodeViz({ node, compact }) {
  const cpuUsage = node.used_cpus / node.cpus;
  const memUsage = node.used_mem / node.mem;
  return (
    <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: compact ? '0.5rem' : '0.75rem', minWidth: compact ? '80px' : '120px', transition: 'all 300ms' }}>
      <div style={{ fontSize: '0.6875rem', fontWeight: '700', color: '#94a3b8', marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <Server size={10} />{node.id}
      </div>
      <div style={{ display: 'flex', gap: '2px', marginBottom: '0.25rem' }}>
        {Array.from({ length: node.cpus }).map((_, i) => (
          <div key={i} style={{ width: compact ? '6px' : '10px', height: compact ? '6px' : '10px', borderRadius: '2px', background: i < node.used_cpus ? '#10b981' : '#1e293b', border: '1px solid #334155', transition: 'background 300ms' }} />
        ))}
      </div>
      <div style={{ fontSize: '0.5625rem', color: '#64748b' }}>
        CPU {node.used_cpus}/{node.cpus} &middot; {node.used_mem}/{node.mem}G
        {node.gpus > 0 && <> &middot; GPU {node.used_gpus}/{node.gpus}</>}
      </div>
      <div style={{ height: '3px', background: '#1e293b', borderRadius: '2px', marginTop: '0.25rem', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${cpuUsage * 100}%`, background: cpuUsage > 0.8 ? '#ef4444' : cpuUsage > 0.5 ? '#f59e0b' : '#10b981', transition: 'all 300ms' }} />
      </div>
    </div>
  );
}

export default function SlurmSimulator({ compact = false, onLearn }) {
  const [script, setScript] = useState(SAMPLE_SCRIPTS[0].script);
  const [cluster, setCluster] = useState(JSON.parse(JSON.stringify(DEFAULT_CLUSTER)));
  const [jobs, setJobs] = useState([]);
  const [nextId, setNextId] = useState(1001);
  const [log, setLog] = useState(['[scheduler] SLURM simulator ready. Submit a job to begin.']);
  const [simTime, setSimTime] = useState(0);
  const [running, setRunning] = useState(false);
  const timerRef = useRef(null);
  const logEndRef = useRef(null);

  const addLog = useCallback((msg) => {
    setLog(prev => [...prev.slice(-50), `[${String(simTime).padStart(3, '0')}s] ${msg}`]);
  }, [simTime]);

  // Scheduler tick
  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      setSimTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [running]);

  // Process jobs on each tick
  useEffect(() => {
    if (!running) return;
    setJobs(prev => {
      const updated = prev.map(j => {
        if (j.state === JOB_STATES.RUNNING) {
          const elapsed = simTime - j.start_time;
          if (elapsed >= j.duration) {
            // Release resources
            setCluster(c => {
              const newNodes = c.nodes.map(n => {
                if (j.assigned_node === n.id) {
                  return { ...n, used_cpus: Math.max(0, n.used_cpus - j.total_cpus), used_mem: Math.max(0, n.used_mem - j.mem_gb), used_gpus: Math.max(0, n.used_gpus - j.gpus) };
                }
                return n;
              });
              return { ...c, nodes: newNodes };
            });
            addLog(`Job ${j.id} (${j.job_name}) COMPLETED on ${j.assigned_node}`);
            return { ...j, state: JOB_STATES.COMPLETED, end_time: simTime };
          }
        }
        return j;
      });

      // Try to schedule pending jobs (FIFO)
      return updated.map(j => {
        if (j.state !== JOB_STATES.PENDING) return j;
        let assigned = null;
        setCluster(c => {
          const newNodes = c.nodes.map(n => {
            if (assigned) return n;
            const matchPartition = !j.partition || j.partition === n.partition;
            const hasCpu = (n.cpus - n.used_cpus) >= j.total_cpus;
            const hasMem = (n.mem - n.used_mem) >= j.mem_gb;
            const hasGpu = (n.gpus - n.used_gpus) >= j.gpus;
            if (matchPartition && hasCpu && hasMem && hasGpu) {
              assigned = n.id;
              return { ...n, used_cpus: n.used_cpus + j.total_cpus, used_mem: n.used_mem + j.mem_gb, used_gpus: n.used_gpus + j.gpus };
            }
            return n;
          });
          return { ...c, nodes: newNodes };
        });
        if (assigned) {
          addLog(`Job ${j.id} (${j.job_name}) RUNNING on ${assigned} — ${j.total_cpus} CPUs, ${j.mem_gb}G RAM${j.gpus ? ', ' + j.gpus + ' GPU(s)' : ''}`);
          return { ...j, state: JOB_STATES.RUNNING, assigned_node: assigned, start_time: simTime };
        }
        return j;
      });
    });
  }, [simTime, running, addLog]);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [log]);

  const submitJob = () => {
    const opts = parseSbatch(script);
    const id = nextId;
    setNextId(id + 1);
    const duration = Math.max(3, Math.min(60, Math.round(opts.time_min / 2))); // Sim speed: compress time
    const job = { id, ...opts, state: JOB_STATES.PENDING, submitted_time: simTime, start_time: null, end_time: null, assigned_node: null, duration };
    setJobs(prev => [...prev, job]);
    addLog(`Job ${id} (${opts.job_name}) SUBMITTED — requesting ${opts.total_cpus} CPUs, ${opts.mem_gb}G, ${opts.gpus} GPUs on [${opts.partition}]`);
    if (!running) setRunning(true);
  };

  const cancelJob = (id) => {
    setJobs(prev => prev.map(j => {
      if (j.id === id && (j.state === JOB_STATES.PENDING || j.state === JOB_STATES.RUNNING)) {
        if (j.assigned_node) {
          setCluster(c => ({
            ...c, nodes: c.nodes.map(n => n.id === j.assigned_node
              ? { ...n, used_cpus: Math.max(0, n.used_cpus - j.total_cpus), used_mem: Math.max(0, n.used_mem - j.mem_gb), used_gpus: Math.max(0, n.used_gpus - j.gpus) }
              : n)
          }));
        }
        addLog(`Job ${id} (${j.job_name}) CANCELLED`);
        return { ...j, state: JOB_STATES.CANCELLED, end_time: simTime };
      }
      return j;
    }));
  };

  const reset = () => {
    setRunning(false);
    setJobs([]);
    setCluster(JSON.parse(JSON.stringify(DEFAULT_CLUSTER)));
    setSimTime(0);
    setLog(['[scheduler] Simulator reset.']);
  };

  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(139,92,246,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={16} color="#8b5cf6" />
          <span style={{ fontWeight: '700', fontSize: '0.9375rem', color: '#f1f5f9' }}>SLURM Job Scheduler Simulator</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={14} color="#64748b" />
          <span style={{ fontSize: '0.8125rem', color: '#94a3b8', fontFamily: 'monospace' }}>T+{simTime}s</span>
          <button onClick={() => setRunning(!running)} style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid #334155', background: running ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: running ? '#ef4444' : '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: '600' }}>
            {running ? <><Pause size={12} />Pause</> : <><Play size={12} />Run</>}
          </button>
          <button onClick={reset} style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid #334155', background: 'rgba(100,116,139,0.1)', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
            <RotateCcw size={12} />Reset
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: '0' }}>
        {/* Left: Script editor + submit */}
        <div style={{ padding: '0.75rem', borderRight: compact ? 'none' : '1px solid #334155' }}>
          <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            {SAMPLE_SCRIPTS.map((s, i) => (
              <button key={i} onClick={() => setScript(s.script)} style={{ padding: '0.2rem 0.5rem', fontSize: '0.6875rem', borderRadius: '4px', border: '1px solid #334155', background: script === s.script ? 'rgba(6,182,212,0.15)' : '#0f172a', color: script === s.script ? '#06b6d4' : '#64748b', cursor: 'pointer', whiteSpace: 'nowrap' }}>{s.label}</button>
            ))}
          </div>
          <textarea value={script} onChange={e => setScript(e.target.value)} spellCheck={false}
            style={{ width: '100%', height: compact ? '120px' : '160px', padding: '0.5rem', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', lineHeight: '1.5', color: '#e2e8f0', background: '#0d1117', border: '1px solid #334155', borderRadius: '6px', resize: 'vertical', outline: 'none' }} />
          <button onClick={submitJob} style={{ marginTop: '0.5rem', width: '100%', padding: '0.5rem', fontWeight: '700', fontSize: '0.875rem', color: '#0f172a', background: 'linear-gradient(135deg, #06b6d4, #14b8a6)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            sbatch submit.sh
          </button>
        </div>

        {/* Right: Cluster visualization + job queue */}
        <div style={{ padding: '0.75rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', marginBottom: '0.375rem' }}>CLUSTER NODES</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.375rem', marginBottom: '0.75rem' }}>
            {cluster.nodes.map(n => <NodeViz key={n.id} node={n} compact={compact} />)}
          </div>

          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', marginBottom: '0.375rem' }}>JOB QUEUE (squeue)</div>
          <div style={{ maxHeight: '120px', overflow: 'auto', background: '#0d1117', borderRadius: '6px', border: '1px solid #334155', fontSize: '0.6875rem', fontFamily: 'monospace' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: '#64748b', borderBottom: '1px solid #1e293b' }}>
                  <th style={{ padding: '0.25rem 0.375rem', textAlign: 'left' }}>JOBID</th>
                  <th style={{ padding: '0.25rem 0.375rem', textAlign: 'left' }}>NAME</th>
                  <th style={{ padding: '0.25rem 0.375rem', textAlign: 'center' }}>ST</th>
                  <th style={{ padding: '0.25rem 0.375rem', textAlign: 'left' }}>NODE</th>
                  <th style={{ padding: '0.25rem 0.375rem' }}></th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 && <tr><td colSpan={5} style={{ padding: '0.5rem', color: '#475569', textAlign: 'center' }}>No jobs submitted</td></tr>}
                {[...jobs].reverse().map(j => (
                  <tr key={j.id} style={{ color: '#e2e8f0', borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '0.25rem 0.375rem' }}>{j.id}</td>
                    <td style={{ padding: '0.25rem 0.375rem', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.job_name}</td>
                    <td style={{ padding: '0.25rem 0.375rem', textAlign: 'center' }}>
                      <span style={{ color: STATE_COLORS[j.state], fontWeight: '700' }}>{j.state}</span>
                    </td>
                    <td style={{ padding: '0.25rem 0.375rem', color: '#94a3b8' }}>{j.assigned_node || '—'}</td>
                    <td style={{ padding: '0.25rem 0.375rem' }}>
                      {(j.state === 'PD' || j.state === 'R') && (
                        <button onClick={() => cancelJob(j.id)} style={{ fontSize: '0.625rem', padding: '0.1rem 0.3rem', borderRadius: '3px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer' }}>scancel</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Log */}
      <div style={{ borderTop: '1px solid #334155', padding: '0.5rem 0.75rem', maxHeight: '100px', overflow: 'auto', background: '#0d1117', fontFamily: 'monospace', fontSize: '0.6875rem', lineHeight: '1.5', color: '#94a3b8' }}>
        {log.map((l, i) => (
          <div key={i} style={{ color: l.includes('COMPLETED') ? '#10b981' : l.includes('RUNNING') ? '#06b6d4' : l.includes('CANCELLED') ? '#ef4444' : l.includes('SUBMITTED') ? '#f59e0b' : '#64748b' }}>{l}</div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}
