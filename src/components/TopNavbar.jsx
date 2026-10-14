import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Menu, AlertCircle, Clock, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getNotifications } from '../services/notificationService';
import { formatDate } from '../utils/helpers';

const ROLE_COLORS = {
  Administrator: '#7c3aed',
  Dispatcher: '#2563eb',
  'Field Officer': '#d97706',
  Citizen: '#16a34a',
  Analyst: '#0891b2',
};

export default function TopNavbar({ title, onMenuToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const roleColor = ROLE_COLORS[user?.role] || '#2563eb';

  useEffect(() => {
    if (user) {
      getNotifications(user.role)
        .then(notifs => setUnreadCount(notifs.filter(n => !n.read).length))
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header style={{
      height: '60px',
      background: '#fff',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: '12px',
      flexShrink: 0,
      zIndex: 50,
    }}>
      {/* Mobile menu button */}
      <button
        onClick={onMenuToggle}
        aria-label="Toggle navigation menu"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', padding: '6px' }}
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <div style={{ flex: 1 }}>
        <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111827' }}>{title}</h1>
      </div>

      {/* System Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', padding: '4px 10px' }}>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16a34a', animation: 'blink 2s infinite' }} />
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#15803d' }}>OPERATIONAL</span>
        <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      </div>

      {/* Emergency indicator */}
      <div style={{ display: 'none' }} id="emergency-indicator">
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '4px 10px' }}>
          <AlertCircle size={14} color="#dc2626" />
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#dc2626' }}>EMERGENCY</span>
        </div>
      </div>

      {/* Date/time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#6b7280', fontSize: '12px' }}>
        <Clock size={14} />
        <span>{currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
        <span style={{ color: '#d1d5db' }}>|</span>
        <span>{currentTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </div>

      {/* Notifications */}
      <button
        onClick={() => navigate('/notifications')}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '6px', display: 'flex', borderRadius: '8px' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '2px', right: '2px',
            background: '#dc2626', color: '#fff',
            fontSize: '9px', fontWeight: 700,
            width: '16px', height: '16px',
            borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            border: '1.5px solid #fff',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* User Avatar & Logout */}
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '6px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: roleColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {user.name.charAt(0)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827', lineHeight: 1.2 }}>{user.name.split(' ')[0]}</span>
            <span style={{ fontSize: '10px', color: roleColor, fontWeight: 600, lineHeight: 1.2 }}>{user.role}</span>
          </div>
          <button
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            title="Logout from FERMS"
            aria-label="Logout"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9ca3af',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '6px',
              marginLeft: '4px',
              transition: 'color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fef2f2'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'none'; }}
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </header>
  );
}
