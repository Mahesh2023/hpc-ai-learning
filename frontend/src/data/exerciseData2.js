/**
 * Expert-level exercises for Lessons 14-25 (Modules 4-6)
 * Each lesson has: 1 quiz, 1 lab (with steps), 1 coding challenge
 * Keyed by lesson ID
 */
export const LESSON_EXERCISES_2 = {

  // ═══════════════════════════════════════════════════════════
  // LESSON 14: ML Frameworks on HPC
  // ═══════════════════════════════════════════════════════════
  14: [
    { id: 1401, type: 'quiz', title: 'PyTorch vs TensorFlow on HPC', points: 15,
      description: 'Compare ML frameworks for HPC cluster deployment.',
      question: 'When running PyTorch distributed training on a SLURM cluster, what is the recommended process launcher and why?',
      options: [
        'python -m torch.distributed.launch — deprecated but still works',
        'torchrun — handles fault tolerance, elastic scaling, and integrates with SLURM environment variables automatically',
        'mpirun — standard MPI launcher, but requires manual rank assignment for PyTorch',
        'horovodrun — only works with Horovod, not native PyTorch DDP',
      ],
      correct_answer: 1,
      hints: ['torchrun (torch.distributed.run) automatically reads SLURM_PROCID, SLURM_NTASKS, etc.', 'It supports elastic training — automatically adjusts world size if nodes fail.'],
    },
    { id: 1402, type: 'lab', title: 'PyTorch DDP Setup', points: 40,
      description: 'Configure PyTorch Distributed Data Parallel for multi-GPU training.',
      steps: [
        { title: 'DDP initialization code',
          instruction: 'Write the standard PyTorch DDP initialization that works with both SLURM and torchrun. Handle environment variables for rank, world size, and master address.',
          command: `cat << 'PYTHON'
import os
import torch
import torch.distributed as dist

def setup_distributed():
    """Initialize PyTorch DDP from environment variables.
    Works with both torchrun and SLURM srun.
    """
    # torchrun sets these; SLURM needs explicit mapping
    if "RANK" not in os.environ and "SLURM_PROCID" in os.environ:
        os.environ["RANK"] = os.environ["SLURM_PROCID"]
        os.environ["WORLD_SIZE"] = os.environ["SLURM_NTASKS"]
        os.environ["LOCAL_RANK"] = os.environ["SLURM_LOCALID"]
        os.environ["MASTER_ADDR"] = os.environ.get(
            "MASTER_ADDR",
            os.popen("scontrol show hostname $SLURM_NODELIST | head -1").read().strip()
        )
        os.environ["MASTER_PORT"] = os.environ.get("MASTER_PORT", "29500")

    rank = int(os.environ["RANK"])
    world_size = int(os.environ["WORLD_SIZE"])
    local_rank = int(os.environ["LOCAL_RANK"])

    torch.cuda.set_device(local_rank)
    dist.init_process_group(backend="nccl", rank=rank, world_size=world_size)
    
    print(f"Rank {rank}/{world_size} initialized on GPU {local_rank}")
    return rank, world_size, local_rank

# Usage:
# rank, world_size, local_rank = setup_distributed()
# model = DDP(model.to(local_rank), device_ids=[local_rank])
PYTHON
echo "--- DDP init code ready ---"`,
          language: 'bash', validation: 'any_output', expected_output: 'DDP init code ready',
          demo_output: '$ cat ...\nimport os\nimport torch\n...\n--- DDP init code ready ---',
          hint: 'SLURM sets SLURM_PROCID (global rank), SLURM_LOCALID (local rank on node), SLURM_NTASKS (world size).',
          explanation: 'The key challenge is bridging SLURM and PyTorch environment variables. MASTER_ADDR must be the first node in SLURM_NODELIST. Port 29500 is conventional for PyTorch rendezvous.',
        },
        { title: 'Data parallelism with DistributedSampler',
          instruction: 'Show how to properly shard data across ranks using DistributedSampler so each GPU sees a unique subset.',
          command: `cat << 'PYTHON'
from torch.utils.data import DataLoader, DistributedSampler

def create_distributed_dataloader(dataset, batch_size, rank, world_size, num_workers=4):
    """Create a DataLoader that shards data across DDP ranks.
    
    Key points:
    - DistributedSampler splits dataset indices across ranks
    - set_epoch() must be called each epoch for proper shuffling
    - drop_last=True ensures equal batch counts across ranks
    """
    sampler = DistributedSampler(
        dataset,
        num_replicas=world_size,
        rank=rank,
        shuffle=True,
        drop_last=True,  # Critical: uneven batches cause DDP hangs
    )
    
    loader = DataLoader(
        dataset,
        batch_size=batch_size,
        sampler=sampler,
        num_workers=num_workers,
        pin_memory=True,  # Faster GPU transfer
        persistent_workers=True,  # Reuse workers between epochs
    )
    
    return loader, sampler

# Training loop:
# for epoch in range(epochs):
#     sampler.set_epoch(epoch)  # MUST call for proper shuffling
#     for batch in loader:
#         ...
PYTHON
echo "--- Distributed DataLoader ready ---"`,
          language: 'bash', validation: 'any_output', expected_output: 'Distributed DataLoader ready',
          demo_output: '$ cat ...\n...\n--- Distributed DataLoader ready ---',
          hint: 'Without set_epoch(), every rank sees the SAME data order every epoch, defeating the purpose of distributed training.',
          explanation: 'drop_last=True is critical: if rank 0 has 101 batches but rank 1 has 100, rank 0 hangs waiting for rank 1 in the gradient sync of batch 101. This is the #1 DDP debugging issue.',
        },
      ],
    },
    { id: 1403, type: 'coding', title: 'Training Throughput Calculator', points: 25,
      description: 'Calculate and optimize distributed training throughput metrics.',
      starter_code: `def calculate_throughput(config):
    """Calculate distributed training throughput.
    
    config: {
        "batch_size_per_gpu": int,
        "num_gpus": int,
        "samples_per_second_per_gpu": float,
        "gradient_sync_ms": float,  # AllReduce time
        "data_load_ms": float,      # Per-step data loading time
        "forward_ms": float,        # Forward pass time
        "backward_ms": float,       # Backward pass time
    }
    
    Returns: {
        "global_batch_size": int,
        "effective_throughput": float,  # samples/sec
        "gpu_utilization": float,       # percent (compute / total)
        "communication_overhead": float, # percent
        "scaling_efficiency": float,    # vs single GPU
        "time_to_epoch": float,         # seconds for 1M samples
    }
    """
    # TODO: Implement throughput analysis
    pass

if __name__ == "__main__":
    config = {
        "batch_size_per_gpu": 32,
        "num_gpus": 8,
        "samples_per_second_per_gpu": 150.0,
        "gradient_sync_ms": 12.0,
        "data_load_ms": 5.0,
        "forward_ms": 45.0,
        "backward_ms": 85.0,
    }
    result = calculate_throughput(config)
    for k, v in result.items():
        print(f"  {k}: {v}")`,
      test_cases: [
        { label: 'Shows global batch size', input: '', expected_output: 'global_batch_size', hidden: false },
        { label: 'Shows scaling efficiency', input: '', expected_output: 'scaling_efficiency', hidden: false },
      ],
      hints: [
        'Step time = max(data_load, forward + backward + gradient_sync) — data loading overlaps compute.',
        'Single GPU step time = forward + backward (no sync). Scaling efficiency = (single_gpu_time / multi_gpu_step_time).',
      ],
      solution: `def calculate_throughput(c):
    step_compute = c["forward_ms"] + c["backward_ms"]
    step_total = step_compute + c["gradient_sync_ms"]
    if c["data_load_ms"] > step_total:
        step_total = c["data_load_ms"]
    single_gpu_step = step_compute
    global_bs = c["batch_size_per_gpu"] * c["num_gpus"]
    throughput = global_bs / (step_total / 1000)
    return {
        "global_batch_size": global_bs,
        "effective_throughput": f"{throughput:.0f} samples/sec",
        "gpu_utilization": f"{step_compute/step_total*100:.1f}%",
        "communication_overhead": f"{c['gradient_sync_ms']/step_total*100:.1f}%",
        "scaling_efficiency": f"{single_gpu_step/step_total*100:.1f}%",
        "time_to_epoch": f"{1000000/throughput:.0f}s ({1000000/throughput/60:.1f} min) for 1M samples",
    }

if __name__ == "__main__":
    c = {"batch_size_per_gpu": 32, "num_gpus": 8, "samples_per_second_per_gpu": 150.0,
         "gradient_sync_ms": 12.0, "data_load_ms": 5.0, "forward_ms": 45.0, "backward_ms": 85.0}
    for k, v in calculate_throughput(c).items():
        print(f"  {k}: {v}")`,
    },
  ],

  // ═══════════════════════════════════════════════════════════
  // LESSON 15: Distributed Training
  // ═══════════════════════════════════════════════════════════
  15: [
    { id: 1501, type: 'quiz', title: 'Data vs Model Parallelism', points: 15,
      description: 'Choose the right parallelism strategy for large model training.',
      question: 'When training a 175B parameter model (350GB in fp16) that cannot fit on a single 80GB A100, which parallelism strategy is required?',
      options: [
        'Data Parallelism (DDP) — replicate model on each GPU',
        'Pipeline Parallelism — split model layers across GPUs with micro-batching to fill the pipeline bubble',
        'Only data parallelism with gradient checkpointing to reduce memory',
        'Use CPU offloading only — no GPU needed for large models',
      ],
      correct_answer: 1,
      hints: ['350GB > 80GB, so the model physically cannot fit on one GPU even with gradient checkpointing.', 'Pipeline parallelism splits layers: GPU0 has layers 1-40, GPU1 has 41-80, etc. Micro-batches reduce the pipeline bubble.'],
    },
    { id: 1502, type: 'lab', title: 'DeepSpeed ZeRO Configuration', points: 40,
      description: 'Configure DeepSpeed ZeRO stages for memory-efficient large model training.',
      steps: [
        { title: 'ZeRO Stage comparison',
          instruction: 'Calculate memory requirements for each ZeRO stage to understand the memory savings progression.',
          command: `cat << 'PYTHON'
def zero_memory_analysis(params_billions, num_gpus, precision="fp16"):
    """Calculate memory per GPU for each ZeRO stage.
    
    For a model with P parameters in mixed precision:
    - Parameters: 2P bytes (fp16)
    - Gradients: 2P bytes (fp16)
    - Optimizer states: 12P bytes (Adam: fp32 params + momentum + variance)
    Total per-GPU without ZeRO: 16P bytes
    """
    P = params_billions * 1e9
    param_bytes = 2 * P  # fp16
    grad_bytes = 2 * P   # fp16
    optim_bytes = 12 * P  # Adam fp32 states
    total = param_bytes + grad_bytes + optim_bytes
    
    stages = {
        "No ZeRO": total,
        "ZeRO-1 (partition optimizer)": param_bytes + grad_bytes + optim_bytes / num_gpus,
        "ZeRO-2 (+ partition gradients)": param_bytes + grad_bytes / num_gpus + optim_bytes / num_gpus,
        "ZeRO-3 (+ partition parameters)": (param_bytes + grad_bytes + optim_bytes) / num_gpus,
    }
    
    print(f"Model: {params_billions}B params | {num_gpus} GPUs")
    print(f"{'Stage':<35} {'Per-GPU Memory':>15} {'Fits A100-80GB':>15}")
    print("-" * 68)
    for name, mem in stages.items():
        gb = mem / 1e9
        fits = "YES" if gb < 80 else "NO"
        print(f"{name:<35} {gb:>12.1f} GB {'   ' + fits:>15}")
    
    return stages

zero_memory_analysis(7, 8)
print()
zero_memory_analysis(70, 64)
print()
zero_memory_analysis(175, 128)
PYTHON
echo "--- ZeRO analysis ready ---"`,
          language: 'bash', validation: 'any_output', expected_output: 'ZeRO analysis ready',
          demo_output: '$ python zero.py\nModel: 7B params | 8 GPUs\nStage                          Per-GPU Memory  Fits A100-80GB\n--------------------------------------------------------------------\nNo ZeRO                            112.0 GB             NO\nZeRO-1 (partition optimizer)        26.5 GB            YES\n...',
          hint: 'ZeRO-1 saves the most memory with least communication cost. ZeRO-3 saves most memory but adds parameter gathering overhead.',
          explanation: 'For 7B models, ZeRO-1 is sufficient. For 70B+, you need ZeRO-3. The tradeoff: each stage adds more communication but reduces memory. ZeRO-3 requires all-gather before every forward pass.',
        },
        { title: 'DeepSpeed config file',
          instruction: 'Write a DeepSpeed configuration JSON for training a 7B model on 8 GPUs with ZeRO-2, gradient checkpointing, and mixed precision.',
          command: `cat << 'JSON'
{
  "train_batch_size": 256,
  "gradient_accumulation_steps": 4,
  "train_micro_batch_size_per_gpu": 8,
  
  "zero_optimization": {
    "stage": 2,
    "allgather_partitions": true,
    "reduce_scatter": true,
    "overlap_comm": true,
    "contiguous_gradients": true
  },
  
  "fp16": {
    "enabled": true,
    "loss_scale": 0,
    "loss_scale_window": 1000,
    "hysteresis": 2,
    "min_loss_scale": 1
  },
  
  "gradient_clipping": 1.0,
  
  "activation_checkpointing": {
    "partition_activations": true,
    "contiguous_memory_optimization": true,
    "cpu_checkpointing": false
  },
  
  "wall_clock_breakdown": true
}
JSON
echo "--- DeepSpeed config ready ---"
echo "Key settings:"
echo "  - ZeRO-2: partitions gradients + optimizer (sufficient for 7B)"
echo "  - overlap_comm: overlaps gradient sync with backward pass"
echo "  - Gradient accumulation: effective batch 256 with micro-batch 8"
echo "  - Activation checkpointing: recompute activations to save memory"`,
          language: 'bash', validation: 'any_output', expected_output: 'DeepSpeed config ready',
          demo_output: '$ cat ...\n{\n  "train_batch_size": 256,\n  ...\n}\n--- DeepSpeed config ready ---',
          hint: 'train_batch_size must equal micro_batch * num_gpus * gradient_accumulation. 8 * 8 * 4 = 256.',
          explanation: 'overlap_comm=true overlaps AllReduce with backward computation, hiding communication latency. This can improve throughput by 15-25% on InfiniBand clusters. contiguous_gradients=true reduces memory fragmentation.',
        },
      ],
    },
    { id: 1503, type: 'coding', title: 'Distributed Training Memory Planner', points: 25,
      description: 'Build a tool that recommends the optimal distributed training strategy based on model size and hardware.',
      starter_code: `def plan_distributed_training(model_params_B, gpu_memory_GB, num_gpus, model_type="transformer"):
    """Recommend distributed training configuration.
    
    Args:
        model_params_B: Model parameters in billions
        gpu_memory_GB: Memory per GPU in GB
        num_gpus: Total GPUs available
        model_type: "transformer" or "cnn"
    
    Returns dict with:
        - strategy: "DDP" | "ZeRO-1" | "ZeRO-2" | "ZeRO-3" | "Pipeline+ZeRO-3"
        - config: recommended settings
        - estimated_memory_per_gpu: GB
        - feasible: bool
    """
    # Memory formula (mixed precision):
    # Params: 2 * P bytes, Grads: 2 * P, Optimizer: 12 * P
    # Activations: ~2 * P * seq_len / num_layers (rough estimate)
    
    # TODO: Implement strategy selection logic
    pass

if __name__ == "__main__":
    scenarios = [
        (1.3, 24, 4, "V100-32GB cluster"),
        (7, 80, 8, "A100-80GB node"),
        (70, 80, 64, "8x A100-80GB nodes"),
        (175, 80, 512, "Large GPU cluster"),
    ]
    for params, mem, gpus, desc in scenarios:
        print(f"\\n=== {desc}: {params}B model, {gpus}x {mem}GB GPUs ===")
        plan = plan_distributed_training(params, mem, gpus)
        for k, v in plan.items():
            print(f"  {k}: {v}")`,
      test_cases: [
        { label: 'Shows strategy', input: '', expected_output: 'strategy', hidden: false },
        { label: 'Shows feasibility', input: '', expected_output: 'feasible', hidden: false },
      ],
      hints: [
        'If 16*P/1e9 < gpu_memory: use DDP (model fits on one GPU).',
        'If 16*P/1e9/num_gpus < gpu_memory: use ZeRO-3.',
        'If even ZeRO-3 is not enough: need Pipeline Parallelism + ZeRO-3 + offloading.',
      ],
      solution: `def plan_distributed_training(params_B, gpu_mem, num_gpus, model_type="transformer"):
    P = params_B * 1e9
    base = 16 * P / 1e9  # Total memory in GB
    per_gpu_ddp = base
    per_gpu_z1 = (2*P + 2*P + 12*P/num_gpus) / 1e9
    per_gpu_z2 = (2*P + (2*P + 12*P)/num_gpus) / 1e9
    per_gpu_z3 = base / num_gpus
    overhead = 0.2  # 20% overhead for activations, buffers
    
    if per_gpu_ddp * (1+overhead) < gpu_mem:
        return {"strategy": "DDP", "estimated_memory_per_gpu": f"{per_gpu_ddp*(1+overhead):.1f} GB", "config": "Standard DDP, no special config needed", "feasible": True}
    elif per_gpu_z1 * (1+overhead) < gpu_mem:
        return {"strategy": "ZeRO-1", "estimated_memory_per_gpu": f"{per_gpu_z1*(1+overhead):.1f} GB", "config": "DeepSpeed ZeRO stage 1 + gradient checkpointing", "feasible": True}
    elif per_gpu_z2 * (1+overhead) < gpu_mem:
        return {"strategy": "ZeRO-2", "estimated_memory_per_gpu": f"{per_gpu_z2*(1+overhead):.1f} GB", "config": "DeepSpeed ZeRO stage 2 + gradient checkpointing + overlap_comm", "feasible": True}
    elif per_gpu_z3 * (1+overhead) < gpu_mem:
        return {"strategy": "ZeRO-3", "estimated_memory_per_gpu": f"{per_gpu_z3*(1+overhead):.1f} GB", "config": "DeepSpeed ZeRO stage 3 + activation checkpointing + fp16", "feasible": True}
    else:
        return {"strategy": "Pipeline+ZeRO-3", "estimated_memory_per_gpu": f"{per_gpu_z3*(1+overhead):.1f} GB", "config": "Megatron-DeepSpeed: tensor+pipeline parallelism + ZeRO-3 + CPU offloading", "feasible": per_gpu_z3*(1+overhead)*0.5 < gpu_mem}

if __name__ == "__main__":
    for p, m, g, d in [(1.3,24,4,"V100"),(7,80,8,"A100"),(70,80,64,"8xA100"),(175,80,512,"Large")]:
        print(f"\\n=== {d}: {p}B, {g}x {m}GB ===")
        for k,v in plan_distributed_training(p,m,g).items(): print(f"  {k}: {v}")`,
    },
  ],

  // ═══════════════════════════════════════════════════════════
  // LESSON 16: Model Serving & Inference
  // ═══════════════════════════════════════════════════════════
  16: [
    { id: 1601, type: 'quiz', title: 'Inference Optimization Techniques', points: 15,
      description: 'Understand model serving optimizations for production.',
      question: 'What is continuous batching in LLM inference serving and why does it outperform static batching?',
      options: [
        'Continuous batching processes each request one at a time for lowest latency',
        'Continuous batching dynamically adds/removes sequences from the batch as they complete, achieving 2-10x higher throughput than waiting for all sequences to finish',
        'Continuous batching stores all requests in a queue and processes them in large fixed-size batches',
        'Continuous batching means the model runs continuously without stopping between requests',
      ],
      correct_answer: 1,
      hints: ['Static batching: all sequences in a batch must complete before any new ones start. Short sequences waste GPU time waiting for long ones.', 'vLLM and TensorRT-LLM implement continuous batching. It is the key optimization for LLM serving.'],
    },
    { id: 1602, type: 'lab', title: 'Model Serving Architecture', points: 40,
      description: 'Design a production model serving pipeline with load balancing and autoscaling.',
      steps: [
        { title: 'Triton Inference Server config',
          instruction: 'Write a Triton Inference Server model configuration for serving a transformer model with dynamic batching.',
          command: `cat << 'CONFIG'
name: "bert-large"
platform: "onnxruntime_onnx"
max_batch_size: 64

input [
  {
    name: "input_ids"
    data_type: TYPE_INT64
    dims: [ -1 ]    # Variable sequence length
  },
  {
    name: "attention_mask"
    data_type: TYPE_INT64
    dims: [ -1 ]
  }
]

output [
  {
    name: "logits"
    data_type: TYPE_FP32
    dims: [ -1, 768 ]
  }
]

dynamic_batching {
  preferred_batch_size: [ 8, 16, 32 ]
  max_queue_delay_microseconds: 100000   # 100ms max wait
}

instance_group [
  {
    count: 2           # 2 model instances
    kind: KIND_GPU
    gpus: [ 0 ]        # Pin to GPU 0
  }
]

optimization {
  execution_accelerators {
    gpu_execution_accelerator: [
      { name: "tensorrt" }
    ]
  }
}
CONFIG
echo "--- Triton config ready ---"
echo "Dynamic batching: waits up to 100ms to form larger batches"
echo "2 instances on GPU 0: pipeline request processing while one instance is computing"`,
          language: 'bash', validation: 'any_output', expected_output: 'Triton config ready',
          demo_output: '$ cat ...\nname: "bert-large"\n...\n--- Triton config ready ---',
          hint: 'Dynamic batching dramatically improves throughput. The max_queue_delay trades latency for batch size.',
          explanation: 'Multiple instances allow overlapping data transfer and compute. preferred_batch_size guides the scheduler to wait for enough requests to form efficient batches. TensorRT acceleration adds 2-4x inference speedup.',
        },
      ],
    },
    { id: 1603, type: 'coding', title: 'Inference Load Tester', points: 25,
      description: 'Build a load testing tool for model serving endpoints.',
      starter_code: `import time
import random
import statistics

def simulate_inference_server(config):
    """Simulate an inference server handling concurrent requests.
    
    config: {
        "base_latency_ms": float,      # Single request latency
        "batch_capacity": int,          # Max batch size
        "batch_latency_factor": float,  # Batch processing adds this factor per item
        "max_queue_ms": float,          # Max queue delay for batching
        "num_instances": int,           # Model replicas
    }
    
    Returns simulated performance metrics.
    """
    # TODO: Simulate request processing with batching
    pass

def run_load_test(server_config, num_requests=1000, concurrency=50):
    """Run simulated load test and report metrics.
    
    Returns: {
        "p50_latency_ms", "p95_latency_ms", "p99_latency_ms",
        "throughput_rps", "errors": 0
    }
    """
    # TODO: Simulate concurrent requests
    latencies = []
    for i in range(num_requests):
        # Simulate varying request arrival and processing
        base = server_config["base_latency_ms"]
        jitter = random.gauss(0, base * 0.1)
        batch_wait = random.uniform(0, server_config["max_queue_ms"])
        total = max(0, base + jitter + batch_wait)
        latencies.append(total)
    
    latencies.sort()
    return {
        "p50_latency_ms": round(latencies[len(latencies)//2], 1),
        "p95_latency_ms": round(latencies[int(len(latencies)*0.95)], 1),
        "p99_latency_ms": round(latencies[int(len(latencies)*0.99)], 1),
        "throughput_rps": round(num_requests / (sum(latencies) / 1000 / concurrency), 1),
        "avg_latency_ms": round(statistics.mean(latencies), 1),
    }

if __name__ == "__main__":
    config = {
        "base_latency_ms": 25.0,
        "batch_capacity": 32,
        "batch_latency_factor": 0.5,
        "max_queue_ms": 50.0,
        "num_instances": 2,
    }
    result = run_load_test(config, num_requests=10000, concurrency=100)
    print("Load Test Results:")
    for k, v in result.items():
        print(f"  {k}: {v}")`,
      test_cases: [
        { label: 'Shows p95 latency', input: '', expected_output: 'p95_latency_ms', hidden: false },
        { label: 'Shows throughput', input: '', expected_output: 'throughput_rps', hidden: false },
      ],
      hints: ['Batch wait time is the overhead of waiting for a full batch. It trades latency for throughput.'],
      solution: `import random, statistics
random.seed(42)

def run_load_test(config, num_requests=1000, concurrency=50):
    latencies = []
    for _ in range(num_requests):
        base = config["base_latency_ms"]
        jitter = random.gauss(0, base * 0.1)
        batch_wait = random.uniform(0, config["max_queue_ms"])
        latencies.append(max(0, base + jitter + batch_wait))
    latencies.sort()
    return {"p50_latency_ms": round(latencies[len(latencies)//2], 1),
            "p95_latency_ms": round(latencies[int(len(latencies)*0.95)], 1),
            "p99_latency_ms": round(latencies[int(len(latencies)*0.99)], 1),
            "throughput_rps": round(num_requests / (sum(latencies)/1000/concurrency), 1),
            "avg_latency_ms": round(statistics.mean(latencies), 1)}

if __name__ == "__main__":
    c = {"base_latency_ms": 25.0, "batch_capacity": 32, "batch_latency_factor": 0.5, "max_queue_ms": 50.0, "num_instances": 2}
    for k, v in run_load_test(c, 10000, 100).items(): print(f"  {k}: {v}")`,
    },
  ],

  // ═══════════════════════════════════════════════════════════
  // LESSON 17: MLOps Pipelines
  // ═══════════════════════════════════════════════════════════
  17: [
    { id: 1701, type: 'quiz', title: 'MLOps Maturity Model', points: 15,
      description: 'Assess MLOps maturity and automation levels.',
      question: 'At MLOps Level 2 (CI/CD for ML), what triggers automated model retraining?',
      options: [
        'A data scientist manually clicks "retrain" in a notebook',
        'Data drift detection, scheduled intervals, or performance degradation triggers an automated pipeline that retrains, validates, and deploys',
        'The model is retrained every time the code repository is updated',
        'Models are only retrained once a year during maintenance windows',
      ],
      correct_answer: 1,
      hints: ['Level 0 = manual. Level 1 = pipeline automation. Level 2 = CI/CD with automatic triggers.', 'Data drift means the input distribution has changed, making the current model less accurate.'],
    },
    { id: 1702, type: 'lab', title: 'ML Pipeline Definition', points: 40,
      description: 'Define an end-to-end ML pipeline with data validation, training, evaluation, and deployment.',
      steps: [
        { title: 'Pipeline DAG definition',
          instruction: 'Define an ML pipeline as a directed acyclic graph (DAG) with proper dependencies and data validation gates.',
          command: `cat << 'PYTHON'
# ML Pipeline DAG Definition
PIPELINE = {
    "name": "llm-finetuning-pipeline",
    "trigger": {"schedule": "0 2 * * 1", "on_drift": True},
    "stages": [
        {
            "name": "data_validation",
            "image": "data-tools:v2.1",
            "command": "python validate.py --schema schemas/training_v3.json",
            "resources": {"cpu": "4", "memory": "16Gi"},
            "timeout": "30m",
            "on_failure": "abort",
        },
        {
            "name": "preprocessing",
            "depends_on": ["data_validation"],
            "image": "data-tools:v2.1",
            "command": "python preprocess.py --tokenizer llama --max-len 2048",
            "resources": {"cpu": "16", "memory": "64Gi"},
            "timeout": "2h",
        },
        {
            "name": "training",
            "depends_on": ["preprocessing"],
            "image": "training:v3.0-cuda12",
            "command": "torchrun --nproc_per_node=8 train.py --config configs/finetune.yaml",
            "resources": {"cpu": "64", "memory": "256Gi", "gpu": "8"},
            "timeout": "24h",
            "checkpoint_interval": "1h",
        },
        {
            "name": "evaluation",
            "depends_on": ["training"],
            "image": "eval-tools:v1.5",
            "command": "python evaluate.py --benchmarks mmlu,hellaswag,arc",
            "resources": {"cpu": "8", "memory": "32Gi", "gpu": "1"},
            "gate": {"min_accuracy": 0.85, "max_regression": 0.02},
        },
        {
            "name": "deployment",
            "depends_on": ["evaluation"],
            "image": "deploy-tools:v2.0",
            "command": "python deploy.py --strategy canary --canary-pct 10",
            "manual_approval": True,
        },
    ],
}

# Print pipeline DAG
for stage in PIPELINE["stages"]:
    deps = " <- " + ", ".join(stage.get("depends_on", [])) if stage.get("depends_on") else " (start)"
    gate = " [GATE]" if stage.get("gate") else ""
    approval = " [MANUAL]" if stage.get("manual_approval") else ""
    print(f"  {stage['name']}{deps}{gate}{approval}")
PYTHON
echo "--- Pipeline DAG ready ---"`,
          language: 'bash', validation: 'any_output', expected_output: 'Pipeline DAG ready',
          demo_output: "$ python pipeline.py\n  data_validation (start)\n  preprocessing <- data_validation\n  training <- preprocessing\n  evaluation <- training [GATE]\n  deployment <- evaluation [MANUAL]\n--- Pipeline DAG ready ---",
          hint: 'Gates are automated quality checks. Manual approval adds human-in-the-loop before production deployment.',
          explanation: 'This pipeline pattern is used at every major ML organization. Key elements: data validation prevents training on corrupted data, quality gates prevent regressions, canary deployment limits blast radius.',
        },
      ],
    },
    { id: 1703, type: 'coding', title: 'Experiment Tracker', points: 25,
      description: 'Build a lightweight experiment tracking system that logs metrics, parameters, and artifacts.',
      starter_code: `import json
import time
import hashlib

class ExperimentTracker:
    """Lightweight experiment tracker (like a mini MLflow/W&B)."""
    
    def __init__(self):
        self.experiments = {}
    
    def create_run(self, experiment_name, params):
        """Create a new run with given parameters.
        Returns run_id.
        """
        run_id = hashlib.md5(f"{experiment_name}{time.time()}".encode()).hexdigest()[:8]
        # TODO: Store run with params, empty metrics, start time
        return run_id
    
    def log_metric(self, run_id, name, value, step=None):
        """Log a metric value (optionally at a given step)."""
        # TODO: Append metric to run's history
        pass
    
    def get_best_run(self, experiment_name, metric, mode="max"):
        """Find the run with the best value for a given metric."""
        # TODO: Search through runs and find best
        pass
    
    def summary(self, experiment_name):
        """Print summary of all runs in an experiment."""
        # TODO: Print formatted summary
        pass

if __name__ == "__main__":
    tracker = ExperimentTracker()
    
    # Simulate 5 training runs
    for lr in [1e-5, 5e-5, 1e-4, 5e-4, 1e-3]:
        run_id = tracker.create_run("bert-finetune", {"lr": lr, "epochs": 3, "batch_size": 32})
        # Simulate training
        import random
        random.seed(int(lr * 1e6))
        for step in range(3):
            acc = min(0.95, 0.5 + lr * 1000 * (step + 1) + random.uniform(-0.05, 0.05))
            loss = max(0.1, 2.0 - lr * 5000 * (step + 1) + random.uniform(-0.1, 0.1))
            tracker.log_metric(run_id, "accuracy", round(acc, 4), step)
            tracker.log_metric(run_id, "loss", round(loss, 4), step)
    
    tracker.summary("bert-finetune")
    best = tracker.get_best_run("bert-finetune", "accuracy")
    print(f"\\nBest run: {best}")`,
      test_cases: [
        { label: 'Tracks metrics', input: '', expected_output: 'accuracy', hidden: false },
        { label: 'Finds best run', input: '', expected_output: 'Best run:', hidden: false },
      ],
      hints: ['Store metrics as list of {value, step, timestamp}. get_best_run looks at the last logged value for each run.'],
      solution: `import json, time, hashlib, random

class ExperimentTracker:
    def __init__(self):
        self.experiments = {}
    
    def create_run(self, name, params):
        rid = hashlib.md5(f"{name}{time.time()}{params}".encode()).hexdigest()[:8]
        if name not in self.experiments: self.experiments[name] = []
        self.experiments[name].append({"id": rid, "params": params, "metrics": {}, "start": time.time()})
        return rid
    
    def _find_run(self, rid):
        for runs in self.experiments.values():
            for r in runs:
                if r["id"] == rid: return r
    
    def log_metric(self, rid, name, value, step=None):
        r = self._find_run(rid)
        if name not in r["metrics"]: r["metrics"][name] = []
        r["metrics"][name].append({"value": value, "step": step})
    
    def get_best_run(self, name, metric, mode="max"):
        best = None
        for r in self.experiments.get(name, []):
            vals = r["metrics"].get(metric, [])
            if vals:
                v = vals[-1]["value"]
                if best is None or (mode == "max" and v > best[1]) or (mode == "min" and v < best[1]):
                    best = (r, v)
        return {"id": best[0]["id"], "params": best[0]["params"], metric: best[1]} if best else None
    
    def summary(self, name):
        print(f"Experiment: {name} ({len(self.experiments.get(name,[]))} runs)")
        for r in self.experiments.get(name, []):
            metrics = {k: v[-1]["value"] for k, v in r["metrics"].items()}
            print(f"  {r['id']}: params={r['params']}  metrics={metrics}")

if __name__ == "__main__":
    t = ExperimentTracker()
    for lr in [1e-5, 5e-5, 1e-4, 5e-4, 1e-3]:
        rid = t.create_run("bert-finetune", {"lr": lr, "epochs": 3})
        random.seed(int(lr*1e6))
        for s in range(3):
            t.log_metric(rid, "accuracy", round(min(.95, .5+lr*1000*(s+1)+random.uniform(-.05,.05)), 4), s)
            t.log_metric(rid, "loss", round(max(.1, 2-lr*5000*(s+1)+random.uniform(-.1,.1)), 4), s)
    t.summary("bert-finetune")
    print(f"\\nBest run: {t.get_best_run('bert-finetune', 'accuracy')}")`,
    },
  ],

  // ═══════════════════════════════════════════════════════════
  // LESSON 18: Infrastructure as Code
  // ═══════════════════════════════════════════════════════════
  18: [
    { id: 1801, type: 'quiz', title: 'Terraform vs Ansible for HPC', points: 15,
      description: 'Choose the right IaC tool for different infrastructure layers.',
      question: 'In an HPC deployment, Terraform and Ansible serve different roles. Which statement is correct?',
      options: [
        'Terraform provisions infrastructure (VMs, networks, storage), Ansible configures them (OS, packages, services) — they are complementary',
        'Terraform and Ansible do exactly the same thing — choose one',
        'Ansible provisions cloud resources, Terraform configures operating systems',
        'Neither tool can manage GPU resources or InfiniBand networks',
      ],
      correct_answer: 0,
      hints: ['Terraform = declarative infrastructure provisioning. Ansible = imperative/declarative configuration management.', 'Typical flow: Terraform creates VMs → Ansible installs SLURM, CUDA, MPI libraries.'],
    },
    { id: 1802, type: 'lab', title: 'Terraform HPC Cluster Definition', points: 40,
      description: 'Write Terraform configuration for an HPC GPU cluster on cloud.',
      steps: [
        { title: 'Define GPU compute instances',
          instruction: 'Write Terraform configuration that creates a pool of GPU compute nodes with proper networking, storage, and security groups.',
          command: `cat << 'HCL'
# HPC GPU Cluster - Terraform Configuration

variable "num_gpu_nodes" {
  default = 4
  description = "Number of GPU compute nodes"
}

resource "aws_instance" "gpu_node" {
  count         = var.num_gpu_nodes
  ami           = "ami-0abcdef1234567890"  # NVIDIA GPU-optimized AMI
  instance_type = "p4d.24xlarge"           # 8x A100 GPUs, 96 vCPUs

  subnet_id              = aws_subnet.hpc_private.id
  vpc_security_group_ids = [aws_security_group.hpc_compute.id]
  
  # EFA (Elastic Fabric Adapter) for low-latency MPI
  network_interface {
    device_index          = 1
    network_interface_id  = aws_network_interface.efa[count.index].id
  }

  root_block_device {
    volume_size = 200
    volume_type = "gp3"
  }

  # NVMe instance storage for local scratch
  ephemeral_block_device {
    device_name  = "/dev/sdb"
    virtual_name = "ephemeral0"
  }

  placement_group = aws_placement_group.hpc_cluster.id

  tags = {
    Name = "gpu-node-\${count.index + 1}"
    Role = "compute"
  }
}

resource "aws_placement_group" "hpc_cluster" {
  name     = "hpc-gpu-cluster"
  strategy = "cluster"  # Places instances close for low latency
}

output "gpu_node_ips" {
  value = aws_instance.gpu_node[*].private_ip
}
HCL
echo "--- Terraform config ready ---"
echo "Key HPC features:"
echo "  - Placement group 'cluster': ensures instances are on same rack"
echo "  - EFA: AWS equivalent of InfiniBand for MPI"
echo "  - NVMe ephemeral: fast local scratch for checkpoints"
echo "  - p4d.24xlarge: 8x A100 with NVSwitch + 400Gbps EFA"`,
          language: 'bash', validation: 'any_output', expected_output: 'Terraform config ready',
          demo_output: '$ cat ...\n# HPC GPU Cluster\n...\n--- Terraform config ready ---',
          hint: 'Placement groups are critical: without cluster placement, instances may be in different racks with 10x higher latency.',
          explanation: 'EFA provides 400Gbps RDMA networking on AWS, equivalent to InfiniBand in on-premise clusters. The placement group ensures all GPU nodes are on the same network spine for lowest latency MPI communication.',
        },
      ],
    },
    { id: 1803, type: 'coding', title: 'Infrastructure Cost Calculator', points: 25,
      description: 'Build a cost calculator for HPC cloud infrastructure.',
      starter_code: `INSTANCE_PRICING = {
    "p4d.24xlarge": {"hourly": 32.77, "gpus": 8, "gpu_type": "A100-40GB", "vcpus": 96, "memory_gb": 1152},
    "p4de.24xlarge": {"hourly": 40.96, "gpus": 8, "gpu_type": "A100-80GB", "vcpus": 96, "memory_gb": 1152},
    "p5.48xlarge": {"hourly": 98.32, "gpus": 8, "gpu_type": "H100-80GB", "vcpus": 192, "memory_gb": 2048},
    "g5.xlarge": {"hourly": 1.006, "gpus": 1, "gpu_type": "A10G-24GB", "vcpus": 4, "memory_gb": 16},
    "g5.48xlarge": {"hourly": 16.288, "gpus": 8, "gpu_type": "A10G-24GB", "vcpus": 192, "memory_gb": 768},
}

def calculate_training_cost(model_params_B, target_tokens_T, instance_type, num_instances):
    """Estimate training cost for an LLM.
    
    Uses the Chinchilla scaling law approximation:
    GPU-hours ≈ 6 * params * tokens / (GPU_TFLOPS * 1e12 * utilization)
    
    Args:
        model_params_B: parameters in billions
        target_tokens_T: training tokens in trillions
        instance_type: from INSTANCE_PRICING
        num_instances: how many instances to use
    
    Returns cost estimate with breakdown.
    """
    # TODO: Implement cost calculation
    pass

if __name__ == "__main__":
    # Estimate cost to train a 7B model on 2T tokens
    result = calculate_training_cost(7, 2.0, "p4d.24xlarge", 4)
    print("Training Cost Estimate:")
    for k, v in result.items():
        print(f"  {k}: {v}")`,
      test_cases: [
        { label: 'Shows total cost', input: '', expected_output: 'total_cost', hidden: false },
        { label: 'Shows GPU hours', input: '', expected_output: 'gpu_hours', hidden: false },
      ],
      hints: [
        'A100 achieves ~150 TFLOPS (bf16). Typical MFU (model FLOPS utilization) is 40-50%.',
        'GPU-hours = 6 * P * T / (TFLOPS * utilization). Cost = GPU-hours / gpus_per_instance * hourly_rate.',
      ],
      solution: `INSTANCE_PRICING = {
    "p4d.24xlarge": {"hourly": 32.77, "gpus": 8, "gpu_type": "A100-40GB", "vcpus": 96, "memory_gb": 1152},
    "p5.48xlarge": {"hourly": 98.32, "gpus": 8, "gpu_type": "H100-80GB", "vcpus": 192, "memory_gb": 2048},
}
GPU_TFLOPS = {"A100-40GB": 312, "A100-80GB": 312, "H100-80GB": 990, "A10G-24GB": 125}

def calculate_training_cost(params_B, tokens_T, itype, num_inst):
    spec = INSTANCE_PRICING[itype]
    tflops = GPU_TFLOPS.get(spec["gpu_type"], 150)
    total_gpus = spec["gpus"] * num_inst
    flops_needed = 6 * params_B * 1e9 * tokens_T * 1e12
    utilization = 0.45
    gpu_seconds = flops_needed / (tflops * 1e12 * utilization)
    gpu_hours = gpu_seconds / 3600
    wall_hours = gpu_hours / total_gpus
    cost = wall_hours * spec["hourly"] * num_inst
    return {"model": f"{params_B}B params", "tokens": f"{tokens_T}T", "gpu_hours": f"{gpu_hours:,.0f}",
            "wall_hours": f"{wall_hours:,.0f} ({wall_hours/24:.0f} days)",
            "total_cost": f"${cost:,.0f}", "cost_per_gpu_hour": f"${spec['hourly']/spec['gpus']:.2f}"}

if __name__ == "__main__":
    for k, v in calculate_training_cost(7, 2.0, "p4d.24xlarge", 4).items(): print(f"  {k}: {v}")`,
    },
  ],

  // ═══════════════════════════════════════════════════════════
  // LESSONS 19-25: Domain-specific exercises
  // ═══════════════════════════════════════════════════════════
  19: [
    { id: 1901, type: 'quiz', title: 'GitOps Principles', points: 15,
      description: 'Understand GitOps workflow for ML platform management.',
      question: 'In a GitOps workflow with ArgoCD, what is the "single source of truth" for the desired cluster state?',
      options: [
        'The running cluster itself — whatever is deployed is the truth',
        'The Git repository containing declarative manifests — ArgoCD reconciles the cluster to match Git',
        'The CI/CD pipeline history — the last successful deployment is truth',
        'A configuration database managed by the platform team',
      ],
      correct_answer: 1,
      hints: ['GitOps: Git repo = desired state. ArgoCD = reconciliation controller.', 'If someone makes a manual change to the cluster, ArgoCD will revert it to match Git.'],
    },
    { id: 1902, type: 'lab', title: 'ArgoCD Application Manifest', points: 40,
      description: 'Define ArgoCD applications for automated ML platform deployment.',
      steps: [
        { title: 'ArgoCD Application definition',
          instruction: 'Write an ArgoCD Application manifest that syncs ML platform services from a Git repository with automated sync and self-healing.',
          command: `cat << 'YAML'
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ml-platform
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/org/ml-platform-config.git
    targetRevision: main
    path: environments/production
    helm:
      valueFiles:
        - values-prod.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: ml-platform
  syncPolicy:
    automated:
      prune: true        # Remove resources deleted from Git
      selfHeal: true     # Revert manual cluster changes
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
YAML
echo "--- ArgoCD Application ready ---"`,
          language: 'bash', validation: 'any_output', expected_output: 'ArgoCD Application ready',
          demo_output: '$ cat ...\napiVersion: argoproj.io/v1alpha1\n...\n--- ArgoCD Application ready ---',
          hint: 'selfHeal=true ensures no one can make manual changes that diverge from Git. prune=true cleans up removed resources.',
          explanation: 'This is the core GitOps pattern: all changes go through Git PRs, ArgoCD watches the repo and applies changes. selfHeal prevents configuration drift — critical for compliance.',
        },
      ],
    },
    { id: 1903, type: 'coding', title: 'GitOps Diff Reporter', points: 25,
      description: 'Build a tool that compares desired state (Git) with actual state (cluster) and reports drift.',
      starter_code: `def detect_drift(desired, actual):
    """Compare desired state (from Git) with actual state (from cluster).
    Returns list of drift items.
    """
    drifts = []
    # TODO: Compare and find differences
    return drifts

if __name__ == "__main__":
    desired = {
        "deployments": {"inference-svc": {"replicas": 3, "image": "model:v2.1"}, "api-gw": {"replicas": 2, "image": "api:v1.5"}},
        "configmaps": {"model-config": {"version": "v2.1", "batch_size": "32"}},
    }
    actual = {
        "deployments": {"inference-svc": {"replicas": 5, "image": "model:v2.0"}, "api-gw": {"replicas": 2, "image": "api:v1.5"}},
        "configmaps": {"model-config": {"version": "v2.0", "batch_size": "64"}},
    }
    for d in detect_drift(desired, actual):
        print(f"  [{d['severity']}] {d['resource']}: {d['message']}")`,
      test_cases: [
        { label: 'Detects replica drift', input: '', expected_output: 'replicas', hidden: false },
        { label: 'Detects image drift', input: '', expected_output: 'image', hidden: false },
      ],
      hints: ['Compare each field in desired vs actual. Different values = drift.'],
      solution: `def detect_drift(desired, actual):
    drifts = []
    for rtype in desired:
        for name, dspec in desired[rtype].items():
            aspec = actual.get(rtype, {}).get(name, {})
            if not aspec:
                drifts.append({"severity": "CRITICAL", "resource": f"{rtype}/{name}", "message": "Missing from cluster"})
                continue
            for k, v in dspec.items():
                if str(aspec.get(k)) != str(v):
                    sev = "CRITICAL" if k == "image" else "WARNING"
                    drifts.append({"severity": sev, "resource": f"{rtype}/{name}", "message": f"{k}: desired={v}, actual={aspec.get(k)}"})
    return drifts

if __name__ == "__main__":
    desired = {"deployments": {"inference-svc": {"replicas": 3, "image": "model:v2.1"}, "api-gw": {"replicas": 2, "image": "api:v1.5"}},
               "configmaps": {"model-config": {"version": "v2.1", "batch_size": "32"}}}
    actual = {"deployments": {"inference-svc": {"replicas": 5, "image": "model:v2.0"}, "api-gw": {"replicas": 2, "image": "api:v1.5"}},
              "configmaps": {"model-config": {"version": "v2.0", "batch_size": "64"}}}
    for d in detect_drift(desired, actual): print(f"  [{d['severity']}] {d['resource']}: {d['message']}")`,
    },
  ],

  20: [
    { id: 2001, type: 'quiz', title: 'Observability for ML Systems', points: 15,
      description: 'Design monitoring for GPU clusters and ML workloads.',
      question: 'Which metric is the most important leading indicator that an ML training job will fail?',
      options: [
        'CPU utilization — high CPU means the job is working hard',
        'GPU memory usage trending upward without plateau — indicates a memory leak that will eventually OOM',
        'Network bandwidth — high bandwidth means good distributed training',
        'Disk IOPS — low IOPS means efficient storage access',
      ],
      correct_answer: 1,
      hints: ['Memory leaks show as a monotonically increasing memory line. Normal training plateaus.', 'OOM kills are the most common training failure. Detecting the trend early saves hours of wasted GPU time.'],
    },
    { id: 2002, type: 'lab', title: 'Prometheus Alert Rules for GPU Cluster', points: 40,
      description: 'Write Prometheus alerting rules for GPU cluster monitoring.',
      steps: [
        { title: 'GPU monitoring alerts',
          instruction: 'Write Prometheus alerting rules that detect GPU issues: idle GPUs, memory leaks, temperature throttling, and training stalls.',
          command: `cat << 'YAML'
groups:
- name: gpu-cluster-alerts
  rules:
  - alert: GPUIdle
    expr: nvidia_gpu_utilization < 10
    for: 30m
    labels:
      severity: warning
    annotations:
      summary: "GPU {{ $labels.gpu }} idle on {{ $labels.instance }}"
      description: "GPU allocated but <10% utilized for 30min. Wasting $4+/hr."
  
  - alert: GPUMemoryLeak
    expr: deriv(nvidia_gpu_memory_used_bytes[1h]) > 0 AND nvidia_gpu_memory_used_bytes / nvidia_gpu_memory_total_bytes > 0.8
    for: 15m
    labels:
      severity: critical
    annotations:
      summary: "GPU memory leak on {{ $labels.instance }}"
      description: "GPU memory continuously increasing and >80% full. OOM imminent."
  
  - alert: GPUTemperatureHigh
    expr: nvidia_gpu_temperature > 85
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "GPU {{ $labels.gpu }} overheating: {{ $value }}C"
      description: "GPU above 85C for 5min. Thermal throttling active, performance degraded."
  
  - alert: TrainingLossStalled
    expr: changes(training_loss[2h]) == 0
    for: 30m
    labels:
      severity: warning
    annotations:
      summary: "Training loss not changing for job {{ $labels.job_name }}"
YAML
echo "--- Prometheus alerts ready ---"`,
          language: 'bash', validation: 'any_output', expected_output: 'Prometheus alerts ready',
          demo_output: '$ cat ...\ngroups:\n- name: gpu-cluster-alerts\n  ...\n--- Prometheus alerts ready ---',
          hint: 'deriv() calculates the rate of change. Positive deriv on memory = leak. changes() counts distinct values.',
          explanation: 'These alerts catch the 4 most common GPU cluster issues: waste (idle GPUs), leaks (OOM), hardware (thermal), and training quality (loss stall). Each saves hours of debugging and thousands in compute cost.',
        },
      ],
    },
    { id: 2003, type: 'coding', title: 'GPU Metrics Anomaly Detector', points: 25,
      description: 'Build a simple anomaly detector for GPU metrics time series.',
      starter_code: `import statistics

def detect_anomalies(metrics, window=10, threshold=2.5):
    """Detect anomalies in a time series using rolling z-score.
    
    Args:
        metrics: list of float values (time series)
        window: rolling window size
        threshold: z-score threshold for anomaly
    
    Returns list of {index, value, z_score, anomaly_type}
    """
    anomalies = []
    # TODO: Implement rolling z-score anomaly detection
    return anomalies

if __name__ == "__main__":
    # Simulated GPU temperature with anomalies
    import random
    random.seed(42)
    temps = [45 + random.gauss(0, 2) for _ in range(50)]
    temps[25] = 92  # Spike
    temps[26] = 88
    temps[40] = 12  # Drop (GPU offline?)
    
    anomalies = detect_anomalies(temps)
    print(f"Detected {len(anomalies)} anomalies in {len(temps)} data points:")
    for a in anomalies:
        print(f"  t={a['index']}: value={a['value']:.1f}, z={a['z_score']:.1f} ({a['anomaly_type']})")`,
      test_cases: [
        { label: 'Detects anomalies', input: '', expected_output: 'Detected', hidden: false },
        { label: 'Shows z-score', input: '', expected_output: 'z=', hidden: false },
      ],
      hints: ['z-score = (value - mean) / stdev. If |z| > threshold, it is an anomaly.', 'Use the window to calculate rolling mean and stdev, then check the next point.'],
      solution: `import statistics, random
random.seed(42)

def detect_anomalies(metrics, window=10, threshold=2.5):
    anomalies = []
    for i in range(window, len(metrics)):
        w = metrics[i-window:i]
        mean = statistics.mean(w)
        std = statistics.stdev(w) or 0.001
        z = (metrics[i] - mean) / std
        if abs(z) > threshold:
            anomalies.append({"index": i, "value": metrics[i], "z_score": round(z, 1),
                            "anomaly_type": "spike" if z > 0 else "drop"})
    return anomalies

if __name__ == "__main__":
    temps = [45 + random.gauss(0, 2) for _ in range(50)]
    temps[25] = 92; temps[26] = 88; temps[40] = 12
    a = detect_anomalies(temps)
    print(f"Detected {len(a)} anomalies in {len(temps)} data points:")
    for x in a: print(f"  t={x['index']}: value={x['value']:.1f}, z={x['z_score']:.1f} ({x['anomaly_type']})")`,
    },
  ],

  21: [
    { id: 2101, type: 'quiz', title: 'Self-Service ML Platforms', points: 15,
      description: 'Design platforms that enable data scientists to be self-sufficient.',
      question: 'What is the primary purpose of resource quotas in a self-service ML platform?',
      options: [
        'To make it harder for data scientists to run experiments',
        'To ensure fair resource sharing across teams, prevent runaway costs, and maintain cluster stability while giving teams autonomy',
        'To track which team uses the most resources for billing only',
        'To limit the number of experiments per user per day',
      ],
      correct_answer: 1,
      hints: ['Without quotas, one team can consume all GPUs, starving others.', 'Good quotas are generous enough to not block work but prevent accidental 1000-GPU requests.'],
    },
    { id: 2102, type: 'lab', title: 'K8s ResourceQuota & LimitRange', points: 40,
      description: 'Configure Kubernetes resource controls for a multi-team ML platform.',
      steps: [
        { title: 'Namespace quotas for ML team',
          instruction: 'Create ResourceQuota and LimitRange for an ML research team namespace that controls GPU allocation and prevents resource abuse.',
          command: `cat << 'YAML'
# ResourceQuota: team-level limits
apiVersion: v1
kind: ResourceQuota
metadata:
  name: ml-research-quota
  namespace: ml-research
spec:
  hard:
    requests.cpu: "128"
    requests.memory: "512Gi"
    limits.cpu: "256"
    limits.memory: "1Ti"
    requests.nvidia.com/gpu: "16"  # Max 16 GPUs for this team
    pods: "50"
    persistentvolumeclaims: "20"
---
# LimitRange: per-pod defaults and maximums
apiVersion: v1
kind: LimitRange
metadata:
  name: ml-research-limits
  namespace: ml-research
spec:
  limits:
  - type: Container
    default:
      cpu: "2"
      memory: "8Gi"
    defaultRequest:
      cpu: "1"
      memory: "4Gi"
    max:
      cpu: "32"
      memory: "128Gi"
      nvidia.com/gpu: "8"
    min:
      cpu: "100m"
      memory: "128Mi"
  - type: Pod
    max:
      nvidia.com/gpu: "8"  # Max 8 GPUs per pod
YAML
echo "--- Quota and LimitRange ready ---"`,
          language: 'bash', validation: 'any_output', expected_output: 'Quota and LimitRange ready',
          demo_output: '$ cat ...\napiVersion: v1\nkind: ResourceQuota\n...\n--- Quota and LimitRange ready ---',
          hint: 'LimitRange sets defaults so pods without resource specs get reasonable defaults instead of unlimited access.',
          explanation: 'The combination of ResourceQuota (team-level) and LimitRange (pod-level) provides defense in depth. Even if a user forgets to set resource limits, LimitRange provides sensible defaults.',
        },
      ],
    },
    { id: 2103, type: 'coding', title: 'Team Resource Dashboard', points: 25,
      description: 'Build a resource utilization dashboard that shows team quota usage.',
      starter_code: `TEAM_DATA = {
    "ml-research": {"quota": {"gpu": 16, "cpu": 128, "mem_gb": 512}, "used": {"gpu": 12, "cpu": 85, "mem_gb": 340},
                     "jobs": [{"name": "llm-train", "gpu": 8, "status": "Running"}, {"name": "eval-1", "gpu": 2, "status": "Running"}, {"name": "preproc", "gpu": 0, "cpu": 32, "status": "Running"}]},
    "ml-engineering": {"quota": {"gpu": 8, "cpu": 64, "mem_gb": 256}, "used": {"gpu": 8, "cpu": 60, "mem_gb": 200},
                       "jobs": [{"name": "serving-prod", "gpu": 4, "status": "Running"}, {"name": "serving-canary", "gpu": 4, "status": "Running"}]},
    "data-science": {"quota": {"gpu": 4, "cpu": 32, "mem_gb": 128}, "used": {"gpu": 1, "cpu": 8, "mem_gb": 32},
                     "jobs": [{"name": "notebook-alice", "gpu": 1, "status": "Running"}]},
}

def generate_dashboard(teams):
    """Generate a resource utilization dashboard.
    Show per-team quota usage, identify teams near limits, and suggest optimizations.
    """
    # TODO: Implement
    pass

if __name__ == "__main__":
    generate_dashboard(TEAM_DATA)`,
      test_cases: [
        { label: 'Shows team names', input: '', expected_output: 'ml-research', hidden: false },
        { label: 'Shows GPU usage', input: '', expected_output: 'gpu', hidden: false },
      ],
      hints: ['Calculate percentage: used/quota * 100. Flag teams above 80% as "near limit".'],
      solution: `TEAM_DATA = {
    "ml-research": {"quota": {"gpu": 16, "cpu": 128, "mem_gb": 512}, "used": {"gpu": 12, "cpu": 85, "mem_gb": 340},
                     "jobs": [{"name": "llm-train", "gpu": 8}, {"name": "eval-1", "gpu": 2}, {"name": "preproc", "gpu": 0}]},
    "ml-engineering": {"quota": {"gpu": 8, "cpu": 64, "mem_gb": 256}, "used": {"gpu": 8, "cpu": 60, "mem_gb": 200},
                       "jobs": [{"name": "serving-prod", "gpu": 4}, {"name": "serving-canary", "gpu": 4}]},
    "data-science": {"quota": {"gpu": 4, "cpu": 32, "mem_gb": 128}, "used": {"gpu": 1, "cpu": 8, "mem_gb": 32},
                     "jobs": [{"name": "notebook-alice", "gpu": 1}]},
}

def generate_dashboard(teams):
    print(f"{'Team':<20} {'GPU':>10} {'CPU':>10} {'Memory':>10} {'Status':>10}")
    print("=" * 65)
    for name, t in teams.items():
        for res in ["gpu", "cpu", "mem_gb"]:
            pct = t["used"][res] / t["quota"][res] * 100
            if pct >= 90: print(f"  WARNING: {name} at {pct:.0f}% {res} capacity")
        gpu_pct = t["used"]["gpu"]/t["quota"]["gpu"]*100
        cpu_pct = t["used"]["cpu"]/t["quota"]["cpu"]*100
        mem_pct = t["used"]["mem_gb"]/t["quota"]["mem_gb"]*100
        status = "FULL" if gpu_pct >= 100 else "HIGH" if gpu_pct >= 75 else "OK"
        print(f"{name:<20} {t['used']['gpu']}/{t['quota']['gpu']:>4} ({gpu_pct:.0f}%) {t['used']['cpu']}/{t['quota']['cpu']:>4} ({cpu_pct:.0f}%) {t['used']['mem_gb']}/{t['quota']['mem_gb']:>4} ({mem_pct:.0f}%) {status:>10}")
    total_gpu = sum(t["used"]["gpu"] for t in teams.values())
    total_quota = sum(t["quota"]["gpu"] for t in teams.values())
    print(f"\\nCluster GPU: {total_gpu}/{total_quota} ({total_gpu/total_quota*100:.0f}%)")

if __name__ == "__main__":
    generate_dashboard(TEAM_DATA)`,
    },
  ],

  22: [
    { id: 2201, type: 'quiz', title: 'Multi-Tenant Platform Design', points: 15,
      description: 'Design isolation and sharing for multi-team GPU clusters.',
      question: 'In a multi-tenant K8s GPU cluster, what combination provides the strongest isolation between teams?',
      options: [
        'Separate namespaces only — sufficient for all isolation needs',
        'Namespaces + NetworkPolicies + ResourceQuotas + RBAC + PodSecurityPolicies — defense in depth',
        'Separate physical clusters for each team — only true isolation',
        'Docker container isolation is sufficient — no additional K8s features needed',
      ],
      correct_answer: 1,
      hints: ['Namespaces are logical grouping only. NetworkPolicies prevent cross-team network access. RBAC controls API permissions.', 'Defense in depth: even if one layer is misconfigured, others maintain isolation.'],
    },
    { id: 2202, type: 'lab', title: 'RBAC for ML Platform', points: 40,
      description: 'Configure Kubernetes RBAC for different ML platform roles.',
      steps: [
        { title: 'Role definitions',
          instruction: 'Create K8s RBAC roles for ML platform: data-scientist (run jobs), ml-engineer (deploy models), platform-admin (full access).',
          command: `cat << 'YAML'
# Data Scientist: can create jobs and notebooks, read logs
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: data-scientist
  namespace: ml-research
rules:
- apiGroups: ["batch"]
  resources: ["jobs"]
  verbs: ["create", "get", "list", "delete"]
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list"]
  # Cannot create secrets — prevents credential theft
---
# ML Engineer: can manage deployments and services
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ml-engineer
  namespace: ml-serving
rules:
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["*"]
- apiGroups: [""]
  resources: ["services", "configmaps"]
  verbs: ["*"]
- apiGroups: ["autoscaling"]
  resources: ["horizontalpodautoscalers"]
  verbs: ["*"]
YAML
echo "--- RBAC roles ready ---"
echo "Principle of least privilege:"
echo "  Data scientists: create jobs, read logs, no secrets write"
echo "  ML engineers: manage deployments and autoscaling"
echo "  Platform admins: cluster-wide access (ClusterRole)"`,
          language: 'bash', validation: 'any_output', expected_output: 'RBAC roles ready',
          demo_output: '$ cat ...\napiVersion: rbac.authorization.k8s.io/v1\n...\n--- RBAC roles ready ---',
          hint: 'Separate roles per persona prevents privilege escalation. Data scientists should never manage production deployments.',
          explanation: 'RBAC is the first line of defense in multi-tenant clusters. Combined with namespaces, it ensures teams can only access their own resources. The "no secrets write" for data scientists prevents accidental exposure of credentials.',
        },
      ],
    },
    { id: 2203, type: 'coding', title: 'Tenant Isolation Validator', points: 25,
      description: 'Build a tool that validates isolation configuration for a multi-tenant cluster.',
      starter_code: `CLUSTER_CONFIG = {
    "namespaces": {
        "ml-research": {"quotas": True, "network_policy": True, "rbac": True, "pod_security": False},
        "ml-serving": {"quotas": True, "network_policy": False, "rbac": True, "pod_security": True},
        "data-pipeline": {"quotas": False, "network_policy": False, "rbac": True, "pod_security": False},
    }
}

def validate_isolation(config):
    """Check multi-tenant isolation and report gaps.
    Each namespace should have: quotas, network_policy, rbac, pod_security.
    """
    # TODO: Validate each namespace and report issues
    pass

if __name__ == "__main__":
    issues = validate_isolation(CLUSTER_CONFIG)
    for ns, problems in issues.items():
        print(f"\\n{ns}:")
        for p in problems:
            print(f"  [{p['severity']}] {p['message']}")`,
      test_cases: [
        { label: 'Detects missing network policy', input: '', expected_output: 'network_policy', hidden: false },
        { label: 'Shows severity levels', input: '', expected_output: 'CRITICAL', hidden: false },
      ],
      hints: ['Check each boolean flag. Missing network_policy = CRITICAL (cross-tenant access possible). Missing quotas = WARNING.'],
      solution: `CLUSTER_CONFIG = {
    "namespaces": {
        "ml-research": {"quotas": True, "network_policy": True, "rbac": True, "pod_security": False},
        "ml-serving": {"quotas": True, "network_policy": False, "rbac": True, "pod_security": True},
        "data-pipeline": {"quotas": False, "network_policy": False, "rbac": True, "pod_security": False},
    }
}
CHECKS = {"network_policy": ("CRITICAL", "No NetworkPolicy — cross-tenant network access possible"),
           "quotas": ("WARNING", "No ResourceQuota — team can consume unlimited resources"),
           "rbac": ("CRITICAL", "No RBAC — any user can access this namespace"),
           "pod_security": ("WARNING", "No PodSecurity — privileged containers allowed")}

def validate_isolation(config):
    issues = {}
    for ns, flags in config["namespaces"].items():
        issues[ns] = []
        for check, (sev, msg) in CHECKS.items():
            if not flags.get(check):
                issues[ns].append({"severity": sev, "message": f"Missing {check}: {msg}"})
        if not issues[ns]:
            issues[ns].append({"severity": "OK", "message": "All isolation controls in place"})
    return issues

if __name__ == "__main__":
    for ns, probs in validate_isolation(CLUSTER_CONFIG).items():
        print(f"\\n{ns}:")
        for p in probs: print(f"  [{p['severity']}] {p['message']}")`,
    },
  ],

  23: [
    { id: 2301, type: 'quiz', title: 'HPC Security Frameworks', points: 15,
      description: 'Understand security and compliance requirements for HPC environments.',
      question: 'When running ML workloads on data subject to HIPAA, which security control is most critical?',
      options: [
        'All data must be stored in CSV format for auditability',
        'Encryption at rest AND in transit, plus audit logging of all data access — even within the cluster network',
        'Only physical security of the data center is required',
        'HIPAA only applies to healthcare providers, not ML workloads',
      ],
      correct_answer: 1,
      hints: ['HIPAA requires protection of PHI (Protected Health Information) everywhere it exists — in storage, in memory, in transit.', 'ML models trained on PHI may memorize and leak patient data. Model outputs also need protection.'],
    },
    { id: 2302, type: 'lab', title: 'Security Scanning Pipeline', points: 40,
      description: 'Build a security scanning pipeline for container images in an ML platform.',
      steps: [
        { title: 'Container security scan',
          instruction: 'Write a script that simulates container image security scanning — checking for vulnerable packages, exposed secrets, and misconfigurations.',
          command: `cat << 'PYTHON'
# Simulated container security scan results
SCAN_RESULTS = {
    "image": "ml-training:v2.1",
    "os": "Ubuntu 22.04",
    "vulnerabilities": [
        {"package": "openssl", "installed": "3.0.2", "fixed": "3.0.13", "severity": "CRITICAL", "cve": "CVE-2024-0727"},
        {"package": "numpy", "installed": "1.24.0", "fixed": "1.24.4", "severity": "HIGH", "cve": "CVE-2023-4231"},
        {"package": "pillow", "installed": "9.4.0", "fixed": "10.0.1", "severity": "HIGH", "cve": "CVE-2023-4431"},
        {"package": "requests", "installed": "2.28.0", "fixed": "2.31.0", "severity": "MEDIUM", "cve": "CVE-2023-32681"},
    ],
    "secrets_found": [
        {"type": "AWS_KEY", "file": "/app/config.py", "line": 42},
    ],
    "misconfigs": [
        {"issue": "Running as root", "severity": "HIGH"},
        {"issue": "No HEALTHCHECK defined", "severity": "MEDIUM"},
    ],
}

# Generate report
print(f"Image: {SCAN_RESULTS['image']}")
print(f"\\nVulnerabilities ({len(SCAN_RESULTS['vulnerabilities'])}):")
for v in sorted(SCAN_RESULTS['vulnerabilities'], key=lambda x: ['CRITICAL','HIGH','MEDIUM','LOW'].index(x['severity'])):
    print(f"  [{v['severity']:>8}] {v['package']} {v['installed']} -> {v['fixed']} ({v['cve']})")

print(f"\\nSecrets Detected ({len(SCAN_RESULTS['secrets_found'])}):")
for s in SCAN_RESULTS['secrets_found']:
    print(f"  [CRITICAL] {s['type']} found in {s['file']}:{s['line']}")

crit = len([v for v in SCAN_RESULTS['vulnerabilities'] if v['severity'] == 'CRITICAL'])
secrets = len(SCAN_RESULTS['secrets_found'])
blocked = crit > 0 or secrets > 0
print(f"\\nVerdict: {'BLOCKED - Fix critical issues before deploy' if blocked else 'PASSED'}")
PYTHON
echo "--- Security scan ready ---"`,
          language: 'bash', validation: 'any_output', expected_output: 'Security scan ready',
          demo_output: "$ python scan.py\nImage: ml-training:v2.1\n...\nVerdict: BLOCKED - Fix critical issues before deploy\n--- Security scan ready ---",
          hint: 'Always block deployment on: CRITICAL CVEs, exposed secrets, running as root. These are non-negotiable.',
          explanation: 'Container scanning in CI/CD prevents deploying vulnerable images. The scan should check: OS packages (apt), Python packages (pip), embedded secrets, and Dockerfile best practices. Gate deployments on CRITICAL findings.',
        },
      ],
    },
    { id: 2303, type: 'coding', title: 'Compliance Audit Report Generator', points: 25,
      description: 'Build a compliance audit tool that checks HPC infrastructure against security frameworks.',
      starter_code: `COMPLIANCE_CHECKS = {
    "encryption_at_rest": {"required_by": ["HIPAA", "SOC2", "PCI"], "check": lambda c: c.get("storage_encrypted", False)},
    "encryption_in_transit": {"required_by": ["HIPAA", "SOC2", "PCI"], "check": lambda c: c.get("tls_enabled", False)},
    "audit_logging": {"required_by": ["HIPAA", "SOC2"], "check": lambda c: c.get("audit_logs", False)},
    "mfa_enabled": {"required_by": ["SOC2", "PCI"], "check": lambda c: c.get("mfa", False)},
    "network_segmentation": {"required_by": ["PCI", "HIPAA"], "check": lambda c: c.get("network_policies", False)},
    "data_retention_policy": {"required_by": ["HIPAA"], "check": lambda c: c.get("retention_days", 0) > 0},
}

def audit_compliance(infrastructure_config, frameworks):
    """Run compliance audit against specified frameworks.
    Returns report with pass/fail per check and overall compliance.
    """
    # TODO: Check each requirement and generate report
    pass

if __name__ == "__main__":
    config = {
        "storage_encrypted": True,
        "tls_enabled": True,
        "audit_logs": False,
        "mfa": True,
        "network_policies": False,
        "retention_days": 365,
    }
    report = audit_compliance(config, ["HIPAA", "SOC2"])
    for check, result in report["checks"].items():
        print(f"  [{result['status']}] {check}: {result['message']}")
    print(f"\\nOverall: {report['overall']}")`,
      test_cases: [
        { label: 'Shows PASS/FAIL', input: '', expected_output: 'PASS', hidden: false },
        { label: 'Shows overall status', input: '', expected_output: 'Overall:', hidden: false },
      ],
      hints: ['For each framework, find which checks apply and evaluate them.'],
      solution: `COMPLIANCE_CHECKS = {
    "encryption_at_rest": {"required_by": ["HIPAA","SOC2","PCI"], "check": lambda c: c.get("storage_encrypted")},
    "encryption_in_transit": {"required_by": ["HIPAA","SOC2","PCI"], "check": lambda c: c.get("tls_enabled")},
    "audit_logging": {"required_by": ["HIPAA","SOC2"], "check": lambda c: c.get("audit_logs")},
    "mfa_enabled": {"required_by": ["SOC2","PCI"], "check": lambda c: c.get("mfa")},
    "network_segmentation": {"required_by": ["PCI","HIPAA"], "check": lambda c: c.get("network_policies")},
    "data_retention_policy": {"required_by": ["HIPAA"], "check": lambda c: c.get("retention_days", 0) > 0},
}

def audit_compliance(config, frameworks):
    checks = {}
    for name, spec in COMPLIANCE_CHECKS.items():
        if any(f in spec["required_by"] for f in frameworks):
            ok = spec["check"](config)
            checks[name] = {"status": "PASS" if ok else "FAIL",
                          "message": f"Required by {[f for f in frameworks if f in spec['required_by']]}"}
    fails = sum(1 for c in checks.values() if c["status"] == "FAIL")
    return {"checks": checks, "overall": f"{'COMPLIANT' if fails == 0 else f'NON-COMPLIANT ({fails} failures)'}"}

if __name__ == "__main__":
    config = {"storage_encrypted": True, "tls_enabled": True, "audit_logs": False, "mfa": True, "network_policies": False, "retention_days": 365}
    r = audit_compliance(config, ["HIPAA", "SOC2"])
    for k, v in r["checks"].items(): print(f"  [{v['status']}] {k}: {v['message']}")
    print(f"\\nOverall: {r['overall']}")`,
    },
  ],

  24: [
    { id: 2401, type: 'quiz', title: 'GPU Cost Optimization', points: 15,
      description: 'Strategies for reducing GPU compute costs.',
      question: 'Which combination of strategies typically provides the largest cost reduction for ML training workloads?',
      options: [
        'Use the latest GPU generation only — newer GPUs are always cheaper per FLOP',
        'Spot/preemptible instances (60-90% discount) + checkpointing + right-sizing GPU allocation based on actual utilization',
        'Run all workloads on CPU — GPUs are too expensive',
        'Reserve all capacity for 3 years upfront — longest commitment = lowest price',
      ],
      correct_answer: 1,
      hints: ['Spot instances are 60-90% cheaper but can be interrupted. Checkpointing lets you resume after interruption.', 'Right-sizing: if utilization is 30%, you are over-provisioned by 3x.'],
    },
    { id: 2402, type: 'lab', title: 'Cost Analysis Dashboard', points: 40,
      description: 'Build a cost analysis and optimization recommendation system.',
      steps: [
        { title: 'Cost breakdown analysis',
          instruction: 'Analyze cloud GPU spending and identify optimization opportunities.',
          command: `cat << 'PYTHON'
MONTHLY_SPENDING = {
    "training": [
        {"team": "NLP", "instance": "p4d.24xlarge", "hours": 720, "count": 8, "cost": 188_832, "utilization": 85},
        {"team": "CV", "instance": "p4d.24xlarge", "hours": 400, "count": 4, "cost": 52_432, "utilization": 72},
        {"team": "RL", "instance": "g5.48xlarge", "hours": 720, "count": 2, "cost": 23_455, "utilization": 45},
    ],
    "inference": [
        {"team": "NLP", "instance": "g5.xlarge", "hours": 720, "count": 12, "cost": 8_692, "utilization": 30},
        {"team": "CV", "instance": "g5.xlarge", "hours": 720, "count": 8, "cost": 5_795, "utilization": 25},
    ],
    "notebooks": [
        {"team": "Research", "instance": "g5.xlarge", "hours": 200, "count": 20, "cost": 4_024, "utilization": 15},
    ],
}

total = sum(item["cost"] for cat in MONTHLY_SPENDING.values() for item in cat)
print(f"Monthly GPU Spend: \${total:,}")
print(f"\\n{'Category':<12} {'Team':<10} {'Cost':>10} {'Util':>6} {'Potential Savings':>18}")
print("-" * 60)

savings = 0
for category, items in MONTHLY_SPENDING.items():
    for item in items:
        sav = 0
        notes = []
        if item["utilization"] < 50:
            sav = item["cost"] * 0.5  # Right-size
            notes.append("right-size")
        if category == "training" and item["hours"] > 400:
            spot_save = item["cost"] * 0.7  # Spot instances
            sav = max(sav, spot_save)
            notes.append("use spot")
        savings += sav
        print(f"{category:<12} {item['team']:<10} \${item['cost']:>9,} {item['utilization']:>5}% \${sav:>10,.0f} ({', '.join(notes) or 'optimized'})")

print(f"\\nTotal potential monthly savings: \${savings:,.0f} ({savings/total*100:.0f}%)")
PYTHON
echo "--- Cost analysis ready ---"`,
          language: 'bash', validation: 'any_output', expected_output: 'Cost analysis ready',
          demo_output: "$ python costs.py\nMonthly GPU Spend: $283,230\n...\nTotal potential monthly savings: $180,000 (64%)\n--- Cost analysis ready ---",
          hint: 'The biggest wins: spot instances for training (70% savings), right-sizing under-utilized inference (50% savings).',
          explanation: 'Most organizations waste 40-60% of GPU spend on: over-provisioned inference, idle notebooks, and on-demand training that could use spot. Checkpointing + spot alone saves more than any other optimization.',
        },
      ],
    },
    { id: 2403, type: 'coding', title: 'Spot Instance Advisor', points: 25,
      description: 'Build a tool that recommends spot vs on-demand based on workload characteristics.',
      starter_code: `def recommend_instance_strategy(workload):
    """Recommend instance purchasing strategy.
    
    workload: {
        "type": "training" | "inference" | "notebook",
        "duration_hours": float,
        "checkpoint_capable": bool,
        "max_interruption_tolerance": float,  # 0-1
        "gpu_count": int,
        "on_demand_hourly": float,
    }
    
    Returns recommendation with cost comparison.
    """
    # TODO: Implement
    pass

if __name__ == "__main__":
    workloads = [
        {"name": "LLM Training", "type": "training", "duration_hours": 72, "checkpoint_capable": True, "max_interruption_tolerance": 0.8, "gpu_count": 8, "on_demand_hourly": 32.77},
        {"name": "API Serving", "type": "inference", "duration_hours": 720, "checkpoint_capable": False, "max_interruption_tolerance": 0.0, "gpu_count": 1, "on_demand_hourly": 1.006},
        {"name": "Dev Notebook", "type": "notebook", "duration_hours": 8, "checkpoint_capable": True, "max_interruption_tolerance": 0.5, "gpu_count": 1, "on_demand_hourly": 1.006},
    ]
    for w in workloads:
        rec = recommend_instance_strategy(w)
        print(f"\\n{w['name']}:")
        for k, v in rec.items():
            print(f"  {k}: {v}")`,
      test_cases: [
        { label: 'Shows recommendation', input: '', expected_output: 'strategy', hidden: false },
        { label: 'Shows cost savings', input: '', expected_output: 'savings', hidden: false },
      ],
      hints: [
        'Training with checkpointing: spot (70% savings). Inference serving: on-demand or reserved (no interruptions). Notebooks: spot with auto-save.',
        'Reserved instances: 40-60% savings for 1-year commit. Only worth it for steady-state workloads (inference).',
      ],
      solution: `def recommend_instance_strategy(w):
    od_cost = w["on_demand_hourly"] * w["duration_hours"] * w.get("gpu_count", 1)
    if w["type"] == "inference" and w["max_interruption_tolerance"] == 0:
        reserved_cost = od_cost * 0.4
        return {"strategy": "Reserved (1yr)", "on_demand_cost": f"${od_cost:,.0f}", "recommended_cost": f"${reserved_cost:,.0f}", "savings": f"${od_cost-reserved_cost:,.0f} (60%)"}
    elif w["checkpoint_capable"] and w["max_interruption_tolerance"] > 0.3:
        spot_cost = od_cost * 0.3
        return {"strategy": "Spot + Checkpointing", "on_demand_cost": f"${od_cost:,.0f}", "recommended_cost": f"${spot_cost:,.0f}", "savings": f"${od_cost-spot_cost:,.0f} (70%)"}
    else:
        return {"strategy": "On-Demand", "on_demand_cost": f"${od_cost:,.0f}", "recommended_cost": f"${od_cost:,.0f}", "savings": "$0 (0%)"}

if __name__ == "__main__":
    wl = [{"name": "LLM Training", "type": "training", "duration_hours": 72, "checkpoint_capable": True, "max_interruption_tolerance": 0.8, "gpu_count": 8, "on_demand_hourly": 32.77},
          {"name": "API Serving", "type": "inference", "duration_hours": 720, "checkpoint_capable": False, "max_interruption_tolerance": 0.0, "gpu_count": 1, "on_demand_hourly": 1.006},
          {"name": "Dev Notebook", "type": "notebook", "duration_hours": 8, "checkpoint_capable": True, "max_interruption_tolerance": 0.5, "gpu_count": 1, "on_demand_hourly": 1.006}]
    for w in wl:
        print(f"\\n{w['name']}:")
        for k, v in recommend_instance_strategy(w).items(): print(f"  {k}: {v}")`,
    },
  ],

  25: [
    { id: 2501, type: 'quiz', title: 'LLM Deployment Architecture', points: 15,
      description: 'Design production LLM deployment systems.',
      question: 'What is KV-cache in LLM inference and why is it the primary memory bottleneck?',
      options: [
        'KV-cache stores the model weights in GPU memory for fast access',
        'KV-cache stores key-value attention states for all previous tokens in the sequence, growing linearly with sequence length and batch size — often exceeding model weight memory',
        'KV-cache is a disk cache for frequently accessed training data',
        'KV-cache is a Redis cache used to store inference results for deduplication',
      ],
      correct_answer: 1,
      hints: ['For a 70B model with 80 layers: KV-cache per token ≈ 2 * 80 * 8192 * 2 bytes = 2.6MB.', 'At 4096 context length * 32 batch size = 131K tokens * 2.6MB = 332GB just for KV-cache.'],
    },
    { id: 2502, type: 'lab', title: 'vLLM Deployment Configuration', points: 40,
      description: 'Configure vLLM for production LLM serving with PagedAttention and continuous batching.',
      steps: [
        { title: 'vLLM server configuration',
          instruction: 'Write the configuration for deploying a 70B model with vLLM, including tensor parallelism, quantization, and memory management.',
          command: `cat << 'CONFIG'
# vLLM Deployment Command
python -m vllm.entrypoints.openai.api_server \\
    --model meta-llama/Llama-2-70b-chat-hf \\
    --tensor-parallel-size 4 \\
    --gpu-memory-utilization 0.90 \\
    --max-model-len 4096 \\
    --max-num-seqs 256 \\
    --quantization awq \\
    --dtype float16 \\
    --enable-prefix-caching \\
    --swap-space 4 \\
    --port 8000

# Key settings explained:
# --tensor-parallel-size 4: Split model across 4 GPUs
#   70B fp16 = 140GB > 80GB per GPU. With 4 GPUs: 35GB each
# --gpu-memory-utilization 0.90: Reserve 90% for model + KV-cache
#   Remaining 10% = 32GB buffer for CUDA kernels and overhead
# --quantization awq: 4-bit quantization reduces model to ~35GB
#   With AWQ: can fit on 2 GPUs instead of 4
# --max-num-seqs 256: Max concurrent sequences (continuous batching)
# --enable-prefix-caching: Cache common prompt prefixes
#   Huge win for RAG workloads with shared system prompts
# --swap-space 4: 4GB CPU memory for KV-cache overflow
CONFIG
echo "--- vLLM config ready ---"
echo ""
echo "Performance expectations (4x A100-80GB, AWQ quantized):"
echo "  Throughput: ~2000 tokens/sec total"
echo "  Latency (TTFT): ~200ms for 1K prompt"
echo "  Latency (TPS): ~40 tokens/sec per request"
echo "  Max concurrent users: ~50-100"`,
          language: 'bash', validation: 'any_output', expected_output: 'vLLM config ready',
          demo_output: '$ cat ...\npython -m vllm.entrypoints.openai.api_server \\\n...\n--- vLLM config ready ---',
          hint: 'PagedAttention (vLLM core innovation) manages KV-cache like virtual memory pages — no wasted memory from pre-allocation.',
          explanation: 'vLLM achieves 2-4x higher throughput than naive HuggingFace serving through PagedAttention (efficient KV-cache memory management) and continuous batching (no wasted GPU cycles waiting for batch completion).',
        },
        { title: 'LLM memory budget',
          instruction: 'Calculate the memory budget for serving different LLM sizes and determine GPU requirements.',
          command: `cat << 'PYTHON'
def llm_memory_budget(params_B, context_len, batch_size, num_layers, hidden_dim, precision="fp16", quantization=None):
    """Calculate GPU memory needed for LLM inference.
    
    Model weights + KV-cache + overhead
    """
    # Model weights
    bytes_per_param = {"fp32": 4, "fp16": 2, "int8": 1, "int4": 0.5}
    if quantization == "awq":
        weight_gb = params_B * 1e9 * bytes_per_param["int4"] / 1e9
    elif quantization == "int8":
        weight_gb = params_B * 1e9 * bytes_per_param["int8"] / 1e9
    else:
        weight_gb = params_B * 1e9 * bytes_per_param[precision] / 1e9
    
    # KV-cache: 2 * num_layers * 2 * hidden_dim * context_len * batch_size * 2 bytes
    kv_per_token = 2 * num_layers * hidden_dim * 2  # bytes (fp16)
    kv_total_gb = kv_per_token * context_len * batch_size / 1e9
    
    # Overhead (activation memory, CUDA kernels)
    overhead_gb = weight_gb * 0.1
    
    total = weight_gb + kv_total_gb + overhead_gb
    
    gpus_80gb = max(1, -(-int(total) // 70))  # ceil division with 70GB usable per 80GB GPU
    
    print(f"  Weights:  {weight_gb:.1f} GB {'(' + quantization + ')' if quantization else ''}")
    print(f"  KV-cache: {kv_total_gb:.1f} GB (ctx={context_len}, batch={batch_size})")
    print(f"  Overhead: {overhead_gb:.1f} GB")
    print(f"  Total:    {total:.1f} GB")
    print(f"  GPUs needed: {gpus_80gb}x A100-80GB")
    return total

# Common LLM configurations
models = [
    ("Llama-2-7B", 7, 32, 4096, 4096, 32, None),
    ("Llama-2-7B (AWQ)", 7, 32, 4096, 4096, 32, "awq"),
    ("Llama-2-70B", 70, 80, 8192, 4096, 32, None),
    ("Llama-2-70B (AWQ)", 70, 80, 8192, 4096, 32, "awq"),
]

for name, params, layers, hidden, ctx, batch, quant in models:
    print(f"\\n{name}:")
    llm_memory_budget(params, ctx, batch, layers, hidden, quantization=quant)
PYTHON
echo "--- Memory budget ready ---"`,
          language: 'bash', validation: 'any_output', expected_output: 'Memory budget ready',
          demo_output: "$ python budget.py\n\nLlama-2-7B:\n  Weights:  14.0 GB\n  KV-cache: 2.1 GB\n  ...\n\nLlama-2-70B (AWQ):\n  Weights:  35.0 GB\n  KV-cache: 16.8 GB\n  ...\n--- Memory budget ready ---",
          hint: 'AWQ 4-bit quantization halves weight memory vs fp16 with minimal quality loss. KV-cache cannot be quantized as easily.',
          explanation: 'The memory budget reveals why quantization matters: 70B fp16 needs 140GB (2 GPUs), but AWQ needs only 35GB (1 GPU). However, KV-cache grows with batch size and context length — this becomes the bottleneck for long-context models.',
        },
      ],
    },
    { id: 2503, type: 'coding', title: 'LLM Serving Cost-Performance Optimizer', points: 25,
      description: 'Build a tool that finds the optimal GPU configuration for LLM serving given cost and latency constraints.',
      starter_code: `GPU_CONFIGS = [
    {"name": "1x A100-80GB", "gpus": 1, "memory_gb": 80, "cost_hr": 4.10, "tflops": 312},
    {"name": "2x A100-80GB", "gpus": 2, "memory_gb": 160, "cost_hr": 8.20, "tflops": 624},
    {"name": "4x A100-80GB", "gpus": 4, "memory_gb": 320, "cost_hr": 16.40, "tflops": 1248},
    {"name": "8x A100-80GB", "gpus": 8, "memory_gb": 640, "cost_hr": 32.77, "tflops": 2496},
    {"name": "1x H100-80GB", "gpus": 1, "memory_gb": 80, "cost_hr": 12.29, "tflops": 990},
    {"name": "4x H100-80GB", "gpus": 4, "memory_gb": 320, "cost_hr": 49.16, "tflops": 3960},
    {"name": "8x H100-80GB", "gpus": 8, "memory_gb": 640, "cost_hr": 98.32, "tflops": 7920},
]

def optimize_llm_serving(model_params_B, target_throughput_tps, max_latency_ms, max_cost_hr, quantization="fp16"):
    """Find the cheapest GPU config that meets throughput and latency requirements.
    
    Args:
        model_params_B: Model size in billions
        target_throughput_tps: Required tokens per second
        max_latency_ms: Maximum acceptable time-to-first-token
        max_cost_hr: Budget per hour in USD
        quantization: "fp16", "int8", or "awq"
    
    Returns best config or None if no config meets requirements.
    """
    # TODO: Evaluate each config against requirements
    pass

if __name__ == "__main__":
    scenarios = [
        {"model": 7, "throughput": 500, "latency": 200, "budget": 10, "quant": "fp16"},
        {"model": 70, "throughput": 1000, "latency": 500, "budget": 50, "quant": "awq"},
        {"model": 70, "throughput": 2000, "latency": 200, "budget": 100, "quant": "fp16"},
    ]
    for s in scenarios:
        print(f"\\n{'='*50}")
        print(f"Model: {s['model']}B | Target: {s['throughput']} t/s | Max latency: {s['latency']}ms | Budget: ${s['budget']}/hr")
        result = optimize_llm_serving(s["model"], s["throughput"], s["latency"], s["budget"], s["quant"])
        if result:
            for k, v in result.items():
                print(f"  {k}: {v}")
        else:
            print("  No configuration meets all requirements within budget")`,
      test_cases: [
        { label: 'Evaluates configs', input: '', expected_output: 'Model:', hidden: false },
        { label: 'Shows cost info', input: '', expected_output: 'cost', hidden: false },
      ],
      hints: [
        'Memory needed = params_B * bytes_per_param / 1e9. fp16=2B, int8=1B, awq=0.5B.',
        'Rough throughput: tflops * 1000 / params_B for decode step.',
        'Latency: proportional to model_size / tflops. More GPUs = lower latency via tensor parallelism.',
      ],
      solution: `GPU_CONFIGS = [
    {"name": "1x A100-80GB", "gpus": 1, "memory_gb": 80, "cost_hr": 4.10, "tflops": 312},
    {"name": "2x A100-80GB", "gpus": 2, "memory_gb": 160, "cost_hr": 8.20, "tflops": 624},
    {"name": "4x A100-80GB", "gpus": 4, "memory_gb": 320, "cost_hr": 16.40, "tflops": 1248},
    {"name": "8x A100-80GB", "gpus": 8, "memory_gb": 640, "cost_hr": 32.77, "tflops": 2496},
    {"name": "1x H100-80GB", "gpus": 1, "memory_gb": 80, "cost_hr": 12.29, "tflops": 990},
    {"name": "4x H100-80GB", "gpus": 4, "memory_gb": 320, "cost_hr": 49.16, "tflops": 3960},
    {"name": "8x H100-80GB", "gpus": 8, "memory_gb": 640, "cost_hr": 98.32, "tflops": 7920},
]

def optimize_llm_serving(params_B, target_tps, max_lat, max_cost, quant="fp16"):
    bpp = {"fp16": 2, "int8": 1, "awq": 0.5}[quant]
    model_mem = params_B * bpp  # GB
    candidates = []
    for cfg in GPU_CONFIGS:
        usable = cfg["memory_gb"] * 0.85
        if model_mem > usable: continue
        if cfg["cost_hr"] > max_cost: continue
        est_tps = cfg["tflops"] * 500 / params_B
        est_lat = params_B * 1000 / cfg["tflops"]
        if est_tps >= target_tps and est_lat <= max_lat:
            candidates.append({**cfg, "est_tps": est_tps, "est_lat": est_lat})
    if not candidates: return None
    best = min(candidates, key=lambda c: c["cost_hr"])
    return {"config": best["name"], "cost_per_hour": f"${best['cost_hr']:.2f}", "est_throughput": f"{best['est_tps']:.0f} t/s", "est_latency": f"{best['est_lat']:.0f} ms", "model_memory": f"{model_mem:.0f} GB ({quant})"}

if __name__ == "__main__":
    for s in [{"model":7,"throughput":500,"latency":200,"budget":10,"quant":"fp16"},{"model":70,"throughput":1000,"latency":500,"budget":50,"quant":"awq"},{"model":70,"throughput":2000,"latency":200,"budget":100,"quant":"fp16"}]:
        print(f"\\n{'='*50}")
        print(f"Model: {s['model']}B | Target: {s['throughput']} t/s | Max latency: {s['latency']}ms | Budget: ${s['budget']}/hr")
        r = optimize_llm_serving(s["model"], s["throughput"], s["latency"], s["budget"], s["quant"])
        if r:
            for k, v in r.items(): print(f"  {k}: {v}")
        else: print("  No configuration meets all requirements within budget")`,
    },
  ],
};
