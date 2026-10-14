export default function StatCard({ title, value, subtitle, icon: Icon, color = '#2563eb', trend, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '10px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s',
        borderLeft: `4px solid ${color}`,
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onMouseEnter={e => onClick && (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            {title}
          </div>
          <div style={{ fontSize: '30px', fontWeight: 700, color: '#111827', lineHeight: 1 }}>
            {value}
          </div>
          {subtitle && (
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{subtitle}</div>
          )}
        </div>
        {Icon && (
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: `${color}18`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={22} color={color} />
          </div>
        )}
      </div>
      {trend && (
        <div style={{ fontSize: '11px', color: trend.positive ? '#15803d' : '#991b1b', fontWeight: 500 }}>
          {trend.positive ? '▲' : '▼'} {trend.label}
        </div>
      )}
    </div>
  );
}
