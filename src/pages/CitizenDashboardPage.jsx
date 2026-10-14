import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getIncidents } from '../services/incidentService';
import { Flame, Plus, Eye, ClipboardList, CheckCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { timeAgo } from '../utils/helpers';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';

export default function CitizenDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myIncidents, setMyIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchIncidents = useCallback(async () => {
    try {
      setError('');
      const data = await getIncidents({ myReports: true });
      setMyIncidents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load your incidents.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const active = myIncidents.filter(i => !['Resolved', 'Archived'].includes(i.status));
  const resolved = myIncidents.filter(i => ['Resolved', 'Archived'].includes(i.status));

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '24px' }}>
      {/* Welcome */}
      <div style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)', borderRadius: '12px', padding: '24px', color: '#fff' }}>
        <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '6px' }}>Welcome back,</div>
        <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800 }}>{user?.name || 'Citizen'}</h2>
        <div style={{ fontSize: '13px', opacity: 0.75 }}>Mumbai Fire Emergency Response — Citizen Portal</div>
      </div>

      {/* Report Button — Primary CTA */}
      <button
        onClick={() => navigate('/incidents/report')}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
          padding: '20px', background: '#dc2626', border: 'none', borderRadius: '12px',
          color: '#fff', fontSize: '18px', fontWeight: 800, cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(220, 38, 38, 0.35)',
          transition: 'transform 0.1s, box-shadow 0.1s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(220, 38, 38, 0.45)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(220, 38, 38, 0.35)'; }}
        aria-label="Report a fire emergency"
      >
        <Flame size={28} />
        REPORT FIRE EMERGENCY
      </button>

      {/* Emergency numbers */}
      <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '10px', padding: '12px 16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <AlertTriangle size={16} color="#d97706" />
        <span style={{ fontSize: '13px', color: '#92400e', fontWeight: 600 }}>
          For life-threatening emergencies: Call <strong>101</strong> (Fire) or <strong>112</strong> (National Emergency)
        </span>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        {[
          { label: 'My Reports', value: myIncidents.length, icon: ClipboardList, color: '#2563eb' },
          { label: 'Active', value: active.length, icon: Clock, color: '#d97706' },
          { label: 'Resolved', value: resolved.length, icon: CheckCircle, color: '#16a34a' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
            <s.icon size={22} color={s.color} />
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#111827' }}>{s.value}</div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* My Incidents */}
      <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#111827' }}>My Incident Reports</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => { setLoading(true); fetchIncidents(); }}
              title="Refresh reports"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
              aria-label="Refresh reports"
            >
              <RefreshCw size={13} /> Refresh
            </button>
            <button
              onClick={() => navigate('/incidents/report')}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              <Plus size={13} /> New Report
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <LoadingSpinner message="Loading your reports…" />
          </div>
        ) : error ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#b91c1c' }}>
            <AlertTriangle size={32} style={{ margin: '0 auto 8px', display: 'block' }} />
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>{error}</div>
            <button
              onClick={() => { setLoading(true); fetchIncidents(); }}
              style={{ padding: '6px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        ) : myIncidents.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <ClipboardList size={36} color="#9ca3af" style={{ margin: '0 auto 12px', display: 'block' }} />
            <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#374151' }}>No Incident Reports Yet</h4>
            <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: '13px', maxWidth: '340px', marginInline: 'auto' }}>
              You have not reported any fire incidents. In case of an emergency, submit a report immediately.
            </p>
            <button
              onClick={() => navigate('/incidents/report')}
              style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Flame size={15} /> Report Fire Emergency
            </button>
          </div>
        ) : (
          myIncidents.map(incident => (
            <div
              key={incident.id}
              style={{ padding: '14px 16px', borderBottom: '1px solid #f9fafb', display: 'flex', gap: '12px', alignItems: 'flex-start' }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', marginBottom: '2px' }}>{incident.id}</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>{incident.type}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>{incident.location} · {timeAgo(incident.reportedAt)}</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <SeverityBadge severity={incident.severity} />
                  <StatusBadge status={incident.status} />
                  {incident.responseTime && (
                    <span style={{ fontSize: '11px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Clock size={10} /> Response: {incident.responseTime}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigate(`/incidents/${incident.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                aria-label={`Track incident ${incident.id}`}
              >
                <Eye size={12} /> Track
              </button>
            </div>
          ))
        )}
      </div>

      {/* How it works */}
      <div style={{ background: '#f8fafc', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '16px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#374151' }}>How It Works</h3>
        {[
          { step: '1', text: 'Report a fire incident using the button above', color: '#dc2626' },
          { step: '2', text: 'Dispatchers review and verify your report', color: '#d97706' },
          { step: '3', text: 'Fire units are dispatched to your location', color: '#2563eb' },
          { step: '4', text: 'Track the response status in real time', color: '#16a34a' },
        ].map(s => (
          <div key={s.step} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
            <div style={{ width: '22px', height: '22px', background: s.color, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>{s.step}</div>
            <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>{s.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
