import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIncidents, updateIncidentStatus } from '../services/incidentService';
import { useToast } from '../context/ToastContext';
import SeverityBadge from '../components/SeverityBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { formatDate, formatTime, timeAgo } from '../utils/helpers';
import { AlertTriangle, Check, X, AlertCircle, Eye, TrendingUp, Clock } from 'lucide-react';

export default function TriagePage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    getIncidents({ status: 'Reported' }).then(data => {
      setIncidents(data);
      setLoading(false);
    });
  }, []);

  async function handleAction(id, action, severity) {
    setActionLoading(prev => ({ ...prev, [id]: action }));
    try {
      if (action === 'Verify') {
        await updateIncidentStatus(id, 'Verified', 'Incident verified by dispatcher');
        setIncidents(prev => prev.filter(i => i.id !== id));
        addToast(`Incident ${id} verified successfully`, 'success');
      } else if (action === 'Reject') {
        setIncidents(prev => prev.filter(i => i.id !== id));
        addToast(`Incident ${id} rejected`, 'info');
      } else if (action === 'Duplicate') {
        setIncidents(prev => prev.filter(i => i.id !== id));
        addToast(`Incident ${id} marked as duplicate`, 'warning');
      } else if (action === 'Escalate') {
        await updateIncidentStatus(id, 'Verified', 'Escalated to high priority by dispatcher');
        setIncidents(prev => prev.filter(i => i.id !== id));
        addToast(`Incident ${id} escalated`, 'warning');
      }
    } catch (err) {
      addToast('Action failed. Please try again.', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }));
    }
  }

  if (loading) return <LoadingSpinner message="Loading triage queue…" fullPage />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 700, color: '#111827' }}>Incident Triage</h2>
        <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
          Review and validate incoming incident reports. Queue: <strong>{incidents.length}</strong> pending.
        </p>
      </div>

      {incidents.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '40px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <EmptyState
            icon={Check}
            title="Triage Queue Clear"
            description="All incoming incidents have been reviewed. No pending reports."
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {incidents.map(incident => (
            <TriageCard
              key={incident.id}
              incident={incident}
              loading={actionLoading[incident.id]}
              onAction={(action) => handleAction(incident.id, action)}
              onView={() => navigate(`/incidents/${incident.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TriageCard({ incident, loading, onAction, onView }) {
  const isOld = (new Date() - new Date(incident.reportedAt)) > 10 * 60 * 1000; // 10 min

  return (
    <div style={{ background: '#fff', borderRadius: '10px', border: `1px solid ${isOld ? '#fca5a5' : '#e5e7eb'}`, padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280' }}>{incident.id}</span>
            {isOld && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#dc2626', fontWeight: 700, background: '#fef2f2', padding: '1px 7px', borderRadius: '4px', border: '1px solid #fca5a5' }}>
                <Clock size={10} /> DELAYED
              </span>
            )}
          </div>
          <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#111827' }}>{incident.type}</h3>
          <div style={{ fontSize: '13px', color: '#374151' }}>{incident.location}</div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{incident.description.slice(0, 100)}…</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          <SeverityBadge severity={incident.severity} size="lg" />
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Reported {timeAgo(incident.reportedAt)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f9fafb', borderRadius: '8px', marginBottom: '12px', fontSize: '12px', color: '#374151' }}>
        <AlertCircle size={13} color="#6b7280" />
        <span><strong>Reporter:</strong> {incident.reporter}</span>
        <span style={{ color: '#d1d5db' }}>·</span>
        <span><strong>Reported:</strong> {formatTime(incident.reportedAt)}</span>
        {incident.affectedPeople > 0 && (
          <>
            <span style={{ color: '#d1d5db' }}>·</span>
            <span><strong>Affected:</strong> {incident.affectedPeople} people</span>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => onAction('Verify')}
          disabled={!!loading}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', background: '#15803d', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading === 'Verify' ? 0.7 : 1 }}
        >
          <Check size={13} /> {loading === 'Verify' ? 'Verifying…' : 'Verify'}
        </button>
        <button
          onClick={() => onAction('Escalate')}
          disabled={!!loading}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading === 'Escalate' ? 0.7 : 1 }}
        >
          <TrendingUp size={13} /> Escalate
        </button>
        <button
          onClick={() => onAction('Duplicate')}
          disabled={!!loading}
          style={{ padding: '8px 14px', background: '#fff', color: '#d97706', border: '1px solid #fcd34d', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          Mark Duplicate
        </button>
        <button
          onClick={() => onAction('Reject')}
          disabled={!!loading}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', background: '#fff', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          <X size={13} /> Reject
        </button>
        <button
          onClick={onView}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}
        >
          <Eye size={13} /> View Details
        </button>
      </div>
    </div>
  );
}
