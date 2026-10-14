import { useToast } from '../context/ToastContext';
import { AlertCircle, CheckCircle, Info, X, AlertTriangle } from 'lucide-react';

const icons = {
  success: <CheckCircle size={18} />,
  error: <AlertCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
};

const colors = {
  success: { bg: '#f0fdf4', border: '#86efac', text: '#166534', icon: '#16a34a' },
  error: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', icon: '#dc2626' },
  warning: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', icon: '#d97706' },
  info: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af', icon: '#3b82f6' },
};

function Toast({ id, message, type }) {
  const { removeToast } = useToast();
  const c = colors[type] || colors.info;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: '8px',
        padding: '12px 16px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        minWidth: '280px',
        maxWidth: '400px',
        animation: 'slideIn 0.25s ease',
      }}
    >
      <span style={{ color: c.icon, flexShrink: 0, marginTop: '1px' }}>{icons[type]}</span>
      <span style={{ color: c.text, fontSize: '14px', flex: 1, lineHeight: '1.5' }}>{message}</span>
      <button
        onClick={() => removeToast(id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, opacity: 0.6, flexShrink: 0 }}
        aria-label="Dismiss notification"
      >
        <X size={15} />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts } = useToast();
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map(t => (
        <Toast key={t.id} {...t} />
      ))}
    </div>
  );
}
