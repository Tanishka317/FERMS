import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, AlertTriangle, Zap, Radio, Truck, Building2,
  Bell, BarChart2, Users, Settings, LogOut, ChevronLeft, ChevronRight,
  Shield, User, FileText, Flame,
} from 'lucide-react';

const ROLE_COLORS = {
  Administrator: '#7c3aed',
  Dispatcher: '#2563eb',
  'Field Officer': '#d97706',
  Citizen: '#16a34a',
  Analyst: '#0891b2',
};

function getRoleNav(role) {
  const all = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Administrator', 'Dispatcher', 'Analyst'] },
    { to: '/incidents', label: 'Incidents', icon: AlertTriangle, roles: ['Administrator', 'Dispatcher', 'Analyst'] },
    { to: '/incidents/triage', label: 'Triage', icon: FileText, roles: ['Administrator', 'Dispatcher'] },
    { to: '/dispatch', label: 'Dispatch', icon: Zap, roles: ['Administrator', 'Dispatcher'] },
    { to: '/live-tracking', label: 'Live Tracking', icon: Radio, roles: ['Administrator', 'Dispatcher'] },
    { to: '/units', label: 'Fire Units', icon: Truck, roles: ['Administrator', 'Dispatcher', 'Analyst'] },
    { to: '/stations', label: 'Stations', icon: Building2, roles: ['Administrator', 'Dispatcher', 'Analyst'] },
    { to: '/notifications', label: 'Notifications', icon: Bell, roles: ['Administrator', 'Dispatcher', 'Field Officer', 'Analyst'] },
    { to: '/analytics', label: 'Analytics', icon: BarChart2, roles: ['Administrator', 'Analyst', 'Dispatcher'] },
    { to: '/reports', label: 'Reports', icon: FileText, roles: ['Administrator', 'Analyst'] },
    { to: '/users', label: 'Users', icon: Users, roles: ['Administrator'] },
    { to: '/settings', label: 'Settings', icon: Settings, roles: ['Administrator', 'Dispatcher', 'Field Officer', 'Analyst', 'Citizen'] },
    // Field Officer
    { to: '/field-dashboard', label: 'Field Ops', icon: Shield, roles: ['Field Officer'] },
    // Citizen
    { to: '/citizen-dashboard', label: 'My Dashboard', icon: User, roles: ['Citizen'] },
    { to: '/incidents/report', label: 'Report Fire', icon: Flame, roles: ['Citizen'] },
  ];
  return all.filter(item => item.roles.includes(role));
}

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = user ? getRoleNav(user.role) : [];
  const roleColor = ROLE_COLORS[user?.role] || '#2563eb';

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <aside
      style={{
        width: collapsed ? '64px' : '240px',
        minWidth: collapsed ? '64px' : '240px',
        background: '#0f1923',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        position: 'relative',
        zIndex: 100,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ padding: collapsed ? '16px 0' : '20px 20px 16px', borderBottom: '1px solid #1e2d3d', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <div style={{ width: '36px', height: '36px', background: '#dc2626', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Flame size={20} color="#fff" />
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>FERMS</div>
            <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1 }}>Fire Emergency Response</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }} aria-label="Main navigation">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            aria-label={label}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: collapsed ? 0 : '10px',
              padding: collapsed ? '10px 0' : '9px 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: '8px',
              marginBottom: '2px',
              textDecoration: 'none',
              background: isActive ? '#1e2d3d' : 'transparent',
              color: isActive ? '#60a5fa' : '#94a3b8',
              fontWeight: isActive ? 600 : 400,
              fontSize: '13.5px',
              transition: 'all 0.15s',
              borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
            })}
            onMouseEnter={e => { if (!e.currentTarget.classList.contains('active')) e.currentTarget.style.background = '#162332'; }}
            onMouseLeave={e => { if (!e.currentTarget.classList.contains('active')) e.currentTarget.style.background = 'transparent'; }}
          >
            {({ isActive }) => (
              <>
                <Icon size={18} style={{ flexShrink: 0 }} color={isActive ? '#60a5fa' : '#94a3b8'} />
                {!collapsed && <span>{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      {user && (
        <div style={{ borderTop: '1px solid #1e2d3d', padding: collapsed ? '12px 8px' : '12px' }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 4px', marginBottom: '4px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: roleColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                {user.name.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.role}</div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
              gap: '8px', padding: collapsed ? '10px 0' : '8px 12px', background: 'none', border: 'none',
              cursor: 'pointer', color: '#64748b', borderRadius: '8px', fontSize: '13px', transition: 'color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#1a0a0a'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'none'; }}
          >
            <LogOut size={16} />
            {!collapsed && 'Logout'}
          </button>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          position: 'absolute', top: '50%', right: '-12px', transform: 'translateY(-50%)',
          width: '24px', height: '24px', borderRadius: '50%', background: '#1e2d3d',
          border: '1px solid #2d3f50', cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 101, color: '#94a3b8',
        }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}
