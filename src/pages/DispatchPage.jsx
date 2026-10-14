import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Zap, AlertTriangle, Truck, Clock, MapPin, CheckCircle } from 'lucide-react';
import { getIncidents, assignUnitsToIncident } from '../services/incidentService';
import { getAvailableUnits, dispatchUnit } from '../services/unitService';
import { addNotification } from '../services/notificationService';
import { useToast } from '../context/ToastContext';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { formatTime, getDistanceKm } from '../utils/helpers';

export default function DispatchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  const preSelectedId = location.state?.incidentId || '';
  const [incidents, setIncidents] = useState([]);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(preSelectedId);
  const [selectedUnitIds, setSelectedUnitIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);

  useEffect(() => {
    async function load() {
      const [inc, units] = await Promise.all([
        getIncidents(),
        getAvailableUnits(),
      ]);
      setIncidents(inc.filter(i => !['Resolved', 'Archived', 'Contained'].includes(i.status)));
      setAvailableUnits(units);
      setLoading(false);
    }
    load();
  }, []);

  const selectedIncident = incidents.find(i => i.id === selectedIncidentId);

  const unitsWithDistance = useMemo(() => {
    if (!selectedIncident) return availableUnits;
    return availableUnits.map(u => ({
      ...u,
      distance: u.latitude && selectedIncident.latitude
        ? getDistanceKm(u.latitude, u.longitude, selectedIncident.latitude, selectedIncident.longitude)
        : null,
    })).sort((a, b) => (parseFloat(a.distance) || 99) - (parseFloat(b.distance) || 99));
  }, [availableUnits, selectedIncident]);

  function toggleUnit(unitId) {
    setSelectedUnitIds(prev =>
      prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]
    );
  }

  async function handleDispatch() {
    if (!selectedIncidentId || selectedUnitIds.length === 0) {
      addToast('Please select an incident and at least one unit.', 'warning');
      return;
    }
    setDispatching(true);
    try {
      await Promise.all(selectedUnitIds.map(uid => dispatchUnit(uid, selectedIncidentId)));
      await assignUnitsToIncident(selectedIncidentId, selectedUnitIds);

      selectedUnitIds.forEach(uid => {
        addNotification({
          type: 'Dispatch',
          title: `Unit ${uid} Dispatched`,
          message: `Unit ${uid} has been assigned to incident ${selectedIncidentId}.`,
          incidentId: selectedIncidentId,
          priority: 'high',
          targetRoles: ['Dispatcher', 'Administrator', 'Field Officer'],
        });
      });

      addToast(`${selectedUnitIds.length} unit(s) dispatched successfully to ${selectedIncidentId}`, 'success');
      setSelectedUnitIds([]);
      setAvailableUnits(prev => prev.filter(u => !selectedUnitIds.includes(u.id)));
      setTimeout(() => navigate(`/incidents/${selectedIncidentId}`), 1500);
    } catch (err) {
      addToast('Dispatch failed. Please try again.', 'error');
    } finally {
      setDispatching(false);
    }
  }

  if (loading) return <LoadingSpinner message="Loading dispatch console…" fullPage />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 700, color: '#111827' }}>Dispatch Management</h2>
        <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Select an incident and assign available fire units.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Left — Incident Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700, color: '#111827' }}>
              1. Select Incident
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
              {incidents.map(incident => (
                <div
                  key={incident.id}
                  onClick={() => { setSelectedIncidentId(incident.id); setSelectedUnitIds([]); }}
                  style={{
                    padding: '12px',
                    border: `2px solid ${selectedIncidentId === incident.id ? '#2563eb' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: selectedIncidentId === incident.id ? '#eff6ff' : '#fff',
                    transition: 'all 0.15s',
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select incident ${incident.id}`}
                  aria-selected={selectedIncidentId === incident.id}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280' }}>{incident.id}</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{incident.type}</div>
                    </div>
                    <SeverityBadge severity={incident.severity} />
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#6b7280' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><MapPin size={10} /> {incident.location}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Clock size={10} /> {formatTime(incident.reportedAt)}</span>
                  </div>
                  <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <StatusBadge status={incident.status} />
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>Units: {incident.assignedUnits.length}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected incident details */}
          {selectedIncident && (
            <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Incident Details</h3>
              <div style={{ fontSize: '13px', color: '#374151', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div><strong>Address:</strong> {selectedIncident.address}</div>
                <div><strong>Description:</strong> {selectedIncident.description.slice(0, 120)}…</div>
                <div><strong>Reporter:</strong> {selectedIncident.reporter}</div>
                {selectedIncident.affectedPeople > 0 && <div><strong>Affected:</strong> {selectedIncident.affectedPeople} people</div>}
              </div>
            </div>
          )}
        </div>

        {/* Right — Unit Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#111827' }}>2. Assign Units</h3>
            <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#6b7280' }}>{availableUnits.length} unit(s) available</p>
            {availableUnits.length === 0 ? (
              <EmptyState
                icon={Truck}
                title="No available units"
                description="All nearby units are currently assigned. Monitor the units page for availability."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '480px', overflowY: 'auto' }}>
                {unitsWithDistance.map(unit => {
                  const isSelected = selectedUnitIds.includes(unit.id);
                  return (
                    <div
                      key={unit.id}
                      onClick={() => toggleUnit(unit.id)}
                      style={{
                        padding: '12px',
                        border: `2px solid ${isSelected ? '#16a34a' : '#e5e7eb'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: isSelected ? '#f0fdf4' : '#fff',
                        transition: 'all 0.15s',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      role="checkbox"
                      aria-checked={isSelected}
                      tabIndex={0}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', background: isSelected ? '#dcfce7' : '#f3f4f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isSelected ? <CheckCircle size={18} color="#16a34a" /> : <Truck size={18} color="#6b7280" />}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{unit.id}</div>
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>{unit.type} · {unit.station}</div>
                          <div style={{ fontSize: '11px', color: '#9ca3af' }}>Crew: {unit.crew} · {unit.currentLocation}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '12px', flexShrink: 0 }}>
                        {unit.distance && <div style={{ fontWeight: 700, color: '#374151' }}>{unit.distance} km</div>}
                        <div style={{ color: '#16a34a', fontWeight: 600, fontSize: '11px' }}>Available</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dispatch Button */}
          <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {selectedUnitIds.length > 0 && (
              <div style={{ marginBottom: '12px', fontSize: '13px', color: '#374151' }}>
                <strong>{selectedUnitIds.length}</strong> unit(s) selected: {selectedUnitIds.join(', ')}
              </div>
            )}
            <button
              onClick={handleDispatch}
              disabled={dispatching || !selectedIncidentId || selectedUnitIds.length === 0}
              style={{
                width: '100%', padding: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: dispatching || !selectedIncidentId || selectedUnitIds.length === 0 ? '#d1d5db' : '#dc2626',
                color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 800,
                cursor: dispatching || !selectedIncidentId || selectedUnitIds.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
              aria-label="Dispatch selected units to selected incident"
            >
              <Zap size={18} /> {dispatching ? 'Dispatching…' : `Dispatch ${selectedUnitIds.length > 0 ? selectedUnitIds.length : ''} Unit${selectedUnitIds.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
