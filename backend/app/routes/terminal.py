"""WebSocket terminal backed by a pty."""

from __future__ import annotations

import asyncio
import fcntl
import json
import os
import pty
import struct
import termios

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..config import TERMINAL_ENABLED, TERMINAL_SHELL, TERMINAL_ROWS, TERMINAL_COLS

router = APIRouter(tags=["terminal"])


@router.websocket("/ws/terminal")
async def terminal_ws(ws: WebSocket):
    if not TERMINAL_ENABLED:
        await ws.close(code=4001, reason="Terminal is disabled")
        return

    await ws.accept()

    # Open a pseudo-terminal
    master_fd, slave_fd = pty.openpty()
    winsize = struct.pack("HHHH", TERMINAL_ROWS, TERMINAL_COLS, 0, 0)
    fcntl.ioctl(slave_fd, termios.TIOCSWINSZ, winsize)

    pid = os.fork()
    if pid == 0:
        # ── child ──
        os.close(master_fd)
        os.setsid()
        fcntl.ioctl(slave_fd, termios.TIOCSCTTY, 0)
        os.dup2(slave_fd, 0)
        os.dup2(slave_fd, 1)
        os.dup2(slave_fd, 2)
        os.close(slave_fd)
        env = {
            **os.environ,
            "TERM": "xterm-256color",
            "COLORTERM": "truecolor",
            "PS1": r"\\[\033[01;32m\\]hpcai\\[\033[00m\\]:\\[\033[01;34m\\]\\w\\[\033[00m\\]\\$ ",
        }
        os.execvpe(TERMINAL_SHELL, [TERMINAL_SHELL, "--login"], env)

    # ── parent ──
    os.close(slave_fd)
    flags = fcntl.fcntl(master_fd, fcntl.F_GETFL)
    fcntl.fcntl(master_fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)

    async def _read_pty():
        """Forward pty output -> WebSocket."""
        while True:
            await asyncio.sleep(0.02)
            try:
                data = os.read(master_fd, 4096)
                if data:
                    await ws.send_text(data.decode("utf-8", errors="replace"))
            except (OSError, BlockingIOError):
                pass
            except Exception:
                break

    reader = asyncio.create_task(_read_pty())

    try:
        while True:
            msg = await ws.receive()
            if msg.get("type") == "websocket.disconnect":
                break

            text = msg.get("text", "")
            if not text:
                continue

            # Resize command: {"type":"resize","rows":N,"cols":N}
            if text.startswith("{"):
                try:
                    obj = json.loads(text)
                    if obj.get("type") == "resize":
                        rows = int(obj.get("rows", TERMINAL_ROWS))
                        cols = int(obj.get("cols", TERMINAL_COLS))
                        ws_pkt = struct.pack("HHHH", rows, cols, 0, 0)
                        fcntl.ioctl(master_fd, termios.TIOCSWINSZ, ws_pkt)
                        os.kill(pid, 28)  # SIGWINCH
                        continue
                except (json.JSONDecodeError, OSError):
                    pass

            try:
                os.write(master_fd, text.encode("utf-8"))
            except OSError:
                break
    except WebSocketDisconnect:
        pass
    finally:
        reader.cancel()
        try:
            os.kill(pid, 9)
            os.waitpid(pid, 0)
        except (OSError, ChildProcessError):
            pass
        try:
            os.close(master_fd)
        except OSError:
            pass
