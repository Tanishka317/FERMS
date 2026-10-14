import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUnitById } from '../services/unitService';
import { ArrowLeft, Truck, MapPin, Users, Radio } from 'lucide-react';
import { getUnitStatusColor } from '../utils/helpers';
import LoadingSpinner from '../components/LoadingSpinner';

export default function UnitDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [unit, setUnit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getUnitById(id)
      .then(data => { setUnit(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [id]);

  if (loading) return <LoadingSpinner message="Loading unit…" fullPage />;
  if (error) return <div style={{ padding: '40px', color: '#991b1b', textAlign: 'center' }}>{error}</div>;
  if (!unit) return null;

  const c = getUnitStatusColor(unit.status);

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <button onClick={() => navigate('/units')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '13px', fontWeight: 500, padding: 0, width: 'fit-content' }}>
        <ArrowLeft size={15} /> Back to Units
      </button>

      <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div style={{ width: '56px', height: '56px', background: '#f3f4f6', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Truck size={28} color="#374151" />
          </div>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800, color: '#111827' }}>{unit.id}</h2>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>{unit.type}</div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <span style={{ background: c.bg, color: c.text, padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 700 }}>{unit.status}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <InfoCard title="Unit Information">
            <Row label="Vehicle No." value={unit.vehicleNo} />
            <Row label="Type" value={unit.type} />
            <Row label="Capacity" value={unit.capacity} />
            <Row label="Last Service" value={unit.lastService} />
          </InfoCard>
          <InfoCard title="Station">
            <Row label="Station" value={unit.station} />
            <Row label="Station ID" value={unit.stationId} />
          </InfoCard>
          <InfoCard title="Current Assignment">
            <Row label="Status" value={<span style={{ background: c.bg, color: c.text, padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>{unit.status}</span>} />
            <Row label="Location" value={<span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} />{unit.currentLocation}</span>} />
            <Row label="Incident" value={unit.currentIncidentId || 'None'} />
            <Row label="ETA" value={unit.eta || '—'} />
          </InfoCard>
          <InfoCard title="Crew">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Users size={16} color="#6b7280" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{unit.crew} crew members</span>
            </div>
            {unit.crewNames.map((name, i) => (
              <div key={i} style={{ fontSize: '12px', color: '#374151', padding: '3px 0', borderBottom: i < unit.crewNames.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                {name}
              </div>
            ))}
          </InfoCard>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, children }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px' }}>
      <h3 style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 600, minWidth: '100px', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '12px', color: '#374151', flex: 1 }}>{value}</span>
    </div>
  );
}
