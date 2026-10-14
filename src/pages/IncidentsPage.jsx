import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Zap, AlertTriangle, Filter } from 'lucide-react';
import { getIncidents } from '../services/incidentService';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import SearchBar from '../components/SearchBar';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { formatDate, formatTime } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';

const PAGE_SIZE = 10;
const SEVERITIES = ['All', 'Critical', 'High', 'Medium', 'Low'];
const STATUSES = ['All', 'Reported', 'Verified', 'Dispatched', 'En Route', 'On-Site', 'Contained', 'Resolved', 'Archived'];

export default function IncidentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('All');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);

  useEffect(() => {
    getIncidents().then(data => { setIncidents(data); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    return incidents.filter(i => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        i.id.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q) ||
        i.type.toLowerCase().includes(q) ||
        i.reporter.toLowerCase().includes(q);
      const matchSev = severity === 'All' || i.severity === severity;
      const matchStat = status === 'All' || i.status === status;
      return matchSearch && matchSev && matchStat;
    });
  }, [incidents, search, severity, status]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleFilterChange(setter) {
    return (val) => { setter(val); setPage(1); };
  }

  const canDispatch = user?.role === 'Dispatcher' || user?.role === 'Administrator';

  if (loading) return <LoadingSpinner message="Loading incidents…" fullPage />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>Incident Records</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>{filtered.length} record{filtered.length !== 1 ? 's' : ''} found</p>
        </div>
        <button
          onClick={() => navigate('/incidents/report')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: '#dc2626', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', color: '#fff' }}
        >
          <Plus size={15} /> Report Incident
        </button>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ flex: '1 1 240px' }}>
          <SearchBar value={search} onChange={handleFilterChange(setSearch)} placeholder="Search by ID, location, type, reporter…" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Filter size={14} color="#6b7280" />
          <FilterSelect label="Severity" value={severity} options={SEVERITIES} onChange={handleFilterChange(setSeverity)} />
          <FilterSelect label="Status" value={status} options={STATUSES} onChange={handleFilterChange(setStatus)} />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {paginated.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No incidents found"
            description="Try adjusting your search or filter criteria."
          />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    {['Incident ID', 'Type', 'Location', 'Severity', 'Reported', 'Status', 'Units', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((incident, idx) => (
                    <tr
                      key={incident.id}
                      style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#111827', fontSize: '12px' }}>{incident.id}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#374151' }}>{incident.type}</div>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#374151' }}>{incident.location}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <SeverityBadge severity={incident.severity} />
                      </td>
                      <td style={{ padding: '12px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {formatTime(incident.reportedAt)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <StatusBadge status={incident.status} />
                      </td>
                      <td style={{ padding: '12px 14px', color: '#374151', textAlign: 'center' }}>
                        {incident.assignedUnits.length || '—'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => navigate(`/incidents/${incident.id}`)}
                            style={actionBtn('#2563eb')}
                            aria-label={`View incident ${incident.id}`}
                          >
                            <Eye size={13} /> View
                          </button>
                          {canDispatch && !['Resolved', 'Archived', 'Contained'].includes(incident.status) && (
                            <button
                              onClick={() => navigate('/dispatch', { state: { incidentId: incident.id } })}
                              style={actionBtn('#dc2626')}
                              aria-label={`Dispatch to incident ${incident.id}`}
                            >
                              <Zap size={13} /> Dispatch
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '14px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-label={`Filter by ${label}`}
      style={{
        padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '7px',
        fontSize: '13px', color: '#374151', background: '#fff', cursor: 'pointer', outline: 'none',
      }}
    >
      {options.map(o => <option key={o} value={o}>{o === 'All' ? `All ${label}` : o}</option>)}
    </select>
  );
}

function actionBtn(color) {
  return {
    display: 'flex', alignItems: 'center', gap: '4px',
    padding: '5px 10px', background: `${color}12`, color, border: `1px solid ${color}30`,
    borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  };
}
