"""Sandboxed code execution service."""

from __future__ import annotations

import asyncio
import os
import resource
import tempfile
from dataclasses import dataclass

from ..config import SANDBOX_ENABLED, SANDBOX_TIMEOUT, SANDBOX_MAX_OUTPUT


@dataclass
class ExecutionResult:
    stdout: str
    stderr: str
    exit_code: int
    timed_out: bool = False


def _set_limits():
    """Resource limits for child process: 256 MB RAM, 10 s CPU, 64 open files."""
    resource.setrlimit(resource.RLIMIT_AS, (256 * 1024 * 1024, 256 * 1024 * 1024))
    resource.setrlimit(resource.RLIMIT_CPU, (10, 10))
    try:
        resource.setrlimit(resource.RLIMIT_NOFILE, (64, 64))
    except ValueError:
        pass


async def run_code(language: str, code: str, timeout: int | None = None) -> ExecutionResult:
    """Execute code in a sandboxed subprocess."""
    if not SANDBOX_ENABLED:
        return ExecutionResult("", "Code execution is disabled on this server.", 1)

    timeout = timeout or SANDBOX_TIMEOUT

    if language == "python":
        return await _run_python(code, timeout)
    elif language == "bash":
        return await _run_bash(code, timeout)
    return ExecutionResult("", f"Unsupported language: {language}", 1)


async def _run_python(code: str, timeout: int) -> ExecutionResult:
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
        f.write(code)
        tmp = f.name
    try:
        return await _exec(["python3", "-u", tmp], timeout)
    finally:
        os.unlink(tmp)


async def _run_bash(code: str, timeout: int) -> ExecutionResult:
    # Block obviously destructive patterns
    dangerous = ["rm -rf /", "mkfs", ":(){", "dd if=/dev/zero", "fork bomb"]
    low = code.lower()
    for pat in dangerous:
        if pat in low:
            return ExecutionResult("", "Blocked: potentially destructive command.", 1)

    with tempfile.NamedTemporaryFile(mode="w", suffix=".sh", delete=False) as f:
        f.write("#!/bin/bash\nset -euo pipefail\n" + code)
        tmp = f.name
    try:
        return await _exec(["bash", tmp], timeout)
    finally:
        os.unlink(tmp)


async def _exec(cmd: list[str], timeout: int) -> ExecutionResult:
    env = {**os.environ, "PYTHONDONTWRITEBYTECODE": "1", "PYTHONUNBUFFERED": "1"}
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            preexec_fn=_set_limits,
            env=env,
        )
    except FileNotFoundError as e:
        return ExecutionResult("", str(e), 127)

    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        return ExecutionResult(
            stdout=stdout.decode("utf-8", errors="replace")[: SANDBOX_MAX_OUTPUT],
            stderr=stderr.decode("utf-8", errors="replace")[: SANDBOX_MAX_OUTPUT],
            exit_code=proc.returncode or 0,
        )
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        return ExecutionResult("", f"Execution timed out after {timeout}s.", 1, timed_out=True)
