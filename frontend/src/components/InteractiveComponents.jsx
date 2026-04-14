/**
 * InteractiveComponents — Registry that maps component names to React components.
 * Lesson markdown can embed interactive components using:
 *   :::interactive{component="SlurmSimulator"}
 *   :::interactive{component="MPIVisualizer"}
 *   :::interactive{component="GuidedLab" config="...JSON..."}
 *
 * The LessonViewer uses this registry to render components inline.
 */

import React, { Suspense, lazy, useState } from 'react';

// Lazy load all interactive components for code splitting
const SlurmSimulator = lazy(() => import('./SlurmSimulator'));
const MPIVisualizer = lazy(() => import('./MPIVisualizer'));
const GuidedLab = lazy(() => import('./GuidedLab'));
const GPUMemoryVisualizer = lazy(() => import('./GPUMemoryVisualizer'));
const StorageStripingSimulator = lazy(() => import('./StorageStripingSimulator'));
const DockerLayerVisualizer = lazy(() => import('./DockerLayerVisualizer'));
const NetworkTopologyViewer = lazy(() => import('./NetworkTopologyViewer'));
const ProcessSchedulerViz = lazy(() => import('./ProcessSchedulerViz'));
const TerminalSimulator = lazy(() => import('./TerminalSimulator'));
const CUDAVisualizer = lazy(() => import('./CUDAVisualizer'));
const K8sVisualizer = lazy(() => import('./K8sVisualizer'));
const PipelineBuilder = lazy(() => import('./PipelineBuilder'));
const GitVisualizer = lazy(() => import('./GitVisualizer'));

const COMPONENT_REGISTRY = {
  SlurmSimulator,
  MPIVisualizer,
  GuidedLab,
  GPUMemoryVisualizer,
  StorageStripingSimulator,
  DockerLayerVisualizer,
  NetworkTopologyViewer,
  ProcessSchedulerViz,
  TerminalSimulator,
  CUDAVisualizer,
  K8sVisualizer,
  PipelineBuilder,
  GitVisualizer,
};

function LoadingFallback() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}>
      <div className="loading-spinner" style={{ margin: '0 auto 0.75rem' }} />
      <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Loading interactive component...</div>
    </div>
  );
}

/**
 * Render an interactive component by name with optional config.
 */
export function InteractiveComponent({ name, config = {}, compact = false }) {
  const Component = COMPONENT_REGISTRY[name];
  if (!Component) {
    return (
      <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', fontSize: '0.8125rem', color: '#fca5a5' }}>
        Unknown interactive component: <code>{name}</code>
      </div>
    );
  }

  // Resolve GuidedLab presets: look up preset name in GUIDED_LAB_PRESETS
  let resolvedConfig = config;
  if (name === 'GuidedLab' && config.preset && GUIDED_LAB_PRESETS[config.preset]) {
    const { preset: _discard, ...rest } = config;
    resolvedConfig = { ...GUIDED_LAB_PRESETS[config.preset], ...rest };
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <div style={{ margin: '1.5rem 0' }}>
        <Component compact={compact} {...resolvedConfig} />
      </div>
    </Suspense>
  );
}

/**
 * Parse markdown content and extract interactive component directives.
 * Returns an array of { type: 'markdown' | 'interactive', content | component, config }
 */
export function parseInteractiveContent(markdown) {
  if (!markdown) return [{ type: 'markdown', content: '' }];

  const parts = [];
  const regex = /:::interactive\{([^}]+)\}/g;
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(markdown)) !== null) {
    // Add markdown before this component
    if (match.index > lastIdx) {
      parts.push({ type: 'markdown', content: markdown.slice(lastIdx, match.index) });
    }

    // Parse component attributes
    const attrs = match[1];
    const nameMatch = attrs.match(/component="([^"]+)"/);
    const configMatch = attrs.match(/config='([^']+)'/);

    let config = {};
    if (configMatch) {
      try { config = JSON.parse(configMatch[1]); } catch {}
    }

    parts.push({
      type: 'interactive',
      component: nameMatch ? nameMatch[1] : 'Unknown',
      config,
    });

    lastIdx = regex.lastIndex;
  }

  // Add remaining markdown
  if (lastIdx < markdown.length) {
    parts.push({ type: 'markdown', content: markdown.slice(lastIdx) });
  }

  return parts.length > 0 ? parts : [{ type: 'markdown', content: markdown }];
}

/**
 * Pre-built guided lab configurations for common topics.
 * These can be referenced from curriculum YAML as:
 *   :::interactive{component="GuidedLab" config='{"preset":"linux-files"}'}
 */
export const GUIDED_LAB_PRESETS = {
  'linux-files': {
    title: 'Hands-On: Linux File System Navigation',
    steps: [
      { title: 'Check your location', instruction: 'Use `pwd` to print your current working directory.', command: 'pwd', language: 'bash', validation: 'any_output', explanation: '`pwd` (print working directory) shows the absolute path of where you are in the filesystem. On HPC systems, you typically start in /home/username.', demo_output: '$ pwd\n/home/learner', hint: 'Just type pwd and press Run.' },
      { title: 'List files with details', instruction: 'List all files including hidden ones with their permissions, sizes, and timestamps.', command: 'ls -la', language: 'bash', validation: 'any_output', explanation: '`ls -la` shows: permissions (rwxr-xr-x), owner, group, size, modification time, and name. The `.` and `..` entries are the current and parent directories. Hidden files start with a dot.', demo_output: '$ ls -la\ntotal 28\ndrwxr-xr-x 4 learner learner 4096 Apr 12 10:00 .\ndrwxr-xr-x 3 root    root    4096 Apr 12 09:00 ..\n-rw-r--r-- 1 learner learner  220 Apr 12 09:00 .bash_logout\n-rw-r--r-- 1 learner learner 3526 Apr 12 09:00 .bashrc', hint: 'The -l flag gives long format, -a shows hidden files (dotfiles).' },
      { title: 'Create a directory structure', instruction: 'Create a nested directory structure for an HPC project: `mkdir -p project/{src,data,results,logs}`', command: 'mkdir -p /tmp/hpc_lab/project/{src,data,results,logs} && ls -la /tmp/hpc_lab/project/', language: 'bash', validation: 'any_output', explanation: '`mkdir -p` creates parent directories as needed. Brace expansion `{a,b,c}` creates multiple items at once. This is a common pattern for organizing HPC project directories.', demo_output: '$ mkdir -p project/{src,data,results,logs} && ls -la project/\ntotal 24\ndrwxr-xr-x 6 learner learner 4096 Apr 12 10:01 .\ndrwxr-xr-x 3 learner learner 4096 Apr 12 10:01 ..\ndrwxr-xr-x 2 learner learner 4096 Apr 12 10:01 data\ndrwxr-xr-x 2 learner learner 4096 Apr 12 10:01 logs\ndrwxr-xr-x 2 learner learner 4096 Apr 12 10:01 results\ndrwxr-xr-x 2 learner learner 4096 Apr 12 10:01 src', hint: 'The -p flag prevents errors if parent dirs already exist, and creates them if needed.' },
      { title: 'Create and inspect a file', instruction: 'Create a Python script and check its size and permissions.', command: "echo '#!/usr/bin/env python3\nimport os\nprint(f\"Running on: {os.uname().nodename}\")\nprint(f\"CPUs available: {os.cpu_count()}\")' > /tmp/hpc_lab/project/src/check_node.py && ls -la /tmp/hpc_lab/project/src/check_node.py && cat /tmp/hpc_lab/project/src/check_node.py", language: 'bash', validation: 'any_output', explanation: 'We used echo with output redirection (>) to create a file. `cat` displays file contents. In real HPC, you would use a text editor (vim, nano) or transfer files with scp/rsync.', demo_output: "-rw-r--r-- 1 learner learner 108 Apr 12 10:02 /tmp/hpc_lab/project/src/check_node.py\n#!/usr/bin/env python3\nimport os\nprint(f\"Running on: {os.uname().nodename}\")\nprint(f\"CPUs available: {os.cpu_count()}\")", hint: 'The > operator redirects output to a file, overwriting it. Use >> to append.' },
      { title: 'Make it executable and run it', instruction: 'Set execute permission and run your script.', command: 'chmod +x /tmp/hpc_lab/project/src/check_node.py && python3 /tmp/hpc_lab/project/src/check_node.py', language: 'bash', validation: 'any_output', explanation: '`chmod +x` adds execute permission. On HPC clusters, you need execute permission to run scripts via the job scheduler. The output shows your node name and CPU count — on a real cluster, this would show the compute node assigned by SLURM.', demo_output: '$ chmod +x check_node.py && python3 check_node.py\nRunning on: compute-001\nCPUs available: 64', hint: 'chmod +x adds execute permission for everyone. chmod 755 is equivalent for scripts you share.' },
    ],
  },

  'slurm-basics': {
    title: 'Hands-On: SLURM Job Submission',
    steps: [
      { title: 'Write a SLURM batch script', instruction: 'Create a SLURM batch script that requests 2 CPUs, 4GB RAM, and runs for 5 minutes on the default partition.', command: "cat << 'SLURM_SCRIPT'\n#!/bin/bash\n#SBATCH --job-name=my_first_job\n#SBATCH --ntasks=1\n#SBATCH --cpus-per-task=2\n#SBATCH --mem=4G\n#SBATCH --time=00:05:00\n#SBATCH --output=job_%j.out\n#SBATCH --error=job_%j.err\n\necho \"Job started at $(date)\"\necho \"Running on node: $(hostname)\"\necho \"Working directory: $(pwd)\"\necho \"CPUs allocated: $SLURM_CPUS_PER_TASK\"\necho \"Memory allocated: $SLURM_MEM_PER_NODE MB\"\n\n# Your computation goes here\npython3 -c \"import time; [print(f'Step {i+1}/5') or time.sleep(1) for i in range(5)]\"\n\necho \"Job completed at $(date)\"\nSLURM_SCRIPT", language: 'bash', validation: 'any_output', explanation: 'Every SLURM script starts with #!/bin/bash and #SBATCH directives. %j in filenames expands to the job ID. SLURM sets environment variables like $SLURM_CPUS_PER_TASK that your code can read.', demo_output: '#!/bin/bash\n#SBATCH --job-name=my_first_job\n#SBATCH --ntasks=1\n#SBATCH --cpus-per-task=2\n#SBATCH --mem=4G\n#SBATCH --time=00:05:00\n#SBATCH --output=job_%j.out\n#SBATCH --error=job_%j.err\n\necho "Job started at $(date)"\n...', hint: '#SBATCH lines must come before any executable commands in the script.' },
      { title: 'Understand resource requests', instruction: 'Calculate the resources for this job. Run this to see the math.', command: "python3 -c \"\nntasks = 1\ncpus_per_task = 2\nmem_gb = 4\ntime_min = 5\n\nprint('=== Resource Request Analysis ===')\nprint(f'Total CPU cores: {ntasks * cpus_per_task}')\nprint(f'Memory per node: {mem_gb} GB')\nprint(f'Wall time limit: {time_min} minutes')\nprint(f'CPU-hours requested: {ntasks * cpus_per_task * time_min / 60:.3f}')\nprint()\nprint('Billing estimate (at $0.05/CPU-hour):')\nprint(f'  Cost = {ntasks * cpus_per_task * time_min / 60 * 0.05:.4f} USD')\nprint()\nprint('Key insight: Request ONLY what you need!')\nprint('Over-requesting wastes allocation and increases queue wait time.')\n\"", language: 'bash', validation: 'any_output', explanation: 'On real HPC systems, your allocation is billed in CPU-hours or GPU-hours. Over-requesting resources means your job waits longer in the queue AND wastes your allocation budget.', demo_output: '=== Resource Request Analysis ===\nTotal CPU cores: 2\nMemory per node: 4 GB\nWall time limit: 5 minutes\nCPU-hours requested: 0.167\n\nBilling estimate (at $0.05/CPU-hour):\n  Cost = 0.0083 USD\n\nKey insight: Request ONLY what you need!', hint: 'CPU-hours = num_cpus × wall_time_hours. This is how HPC centers track usage.' },
      { title: 'Parse squeue output', instruction: 'Write Python to parse SLURM queue output and identify job states.', command: "python3 << 'EOF'\nimport re\n\n# Simulated squeue output (what you see on a real cluster)\nsqueue_output = \"\"\"JOBID  PARTITION  NAME      USER    ST  TIME  NODES  NODELIST\n10001  gpu        train_v2  alice   R   2:30  1      gpu-001\n10002  gpu        inference bob     PD  0:00  1      (Priority)\n10003  cpu        preproc   alice   R   0:45  4      node[001-004]\n10004  highmem    analysis  carol   PD  0:00  2      (Resources)\n10005  gpu        train_v3  alice   R   5:12  2      gpu[002-003]\n\"\"\"\n\nprint('=== Job Queue Analysis ===')\nlines = squeue_output.strip().split('\\n')[1:]  # Skip header\nrunning = [l for l in lines if '  R  ' in l or '  R ' in l]\npending = [l for l in lines if '  PD ' in l or '  PD  ' in l]\n\nprint(f'Running jobs: {len(running)}')\nprint(f'Pending jobs: {len(pending)}')\nprint()\n\nfor line in pending:\n    reason = ''\n    if '(Priority)' in line: reason = 'Waiting - higher priority jobs ahead'\n    elif '(Resources)' in line: reason = 'Waiting - not enough free resources'\n    parts = line.split()\n    print(f'  Job {parts[0]} ({parts[2]}): {reason}')\n\nprint()\nprint('Common pending reasons on real clusters:')\nprint('  (Priority)  - Fair-share scheduler, other users have priority')\nprint('  (Resources) - Cluster is full, waiting for nodes to free up')\nprint('  (QOSMaxJobsPerUserLimit) - You hit your concurrent job limit')\nprint('  (ReqNodeNotAvail) - Requested nodes are down for maintenance')\nEOF", language: 'bash', validation: 'any_output', explanation: 'Understanding squeue output is essential for HPC. The ST column shows state: R=Running, PD=Pending, CG=Completing, CD=Completed. Pending reasons tell you WHY your job is waiting.', demo_output: '=== Job Queue Analysis ===\nRunning jobs: 3\nPending jobs: 2\n\n  Job 10002 (inference): Waiting - higher priority jobs ahead\n  Job 10004 (analysis): Waiting - not enough free resources', hint: 'squeue -u $USER shows only your jobs. squeue -j JOBID shows details for one job.' },
    ],
  },

  'python-hpc': {
    title: 'Hands-On: Python for HPC Infrastructure',
    steps: [
      { title: 'System resource detection', instruction: 'Write Python that detects available compute resources — the first thing any HPC script should do.', command: "python3 << 'EOF'\nimport os, platform, multiprocessing\n\nprint('=== System Resource Detection ===')\nprint(f'Hostname:     {platform.node()}')\nprint(f'OS:           {platform.system()} {platform.release()}')\nprint(f'Architecture: {platform.machine()}')\nprint(f'CPU cores:    {multiprocessing.cpu_count()}')\nprint(f'Python:       {platform.python_version()}')\n\n# Memory detection\ntry:\n    with open('/proc/meminfo') as f:\n        for line in f:\n            if line.startswith('MemTotal'):\n                mem_kb = int(line.split()[1])\n                print(f'Total RAM:    {mem_kb / 1024 / 1024:.1f} GB')\n            if line.startswith('MemAvailable'):\n                mem_kb = int(line.split()[1])\n                print(f'Available:    {mem_kb / 1024 / 1024:.1f} GB')\nexcept FileNotFoundError:\n    print('(Memory info not available on this OS)')\n\n# GPU detection\ntry:\n    import subprocess\n    result = subprocess.run(['nvidia-smi', '--query-gpu=name,memory.total', '--format=csv,noheader'], capture_output=True, text=True, timeout=5)\n    if result.returncode == 0:\n        for i, line in enumerate(result.stdout.strip().split('\\n')):\n            print(f'GPU {i}:        {line.strip()}')\n    else:\n        print('GPUs:         None detected (nvidia-smi not available)')\nexcept (FileNotFoundError, subprocess.TimeoutExpired):\n    print('GPUs:         None detected')\n\nprint()\nprint('On a real HPC node, you would also check:')\nprint('  - SLURM environment: $SLURM_JOB_ID, $SLURM_NODELIST')\nprint('  - InfiniBand: ibstat, ibv_devinfo')\nprint('  - Lustre: lfs df, lfs getstripe')\nEOF", language: 'bash', validation: 'any_output', explanation: 'Production HPC code should always detect and log available resources at startup. This helps with debugging (\"did I get the GPUs I requested?\") and auto-configuring parallelism.', demo_output: '=== System Resource Detection ===\nHostname:     compute-001\nOS:           Linux 5.14.0-570.el9.x86_64\nArchitecture: x86_64\nCPU cores:    64\nPython:       3.11.7\nTotal RAM:    251.5 GB\nAvailable:    248.2 GB\nGPUs:         None detected', hint: 'multiprocessing.cpu_count() returns the total cores visible to your process.' },
      { title: 'Parallel processing with multiprocessing', instruction: 'Use Python multiprocessing to parallelize a computation across all available cores.', command: "python3 << 'EOF'\nimport multiprocessing as mp\nimport time\nimport math\n\ndef cpu_intensive_task(args):\n    \"\"\"Simulate a compute-heavy task (computing pi digits using Leibniz formula).\"\"\"\n    chunk_id, n_terms = args\n    total = 0.0\n    for i in range(chunk_id * n_terms, (chunk_id + 1) * n_terms):\n        total += ((-1) ** i) / (2 * i + 1)\n    return total\n\ndef benchmark(num_workers, total_terms=2_000_000):\n    terms_per_worker = total_terms // num_workers\n    args = [(i, terms_per_worker) for i in range(num_workers)]\n\n    start = time.time()\n    with mp.Pool(num_workers) as pool:\n        results = pool.map(cpu_intensive_task, args)\n    elapsed = time.time() - start\n\n    pi_estimate = 4 * sum(results)\n    return elapsed, pi_estimate\n\nprint('=== Parallel Scaling Benchmark ===')\nprint(f'Computing pi using Leibniz series (2M terms)')\nprint(f'Available cores: {mp.cpu_count()}')\nprint()\nprint(f'{\"Workers\":<10} {\"Time (s)\":<12} {\"Speedup\":<10} {\"Efficiency\":<12} {\"Pi estimate\"}')\nprint('-' * 65)\n\nbaseline = None\nfor workers in [1, 2, 4, min(8, mp.cpu_count())]:\n    elapsed, pi_est = benchmark(workers)\n    if baseline is None:\n        baseline = elapsed\n    speedup = baseline / elapsed\n    efficiency = speedup / workers * 100\n    print(f'{workers:<10} {elapsed:<12.4f} {speedup:<10.2f} {efficiency:<12.1f}% {pi_est:.10f}')\n\nprint(f'\\nActual pi:  {math.pi:.10f}')\nprint()\nprint('Key insight: Efficiency drops as you add more workers due to:')\nprint('  - Process creation overhead')\nprint('  - Data serialization (pickle) between processes')\nprint('  - Amdahl\\'s Law: serial portions limit parallel speedup')\nEOF", language: 'bash', validation: 'any_output', explanation: 'This demonstrates Amdahl\\'s Law in practice. Note how speedup is less than linear — efficiency drops because each worker has overhead. On real HPC, you use MPI across nodes and multiprocessing/OpenMP within nodes.', demo_output: '=== Parallel Scaling Benchmark ===\nComputing pi using Leibniz series (2M terms)\nAvailable cores: 8\n\nWorkers    Time (s)     Speedup    Efficiency   Pi estimate\n-----------------------------------------------------------------\n1          0.4521       1.00       100.0%       3.1415921536\n2          0.2384       1.90       94.8%        3.1415921536\n4          0.1342       3.37       84.2%        3.1415921536\n8          0.0891       5.07       63.4%        3.1415921536', hint: 'Pool.map distributes work across processes. Each process has its own memory space (unlike threads).' },
    ],
  },

  'mpi-intro': {
    title: 'Hands-On: MPI Programming Basics',
    steps: [
      { title: 'Simulate MPI rank communication', instruction: 'Since we can\\'t run real MPI here, we\\'ll simulate the key concepts using Python multiprocessing with the same communication patterns.', command: "python3 << 'EOF'\nimport multiprocessing as mp\nimport time\nimport json\n\ndef mpi_rank(rank, size, comm_queues, results_queue):\n    \"\"\"Simulate an MPI rank with point-to-point communication.\"\"\"\n    # Phase 1: Each rank computes local data\n    local_data = [rank * 10 + i for i in range(3)]\n    results_queue.put(f'Rank {rank}/{size}: Local data = {local_data}')\n\n    # Phase 2: Ring communication (each rank sends to next)\n    next_rank = (rank + 1) % size\n    prev_rank = (rank - 1) % size\n\n    # Send to next rank\n    comm_queues[next_rank].put({'from': rank, 'data': sum(local_data)})\n    results_queue.put(f'Rank {rank}: Sent partial_sum={sum(local_data)} to Rank {next_rank}')\n\n    # Receive from previous rank\n    msg = comm_queues[rank].get(timeout=5)\n    results_queue.put(f'Rank {rank}: Received partial_sum={msg[\"data\"]} from Rank {msg[\"from\"]}')\n\n    # Phase 3: Compute global result\n    global_sum = sum(local_data) + msg['data']\n    results_queue.put(f'Rank {rank}: Global partial = {global_sum}')\n\nif __name__ == '__main__':\n    SIZE = 4  # Number of MPI ranks\n    print(f'=== Simulated MPI Program (world_size={SIZE}) ===')\n    print(f'Pattern: Ring communication (like MPI_Allreduce ring algorithm)')\n    print()\n\n    # Create communication channels (simulating MPI message passing)\n    comm_queues = {i: mp.Queue() for i in range(SIZE)}\n    results_queue = mp.Queue()\n\n    # Launch ranks\n    processes = []\n    for rank in range(SIZE):\n        p = mp.Process(target=mpi_rank, args=(rank, SIZE, comm_queues, results_queue))\n        processes.append(p)\n        p.start()\n\n    # Collect and print results in order\n    for p in processes:\n        p.join(timeout=10)\n\n    messages = []\n    while not results_queue.empty():\n        messages.append(results_queue.get_nowait())\n\n    for msg in sorted(messages):\n        print(f'  {msg}')\n\n    print()\n    print('This simulates what happens with real MPI:')\n    print('  mpirun -np 4 python3 my_mpi_program.py')\n    print()\n    print('Key MPI concepts demonstrated:')\n    print('  - Each rank runs independently with its own memory')\n    print('  - Communication is explicit (Send/Recv, not shared memory)')\n    print('  - Ring pattern is used by NCCL for AllReduce in distributed training')\nEOF", language: 'bash', validation: 'any_output', explanation: 'MPI (Message Passing Interface) is the foundation of distributed HPC. Each \"rank\" is a separate process, potentially on a different node. Communication is explicit — you must Send and Recv data. This is fundamentally different from shared-memory threading.', demo_output: '=== Simulated MPI Program (world_size=4) ===\nPattern: Ring communication (like MPI_Allreduce ring algorithm)\n\n  Rank 0/4: Local data = [0, 1, 2]\n  Rank 0: Sent partial_sum=3 to Rank 1\n  Rank 0: Received partial_sum=27 from Rank 3\n  ...', hint: 'In real MPI, you would use mpi4py: from mpi4py import MPI; comm = MPI.COMM_WORLD; rank = comm.Get_rank()' },
    ],
  },
};

export default InteractiveComponent;
