import { INCIDENT_STATUSES } from '../utils/helpers';
import { Check } from 'lucide-react';

const statusColors = {
  done: { bg: '#15803d', text: '#fff', border: '#15803d' },
  current: { bg: '#1d4ed8', text: '#fff', border: '#1d4ed8' },
  pending: { bg: '#fff', text: '#9ca3af', border: '#d1d5db' },
};

export default function IncidentTimeline({ currentStatus }) {
  const currentIdx = INCIDENT_STATUSES.indexOf(currentStatus);

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {INCIDENT_STATUSES.map((status, idx) => {
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isPending = idx > currentIdx;
          const colors = isDone ? statusColors.done : isCurrent ? statusColors.current : statusColors.pending;
          const isLast = idx === INCIDENT_STATUSES.length - 1;

          return (
            <div key={status} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              {/* Circle + Line */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: colors.bg,
                    border: `2px solid ${colors.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    zIndex: 1,
                  }}
                  aria-label={`${status}: ${isDone ? 'Completed' : isCurrent ? 'Current' : 'Pending'}`}
                >
                  {isDone ? (
                    <Check size={14} color="#fff" strokeWidth={3} />
                  ) : isCurrent ? (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />
                  ) : null}
                </div>
                {!isLast && (
                  <div
                    style={{
                      width: '2px',
                      height: '32px',
                      background: isDone ? '#15803d' : '#e5e7eb',
                      margin: '0',
                    }}
                  />
                )}
              </div>

              {/* Label */}
              <div style={{ paddingTop: '4px', paddingBottom: isLast ? 0 : '20px' }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: isCurrent ? 700 : 500,
                    color: isDone ? '#15803d' : isCurrent ? '#1d4ed8' : '#9ca3af',
                    lineHeight: '28px',
                  }}
                >
                  {status}
                  {isCurrent && (
                    <span
                      style={{
                        marginLeft: '8px',
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        verticalAlign: 'middle',
                      }}
                    >
                      CURRENT
                    </span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
