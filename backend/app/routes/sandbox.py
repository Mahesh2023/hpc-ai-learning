"""Sandbox API — run code snippets and fetch starter templates."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from ..services.code_runner import run_code, ExecutionResult

router = APIRouter(prefix="/api/sandbox", tags=["sandbox"])


class RunRequest(BaseModel):
    language: str  # python | bash
    code: str
    timeout: int | None = None


class RunResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    timed_out: bool = False


@router.post("/run", response_model=RunResponse)
async def sandbox_run(req: RunRequest):
    res: ExecutionResult = await run_code(req.language, req.code, req.timeout)
    return RunResponse(
        stdout=res.stdout, stderr=res.stderr,
        exit_code=res.exit_code, timed_out=res.timed_out,
    )


# ── Starter templates for the sandbox playground ─────────────────────────

TEMPLATES = [
    {
        "id": "python_hello",
        "language": "python",
        "title": "Hello World",
        "description": "Your first Python program",
        "code": 'print("Hello, HPC World!")\n',
    },
    {
        "id": "python_numpy",
        "language": "python",
        "title": "NumPy Matrix Ops",
        "description": "Basic linear algebra with NumPy",
        "code": (
            "import numpy as np\n\n"
            "A = np.random.rand(4, 4)\n"
            "print('Matrix A:\\n', A)\n"
            "print('\\nDeterminant:', np.linalg.det(A))\n"
            "eigenvalues = np.linalg.eigvals(A)\n"
            "print('Eigenvalues:', eigenvalues)\n"
        ),
    },
    {
        "id": "bash_sysinfo",
        "language": "bash",
        "title": "System Info",
        "description": "Explore the host system",
        "code": (
            'echo "=== Kernel ===" && uname -a\n'
            'echo "\\n=== CPUs ===" && nproc\n'
            'echo "\\n=== Memory ===" && free -h\n'
            'echo "\\n=== Disk ===" && df -h /\n'
        ),
    },
    {
        "id": "python_mpi_sim",
        "language": "python",
        "title": "MPI Simulation",
        "description": "Simulate map-reduce across workers",
        "code": (
            "import time, random\n\n"
            "data = list(range(1000))\n"
            "num_workers = 4\n"
            "chunk = len(data) // num_workers\n\n"
            "print(f'Distributing {len(data)} items across {num_workers} workers')\n"
            "total = 0\n"
            "for rank in range(num_workers):\n"
            "    c = data[rank*chunk:(rank+1)*chunk]\n"
            "    partial = sum(x**2 for x in c)\n"
            "    print(f'  Worker {rank}: partial_sum={partial}')\n"
            "    total += partial\n\n"
            "print(f'\\nReduced result: {total}')\n"
            "print(f'Verification : {sum(x**2 for x in data)}')\n"
        ),
    },
    {
        "id": "bash_slurm",
        "language": "bash",
        "title": "SLURM Job Script",
        "description": "Example HPC job submission script",
        "code": (
            "cat << 'EOF'\n"
            "#!/bin/bash\n"
            "#SBATCH --job-name=gpu-train\n"
            "#SBATCH --partition=gpu\n"
            "#SBATCH --nodes=2\n"
            "#SBATCH --ntasks-per-node=4\n"
            "#SBATCH --gres=gpu:4\n"
            "#SBATCH --time=24:00:00\n"
            "#SBATCH --output=train_%j.log\n\n"
            "module load cuda/12.0 python/3.11\n"
            "source venv/bin/activate\n\n"
            "srun python -m torch.distributed.run \\\\\n"
            "  --nproc_per_node=4 --nnodes=2 \\\\\n"
            "  train.py --config config.yaml\n"
            "EOF\n\n"
            "echo ''\n"
            "echo 'This script requests 2 nodes x 4 GPUs = 8 GPUs total'\n"
        ),
    },
    {
        "id": "python_torch_check",
        "language": "python",
        "title": "PyTorch GPU Check",
        "description": "Detect CUDA availability",
        "code": (
            "import sys\n"
            "print(f'Python {sys.version}')\n\n"
            "try:\n"
            "    import torch\n"
            "    print(f'PyTorch {torch.__version__}')\n"
            "    print(f'CUDA available: {torch.cuda.is_available()}')\n"
            "    if torch.cuda.is_available():\n"
            "        print(f'GPU: {torch.cuda.get_device_name(0)}')\n"
            "        print(f'Memory: {torch.cuda.get_device_properties(0).total_mem / 1e9:.1f} GB')\n"
            "except ImportError:\n"
            "    print('PyTorch is not installed in this environment.')\n"
        ),
    },
    {
        "id": "python_data_pipeline",
        "language": "python",
        "title": "Data Pipeline",
        "description": "ETL pipeline pattern",
        "code": (
            "import json, hashlib, time\n\n"
            "# Simulate a mini ETL pipeline\n"
            "raw_data = [\n"
            "    {'id': i, 'sensor': f's{i%4}', 'value': i * 3.14, 'ts': time.time()}\n"
            "    for i in range(20)\n"
            "]\n"
            "print(f'Extract: {len(raw_data)} records')\n\n"
            "# Transform: aggregate by sensor\n"
            "agg = {}\n"
            "for r in raw_data:\n"
            "    s = r['sensor']\n"
            "    agg.setdefault(s, []).append(r['value'])\n\n"
            "summary = {s: {'count': len(v), 'mean': sum(v)/len(v)} for s, v in agg.items()}\n"
            "print('Transform:', json.dumps(summary, indent=2))\n\n"
            "# Load: checksum\n"
            "payload = json.dumps(summary).encode()\n"
            "print(f'Load: {len(payload)} bytes, sha256={hashlib.sha256(payload).hexdigest()[:16]}')\n"
        ),
    },
]


@router.get("/templates")
async def get_templates():
    return TEMPLATES
