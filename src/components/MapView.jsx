import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, AlertTriangle, Navigation, Building2, X, Eye, Zap } from 'lucide-react';
import SeverityBadge from './SeverityBadge';
import { formatTime } from '../utils/helpers';

// Realistic map positions for Mumbai incidents (normalized to our display box)
// This component provides a realistic map placeholder.
// TODO: Replace with react-leaflet MapContainer and real tile layers when backend/geo service is ready.

const MUMBAI_BOUNDS = {
  latMin: 18.9, latMax: 19.3,
  lngMin: 72.8, lngMax: 73.0,
};

function latToY(lat) {
  return ((MUMBAI_BOUNDS.latMax - lat) / (MUMBAI_BOUNDS.latMax - MUMBAI_BOUNDS.latMin)) * 100;
}

function lngToX(lng) {
  return ((lng - MUMBAI_BOUNDS.lngMin) / (MUMBAI_BOUNDS.lngMax - MUMBAI_BOUNDS.lngMin)) * 100;
}

const severityMarkerColors = {
  Critical: '#dc2626',
  High: '#ea580c',
  Medium: '#d97706',
  Low: '#2563eb',
};

export default function MapView({ incidents = [], units = [], stations = [] }) {
  const [selectedIncident, setSelectedIncident] = useState(null);
  const navigate = useNavigate();

  const activeIncidents = incidents.filter(i => !['Resolved', 'Archived'].includes(i.status) && i.latitude && i.longitude);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '400px', background: '#e8f0e9', borderRadius: '8px', overflow: 'hidden', border: '1px solid #d1d5db' }}>
      {/* Map Grid Background */}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#c8d8c9" strokeWidth="0.5" />
          </pattern>
          <pattern id="grid-major" width="200" height="200" patternUnits="userSpaceOnUse">
            <path d="M 200 0 L 0 0 0 200" fill="none" stroke="#b0c4b2" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="#e8f0e9" />
        <rect width="100%" height="100%" fill="url(#grid)" />
        <rect width="100%" height="100%" fill="url(#grid-major)" />

        {/* Simulated roads */}
        <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#d0ddd1" strokeWidth="2" />
        <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#d0ddd1" strokeWidth="2" />
        <line x1="0" y1="25%" x2="100%" y2="28%" stroke="#d0ddd1" strokeWidth="1.5" />
        <line x1="0" y1="72%" x2="100%" y2="70%" stroke="#d0ddd1" strokeWidth="1.5" />
        <line x1="30%" y1="0" x2="28%" y2="100%" stroke="#d0ddd1" strokeWidth="1.5" />
        <line x1="75%" y1="0" x2="73%" y2="100%" stroke="#d0ddd1" strokeWidth="1.5" />
        {/* Diagonal connector */}
        <line x1="20%" y1="15%" x2="80%" y2="80%" stroke="#d0ddd1" strokeWidth="1" strokeDasharray="6,4" />

        {/* Water body (sea to west) */}
        <rect x="0" y="0" width="8%" height="100%" fill="#c8dff5" opacity="0.5" />
      </svg>

      {/* Map Label */}
      <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(255,255,255,0.9)', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: '#374151', fontWeight: 600, border: '1px solid #d1d5db' }}>
        Mumbai, Maharashtra — Live View
      </div>

      {/* Prototype Notice */}
      <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(254,243,199,0.95)', borderRadius: '6px', padding: '4px 10px', fontSize: '10px', color: '#92400e', fontWeight: 600, border: '1px solid #fcd34d' }}>
        Map Prototype — Demo Only
      </div>

      {/* Fire Station Markers */}
      {stations.filter(s => s.latitude).map(station => (
        <div
          key={station.id}
          title={station.name}
          style={{
            position: 'absolute',
            left: `${lngToX(station.longitude)}%`,
            top: `${latToY(station.latitude)}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 2,
          }}
        >
          <div style={{ background: '#1d4ed8', border: '2px solid #fff', borderRadius: '6px', padding: '3px', display: 'flex', boxShadow: '0 2px 6px rgba(0,0,0,0.25)', cursor: 'default' }} title={station.name}>
            <Building2 size={12} color="#fff" />
          </div>
        </div>
      ))}

      {/* Unit Markers */}
      {units.filter(u => u.latitude && u.status === 'En Route').map(unit => (
        <div
          key={unit.id}
          title={`${unit.id} — ${unit.status}`}
          style={{
            position: 'absolute',
            left: `${lngToX(unit.longitude)}%`,
            top: `${latToY(unit.latitude)}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 3,
          }}
        >
          <div style={{ background: '#d97706', border: '2px solid #fff', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', cursor: 'default' }}>
            <Navigation size={8} color="#fff" />
          </div>
        </div>
      ))}

      {/* Incident Markers */}
      {activeIncidents.map(incident => {
        const color = severityMarkerColors[incident.severity] || '#6b7280';
        const isCritical = incident.severity === 'Critical';
        return (
          <button
            key={incident.id}
            onClick={() => setSelectedIncident(selectedIncident?.id === incident.id ? null : incident)}
            aria-label={`Incident ${incident.id}: ${incident.type} at ${incident.location}`}
            style={{
              position: 'absolute',
              left: `${lngToX(incident.longitude)}%`,
              top: `${latToY(incident.latitude)}%`,
              transform: 'translate(-50%, -100%)',
              zIndex: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <div style={{ position: 'relative' }}>
              {isCritical && (
                <div style={{
                  position: 'absolute', inset: '-4px', borderRadius: '50%',
                  border: `2px solid ${color}`, animation: 'pulse 2s infinite', opacity: 0.6,
                }} />
              )}
              <MapPin size={28} color={color} fill={color} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
              <style>{`@keyframes pulse { 0%,100%{transform:scale(1);opacity:0.6} 50%{transform:scale(1.4);opacity:0.2} }`}</style>
            </div>
          </button>
        );
      })}

      {/* Incident Popup */}
      {selectedIncident && (
        <div style={{
          position: 'absolute',
          left: `${Math.min(lngToX(selectedIncident.longitude) + 2, 65)}%`,
          top: `${Math.max(latToY(selectedIncident.latitude) - 5, 5)}%`,
          zIndex: 10,
          background: '#fff',
          border: '1px solid #d1d5db',
          borderRadius: '10px',
          padding: '14px',
          width: '240px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>{selectedIncident.id}</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>{selectedIncident.type}</div>
            </div>
            <button onClick={() => setSelectedIncident(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '2px' }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ fontSize: '12px', color: '#374151', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
            <SeverityBadge severity={selectedIncident.severity} />
            <div><strong>Location:</strong> {selectedIncident.location}</div>
            <div><strong>Reported:</strong> {formatTime(selectedIncident.reportedAt)}</div>
            <div><strong>Units:</strong> {selectedIncident.assignedUnits.length || 'None assigned'}</div>
            {selectedIncident.eta && <div><strong>ETA:</strong> {selectedIncident.eta}</div>}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => navigate(`/incidents/${selectedIncident.id}`)}
              style={{ flex: 1, padding: '6px', fontSize: '11px', fontWeight: 600, background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            >
              <Eye size={12} /> View
            </button>
            <button
              onClick={() => navigate('/dispatch', { state: { incidentId: selectedIncident.id } })}
              style={{ flex: 1, padding: '6px', fontSize: '11px', fontWeight: 600, background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            >
              <Zap size={12} /> Dispatch
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(255,255,255,0.95)', borderRadius: '8px', padding: '10px 14px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legend</div>
        {[
          { color: '#dc2626', label: 'Critical' },
          { color: '#ea580c', label: 'High' },
          { color: '#d97706', label: 'Medium' },
          { color: '#2563eb', label: 'Low' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
            <span style={{ fontSize: '11px', color: '#374151' }}>{item.label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', marginTop: '4px', borderTop: '1px solid #e5e7eb', paddingTop: '4px' }}>
          <div style={{ width: '12px', height: '12px', background: '#1d4ed8', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={8} color="#fff" />
          </div>
          <span style={{ fontSize: '11px', color: '#374151' }}>Fire Station</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', background: '#d97706', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Navigation size={7} color="#fff" />
          </div>
          <span style={{ fontSize: '11px', color: '#374151' }}>Unit En Route</span>
        </div>
      </div>

      {/* Active count badge */}
      <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: activeIncidents.length > 0 ? '#dc2626' : '#15803d', color: '#fff', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: 700 }}>
        {activeIncidents.length} Active Incident{activeIncidents.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
