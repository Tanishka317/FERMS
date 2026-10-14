import { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getAnalytics } from '../services/analyticsService';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../context/ToastContext';
import { Download, FileText, BarChart2 } from 'lucide-react';

const DATE_RANGES = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last 3 Months', value: '90d' },
];

export default function AnalyticsPage() {
  const { addToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('7d');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    getAnalytics(range).then(d => { setData(d); setLoading(false); });
  }, [range]);

  async function handleExport(format) {
    setExporting(true);
    await new Promise(r => setTimeout(r, 1200));
    // TODO: Replace with actual file download from backend
    addToast(`Report exported as ${format.toUpperCase()} successfully.`, 'success');
    setExporting(false);
  }

  if (loading) return <LoadingSpinner message="Loading analytics…" fullPage />;

  const { summary, incidentsPerDay, incidentsBySeverity, incidentsByRegion, avgResponseTimeByRegion, unitUtilization, resolutionTimeByType, monthlyTrend } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 700, color: '#111827' }}>Analytics & Reports</h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>System-wide performance metrics and incident analytics</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {DATE_RANGES.map(dr => (
            <button
              key={dr.value}
              onClick={() => setRange(dr.value)}
              style={{
                padding: '7px 14px', borderRadius: '7px', border: '1px solid',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                background: range === dr.value ? '#1d4ed8' : '#fff',
                color: range === dr.value ? '#fff' : '#374151',
                borderColor: range === dr.value ? '#1d4ed8' : '#d1d5db',
              }}
            >
              {dr.label}
            </button>
          ))}
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: exporting ? 'not-allowed' : 'pointer', color: '#374151' }}
          >
            <Download size={14} /> {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#1d4ed8', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 700, cursor: exporting ? 'not-allowed' : 'pointer', color: '#fff' }}
          >
            <FileText size={14} /> Download PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
        {[
          { label: 'Total Incidents', value: summary.totalIncidents, color: '#2563eb' },
          { label: 'Resolved', value: summary.totalResolved, color: '#16a34a' },
          { label: 'Avg Response Time', value: summary.avgResponseTime, color: '#d97706' },
          { label: 'Avg Resolution', value: summary.avgResolutionTime, color: '#7c3aed' },
          { label: 'Unit Utilization', value: `${summary.unitUtilization}%`, color: '#0891b2' },
          { label: 'Critical Incidents', value: summary.criticalIncidents, color: '#dc2626' },
        ].map(card => (
          <div key={card.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `4px solid ${card.color}` }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{card.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#111827' }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        <ChartCard title="Incidents Per Day" subtitle="Daily incident volume trend">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={incidentsPerDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="incidents" fill="#2563eb" radius={[4, 4, 0, 0]} name="Incidents" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="By Severity" subtitle="Incident severity distribution">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={incidentsBySeverity}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                dataKey="count"
                nameKey="severity"
                label={({ severity, count }) => `${severity}: ${count}`}
                labelLine={false}
              >
                {incidentsBySeverity.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <ChartCard title="Incidents by Region" subtitle="Geographic distribution of incidents">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={incidentsByRegion} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="region" type="category" tick={{ fontSize: 11 }} width={60} />
              <Tooltip />
              <Bar dataKey="incidents" fill="#7c3aed" radius={[0, 4, 4, 0]} name="Incidents" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Avg Response Time (min)" subtitle="By region — lower is better">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={avgResponseTimeByRegion}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="region" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} unit="m" />
              <Tooltip formatter={(v) => [`${v} min`]} />
              <Bar dataKey="time" fill="#ea580c" radius={[4, 4, 0, 0]} name="Avg Time (min)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 3 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <ChartCard title="Unit Utilization (%)" subtitle="Usage rate across all fire units">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={unitUtilization}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="unit" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v) => [`${v}%`]} />
              <Bar dataKey="utilizationPct" fill="#0891b2" radius={[4, 4, 0, 0]} name="Utilization %" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly Trend" subtitle="Incidents reported vs resolved">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="incidents" stroke="#dc2626" strokeWidth={2} dot={{ r: 4 }} name="Reported" />
              <Line type="monotone" dataKey="resolved" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} name="Resolved" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <h3 style={{ margin: '0 0 2px', fontSize: '14px', fontWeight: 700, color: '#111827' }}>{title}</h3>
      {subtitle && <p style={{ margin: '0 0 12px', fontSize: '11px', color: '#9ca3af' }}>{subtitle}</p>}
      {children}
    </div>
  );
}
