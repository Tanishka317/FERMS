import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Building2,
  Navigation,
  Eye,
  Zap,
  MapPin,
} from 'lucide-react';
import SeverityBadge from './SeverityBadge';
import StatusBadge from './StatusBadge';
import { formatTime } from '../utils/helpers';

const MUMBAI_CENTER = [19.0760, 72.8777];

const SEVERITY_COLORS = {
  Critical: '#dc2626',
  High: '#ea580c',
  Medium: '#d97706',
  Low: '#2563eb',
};

/**
 * Validate that latitude and longitude are valid numeric geographical coordinates.
 */
function isValidCoord(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  if (lat === '' || lng === '') return false;
  const nLat = Number(lat);
  const nLng = Number(lng);
  return !isNaN(nLat) && !isNaN(nLng) && nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180;
}

/**
 * Create custom SVG-based Leaflet DivIcons to avoid asset-loading issues.
 */
function createIncidentIcon(severity) {
  const color = SEVERITY_COLORS[severity] || '#6b7280';
  const html = `
    <div style="position:relative; width:30px; height:42px; display:flex; align-items:flex-start; justify-content:center;">
      <svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">
        <defs>
          <filter id="pin-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.35"/>
          </filter>
        </defs>
        <path d="M15 1C7.82 1 2 6.82 2 14c0 9.75 13 26 13 26s13-16.25 13-26C28 6.82 22.18 1 15 1z"
              fill="${color}" stroke="#ffffff" stroke-width="2" filter="url(#pin-shadow)"/>
        <circle cx="15" cy="14" r="5" fill="#ffffff"/>
      </svg>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'ferms-incident-marker',
    iconSize: [30, 42],
    iconAnchor: [15, 41],
    popupAnchor: [0, -38],
  });
}

function createStationIcon() {
  const html = `
    <div style="width:28px; height:28px; background:#1d4ed8; border:2px solid #ffffff; border-radius:6px; box-shadow:0 2px 6px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center;">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
        <path d="M9 22v-4h6v4"/>
        <path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/>
        <path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/>
        <path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>
      </svg>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'ferms-station-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function createUnitIcon(status) {
  const isAvailable = status === 'Available';
  const color = isAvailable ? '#16a34a' : status === 'On-Site' ? '#dc2626' : '#d97706';
  const html = `
    <div style="width:26px; height:26px; background:${color}; border:2px solid #ffffff; border-radius:50%; box-shadow:0 2px 5px rgba(0,0,0,0.25); display:flex; align-items:center; justify-content:center;">
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="#ffffff" stroke="#ffffff" stroke-width="1">
        <polygon points="3 11 22 2 13 21 11 13 3 11"/>
      </svg>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'ferms-unit-marker',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
}

/**
 * Reusable Leaflet + OpenStreetMap Map Component for FERMS.
 * Uses standard OpenStreetMap raster tiles with visible attribution.
 */
export default function LeafletIncidentMap({
  incidents = [],
  units = [],
  stations = [],
  userRole = 'Dispatcher',
  height = '100%',
  initialCenter = MUMBAI_CENTER,
  initialZoom = 11,
  showStations = true,
  showUnits = true,
}) {
  const navigate = useNavigate();

  // Validate coordinates without fabricating missing data
  const validIncidents = useMemo(
    () => incidents.filter(i => !['Resolved', 'Archived'].includes(i.status) && isValidCoord(i.latitude, i.longitude)),
    [incidents]
  );

  const unmappedIncidents = useMemo(
    () => incidents.filter(i => !['Resolved', 'Archived'].includes(i.status) && !isValidCoord(i.latitude, i.longitude)),
    [incidents]
  );

  const validStations = useMemo(
    () => stations.filter(s => isValidCoord(s.latitude, s.longitude)),
    [stations]
  );

  const validUnits = useMemo(
    () => units.filter(u => isValidCoord(u.latitude, u.longitude)),
    [units]
  );

  // Compute center if valid coordinates exist, otherwise fallback to Mumbai default
  const center = useMemo(() => {
    if (validIncidents.length > 0) {
      const avgLat = validIncidents.reduce((sum, i) => sum + Number(i.latitude), 0) / validIncidents.length;
      const avgLng = validIncidents.reduce((sum, i) => sum + Number(i.longitude), 0) / validIncidents.length;
      return [avgLat, avgLng];
    }
    return initialCenter;
  }, [validIncidents, initialCenter]);

  // Empty state if literally no valid coordinates are available across any entity
  if (validIncidents.length === 0 && validStations.length === 0 && validUnits.length === 0) {
    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height,
          minHeight: '380px',
          background: '#f8fafc',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '28px',
          textAlign: 'center',
        }}
      >
        <MapPin size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
        <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: '#1e293b' }}>No Geocoded Incidents Available</h4>
        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
          All active incidents can be viewed directly from the adjacent list panel.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height,
        minHeight: '380px',
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid #d1d5db',
      }}
    >
      <MapContainer
        center={center}
        zoom={initialZoom}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', minHeight: '380px' }}
      >
        {/* OpenStreetMap Standard Raster Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Fire Stations */}
        {showStations &&
          validStations.map(station => (
            <Marker
              key={`stn-${station.id}`}
              position={[Number(station.latitude), Number(station.longitude)]}
              icon={createStationIcon()}
            >
              <Popup>
                <div style={{ maxWidth: '240px', padding: '2px', color: '#111827', fontFamily: 'inherit' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <Building2 size={16} color="#1d4ed8" />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                      {station.name}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#4b5563', lineHeight: 1.4, marginBottom: '8px' }}>
                    <div><strong>Address:</strong> {station.address || station.location}</div>
                    <div><strong>Status:</strong> {station.status}</div>
                    <div>
                      <strong>Units:</strong> {station.availableUnits} available / {station.totalUnits} total
                    </div>
                    {station.phone && <div><strong>Phone:</strong> {station.phone}</div>}
                  </div>
                  <button
                    onClick={() => navigate('/stations')}
                    style={{
                      width: '100%',
                      padding: '5px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: '#1d4ed8',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    View All Stations
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Fire Units */}
        {showUnits &&
          validUnits.map(unit => (
            <Marker
              key={`unit-${unit.id}`}
              position={[Number(unit.latitude), Number(unit.longitude)]}
              icon={createUnitIcon(unit.status)}
            >
              <Popup>
                <div style={{ maxWidth: '240px', padding: '2px', color: '#111827', fontFamily: 'inherit' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                      {unit.id}
                    </span>
                    <StatusBadge status={unit.status} />
                  </div>
                  <div style={{ fontSize: '11px', color: '#4b5563', lineHeight: 1.4, marginBottom: '8px' }}>
                    <div><strong>Type:</strong> {unit.type}</div>
                    <div><strong>Current Location:</strong> {unit.currentLocation || 'Unknown'}</div>
                    {unit.currentIncidentId && (
                      <div><strong>Assigned Incident:</strong> {unit.currentIncidentId}</div>
                    )}
                  </div>
                  <button
                    onClick={() => navigate(`/units/${unit.id}`)}
                    style={{
                      width: '100%',
                      padding: '5px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: '#374151',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Unit Details
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Active Incidents */}
        {validIncidents.map(incident => (
          <Marker
            key={`inc-${incident.id}`}
            position={[Number(incident.latitude), Number(incident.longitude)]}
            icon={createIncidentIcon(incident.severity)}
          >
            <Popup>
              <div style={{ maxWidth: '260px', padding: '4px', color: '#111827', fontFamily: 'inherit' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280' }}>
                    {incident.id}
                  </span>
                  <SeverityBadge severity={incident.severity} />
                </div>

                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px', color: '#111827' }}>
                  {incident.type}
                </div>

                <div style={{ fontSize: '12px', color: '#4b5563', marginBottom: '8px', lineHeight: 1.4 }}>
                  <div><strong>Location:</strong> {incident.location}</div>
                  {incident.reportedAt && (
                    <div><strong>Reported:</strong> {formatTime(incident.reportedAt)}</div>
                  )}
                  <div>
                    <strong>Assigned Units:</strong>{' '}
                    {Array.isArray(incident.assignedUnits) && incident.assignedUnits.length > 0
                      ? incident.assignedUnits.join(', ')
                      : 'None'}
                  </div>
                  {incident.eta && <div><strong>ETA:</strong> {incident.eta}</div>}
                </div>

                <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                  <button
                    onClick={() => navigate(`/incidents/${incident.id}`)}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <Eye size={12} /> View
                  </button>

                  {/* Gated action: Only Administrator and Dispatcher can initiate dispatch */}
                  {userRole !== 'Analyst' && (
                    <button
                      onClick={() => navigate('/dispatch', { state: { incidentId: incident.id } })}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: '#dc2626',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                    >
                      <Zap size={12} /> Dispatch
                    </button>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* FERMS Legend Overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          background: 'rgba(255,255,255,0.95)',
          borderRadius: '8px',
          padding: '8px 12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          pointerEvents: 'auto',
          zIndex: 1000,
        }}
      >
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#374151', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Legend
        </div>
        {[
          { color: '#dc2626', label: 'Critical' },
          { color: '#ea580c', label: 'High' },
          { color: '#d97706', label: 'Medium' },
          { color: '#2563eb', label: 'Low' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
            <span style={{ fontSize: '10px', color: '#374151' }}>{item.label}</span>
          </div>
        ))}
        {showStations && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', borderTop: '1px solid #e5e7eb', paddingTop: '3px' }}>
            <div style={{ width: '10px', height: '10px', background: '#1d4ed8', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={6} color="#fff" />
            </div>
            <span style={{ fontSize: '10px', color: '#374151' }}>Station</span>
          </div>
        )}
        {showUnits && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <div style={{ width: '10px', height: '10px', background: '#d97706', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Navigation size={6} color="#fff" />
            </div>
            <span style={{ fontSize: '10px', color: '#374151' }}>Unit</span>
          </div>
        )}
      </div>

      {/* Active Incidents Count Badge */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          background: validIncidents.length > 0 ? '#dc2626' : '#15803d',
          color: '#fff',
          borderRadius: '20px',
          padding: '4px 12px',
          fontSize: '11px',
          fontWeight: 700,
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          zIndex: 1000,
        }}
      >
        {validIncidents.length} Active Incident{validIncidents.length !== 1 ? 's' : ''}
        {unmappedIncidents.length > 0 && ` (${unmappedIncidents.length} unmapped)`}
      </div>
    </div>
  );
}
