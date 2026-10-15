import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Camera, AlertTriangle, CheckCircle } from 'lucide-react';
import { createIncident } from '../services/incidentService';
import { addNotification } from '../services/notificationService';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { notifyDataSync } from '../utils/syncEvents';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDate } from '../utils/helpers';

const INCIDENT_TYPES = [
  'Residential Building Fire', 'Commercial Fire', 'Industrial Fire',
  'Vehicle Fire', 'Forest / Scrubland Fire', 'Warehouse Fire',
  'Chemical Spill & Fire', 'Electrical Fire', 'Gas Leak',
  'Slum / Shanty Fire', 'Garbage Dump Fire', 'Transformer Explosion', 'Other',
];

export default function ReportIncidentPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [locating, setLocating] = useState(false);

  const [form, setForm] = useState({
    reporter: user?.name || '',
    reporterPhone: user?.phone || '',
    type: '',
    location: '',
    address: '',
    latitude: '',
    longitude: '',
    severity: 'Medium',
    description: '',
    affectedPeople: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});

  function update(field, val) {
    setForm(f => ({ ...f, [field]: val }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }));
  }

  function validate() {
    const newErrors = {};
    if (!form.reporter.trim()) newErrors.reporter = 'Reporter name is required';
    if (!form.type) newErrors.type = 'Please select an incident type';
    if (!form.location.trim()) newErrors.location = 'Location is required';
    if (!form.description.trim()) newErrors.description = 'Description is required';
    if (form.description.trim().length < 10) newErrors.description = 'Please provide more detail (at least 10 characters)';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleLocate() {
    setLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          update('latitude', pos.coords.latitude.toFixed(6));
          update('longitude', pos.coords.longitude.toFixed(6));
          setLocating(false);
          addToast('Location detected successfully', 'success');
        },
        () => {
          addToast('Could not detect location. Please enter manually.', 'warning');
          setLocating(false);
        }
      );
    } else {
      addToast('Geolocation not supported. Please enter coordinates manually.', 'info');
      setLocating(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return; // Prevent double submission
    if (!validate()) return;

    setLoading(true);
    try {
      const incident = await createIncident({
        ...form,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        affectedPeople: form.affectedPeople ? parseInt(form.affectedPeople) : 0,
      });

      addNotification({
        type: 'Status Update',
        title: `New Incident Reported — ${incident.id}`,
        message: `${form.severity} severity ${form.type} reported at ${form.location} by ${form.reporter}.`,
        incidentId: incident.id,
        priority: form.severity === 'Critical' ? 'critical' : form.severity === 'High' ? 'high' : 'medium',
        targetRoles: ['Dispatcher', 'Administrator'],
      });

      setSubmitted(incident);
      notifyDataSync({ type: 'INCIDENT_CREATED', id: incident.id });
    } catch (err) {
      addToast('Failed to submit incident report. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '40px', textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
          <div style={{ width: '64px', height: '64px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={32} color="#16a34a" />
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 800, color: '#111827' }}>Incident Reported Successfully</h2>
          <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: '14px' }}>Your incident has been submitted and dispatchers have been notified.</p>

          <div style={{ background: '#f8fafc', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <InfoRow label="Incident ID" value={<strong style={{ color: '#dc2626' }}>{submitted.id}</strong>} />
              <InfoRow label="Type" value={submitted.type} />
              <InfoRow label="Location" value={submitted.location} />
              <InfoRow label="Severity" value={submitted.severity} />
              <InfoRow label="Status" value="Reported" />
              <InfoRow label="Reported At" value={formatDate(submitted.reportedAt, { hour: '2-digit', minute: '2-digit', hour12: true })} />
            </div>
          </div>

          <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#6b7280', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', padding: '10px 14px' }}>
            In a real emergency, call <strong>101</strong> (Fire) or <strong>112</strong> (National Emergency).
          </p>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={() => navigate(`/incidents/${submitted.id}`)}
              style={{ padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
            >
              Track Incident
            </button>
            <button
              onClick={() => { setSubmitted(null); setForm({ reporter: user?.name || '', reporterPhone: user?.phone || '', type: '', location: '', address: '', latitude: '', longitude: '', severity: 'Medium', description: '', affectedPeople: '', notes: '' }); }}
              style={{ padding: '10px 20px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              Report Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 700, color: '#111827' }}>Report Fire Incident</h2>
        <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
          Complete all required fields. In a life-threatening emergency, call <strong>101</strong> or <strong>112</strong> immediately.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Reporter Info */}
          <Section title="Reporter Information">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Reporter Name *" error={errors.reporter}>
                <input value={form.reporter} onChange={e => update('reporter', e.target.value)} placeholder="Your full name" style={inputStyle(errors.reporter)} />
              </Field>
              <Field label="Contact Number">
                <input value={form.reporterPhone} onChange={e => update('reporterPhone', e.target.value)} placeholder="+91-98xxx-xxxxx" type="tel" style={inputStyle()} />
              </Field>
            </div>
          </Section>

          {/* Incident Details */}
          <Section title="Incident Details">
            <Field label="Incident Type *" error={errors.type}>
              <select value={form.type} onChange={e => update('type', e.target.value)} style={inputStyle(errors.type)}>
                <option value="">Select incident type…</option>
                {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Severity *">
                {['Low', 'Medium', 'High', 'Critical'].map(s => (
                  <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer' }}>
                    <input type="radio" name="severity" value={s} checked={form.severity === s} onChange={() => update('severity', s)} />
                    <span style={{ fontSize: '13px', fontWeight: form.severity === s ? 700 : 400, color: sevColors[s] }}>{s}</span>
                  </label>
                ))}
              </Field>
              <Field label="People Affected">
                <input value={form.affectedPeople} onChange={e => update('affectedPeople', e.target.value)} placeholder="Approx. number" type="number" min="0" style={inputStyle()} />
              </Field>
            </div>
            <Field label="Description *" error={errors.description}>
              <textarea
                value={form.description}
                onChange={e => update('description', e.target.value)}
                placeholder="Describe what you see — fire size, spread, smoke, people in danger…"
                rows={4}
                style={{ ...inputStyle(errors.description), resize: 'vertical' }}
              />
            </Field>
          </Section>

          {/* Location */}
          <Section title="Location">
            <Field label="Area / Location Name *" error={errors.location}>
              <input value={form.location} onChange={e => update('location', e.target.value)} placeholder="e.g. Andheri East, Bandra West" style={inputStyle(errors.location)} />
            </Field>
            <Field label="Full Address">
              <input value={form.address} onChange={e => update('address', e.target.value)} placeholder="Building name, street, landmark" style={inputStyle()} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Latitude">
                <input value={form.latitude} onChange={e => update('latitude', e.target.value)} placeholder="e.g. 19.1136" type="number" step="0.000001" style={inputStyle()} />
              </Field>
              <Field label="Longitude">
                <input value={form.longitude} onChange={e => update('longitude', e.target.value)} placeholder="e.g. 72.8697" type="number" step="0.000001" style={inputStyle()} />
              </Field>
            </div>
            <button
              type="button"
              onClick={handleLocate}
              disabled={locating}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: locating ? 'not-allowed' : 'pointer', color: '#2563eb', width: 'fit-content' }}
            >
              <MapPin size={14} /> {locating ? 'Detecting…' : 'Use Current Location'}
            </button>
          </Section>

          {/* Additional */}
          <Section title="Additional Information">
            <Field label="Notes / Remarks">
              <textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Any additional information for dispatchers…" rows={3} style={{ ...inputStyle(), resize: 'vertical' }} />
            </Field>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '8px', color: '#9ca3af', fontSize: '13px' }}>
              <Camera size={16} />
              <span>Photo upload will be available in the next version.</span>
            </div>
          </Section>

          {/* Warning */}
          <div style={{ display: 'flex', gap: '10px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', padding: '12px 14px' }}>
            <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: '1px' }} />
            <p style={{ margin: 0, fontSize: '12px', color: '#92400e', lineHeight: 1.6 }}>
              <strong>PROTOTYPE SYSTEM ONLY.</strong> This form does not connect to real emergency services. For actual emergencies, call <strong>101</strong> (Fire) or <strong>112</strong> (National Emergency Number).
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '13px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Submitting…' : '🔥 Submit Incident Report'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h3 style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children, error }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>{label}</label>
      {children}
      {error && <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>{error}</div>}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '13px', color: '#111827', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function inputStyle(error) {
  return {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px',
    border: `1px solid ${error ? '#fca5a5' : '#d1d5db'}`,
    borderRadius: '8px', fontSize: '13px', color: '#111827', outline: 'none', background: '#fff',
  };
}

const sevColors = { Low: '#2563eb', Medium: '#d97706', High: '#ea580c', Critical: '#dc2626' };
