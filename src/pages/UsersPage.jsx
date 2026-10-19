import { useEffect, useState } from 'react';
import { getUsers, createUser, deactivateUser } from '../services/userService';
import { getStations } from '../services/stationService';
import { getUnits } from '../services/unitService';
import { Plus, UserX, Eye, AlertCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDate, timeAgo } from '../utils/helpers';

const ROLES = ['Administrator', 'Dispatcher', 'Field Officer', 'Analyst', 'Citizen'];

const INITIAL_FORM = {
  name: '',
  email: '',
  password: '',
  phone: '',
  role: 'Dispatcher',
  station: '',
  assignedUnit: '',
  status: 'Active',
};

export default function UsersPage() {
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [stations, setStations] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  async function reload() {
    const [userData, stationData, unitData] = await Promise.all([
      getUsers(),
      getStations().catch(() => []),
      getUnits().catch(() => []),
    ]);
    setUsers(userData);
    setStations(stationData);
    setUnits(unitData);
    setLoading(false);
  }

  useEffect(() => { reload(); }, []);

  function validate() {
    const errs = {};
    if (!form.name || form.name.trim().length < 2) {
      errs.name = 'Full name must be at least 2 characters long.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email || !emailRegex.test(form.email.trim())) {
      errs.email = 'Please provide a valid email address.';
    }
    if (form.phone && form.phone.trim() && !/^[\d\s\-+()]{7,20}$/.test(form.phone.trim())) {
      errs.phone = 'Please provide a valid phone number format.';
    }
    if (form.password && form.password.trim().length < 8) {
      errs.password = 'Password must be at least 8 characters long.';
    }
    if (!ROLES.includes(form.role)) {
      errs.role = 'Please select a valid role.';
    }
    return errs;
  }

  async function handleCreate(e) {
    if (e && e.preventDefault) e.preventDefault();
    setFormError('');
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setFormError('Please resolve the highlighted validation errors.');
      return;
    }
    setFieldErrors({});
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        phone: form.phone.trim() || undefined,
        status: form.status,
        station: form.station.trim() || undefined,
        assignedUnit: form.assignedUnit.trim() || undefined,
      };
      if (form.password && form.password.trim()) {
        payload.password = form.password.trim();
      }

      await createUser(payload);
      await reload();
      setShowModal(false);
      setForm(INITIAL_FORM);
      setFieldErrors({});
      setFormError('');
      addToast(`User ${payload.name} created successfully`, 'success');
    } catch (err) {
      const msg = err.message || 'Failed to create user';
      setFormError(msg);
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id, name) {
    if (!window.confirm(`Deactivate ${name}?`)) return;
    try {
      await deactivateUser(id);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: 'Inactive' } : u));
      addToast(`${name} deactivated`, 'info');
    } catch (err) {
      addToast(err.message || 'Failed to deactivate user', 'error');
    }
  }

  if (loading) return <LoadingSpinner message="Loading users…" fullPage />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 700, color: '#111827' }}>User Management</h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>{users.length} registered users</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: '#1d4ed8', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', color: '#fff' }}
        >
          <Plus size={15} /> Add User
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search users by name, email, ID…" />
      </div>

      <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <EmptyState icon={UserX} title="No users found" description="Try adjusting your search." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['User ID', 'Name', 'Role', 'Contact', 'Status', 'Last Active', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => (
                  <tr
                    key={user.id}
                    style={{ borderBottom: '1px solid #f3f4f6' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#6b7280', fontSize: '12px' }}>{user.id}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{user.name}</div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>{user.email}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '4px' }}>{user.role}</span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#374151', fontSize: '12px' }}>{user.phone || '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, background: user.status === 'Active' ? '#dcfce7' : '#f3f4f6', color: user.status === 'Active' ? '#15803d' : '#6b7280', padding: '2px 8px', borderRadius: '4px' }}>
                        {user.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#6b7280', fontSize: '12px' }}>{user.lastActive ? timeAgo(user.lastActive) : 'Never'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {user.status === 'Active' && (
                          <button
                            onClick={() => handleDeactivate(user.id, user.name)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                            aria-label={`Deactivate ${user.name}`}
                          >
                            <UserX size={12} /> Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setFieldErrors({});
          setFormError('');
        }}
        title="Add New User"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setFieldErrors({});
                setFormError('');
              }}
              style={{ padding: '8px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '13px', cursor: 'pointer', fontWeight: 600, color: '#374151' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-user-form"
              disabled={saving}
              style={{ padding: '8px 16px', background: '#1d4ed8', border: 'none', borderRadius: '7px', fontSize: '13px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, color: '#fff', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Creating…' : 'Create User'}
            </button>
          </>
        }
      >
        {formError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', marginBottom: '16px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{formError}</span>
          </div>
        )}

        <form id="add-user-form" onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
              Full Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Ramesh Kumar"
              required
              style={{
                width: '100%', boxSizing: 'border-box', padding: '9px 12px',
                border: `1px solid ${fieldErrors.name ? '#dc2626' : '#d1d5db'}`,
                borderRadius: '8px', fontSize: '13px', outline: 'none',
              }}
            />
            {fieldErrors.name && (
              <span style={{ fontSize: '11px', color: '#dc2626', marginTop: '3px', display: 'block' }}>{fieldErrors.name}</span>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
              Email Address *
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="ramesh@ferms.gov.in"
              required
              style={{
                width: '100%', boxSizing: 'border-box', padding: '9px 12px',
                border: `1px solid ${fieldErrors.email ? '#dc2626' : '#d1d5db'}`,
                borderRadius: '8px', fontSize: '13px', outline: 'none',
              }}
            />
            {fieldErrors.email && (
              <span style={{ fontSize: '11px', color: '#dc2626', marginTop: '3px', display: 'block' }}>{fieldErrors.email}</span>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
              Password (Optional — defaults to &apos;ferms123&apos;)
            </label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              placeholder="Minimum 8 characters"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '9px 12px',
                border: `1px solid ${fieldErrors.password ? '#dc2626' : '#d1d5db'}`,
                borderRadius: '8px', fontSize: '13px', outline: 'none',
              }}
            />
            {fieldErrors.password && (
              <span style={{ fontSize: '11px', color: '#dc2626', marginTop: '3px', display: 'block' }}>{fieldErrors.password}</span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                Role *
              </label>
              <select
                value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                Status *
              </label>
              <select
                value={form.status}
                onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="+91-98765-43210"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '9px 12px',
                border: `1px solid ${fieldErrors.phone ? '#dc2626' : '#d1d5db'}`,
                borderRadius: '8px', fontSize: '13px', outline: 'none',
              }}
            />
            {fieldErrors.phone && (
              <span style={{ fontSize: '11px', color: '#dc2626', marginTop: '3px', display: 'block' }}>{fieldErrors.phone}</span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                Station Assignment
              </label>
              <select
                value={form.station}
                onChange={e => setForm(p => ({ ...p, station: e.target.value }))}
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
              >
                <option value="">None / Unassigned</option>
                {stations.map(s => (
                  <option key={s.id} value={s.name}>{s.name} ({s.id})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                Assigned Fire Unit
              </label>
              <select
                value={form.assignedUnit}
                onChange={e => setForm(p => ({ ...p, assignedUnit: e.target.value }))}
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
              >
                <option value="">None / Unassigned</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.id} ({u.type})</option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
