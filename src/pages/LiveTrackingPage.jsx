import { useEffect, useState } from 'react';
import { getIncidents } from '../services/incidentService';
import { getUnits } from '../services/unitService';
import { getStations } from '../services/stationService';
import { useAuth } from '../context/AuthContext';
import GoogleIncidentMap from '../components/GoogleIncidentMap';
import MapView from '../components/MapView';
import LoadingSpinner from '../components/LoadingSpinner';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import { Radio, RefreshCw } from 'lucide-react';
import { formatTime } from '../utils/helpers';

export default function LiveTrackingPage() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [units, setUnits] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    setRefreshing(true);
    const [inc, u, s] = await Promise.all([getIncidents(), getUnits(), getStations()]);
    setIncidents(inc);
    setUnits(u);
    setStations(s);
    setLastRefresh(new Date());
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { loadData(); }, []);

  const activeIncidents = incidents.filter(i => !['Resolved', 'Archived'].includes(i.status));

  if (loading) return <LoadingSpinner message="Loading live tracking…" fullPage />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: 'calc(100vh - 108px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Radio size={18} color="#dc2626" />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>Live Incident Tracking</h2>
          <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, border: '1px solid #86efac' }}>LIVE</span>
        </div>
        <button
          onClick={loadData}
          disabled={refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: refreshing ? 'not-allowed' : 'pointer', color: '#374151' }}
        >
          <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          {refreshing ? 'Refreshing…' : 'Refresh'} · {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '16px', flex: 1, overflow: 'hidden' }}>
        {/* Map */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <GoogleIncidentMap incidents={incidents} units={units} stations={stations} userRole={user?.role} height="100%" />
        </div>

        {/* Side panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
          {/* Active incidents */}
          <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', fontSize: '13px', fontWeight: 700, color: '#111827' }}>
              Active Incidents ({activeIncidents.length})
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {activeIncidents.map(incident => (
                <div key={incident.id} style={{ padding: '10px 14px', borderBottom: '1px solid #f9fafb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280' }}>{incident.id}</div>
                    <SeverityBadge severity={incident.severity} />
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#111827', marginBottom: '2px' }}>{incident.type}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>{incident.location}</div>
                  <StatusBadge status={incident.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Unit statuses */}
          <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '12px 14px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>Unit Status</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {units.slice(0, 8).map(unit => (
                <div key={unit.id} style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', background: '#f9fafb', padding: '5px 8px', borderRadius: '5px' }}>
                  <span style={{ fontWeight: 700, color: '#111827' }}>{unit.id}</span>
                  <span style={{ color: unit.status === 'Available' ? '#16a34a' : unit.status === 'On-Site' ? '#dc2626' : '#d97706', fontWeight: 600 }}>{unit.status.replace('Dispatched', 'Disp.')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
