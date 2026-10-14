import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { APIProvider, Map, Marker, InfoWindow } from '@vis.gl/react-google-maps';
import {
  AlertTriangle,
  Building2,
  Navigation,
  Eye,
  Zap,
  MapPin,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import SeverityBadge from './SeverityBadge';
import StatusBadge from './StatusBadge';
import { formatTime } from '../utils/helpers';

const MUMBAI_CENTER = { lat: 19.0760, lng: 72.8777 };

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
 * Generate SVG marker icons encoded as data URLs for standard Google Maps Markers.
 */
function getIncidentMarkerIcon(severity) {
  const color = SEVERITY_COLORS[severity] || '#6b7280';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/>
        </filter>
      </defs>
      <path d="M16 1C8.268 1 2 7.268 2 15c0 10.5 14 25.5 14 25.5s14-15 14-25.5C30 7.268 23.732 1 16 1z"
            fill="${color}" stroke="#ffffff" stroke-width="2" filter="url(#shadow)"/>
      <circle cx="16" cy="15" r="5" fill="#ffffff"/>
    </svg>
  `;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: { width: 32, height: 42 },
    anchor: { x: 16, y: 41 },
  };
}

function getStationMarkerIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
      <rect x="2" y="2" width="26" height="26" rx="6" fill="#1d4ed8" stroke="#ffffff" stroke-width="2"/>
      <path d="M7 22V10l8-4 8 4v12H7z" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
      <path d="M13 22v-6h4v6" fill="none" stroke="#ffffff" stroke-width="2"/>
    </svg>
  `;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: { width: 28, height: 28 },
    anchor: { x: 14, y: 14 },
  };
}

function getUnitMarkerIcon(status) {
  const isAvailable = status === 'Available';
  const color = isAvailable ? '#16a34a' : status === 'On-Site' ? '#dc2626' : '#d97706';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r="12" fill="${color}" stroke="#ffffff" stroke-width="2"/>
      <polygon points="14,6 20,20 14,16 8,20" fill="#ffffff"/>
    </svg>
  `;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: { width: 26, height: 26 },
    anchor: { x: 13, y: 13 },
  };
}

/**
 * Reusable Google Maps Component for FERMS.
 * Safely renders verified incidents, units, and stations.
 */
export default function GoogleIncidentMap({
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
  const [selectedEntity, setSelectedEntity] = useState(null); // { type: 'incident'|'station'|'unit', data: obj }

  const apiKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOOGLE_MAPS_API_KEY) || '';

  // Filter valid coordinates without fabricating missing data
  const validIncidents = incidents.filter(
    i => !['Resolved', 'Archived'].includes(i.status) && isValidCoord(i.latitude, i.longitude)
  );
  const unmappedIncidents = incidents.filter(
    i => !['Resolved', 'Archived'].includes(i.status) && !isValidCoord(i.latitude, i.longitude)
  );

  const validStations = stations.filter(s => isValidCoord(s.latitude, s.longitude));
  const validUnits = units.filter(u => isValidCoord(u.latitude, u.longitude));

  // If no API key is provided, display a clean, non-crashing configuration view
  if (!apiKey || apiKey.trim() === '') {
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
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '14px',
          }}
        >
          <MapPin size={28} color="#2563eb" />
        </div>

        <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
          Interactive Google Maps Integration
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b', maxWidth: '480px', lineHeight: 1.5 }}>
          Real Google Maps tiles will render once a Google Maps API key is configured.
          To activate, add your key to <code>.env</code> in the project root:
        </p>

        <div
          style={{
            background: '#1e293b',
            color: '#f8fafc',
            fontFamily: 'monospace',
            fontSize: '12px',
            padding: '10px 16px',
            borderRadius: '8px',
            marginBottom: '18px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>VITE_GOOGLE_MAPS_API_KEY="your-google-cloud-api-key"</span>
        </div>

        {/* Live Data Summary Notice */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            fontSize: '12px',
            color: '#334155',
          }}
        >
          <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
            📍 {validIncidents.length} Mapped Incidents
          </span>
          <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
            🚒 {validUnits.length} Monitored Units
          </span>
          <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
            🏢 {validStations.length} Fire Stations
          </span>
          {unmappedIncidents.length > 0 && (
            <span style={{ background: '#fef2f2', color: '#991b1b', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
              ⚠️ {unmappedIncidents.length} Incident missing GPS
            </span>
          )}
        </div>

        <p style={{ margin: '14px 0 0', fontSize: '11px', color: '#94a3b8' }}>
          All triage, dispatch, and incident management functions remain operational through the dashboard panels.
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
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={initialCenter}
          defaultZoom={initialZoom}
          gestureHandling="greedy"
          disableDefaultUI={false}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Fire Stations */}
          {showStations &&
            validStations.map(station => (
              <Marker
                key={`stn-${station.id}`}
                position={{ lat: Number(station.latitude), lng: Number(station.longitude) }}
                icon={getStationMarkerIcon()}
                title={station.name}
                onClick={() => setSelectedEntity({ type: 'station', data: station })}
              />
            ))}

          {/* Fire Units */}
          {showUnits &&
            validUnits.map(unit => (
              <Marker
                key={`unit-${unit.id}`}
                position={{ lat: Number(unit.latitude), lng: Number(unit.longitude) }}
                icon={getUnitMarkerIcon(unit.status)}
                title={`${unit.id} (${unit.status})`}
                onClick={() => setSelectedEntity({ type: 'unit', data: unit })}
              />
            ))}

          {/* Active Incidents */}
          {validIncidents.map(incident => (
            <Marker
              key={`inc-${incident.id}`}
              position={{ lat: Number(incident.latitude), lng: Number(incident.longitude) }}
              icon={getIncidentMarkerIcon(incident.severity)}
              title={`${incident.id}: ${incident.type} (${incident.severity})`}
              onClick={() => setSelectedEntity({ type: 'incident', data: incident })}
            />
          ))}

          {/* Info Window for Selected Entity */}
          {selectedEntity && (
            <InfoWindow
              position={{
                lat: Number(selectedEntity.data.latitude),
                lng: Number(selectedEntity.data.longitude),
              }}
              onCloseClick={() => setSelectedEntity(null)}
            >
              <div style={{ maxWidth: '260px', padding: '4px', color: '#111827', fontFamily: 'inherit' }}>
                {selectedEntity.type === 'incident' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280' }}>
                        {selectedEntity.data.id}
                      </span>
                      <SeverityBadge severity={selectedEntity.data.severity} />
                    </div>

                    <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px', color: '#111827' }}>
                      {selectedEntity.data.type}
                    </div>

                    <div style={{ fontSize: '12px', color: '#4b5563', marginBottom: '8px', lineHeight: 1.4 }}>
                      <div><strong>Location:</strong> {selectedEntity.data.location}</div>
                      {selectedEntity.data.reportedAt && (
                        <div><strong>Reported:</strong> {formatTime(selectedEntity.data.reportedAt)}</div>
                      )}
                      <div>
                        <strong>Assigned Units:</strong>{' '}
                        {Array.isArray(selectedEntity.data.assignedUnits) && selectedEntity.data.assignedUnits.length > 0
                          ? selectedEntity.data.assignedUnits.join(', ')
                          : 'None'}
                      </div>
                      {selectedEntity.data.eta && <div><strong>ETA:</strong> {selectedEntity.data.eta}</div>}
                    </div>

                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                      <button
                        onClick={() => navigate(`/incidents/${selectedEntity.data.id}`)}
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
                          onClick={() => navigate('/dispatch', { state: { incidentId: selectedEntity.data.id } })}
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
                  </>
                )}

                {selectedEntity.type === 'station' && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <Building2 size={16} color="#1d4ed8" />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                        {selectedEntity.data.name}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#4b5563', lineHeight: 1.4, marginBottom: '8px' }}>
                      <div><strong>Address:</strong> {selectedEntity.data.address || selectedEntity.data.location}</div>
                      <div><strong>Status:</strong> {selectedEntity.data.status}</div>
                      <div>
                        <strong>Units:</strong> {selectedEntity.data.availableUnits} available / {selectedEntity.data.totalUnits} total
                      </div>
                      {selectedEntity.data.phone && <div><strong>Phone:</strong> {selectedEntity.data.phone}</div>}
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
                  </>
                )}

                {selectedEntity.type === 'unit' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                        {selectedEntity.data.id}
                      </span>
                      <StatusBadge status={selectedEntity.data.status} />
                    </div>
                    <div style={{ fontSize: '11px', color: '#4b5563', lineHeight: 1.4, marginBottom: '8px' }}>
                      <div><strong>Type:</strong> {selectedEntity.data.type}</div>
                      <div><strong>Current Location:</strong> {selectedEntity.data.currentLocation || 'Unknown'}</div>
                      {selectedEntity.data.currentIncidentId && (
                        <div><strong>Incident:</strong> {selectedEntity.data.currentIncidentId}</div>
                      )}
                    </div>
                    <button
                      onClick={() => navigate(`/units/${selectedEntity.data.id}`)}
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
                  </>
                )}
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>

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
          zIndex: 10,
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
          zIndex: 10,
        }}
      >
        {validIncidents.length} Active Incident{validIncidents.length !== 1 ? 's' : ''}
        {unmappedIncidents.length > 0 && ` (${unmappedIncidents.length} unmapped)`}
      </div>
    </div>
  );
}
