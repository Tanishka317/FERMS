import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getIncidents, updateIncidentStatus } from '../services/incidentService';
import { useToast } from '../context/ToastContext';
import SeverityBadge from '../components/SeverityBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatTime, timeAgo } from '../utils/helpers';
import { Shield, MapPin, Navigation, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

const STATUS_FLOW = ['En Route', 'On-Site', 'Contained', 'Resolved'];

export default function FieldDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    // Field officer sees their current assignment — INC-2026-0047 as demo
    getIncidents().then(incidents => {
      const assigned = incidents.find(i => i.assignedUnits.length > 0 && !['Resolved', 'Archived'].includes(i.status));
      setAssignment(assigned || null);
      setLoading(false);
    });
  }, []);

  async function handleStatusUpdate(newStatus) {
    if (!assignment) return;
    setUpdating(true);
    try {
      const updated = await updateIncidentStatus(
        assignment.id,
        newStatus,
        `Status updated to ${newStatus} by Field Officer ${user.name}`
      );
      setAssignment(updated);
      addToast(`Status updated: ${newStatus}`, 'success');
    } catch {
      addToast('Status update failed.', 'error');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <LoadingSpinner message="Loading field assignment…" fullPage />;

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '40px', height: '40px', background: '#d97706', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={20} color="#fff" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#111827' }}>Field Operations</h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>Officer: {user?.name} · Unit: {user?.assignedUnit || 'FT-02'}</p>
        </div>
      </div>

      {/* Assignment */}
      {!assignment ? (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '40px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <CheckCircle size={48} color="#16a34a" style={{ marginBottom: '12px' }} />
          <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: '#111827' }}>No Active Assignment</h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>You have no active incident assignment. Stand by for dispatch.</p>
        </div>
      ) : (
        <>
          {/* Incident Card */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280' }}>{assignment.id}</span>
              <SeverityBadge severity={assignment.severity} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800, color: '#111827' }}>{assignment.type}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#374151', fontSize: '13px', marginBottom: '8px' }}>
              <MapPin size={14} color="#6b7280" /> {assignment.location}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.6, marginBottom: '12px' }}>
              {assignment.description.slice(0, 150)}…
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '8px 12px', background: '#f9fafb', borderRadius: '8px', fontSize: '12px', color: '#374151' }}>
              <Clock size={13} color="#6b7280" />
              <span>Reported: {formatTime(assignment.reportedAt)}</span>
              <span style={{ color: '#d1d5db' }}>·</span>
              <span>{timeAgo(assignment.reportedAt)}</span>
            </div>
          </div>

          {/* ETA and Navigation */}
          {assignment.eta && (
            <div style={{ background: '#1d4ed8', borderRadius: '12px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#93c5fd', fontWeight: 600 }}>ESTIMATED TIME OF ARRIVAL</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{assignment.eta}</div>
              </div>
              <button
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: '#fff', color: '#1d4ed8', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                aria-label="Open route navigation"
              >
                <Navigation size={16} /> Open Route
              </button>
            </div>
          )}

          {/* Status Update Buttons */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Update Status</h4>
            <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#6b7280' }}>Current: <strong>{assignment.status}</strong></p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {STATUS_FLOW.map(s => {
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
