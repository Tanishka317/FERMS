import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import ToastContainer from '../components/Toast';

const PAGE_TITLES = {
  '/dashboard': 'Emergency Operations Dashboard',
  '/incidents': 'Incident Records',
  '/incidents/triage': 'Incident Triage',
  '/incidents/report': 'Report Fire Incident',
  '/dispatch': 'Dispatch Management',
  '/units': 'Fire Unit Management',
  '/stations': 'Fire Stations',
  '/live-tracking': 'Live Incident Tracking',
  '/field-dashboard': 'Field Operations',
  '/citizen-dashboard': 'Citizen Dashboard',
  '/notifications': 'Notification Center',
  '/analytics': 'Analytics & Reports',
  '/reports': 'Reports',
  '/users': 'User Management',
  '/settings': 'System Settings',
};

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const title = Object.entries(PAGE_TITLES).find(([path]) =>
    location.pathname.startsWith(path) && path !== '/incidents'
  )?.[1] || PAGE_TITLES[location.pathname] || 'FERMS';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f8fafc' }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99 }}
        />
      )}

      {/* Sidebar */}
      <div
        style={{
          position: window.innerWidth < 768 ? 'fixed' : 'relative',
          left: window.innerWidth < 768 ? (mobileOpen ? 0 : '-240px') : undefined,
          top: 0, bottom: 0,
          zIndex: 100,
          transition: 'left 0.25s ease',
        }}
      >
        <Sidebar
          collapsed={collapsed && window.innerWidth >= 768}
          onToggle={() => setCollapsed(c => !c)}
        />
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopNavbar title={title} onMenuToggle={() => setMobileOpen(o => !o)} />
        <main
          id="main-content"
          style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#f8fafc' }}
        >
          <Outlet />
        </main>
      </div>

      <ToastContainer />

      {/* Prototype banner */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#1e2d3d', color: '#94a3b8',
        fontSize: '10px', textAlign: 'center',
        padding: '3px', zIndex: 9998, letterSpacing: '0.05em',
      }}>
        FERMS PROTOTYPE — DEMONSTRATION SYSTEM ONLY — NOT CONNECTED TO REAL EMERGENCY SERVICES
      </div>
    </div>
  );
}
