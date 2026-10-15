import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, User, Clock, Truck, AlertTriangle, Zap, Edit3, Activity } from 'lucide-react';
import { getIncidentById, updateIncidentStatus } from '../services/incidentService';
import { addNotification } from '../services/notificationService';
import IncidentTimeline from '../components/IncidentTimeline';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatTime, INCIDENT_STATUSES, getNextStatus } from '../utils/helpers';
import { notifyDataSync } from '../utils/syncEvents';

export default function IncidentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const canUpdate = user?.role === 'Dispatcher' || user?.role === 'Administrator' || user?.role === 'Field Officer';
  const canDispatch = user?.role === 'Dispatcher' || user?.role === 'Administrator';

  useEffect(() => {
    getIncidentById(id)
      .then(data => { setIncident(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [id]);

  async function handleStatusUpdate(newStatus) {
    setUpdating(true);
    try {
      const updated = await updateIncidentStatus(id, newStatus, `Status updated to ${newStatus} by ${user.name}`);
      setIncident(updated);
      addNotification({
        type: 'Status Update',
        title: `${incident.id} — ${newStatus}`,
        message: `Incident ${incident.id} (${incident.type}) status changed to ${newStatus}.`,
        incidentId: incident.id,
        priority: newStatus === 'Resolved' ? 'medium' : 'low',
        targetRoles: ['Dispatcher', 'Administrator', 'Analyst'],
      });
      notifyDataSync({ type: 'INCIDENT_STATUS_UPDATED', id, status: newStatus });
      addToast(`Status updated to "${newStatus}"`, 'success');
    } catch (err) {
      addToast('Failed to update status', 'error');
    } finally {
      setUpdating(false);
    }
  }

  const isCitizen = user?.role === 'Citizen';
  const backTarget = isCitizen ? '/citizen-dashboard' : '/incidents';
  const backText = isCitizen ? 'Back to Citizen Dashboard' : 'Back to Incidents';

  if (loading) return <LoadingSpinner message="Loading incident…" fullPage />;
  if (error) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#991b1b' }}>
      <AlertTriangle size={48} style={{ marginBottom: '16px' }} />
      <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#111827' }}>Unable to View Incident</h3>
      <p style={{ margin: '0 auto 20px', color: '#6b7280', fontSize: '14px', maxWidth: '460px' }}>{error}</p>
      <button onClick={() => navigate(backTarget)} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
        ← {backText}
      </button>
    </div>
  );
  if (!incident) return null;

  const nextStatus = getNextStatus(incident.status);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(backTarget)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '13px', fontWeight: 500, marginBottom: '12px', padding: 0 }}
        >
          <ArrowLeft size={15} /> {backText}
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 600, marginBottom: '4px' }}>{incident.id}</div>
            <h2 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 800, color: '#111827' }}>{incident.type}</h2>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <SeverityBadge severity={incident.severity} size="lg" />
              <StatusBadge status={incident.status} size="lg" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {canDispatch && !['Resolved', 'Archived', 'Contained'].includes(incident.status) && (
              <button
                onClick={() => navigate('/dispatch', { state: { incidentId: incident.id } })}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: '#dc2626', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', color: '#fff' }}
              >
                <Zap size={15} /> Dispatch Unit
              </button>
            )}
            {canUpdate && nextStatus && (
              <button
                onClick={() => handleStatusUpdate(nextStatus)}
                disabled={updating}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: '#2563eb', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: updating ? 'not-allowed' : 'pointer', color: '#fff', opacity: updating ? 0.7 : 1 }}
              >
                <Activity size={15} /> {updating ? 'Updating…' : `Mark as ${nextStatus}`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', alignItems: 'start' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Incident Info */}
          <InfoCard title="Incident Information" icon={AlertTriangle}>
            <InfoRow label="Type" value={incident.type} />
            <InfoRow label="Location" value={incident.location} />
            <InfoRow label="Address" value={incident.address} />
            <InfoRow label="Description" value={incident.description} />
            <InfoRow label="Severity" value={<SeverityBadge severity={incident.severity} />} />
            <InfoRow label="Affected People" value={incident.affectedPeople || 'Unknown'} />
            {incident.notes && <InfoRow label="Notes" value={incident.notes} />}
          </InfoCard>

          {/* Reporter Info */}
          <InfoCard title="Reporter Information" icon={User}>
            <InfoRow label="Name" value={incident.reporter} />
            <InfoRow label="Phone" value={incident.reporterPhone || 'Not provided'} />
            <InfoRow label="Reported At" value={formatDate(incident.reportedAt)} />
          </InfoCard>

          {/* Response Info */}
          <InfoCard title="Response Information" icon={Truck}>
            <InfoRow label="Assigned Units" value={incident.assignedUnits.length > 0 ? incident.assignedUnits.join(', ') : 'None assigned'} />
            <InfoRow label="Dispatch Time" value={incident.dispatchTime ? formatDate(incident.dispatchTime) : 'Not dispatched'} />
            <InfoRow label="ETA" value={incident.eta || '—'} />
            <InfoRow label="Arrival Time" value={incident.arrivalTime ? formatDate(incident.arrivalTime) : '—'} />
            <InfoRow label="Response Time" value={incident.responseTime || '—'} />
            <InfoRow label="Resolution Time" value={incident.resolutionTime ? formatDate(incident.resolutionTime) : '—'} />
            {incident.outcome && <InfoRow label="Outcome" value={incident.outcome} />}
          </InfoCard>

          {/* Activity Log */}
          <InfoCard title="Activity Log" icon={Clock}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {incident.activityLog.map((entry, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', paddingBottom: '12px', position: 'relative' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: logColors[entry.type] || '#9ca3af', zIndex: 1, marginTop: '4px' }} />
                    {idx < incident.activityLog.length - 1 && (
                      <div style={{ width: '2px', flex: 1, background: '#e5e7eb', marginTop: '2px' }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>{entry.action}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{formatTime(entry.time)}</div>
                  </div>
                </div>
              ))}
            </div>
          </InfoCard>
        </div>

        {/* Right column — Timeline */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', position: 'sticky', top: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 700, color: '#111827' }}>Incident Lifecycle</h3>
          <IncidentTimeline currentStatus={incident.status} />
        </div>
      </div>
    </div>
  );
}

const logColors = {
  report: '#2563eb',
  verify: '#16a34a',
  dispatch: '#dc2626',
  update: '#d97706',
  arrive: '#7c3aed',
  resolve: '#15803d',
};

function InfoCard({ title, icon: Icon, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #f3f4f6' }}>
        <Icon size={16} color="#6b7280" />
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#111827' }}>{title}</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: '12px' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', minWidth: '130px', flexShrink: 0 }}>{label}</div>
      <div style={{ fontSize: '13px', color: '#374151', flex: 1 }}>{value || '—'}</div>
    </div>
  );
}
