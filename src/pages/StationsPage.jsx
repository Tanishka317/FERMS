import { useEffect, useState } from 'react';
import { getStations } from '../services/stationService';
import { Building2, Phone, Truck, Users, CheckCircle } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

export default function StationsPage() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getStations().then(s => { setStations(s); setLoading(false); }); }, []);

  if (loading) return <LoadingSpinner message="Loading stations…" fullPage />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 700, color: '#111827' }}>Fire Stations</h2>
        <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Mumbai region fire station directory</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
        {stations.map(station => (
          <div key={station.id} style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', background: '#eff6ff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Building2 size={22} color="#2563eb" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 800, color: '#111827' }}>{station.name}</h3>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>{station.location}</div>
                <div style={{ marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                    {station.status}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '12px', color: '#374151', background: '#f9fafb', borderRadius: '8px', padding: '10px' }}>
              {station.address}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { icon: Truck, label: 'Total Units', value: station.totalUnits },
                { icon: CheckCircle, label: 'Available', value: station.availableUnits, color: '#16a34a' },
                { icon: Users, label: 'Personnel', value: station.totalPersonnel },
                { icon: CheckCircle, label: 'On Duty', value: station.activePersonnel, color: '#16a34a' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <item.icon size={13} color={item.color || '#6b7280'} />
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>{item.label}:</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: item.color || '#111827' }}>{item.value}</span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#374151', fontSize: '12px' }}>
                <Phone size={13} color="#6b7280" /> {station.phone}
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                Officer: {station.commandOfficer}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
