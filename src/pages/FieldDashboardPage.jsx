import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import { getIncidents, updateIncidentStatus } from '../services/incidentService';
import { getUnits } from '../services/unitService';
import { useToast } from '../context/ToastContext';
import SeverityBadge from '../components/SeverityBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatTime, timeAgo } from '../utils/helpers';
import {
  Shield,
  MapPin,
  Navigation,
  CheckCircle,
  AlertTriangle,
  Clock,
  Compass,
  ExternalLink,
  ChevronDown,
  Layers,
} from 'lucide-react';

const STATUS_FLOW = ['En Route', 'On-Site', 'Contained', 'Resolved'];

const SEVERITY_COLORS = {
  Critical: '#dc2626',
  High: '#ea580c',
  Medium: '#d97706',
  Low: '#2563eb',
};

function isValidCoord(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  if (lat === '' || lng === '') return false;
  const nLat = Number(lat);
  const nLng = Number(lng);
  return !isNaN(nLat) && !isNaN(nLng) && nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180;
}

function createIncidentPinIcon(severity = 'Critical') {
  const color = SEVERITY_COLORS[severity] || '#dc2626';
  const html = `
    <div style="position:relative; width:28px; height:38px; display:flex; align-items:flex-start; justify-content:center;">
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 30 42">
        <path d="M15 1C7.82 1 2 6.82 2 14c0 9.75 13 26 13 26s13-16.25 13-26C28 6.82 22.18 1 15 1z"
              fill="${color}" stroke="#ffffff" stroke-width="2"/>
        <circle cx="15" cy="14" r="5" fill="#ffffff"/>
      </svg>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'ferms-route-incident-marker',
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -35],
  });
}

function createUnitPinIcon(unitId = 'Unit') {
  const html = `
    <div style="background:#1d4ed8; color:#fff; border:2px solid #ffffff; border-radius:14px; padding:3px 8px; font-size:11px; font-weight:800; box-shadow:0 2px 6px rgba(0,0,0,0.3); display:flex; align-items:center; gap:4px; white-space:nowrap;">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#ffffff">
        <polygon points="3 11 22 2 13 21 11 13 3 11"/>
      </svg>
      <span>${unitId}</span>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'ferms-route-unit-marker',
    iconSize: [60, 26],
    iconAnchor: [30, 13],
    popupAnchor: [0, -15],
  });
}

export default function FieldDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [assignedIncidents, setAssignedIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showMapPreview, setShowMapPreview] = useState(true);

  // Determine officer's effective unit
  const officerUnitId = user?.assignedUnit || 'FT-02';

  useEffect(() => {
    Promise.all([
      getIncidents(),
      getUnits().catch(() => []),
    ])
      .then(([allIncidents, allUnits]) => {
        setUnits(allUnits);

        // Filter active incidents assigned to this officer's unit
        const active = allIncidents.filter((i) => !['Resolved', 'Archived'].includes(i.status));

        // Find incidents assigned to officer's unit
        let officerMatches = active.filter((i) => {
          const inAssignedUnits = Array.isArray(i.assignedUnits) && i.assignedUnits.includes(officerUnitId);
          const inDispatches = Array.isArray(i.dispatches) && i.dispatches.some((d) => d.unitId === officerUnitId);
          return inAssignedUnits || inDispatches;
        });

        // If no incident explicitly matches unitId, fallback to any active incident with assignments
        if (officerMatches.length === 0) {
          officerMatches = active.filter((i) => Array.isArray(i.assignedUnits) && i.assignedUnits.length > 0);
        }

        setAssignedIncidents(officerMatches);
        if (officerMatches.length > 0) {
          setSelectedIncidentId(officerMatches[0].id);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load field operations data:', err);
        addToast('Failed to load field assignments.', 'error');
        setLoading(false);
      });
  }, [officerUnitId, addToast]);

  const assignment = useMemo(() => {
    return assignedIncidents.find((i) => i.id === selectedIncidentId) || assignedIncidents[0] || null;
  }, [assignedIncidents, selectedIncidentId]);

  const officerUnit = useMemo(() => {
    return units.find((u) => u.id === officerUnitId) || null;
  }, [units, officerUnitId]);

  const hasDestCoords = useMemo(() => {
    return assignment ? isValidCoord(assignment.latitude, assignment.longitude) : false;
  }, [assignment]);

  const hasOriginCoords = useMemo(() => {
    return officerUnit ? isValidCoord(officerUnit.latitude, officerUnit.longitude) : false;
  }, [officerUnit]);

  // Compute map center and route bounds
  const mapCenter = useMemo(() => {
    if (hasDestCoords) {
      return [Number(assignment.latitude), Number(assignment.longitude)];
    }
    if (hasOriginCoords) {
      return [Number(officerUnit.latitude), Number(officerUnit.longitude)];
    }
    return [19.0760, 72.8777]; // Mumbai center
  }, [hasDestCoords, hasOriginCoords, assignment, officerUnit]);

  async function handleStatusUpdate(newStatus) {
    if (!assignment) return;
    setUpdating(true);
    try {
      const updated = await updateIncidentStatus(
        assignment.id,
        newStatus,
        `Status updated to ${newStatus} by Field Officer ${user?.name || 'Officer'}`
      );
      setAssignedIncidents((prev) =>
        prev
          .map((i) => (i.id === updated.id ? updated : i))
          .filter((i) => !['Resolved', 'Archived'].includes(i.status))
      );
      addToast(`Status updated: ${newStatus}`, 'success');
    } catch (err) {
      addToast(err.message || 'Status update failed.', 'error');
    } finally {
      setUpdating(false);
    }
  }

  function handleOpenRoute() {
    if (!assignment) return;

    if (!hasDestCoords) {
      addToast(
        `Navigation route unavailable: Incident ${assignment.id} has no geographical coordinates recorded in the database. Please navigate to: ${assignment.location}`,
        'error'
      );
      return;
    }

    const destLat = Number(assignment.latitude);
    const destLng = Number(assignment.longitude);

    if (hasOriginCoords) {
      const originLat = Number(officerUnit.latitude);
      const originLng = Number(officerUnit.longitude);

      // Open turn-by-turn routing via OpenStreetMap directions service
      const osmRouteUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${originLat}%2C${originLng}%3B${destLat}%2C${destLng}`;
      if (typeof window !== 'undefined') {
        window.open(osmRouteUrl, '_blank', 'noopener,noreferrer');
      }
      addToast(`Opening turn-by-turn route navigation from ${officerUnit.id} to ${assignment.id}`, 'success');
    } else {
      // Explain missing information gracefully without inventing coordinates
      addToast(
        `Unit origin GPS coordinates unavailable for ${officerUnitId}. Opening directions map directly to destination coordinates (${destLat}, ${destLng}).`,
        'info'
      );
      const osmDestUrl = `https://www.openstreetmap.org/?mlat=${destLat}&mlon=${destLng}#map=16/${destLat}/${destLng}`;
      if (typeof window !== 'undefined') {
        window.open(osmDestUrl, '_blank', 'noopener,noreferrer');
      }
    }
  }

  if (loading) return <LoadingSpinner message="Loading field assignment…" fullPage />;

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '40px', height: '40px', background: '#d97706', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={20} color="#fff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#111827' }}>Field Operations</h2>
            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
              Officer: <strong>{user?.name || 'Officer'}</strong> · Unit: <strong>{officerUnitId}</strong>
            </p>
          </div>
        </div>

        {/* Multi-incident switcher if assigned to multiple active incidents */}
        {assignedIncidents.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280' }}>Assignment:</label>
            <select
              value={selectedIncidentId || ''}
              onChange={(e) => setSelectedIncidentId(e.target.value)}
              style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 700, borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', color: '#111827' }}
            >
              {assignedIncidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  {inc.id} ({inc.type})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Assignment Display */}
      {!assignment ? (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '40px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <CheckCircle size={48} color="#16a34a" style={{ marginBottom: '12px' }} />
          <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: '#111827' }}>No Active Assignment</h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
            Unit {officerUnitId} has no active emergency incidents assigned. Stand by for dispatcher alert.
          </p>
        </div>
      ) : (
        <>
          {/* Incident Overview Card */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#2563eb' }}>{assignment.id}</span>
              <SeverityBadge severity={assignment.severity} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800, color: '#111827' }}>{assignment.type}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#374151', fontSize: '13px', marginBottom: '8px' }}>
              <MapPin size={15} color="#dc2626" /> <strong>{assignment.location}</strong>
            </div>
            <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.5, marginBottom: '12px' }}>
              {assignment.description || 'No description provided.'}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '8px 12px', background: '#f9fafb', borderRadius: '8px', fontSize: '12px', color: '#374151' }}>
              <Clock size={13} color="#6b7280" />
              <span>Reported: {formatTime(assignment.reportedAt)}</span>
              <span style={{ color: '#d1d5db' }}>·</span>
              <span>{timeAgo(assignment.reportedAt)}</span>
            </div>
          </div>

          {/* Navigation & ETA Card */}
          <div style={{ background: '#1d4ed8', borderRadius: '12px', padding: '16px 18px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#bfdbfe', fontWeight: 700, letterSpacing: '0.05em' }}>
                  ESTIMATED TIME OF ARRIVAL
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                  {assignment.eta ? assignment.eta : 'Pending Dispatch'}
                </div>
              </div>

              {/* Functional Open Route Button */}
              <button
                id="btn-open-route"
                onClick={handleOpenRoute}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 16px',
                  background: '#fff',
                  color: '#1d4ed8',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                }}
                aria-label="Open route navigation"
              >
                <Navigation size={16} /> Open Route
              </button>
            </div>

            {/* GPS coordinates status row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '8px', fontSize: '11px', color: '#bfdbfe' }}>
              <div>
                Destination GPS:{' '}
                {hasDestCoords ? (
                  <span style={{ color: '#86efac', fontWeight: 700 }}>
                    {Number(assignment.latitude).toFixed(4)}, {Number(assignment.longitude).toFixed(4)}
                  </span>
                ) : (
                  <span style={{ color: '#fca5a5', fontWeight: 700 }}>Missing Coordinates</span>
                )}
              </div>
              <div>
                Unit GPS:{' '}
                {hasOriginCoords ? (
                  <span style={{ color: '#86efac', fontWeight: 700 }}>
                    {Number(officerUnit.latitude).toFixed(4)}, {Number(officerUnit.longitude).toFixed(4)}
                  </span>
                ) : (
                  <span style={{ color: '#fcd34d', fontWeight: 700 }}>Unavailable</span>
                )}
              </div>
            </div>
          </div>

          {/* Leaflet Route Map Preview */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#374151' }}>
                <Compass size={14} color="#1d4ed8" />
                <span>Incident Route Map</span>
              </div>
              <button
                onClick={() => setShowMapPreview((prev) => !prev)}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: '2px 4px' }}
              >
                {showMapPreview ? 'Hide Map' : 'Show Map'}
              </button>
            </div>

            {showMapPreview && (
              <>
                {hasDestCoords ? (
                  <div style={{ height: '220px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #d1d5db' }}>
                    <MapContainer
                      center={mapCenter}
                      zoom={13}
                      scrollWheelZoom={false}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      {/* Destination Incident Pin */}
                      <Marker
                        position={[Number(assignment.latitude), Number(assignment.longitude)]}
                        icon={createIncidentPinIcon(assignment.severity)}
                      >
                        <Popup>
                          <div style={{ fontSize: '12px' }}>
                            <strong>{assignment.id}</strong>: {assignment.type}
                            <br />
                            Location: {assignment.location}
                          </div>
                        </Popup>
                      </Marker>

                      {/* Origin Unit Pin */}
                      {hasOriginCoords && (
                        <Marker
                          position={[Number(officerUnit.latitude), Number(officerUnit.longitude)]}
                          icon={createUnitPinIcon(officerUnit.id)}
                        >
                          <Popup>
                            <div style={{ fontSize: '12px' }}>
                              <strong>{officerUnit.id}</strong> ({officerUnit.type})
                              <br />
                              Current: {officerUnit.currentLocation || 'En Route'}
                            </div>
                          </Popup>
                        </Marker>
                      )}

                      {/* Connecting Route Line */}
                      {hasOriginCoords && hasDestCoords && (
                        <Polyline
                          positions={[
                            [Number(officerUnit.latitude), Number(officerUnit.longitude)],
                            [Number(assignment.latitude), Number(assignment.longitude)],
                          ]}
                          color="#1d4ed8"
                          weight={4}
                          dashArray="6, 8"
                        />
                      )}
                    </MapContainer>
                  </div>
                ) : (
                  <div style={{ padding: '20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', textAlign: 'center' }}>
                    <AlertTriangle size={24} color="#dc2626" style={{ marginBottom: '6px' }} />
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b', marginBottom: '4px' }}>
                      Geographical Coordinates Missing
                    </div>
                    <div style={{ fontSize: '12px', color: '#7f1d1d' }}>
                      Incident {assignment.id} has no latitude/longitude recorded in the database.
                      <br />
                      Recorded address: <strong>{assignment.location || 'Unknown'}</strong>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Status Update Buttons */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Update Incident Status
            </h4>
            <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#6b7280' }}>
              Current Status: <strong>{assignment.status}</strong>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {STATUS_FLOW.map((s) => {
                const isCurrent = assignment.status === s;
                const isDone = STATUS_FLOW.indexOf(s) < STATUS_FLOW.indexOf(assignment.status);
                return (
                  <button
                    key={s}
                    onClick={() => !isDone && !isCurrent && handleStatusUpdate(s)}
                    disabled={updating || isDone || isCurrent}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: '2px solid',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: isDone || isCurrent ? 'not-allowed' : 'pointer',
                      background: isCurrent ? '#1d4ed8' : isDone ? '#dcfce7' : '#fff',
                      color: isCurrent ? '#fff' : isDone ? '#15803d' : '#374151',
                      borderColor: isCurrent ? '#1d4ed8' : isDone ? '#86efac' : '#d1d5db',
                      opacity: updating ? 0.7 : 1,
                    }}
                    aria-label={`Update status to ${s}`}
                    aria-pressed={isCurrent}
                  >
                    {isDone ? '✓ ' : ''}{s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Emergency notes */}
          {assignment.notes && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <AlertTriangle size={13} color="#dc2626" />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626' }}>EMERGENCY NOTES</span>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#7f1d1d', lineHeight: 1.6 }}>{assignment.notes}</p>
            </div>
          )}

          {/* View full details */}
          <button
            onClick={() => navigate(`/incidents/${assignment.id}`)}
            style={{ padding: '13px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', color: '#374151', width: '100%' }}
          >
            View Full Incident Details
          </button>
        </>
      )}
    </div>
  );
}
