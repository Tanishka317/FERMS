import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Truck, Clock, Activity, CheckCircle, TrendingUp, Zap, Plus } from 'lucide-react';
import { getIncidents, getIncidentStats } from '../services/incidentService';
import { getUnitStats } from '../services/unitService';
import { getUnits } from '../services/unitService';
import { getStations } from '../services/stationService';
import StatCard from '../components/StatCard';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import MapView from '../components/MapView';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatTime, truncate } from '../utils/helpers';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [incidentStats, setIncidentStats] = useState(null);
  const [unitStats, setUnitStats] = useState(null);
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [allIncidents, setAllIncidents] = useState([]);
  const [units, setUnits] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [iStats, uStats, incidents, allUnits, allStations] = await Promise.all([
          getIncidentStats(),
          getUnitStats(),
          getIncidents(),
          getUnits(),
          getStations(),
        ]);
        setIncidentStats(iStats);
        setUnitStats(uStats);
        setRecentIncidents(incidents.filter(i => !['Resolved', 'Archived'].includes(i.status)).slice(0, 8));
        setAllIncidents(incidents);
        setUnits(allUnits);
        setStations(allStations);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <LoadingSpinner message="Loading dashboard…" fullPage />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>Emergency Operations Dashboard</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>Real-time monitoring and dispatch coordination — Mumbai Region</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/incidents/triage')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#374151' }}
          >
            <Activity size={15} /> Triage
          </button>
          <button
            onClick={() => navigate('/dispatch')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: '#dc2626', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', color: '#fff' }}
          >
            <Zap size={15} /> Dispatch Unit
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
        <StatCard
          title="Active Incidents"
          value={incidentStats?.activeIncidents ?? '—'}
          icon={AlertTriangle}
          color="#dc2626"
          onClick={() => navigate('/incidents')}
          subtitle="Requires attention"
        />
        <StatCard
          title="Critical"
          value={incidentStats?.criticalIncidents ?? '—'}
          icon={AlertTriangle}
          color="#dc2626"
          subtitle="Severity: Critical"
        />
        <StatCard
          title="Units Dispatched"
          value={unitStats ? (unitStats.dispatched + unitStats.enRoute + unitStats.onSite) : '—'}
          icon={Truck}
          color="#ea580c"
          onClick={() => navigate('/units')}
          subtitle="Active deployment"
        />
        <StatCard
          title="Units Available"
          value={unitStats?.available ?? '—'}
          icon={CheckCircle}
          color="#16a34a"
          onClick={() => navigate('/units')}
          subtitle="Ready to deploy"
        />
        <StatCard
          title="Avg Response"
          value="7m 42s"
          icon={Clock}
          color="#2563eb"
          subtitle="Current shift"
        />
        <StatCard
          title="Incidents Today"
          value={incidentStats?.incidentsToday ?? '—'}
          icon={TrendingUp}
          color="#7c3aed"
          subtitle="Since 00:00 hrs"
        />
      </div>

      {/* Live Map + Active Incidents */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px', alignItems: 'stretch' }}>
        {/* Map */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#111827' }}>Live Incident Map</h3>
            <button onClick={() => navigate('/live-tracking')} style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View Full →</button>
          </div>
          <div style={{ height: '380px' }}>
            <MapView incidents={allIncidents} units={units} stations={stations} />
          </div>
        </div>

        {/* Active Incidents Panel */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#111827' }}>Active Incidents</h3>
            <button
              onClick={() => navigate('/incidents')}
              style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              View All →
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {recentIncidents.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>No active incidents</div>
            ) : (
              recentIncidents.map(incident => (
                <div
                  key={incident.id}
                  onClick={() => navigate(`/incidents/${incident.id}`)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  role="button"
                  tabIndex={0}
                  aria-label={`View incident ${incident.id}`}
                  onKeyDown={e => e.key === 'Enter' && navigate(`/incidents/${incident.id}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>{incident.id}</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{incident.type}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{incident.location}</div>
                    </div>
                    <SeverityBadge severity={incident.severity} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <StatusBadge status={incident.status} />
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>{formatTime(incident.reportedAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Unit Status Summary */}
      {unitStats && (
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 700, color: '#111827' }}>Unit Status Overview</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {[
              { label: 'Available', value: unitStats.available, color: '#15803d', bg: '#dcfce7' },
              { label: 'Dispatched', value: unitStats.dispatched, color: '#c2410c', bg: '#ffedd5' },
              { label: 'En Route', value: unitStats.enRoute, color: '#854d0e', bg: '#fef9c3' },
              { label: 'On-Site', value: unitStats.onSite, color: '#991b1b', bg: '#fef2f2' },
              { label: 'Maintenance', value: unitStats.maintenance, color: '#6b7280', bg: '#f3f4f6' },
            ].map(s => (
              <div
                key={s.label}
                onClick={() => navigate('/units')}
                style={{ flex: '1 1 120px', background: s.bg, borderRadius: '8px', padding: '12px 16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '2px' }}
                role="button"
                tabIndex={0}
              >
                <div style={{ fontSize: '22px', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: s.color, opacity: 0.8 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
