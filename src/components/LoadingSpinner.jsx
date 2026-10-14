import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading…', fullPage = false }) {
  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: '#6b7280' }}>
      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} color="#2563eb" />
      <span style={{ fontSize: '14px', fontWeight: 500 }}>{message}</span>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (fullPage) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '300px' }}>
        {content}
      </div>
    );
  }
  return content;
}
