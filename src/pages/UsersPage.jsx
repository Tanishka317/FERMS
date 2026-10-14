import { useEffect, useState } from 'react';
import { getUsers, createUser, deactivateUser } from '../services/userService';
import { Plus, UserX, Eye } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDate, timeAgo } from '../utils/helpers';

const ROLES = ['Administrator', 'Dispatcher', 'Field Officer', 'Analyst', 'Citizen'];

export default function UsersPage() {
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'Dispatcher', status: 'Active' });
  const [saving, setSaving] = useState(false);

  async function reload() {
    const data = await getUsers();
    setUsers(data);
    setLoading(false);
  }

  useEffect(() => { reload(); }, []);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.id.toLowerCase().includes(q);
  });

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await createUser(form);
      await reload();
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', role: 'Dispatcher', status: 'Active' });
      addToast('User created successfully', 'success');
    } catch {
      addToast('Failed to create user', 'error');
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
    } catch {
      addToast('Failed to deactivate user', 'error');
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
        onClose={() => setShowModal(false)}
        title="Add New User"
        footer={
          <>
            <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '13px', cursor: 'pointer', fontWeight: 600, color: '#374151' }}>Cancel</button>
            <button onClick={handleCreate} disabled={saving} style={{ padding: '8px 16px', background: '#1d4ed8', border: 'none', borderRadius: '7px', fontSize: '13px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, color: '#fff', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Creating…' : 'Create User'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[
            { id: 'name', label: 'Full Name *', type: 'text', placeholder: 'John Doe' },
            { id: 'email', label: 'Email *', type: 'email', placeholder: 'john@ferms.gov.in' },
            { id: 'phone', label: 'Phone', type: 'tel', placeholder: '+91-98xxx-xxxxx' },
          ].map(f => (
            <div key={f.id}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>{f.label}</label>
              <input
                type={f.type}
                value={form[f.id]}
                onChange={e => setForm(p => ({ ...p, [f.id]: e.target.value }))}
                placeholder={f.placeholder}
                required={f.label.includes('*')}
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
              />
            </div>
          ))}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>Role *</label>
            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none' }}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
