export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '60px 24px', textAlign: 'center', gap: '12px',
    }}>
      {Icon && (
        <div style={{ color: '#d1d5db', marginBottom: '4px' }}>
          <Icon size={48} strokeWidth={1.5} />
        </div>
      )}
      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#374151' }}>{title}</h3>
      {description && (
        <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', maxWidth: '360px', lineHeight: '1.6' }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: '8px' }}>{action}</div>}
    </div>
  );
}
