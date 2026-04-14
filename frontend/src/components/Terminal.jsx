import React, { useRef, useEffect, useState } from 'react';

/**
 * WebSocket-backed terminal using xterm.js (if installed) or a simple fallback.
 */

export default function TerminalComponent({ wsUrl }) {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [fallback, setFallback] = useState(false);
  const [fallbackHistory, setFallbackHistory] = useState([]);
  const [fallbackInput, setFallbackInput] = useState('');

  // Determine the WebSocket URL
  const resolvedUrl = wsUrl || (() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws/terminal`;
  })();

  useEffect(() => {
    let cancelled = false;

    async function initXterm() {
      try {
        const [xtermMod, fitMod] = await Promise.all([
          import('@xterm/xterm'),
          import('@xterm/addon-fit'),
        ]);
        // Also need the CSS — Vite will handle it
        try { await import('@xterm/xterm/css/xterm.css'); } catch {}

        if (cancelled) return;

        const Terminal = xtermMod.Terminal;
        const FitAddon = fitMod.FitAddon;

        const term = new Terminal({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          theme: {
            background: '#0d1117',
            foreground: '#e2e8f0',
            cursor: '#06b6d4',
            selectionBackground: 'rgba(6,182,212,0.3)',
            black: '#0d1117',
            red: '#ef4444',
            green: '#10b981',
            yellow: '#f59e0b',
            blue: '#3b82f6',
            magenta: '#8b5cf6',
            cyan: '#06b6d4',
            white: '#e2e8f0',
          },
          allowProposedApi: true,
        });

        const fit = new FitAddon();
        term.loadAddon(fit);
        term.open(containerRef.current);
        fit.fit();
        termRef.current = term;

        // Connect WebSocket
        const ws = new WebSocket(resolvedUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
          setError(null);
          // Send initial resize
          ws.send(JSON.stringify({ type: 'resize', rows: term.rows, cols: term.cols }));
        };

        ws.onmessage = (evt) => {
          term.write(evt.data);
        };

        ws.onerror = () => setError('WebSocket connection failed');
        ws.onclose = () => setConnected(false);

        term.onData(data => {
          if (ws.readyState === WebSocket.OPEN) ws.send(data);
        });

        const resizeObs = new ResizeObserver(() => {
          fit.fit();
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'resize', rows: term.rows, cols: term.cols }));
          }
        });
        resizeObs.observe(containerRef.current);

        return () => {
          resizeObs.disconnect();
          ws.close();
          term.dispose();
        };
      } catch {
        // xterm.js not installed — use fallback
        if (!cancelled) {
          setFallback(true);
          connectFallbackWs();
        }
      }
    }

    function connectFallbackWs() {
      const ws = new WebSocket(resolvedUrl);
      wsRef.current = ws;
      ws.onopen = () => { setConnected(true); setError(null); };
      ws.onmessage = (evt) => {
        setFallbackHistory(prev => [...prev.slice(-500), evt.data]);
      };
      ws.onerror = () => setError('WebSocket connection failed');
      ws.onclose = () => setConnected(false);
    }

    const cleanup = initXterm();
    return () => {
      cancelled = true;
      if (cleanup && typeof cleanup.then === 'function') cleanup.then(fn => fn?.());
      wsRef.current?.close();
    };
  }, [resolvedUrl]);

  const sendFallbackCommand = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN && fallbackInput) {
      wsRef.current.send(fallbackInput + '\r');
      setFallbackInput('');
    }
  };

  if (fallback) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0d1117', borderRadius: '8px', border: '1px solid #334155', overflow: 'hidden' }}>
        <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#10b981' : '#ef4444' }} />
          <span style={{ color: '#94a3b8' }}>{connected ? 'Connected' : 'Disconnected'}</span>
          {error && <span style={{ color: '#f87171', marginLeft: 'auto' }}>{error}</span>}
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '0.75rem 1rem', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8125rem', color: '#e2e8f0', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
          {fallbackHistory.join('')}
        </div>
        <div style={{ display: 'flex', borderTop: '1px solid #334155' }}>
          <span style={{ padding: '0.5rem', color: '#06b6d4', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem' }}>$</span>
          <input
            value={fallbackInput}
            onChange={e => setFallbackInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendFallbackCommand(); }}
            style={{ flex: 1, padding: '0.5rem', background: 'transparent', border: 'none', color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem', outline: 'none' }}
            placeholder="Type a command..."
            autoFocus
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0d1117', borderRadius: '8px', border: '1px solid #334155', overflow: 'hidden' }}>
      <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#10b981' : '#ef4444' }} />
        <span style={{ color: '#94a3b8' }}>{connected ? 'Terminal Connected' : 'Connecting...'}</span>
        {error && <span style={{ color: '#f87171', marginLeft: 'auto' }}>{error}</span>}
      </div>
      <div ref={containerRef} style={{ flex: 1, padding: '4px' }} />
    </div>
  );
}
