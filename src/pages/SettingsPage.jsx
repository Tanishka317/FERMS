import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Settings, Shield, Bell, Database, Monitor } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 700, color: '#111827' }}>System Settings</h2>
        <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Configure FERMS system preferences</p>
      </div>

      {/* Profile */}
      <SettingsCard icon={Shield} title="Profile Information">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <InfoRow label="Name" value={user?.name} />
          <InfoRow label="Role" value={user?.role} />
          <InfoRow label="Email" value={user?.email} />
          <InfoRow label="Phone" value={user?.phone || 'Not set'} />
          <InfoRow label="Status" value={user?.status} />
          <InfoRow label="Station" value={user?.station || '—'} />
        </div>
      </SettingsCard>

      {/* Notifications */}
      <SettingsCard icon={Bell} title="Notification Preferences">
        {[
          { label: 'Critical incident alerts', desc: 'Get alerted when a critical incident is reported' },
          { label: 'Dispatch notifications', desc: 'Alerts when units are dispatched' },
          { label: 'Status update alerts', desc: 'Notifications for incident status changes' },
          { label: 'System notifications', desc: 'Maintenance and system updates' },
        ].map((pref, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: i < 3 ? '1px solid #f3f4f6' : 'none' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{pref.label}</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{pref.desc}</div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked={i < 3} style={{ width: '16px', height: '16px', cursor: 'pointer' }} onChange={() => addToast('Preference saved', 'success')} />
            </label>
          </div>
        ))}
      </SettingsCard>

      {/* Display */}
      <SettingsCard icon={Monitor} title="Display Settings">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>Theme</label>
            <select style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '13px', width: '200px', outline: 'none' }} onChange={() => addToast('Theme preference saved', 'success')}>
              <option>Light (Default)</option>
              <option>Dark</option>
              <option>High Contrast</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>Default Map Region</label>
            <select style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '13px', width: '200px', outline: 'none' }}>
              <option>Mumbai, Maharashtra</option>
              <option>Thane</option>
              <option>Navi Mumbai</option>
            </select>
          </div>
        </div>
      </SettingsCard>

      {/* System */}
      <SettingsCard icon={Database} title="System Information">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <InfoRow label="Version" value="FERMS v2.1.0-prototype" />
          <InfoRow label="Environment" value="Demo / Prototype" />
          <InfoRow label="Region" value="Mumbai, MH, India" />
          <InfoRow label="Last Updated" value="01 Oct 2026, 05:00 AM" />
        </div>
        <div style={{ marginTop: '12px', padding: '10px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', fontSize: '12px', color: '#92400e' }}>
          <strong>Prototype Disclaimer:</strong> FERMS is a demonstration system for academic/project purposes only. Not connected to real emergency services.
        </div>
      </SettingsCard>
    </div>
  );
}

function SettingsCard({ icon: Icon, title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #f3f4f6' }}>
        <Icon size={16} color="#6b7280" />
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#111827' }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );
}
