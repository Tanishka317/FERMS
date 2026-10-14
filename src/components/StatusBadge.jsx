import { getStatusColor } from '../utils/helpers';

export default function StatusBadge({ status, size = 'sm' }) {
  const c = getStatusColor(status);
  const padding = size === 'lg' ? '4px 12px' : '2px 8px';
  const fontSize = size === 'lg' ? '13px' : '11px';
  return (
    <span
      style={{
        display: 'inline-block',
        background: c.bg,
        color: c.text,
        borderRadius: '4px',
        padding,
        fontSize,
        fontWeight: 600,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}
      aria-label={`Status: ${status}`}
    >
      {status}
    </span>
  );
}
