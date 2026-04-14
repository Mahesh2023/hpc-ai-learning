import React from 'react';

const sizeMap = {
  sm: { height: '6px', fontSize: '0.6875rem' },
  md: { height: '10px', fontSize: '0.75rem' },
  lg: { height: '14px', fontSize: '0.8125rem' },
};

const colorMap = {
  cyan: 'linear-gradient(90deg, #06b6d4, #14b8a6)',
  purple: 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
  green: 'linear-gradient(90deg, #10b981, #34d399)',
  orange: 'linear-gradient(90deg, #f97316, #f59e0b)',
  pink: 'linear-gradient(90deg, #ec4899, #f472b6)',
};

export default function ProgressBar({
  value = 0,
  color = 'cyan',
  label = '',
  size = 'md',
  showPercent = true,
  animated = true,
}) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const sizeConfig = sizeMap[size] || sizeMap.md;
  const gradient = colorMap[color] || colorMap.cyan;

  return (
    <div style={{ width: '100%' }}>
      {(label || showPercent) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.375rem',
            fontSize: sizeConfig.fontSize,
          }}
        >
          {label && (
            <span style={{ color: '#94a3b8', fontWeight: '500' }}>{label}</span>
          )}
          {showPercent && (
            <span style={{ color: '#06b6d4', fontWeight: '600' }}>
              {Math.round(clampedValue)}%
            </span>
          )}
        </div>
      )}
      <div
        style={{
          width: '100%',
          height: sizeConfig.height,
          background: '#0f172a',
          borderRadius: '9999px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: clampedValue + '%',
            height: '100%',
            borderRadius: '9999px',
            background: gradient,
            transition: animated ? 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {animated && clampedValue > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background:
                  'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent)',
                animation: 'progress-shimmer 2s infinite',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
