import { getSeverityColor } from '../utils/helpers';

export default function SeverityBadge({ severity, size = 'sm' }) {
  const c = getSeverityColor(severity);
  const padding = size === 'lg' ? '4px 12px' : '2px 8px';
  const fontSize = size === 'lg' ? '13px' : '11px';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        borderRadius: '4px',
        padding,
        fontSize,
        fontWeight: 600,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}
      aria-label={`Severity: ${severity}`}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: c.text,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {severity}
    </span>
  );
}
