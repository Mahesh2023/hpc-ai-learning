import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, FileCode, Clock, AlertTriangle, CheckCircle2, Copy, Terminal as TermIcon } from 'lucide-react';
import CodeEditor from '../components/CodeEditor';
import TerminalComponent from '../components/Terminal';
import { runCodeAPI, getTemplatesAPI } from '../utils/api';

const TABS = [
  { id: 'editor', label: 'Code Editor', icon: FileCode },
  { id: 'terminal', label: 'Terminal', icon: TermIcon },
];

export default function Sandbox() {
  const [activeTab, setActiveTab] = useState('editor');
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('# Write your code here\nprint("Hello, HPC World!")\n');
  const [output, setOutput] = useState(null);
  const [running, setRunning] = useState(false);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    getTemplatesAPI().then(setTemplates).catch(() => {});
  }, []);

  const handleRun = async () => {
    setRunning(true);
    setOutput(null);
    try {
      const res = await runCodeAPI(language, code);
      setOutput(res);
    } catch (err) {
      setOutput({ stdout: '', stderr: err.message, exit_code: 1, timed_out: false });
    } finally {
      setRunning(false);
    }
  };

  const loadTemplate = (tmpl) => {
    setLanguage(tmpl.language);
    setCode(tmpl.code);
    setOutput(null);
  };

  const copyOutput = () => {
    const text = output ? (output.stdout || '') + (output.stderr || '') : '';
    navigator.clipboard.writeText(text);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)', gap: '1rem' }} className="animate-fadeIn">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.025em' }}>
            <span style={{ color: '#06b6d4' }}>Sandbox</span> Lab
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Write, run, and experiment with code in a safe environment
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', background: '#1e293b', borderRadius: '10px', border: '1px solid #334155', overflow: 'hidden' }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem',
                background: active ? 'rgba(6,182,212,0.15)' : 'transparent',
                color: active ? '#06b6d4' : '#94a3b8', border: 'none', cursor: 'pointer',
                fontSize: '0.875rem', fontWeight: active ? '600' : '500', transition: 'all 150ms',
              }}>
                <Icon size={16} />{tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'terminal' ? (
        <div style={{ flex: 1, minHeight: 0 }}>
          <TerminalComponent />
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', gap: '1rem', minHeight: 0 }}>
          {/* Left: Editor */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <select value={language} onChange={e => setLanguage(e.target.value)} style={{
                padding: '0.375rem 0.75rem', background: '#1e293b', border: '1px solid #334155',
                borderRadius: '8px', color: '#f1f5f9', fontSize: '0.8125rem', outline: 'none', cursor: 'pointer',
              }}>
                <option value="python">Python</option>
                <option value="bash">Bash</option>
              </select>

              <button onClick={handleRun} disabled={running} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem',
                background: running ? '#334155' : 'linear-gradient(135deg, #10b981, #06b6d4)',
                color: running ? '#94a3b8' : '#0f172a', border: 'none', borderRadius: '8px',
                fontWeight: '600', fontSize: '0.875rem', cursor: running ? 'not-allowed' : 'pointer',
                boxShadow: running ? 'none' : '0 2px 8px rgba(16,185,129,0.3)', transition: 'all 150ms',
              }}>
                {running ? <><div className="loading-spinner sm" />Running...</> : <><Play size={16} />Run Code</>}
              </button>

              <button onClick={() => { setCode(''); setOutput(null); }} style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem',
                background: '#1e293b', border: '1px solid #334155', borderRadius: '8px',
                color: '#94a3b8', fontSize: '0.8125rem', cursor: 'pointer', transition: 'all 150ms',
              }}>
                <RotateCcw size={14} />Clear
              </button>
            </div>

            {/* Code editor */}
            <div style={{ flex: 1, minHeight: 0, borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155' }}>
              <CodeEditor value={code} onChange={setCode} language={language} height="100%" />
            </div>

            {/* Output */}
            {output && (
              <div style={{ marginTop: '0.75rem', background: '#0d1117', border: '1px solid #334155', borderRadius: '8px', maxHeight: '240px', overflow: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 1rem', borderBottom: '1px solid #1e293b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                    {output.exit_code === 0 ? <CheckCircle2 size={14} color="#10b981" /> : <AlertTriangle size={14} color="#ef4444" />}
                    <span style={{ color: output.exit_code === 0 ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                      {output.timed_out ? 'Timed Out' : output.exit_code === 0 ? 'Success' : `Exit ${output.exit_code}`}
                    </span>
                  </div>
                  <button onClick={copyOutput} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.25rem' }} title="Copy output">
                    <Copy size={14} />
                  </button>
                </div>
                <pre style={{ padding: '0.75rem 1rem', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8125rem', lineHeight: '1.6', color: '#e2e8f0', whiteSpace: 'pre-wrap', margin: 0, background: 'transparent', border: 'none' }}>
                  {output.stdout}{output.stderr && <span style={{ color: '#fca5a5' }}>{output.stderr}</span>}
                </pre>
              </div>
            )}
          </div>

          {/* Right: Templates */}
          <div style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '700', color: '#f1f5f9', marginBottom: '0.25rem' }}>Templates</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflow: 'auto', flex: 1 }}>
              {templates.map(tmpl => (
                <button key={tmpl.id} onClick={() => loadTemplate(tmpl)} style={{
                  display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.75rem',
                  background: '#1e293b', border: '1px solid #334155', borderRadius: '8px',
                  textAlign: 'left', cursor: 'pointer', transition: 'all 150ms', color: '#f1f5f9',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#06b6d4'; e.currentTarget.style.background = '#253348'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.background = '#1e293b'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileCode size={14} color="#06b6d4" />
                    <span style={{ fontSize: '0.8125rem', fontWeight: '600' }}>{tmpl.title}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{tmpl.description}</span>
                  <span style={{
                    alignSelf: 'flex-start', fontSize: '0.625rem', fontWeight: '700', textTransform: 'uppercase',
                    padding: '0.125rem 0.375rem', borderRadius: '4px', letterSpacing: '0.05em',
                    background: tmpl.language === 'python' ? 'rgba(16,185,129,0.1)' : 'rgba(139,92,246,0.1)',
                    color: tmpl.language === 'python' ? '#10b981' : '#8b5cf6',
                  }}>{tmpl.language}</span>
                </button>
              ))}
              {templates.length === 0 && (
                <p style={{ color: '#64748b', fontSize: '0.8125rem', padding: '1rem', textAlign: 'center' }}>
                  Templates load when the backend is running.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
