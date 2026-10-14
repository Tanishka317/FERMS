import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUnits, getUnitStats } from '../services/unitService';
import { Truck, MapPin, Users, Eye } from 'lucide-react';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import SearchBar from '../components/SearchBar';
import { getUnitStatusColor } from '../utils/helpers';

const STATUSES = ['All', 'Available', 'Dispatched', 'En Route', 'On-Site', 'Maintenance', 'Unavailable'];

export default function UnitsPage() {
  const navigate = useNavigate();
  const [units, setUnits] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    Promise.all([getUnits(), getUnitStats()]).then(([u, s]) => {
      setUnits(u); setStats(s); setLoading(false);
    });
  }, []);

  const filtered = units.filter(u => {
    const q = search.toLowerCase();
    const matchQ = !q || u.id.toLowerCase().includes(q) || u.station.toLowerCase().includes(q) || u.type.toLowerCase().includes(q);
    const matchS = statusFilter === 'All' || u.status === statusFilter;
    return matchQ && matchS;
  });

  if (loading) return <LoadingSpinner message="Loading units…" fullPage />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 700, color: '#111827' }}>Fire Unit Management</h2>
        <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Monitor and manage all fire response units</p>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
          {[
            { label: 'Total Units', value: stats.total, color: '#374151' },
            { label: 'Available', value: stats.available, color: '#15803d' },
            { label: 'Dispatched', value: stats.dispatched, color: '#c2410c' },
            { label: 'En Route', value: stats.enRoute, color: '#854d0e' },
            { label: 'On-Site', value: stats.onSite, color: '#991b1b' },
            { label: 'Maintenance', value: stats.maintenance, color: '#6b7280' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '14px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ flex: '1 1 240px' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search units by ID, station, type…" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '13px', color: '#374151', background: '#fff', cursor: 'pointer', outline: 'none' }} aria-label="Filter by status">
          {STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <EmptyState icon={Truck} title="No units found" description="Adjust your search or filter." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['Unit ID', 'Type', 'Station', 'Status', 'Location', 'Crew', 'Incident', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(unit => {
                  const c = getUnitStatusColor(unit.status);
                  return (
                    <tr
                      key={unit.id}
                      style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#111827' }}>{unit.id}</td>
                      <td style={{ padding: '12px 14px', color: '#374151' }}>{unit.type}</td>
                      <td style={{ padding: '12px 14px', color: '#374151', fontSize: '12px' }}>{unit.station}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ background: c.bg, color: c.text, padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>{unit.status}</span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#6b7280', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} /> {unit.currentLocation}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: '#374151' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                          <Users size={12} color="#6b7280" /> {unit.crew}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#6b7280', fontSize: '12px' }}>
                        {unit.currentIncidentId || '—'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <button
                          onClick={() => navigate(`/units/${unit.id}`)}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                          aria-label={`View unit ${unit.id}`}
                        >
                          <Eye size={12} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
