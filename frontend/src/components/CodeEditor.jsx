import React, { useRef, useState, useEffect, lazy, Suspense } from 'react';

/**
 * Code editor component.
 * Attempts to load @monaco-editor/react; falls back to a styled <textarea>.
 */

const LANG_MAP = { python: 'python', bash: 'shell', sh: 'shell', javascript: 'javascript', yaml: 'yaml', json: 'json', dockerfile: 'dockerfile' };

// Try lazy-loading Monaco — if the package isn't installed the catch renders the fallback
let MonacoEditor = null;
try {
  MonacoEditor = lazy(() => import('@monaco-editor/react'));
} catch {
  MonacoEditor = null;
}

function FallbackEditor({ value, onChange, readOnly, height }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange?.(e.target.value)}
      readOnly={readOnly}
      spellCheck={false}
      style={{
        width: '100%',
        height: height || '300px',
        padding: '1rem',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: '0.875rem',
        lineHeight: '1.7',
        color: '#e2e8f0',
        background: '#0d1117',
        border: '1px solid #334155',
        borderRadius: '8px',
        resize: 'vertical',
        outline: 'none',
        tabSize: 4,
      }}
      onKeyDown={e => {
        if (e.key === 'Tab') {
          e.preventDefault();
          const ta = e.target;
          const s = ta.selectionStart;
          const newVal = ta.value.substring(0, s) + '    ' + ta.value.substring(ta.selectionEnd);
          onChange?.(newVal);
          requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 4; });
        }
      }}
    />
  );
}

export default function CodeEditor({ value, onChange, language = 'python', readOnly = false, height = '300px' }) {
  const monacoLang = LANG_MAP[language] || language;
  const [useFallback, setUseFallback] = useState(!MonacoEditor);

  if (useFallback || !MonacoEditor) {
    return <FallbackEditor value={value} onChange={onChange} readOnly={readOnly} height={height} />;
  }

  return (
    <Suspense fallback={<FallbackEditor value={value} onChange={onChange} readOnly={readOnly} height={height} />}>
      <ErrorBoundaryEditor onError={() => setUseFallback(true)}>
        <MonacoEditor
          height={height}
          language={monacoLang}
          value={value}
          onChange={val => onChange?.(val)}
          theme="vs-dark"
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            padding: { top: 12 },
            renderLineHighlight: 'line',
            cursorBlinking: 'smooth',
          }}
        />
      </ErrorBoundaryEditor>
    </Suspense>
  );
}

// Tiny error boundary so that a Monaco load failure falls back gracefully
class ErrorBoundaryEditor extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch() { this.props.onError?.(); }
  render() { return this.state.hasError ? null : this.props.children; }
}
