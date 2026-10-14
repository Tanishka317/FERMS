import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Check } from 'lucide-react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDate, timeAgo, getNotifPriorityColor } from '../utils/helpers';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const FILTER_TYPES = ['All', 'Critical', 'Dispatch', 'Status Update', 'Escalation', 'System'];

export default function NotificationsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  async function reload() {
    const data = await getNotifications(user?.role);
    setNotifications(data);
    setLoading(false);
  }

  useEffect(() => { reload(); }, []);

  async function handleMarkRead(id) {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    addToast('All notifications marked as read', 'success');
  }

  const filtered = notifications.filter(n => filter === 'All' || n.type === filter);
  const unread = notifications.filter(n => !n.read).length;

  if (loading) return <LoadingSpinner message="Loading notifications…" fullPage />;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 700, color: '#111827' }}>Notification Center</h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
            {unread > 0 ? `${unread} unread notification${unread !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={handleMarkAllRead}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#374151' }}
          >
            <CheckCheck size={15} /> Mark All Read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
        {FILTER_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            style={{
              padding: '6px 14px', borderRadius: '20px', border: '1px solid',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all 0.15s',
              background: filter === type ? '#1d4ed8' : '#fff',
              color: filter === type ? '#fff' : '#374151',
              borderColor: filter === type ? '#1d4ed8' : '#d1d5db',
            }}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" description="You're all caught up! No notifications match this filter." />
        ) : (
          filtered.map(notif => {
            const c = getNotifPriorityColor(notif.priority);
            return (
              <div
                key={notif.id}
                style={{
                  background: notif.read ? '#fff' : `${c.bg}`,
                  border: `1px solid ${notif.read ? '#e5e7eb' : c.dot + '40'}`,
                  borderRadius: '10px',
                  padding: '14px 16px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  boxShadow: notif.read ? 'none' : '0 1px 6px rgba(0,0,0,0.06)',
                }}
              >
                {/* Dot */}
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: notif.read ? '#d1d5db' : c.dot, flexShrink: 0, marginTop: '5px' }} />

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <div>
                      <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: 700, color: c.text, background: `${c.dot}18`, padding: '1px 7px', borderRadius: '4px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {notif.type}
                      </span>
                      <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#111827' }}>{notif.title}</h4>
                    </div>
                    <span style={{ fontSize: '11px', color: '#9ca3af', whiteSpace: 'nowrap', marginLeft: '12px' }}>{timeAgo(notif.timestamp)}</span>
                  </div>
                  <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#374151', lineHeight: 1.6 }}>{notif.message}</p>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>{formatDate(notif.timestamp, { hour: '2-digit', minute: '2-digit', hour12: true, day: '2-digit', month: 'short' })}</span>
                    {!notif.read && (
                      <button
                        onClick={() => handleMarkRead(notif.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                        aria-label={`Mark ${notif.title} as read`}
                      >
                        <Check size={11} /> Mark Read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
