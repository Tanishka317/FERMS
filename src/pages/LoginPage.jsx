import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Flame, Eye, EyeOff, AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { loginUser, demoLogin } from '../services/userService';
import { ROLE_HOME } from '../routes/ProtectedRoute';

const DEMO_ROLES = [
  { role: 'Citizen', color: '#16a34a', desc: 'Report & track incidents' },
  { role: 'Dispatcher', color: '#2563eb', desc: 'Triage & dispatch units' },
  { role: 'Field Officer', color: '#d97706', desc: 'Field operations view' },
  { role: 'Administrator', color: '#7c3aed', desc: 'Full system access' },
  { role: 'Analyst', color: '#0891b2', desc: 'Analytics & reports' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [demoLoading, setDemoLoading] = useState('');

  const registeredMessage = location.state?.registeredMessage;

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user, token } = await loginUser(email, password);
      login(user, token);
      navigate(ROLE_HOME[user.role] || '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin(role) {
    setError('');
    setDemoLoading(role);
    try {
      const { user, token } = await demoLogin(role);
      login(user, token);
      navigate(ROLE_HOME[user.role] || '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setDemoLoading('');
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#0f1923' }}>
      {/* Left Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 48px', background: 'linear-gradient(135deg, #0f1923 0%, #162d40 100%)', borderRight: '1px solid #1e2d3d', maxWidth: '520px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '48px' }}>
          <div style={{ width: '56px', height: '56px', background: '#dc2626', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 20px rgba(220,38,38,0.35)' }}>
            <Flame size={30} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>FERMS</div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Fire Emergency Response Management System</div>
          </div>
        </div>

        <h2 style={{ color: '#e2e8f0', fontSize: '26px', fontWeight: 700, margin: '0 0 16px', lineHeight: 1.3 }}>
          Coordinate. Dispatch.<br />Protect.
        </h2>
        <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.7, margin: '0 0 40px' }}>
          Real-time fire incident management for dispatchers, field officers, and emergency command centers. Monitor incidents, dispatch units, and track response — all in one platform.
        </p>

        {/* Features */}
        {[
          'Live incident tracking and dispatch coordination',
          'Role-based access for all emergency personnel',
          'Analytics and incident history for auditors',
        ].map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>{f}</span>
          </div>
        ))}

        {/* Prototype notice */}
        <div style={{ marginTop: '48px', background: '#1e2d3d', border: '1px solid #2d3f50', borderRadius: '8px', padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Shield size={14} color="#60a5fa" />
            <span style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prototype System</span>
          </div>
          <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
            FERMS is an academic prototype for demonstration only. Not connected to any real emergency services.
          </p>
        </div>
      </div>

      {/* Right Panel — Login Card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', background: '#f8fafc' }}>
        <div style={{ width: '100%', maxWidth: '440px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '40px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
            <h1 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 800, color: '#111827' }}>Sign in to FERMS</h1>
            <p style={{ margin: '0 0 28px', fontSize: '13px', color: '#6b7280' }}>Enter your credentials or use a demo account below.</p>

            {/* Registration success message */}
            {registeredMessage && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px' }}>
                <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: '#15803d', fontWeight: 600 }}>{registeredMessage}</span>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px' }}>
                <AlertCircle size={15} color="#dc2626" />
                <span style={{ fontSize: '13px', color: '#991b1b' }}>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }} htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.gov.in"
                  autoComplete="email"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }} htmlFor="password">
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    style={{ ...inputStyle, paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => !s)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                  Remember me
                </label>
                <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#2563eb', fontWeight: 500 }}>
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', padding: '12px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            {/* Link to Registration */}
            <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '13px', color: '#6b7280' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                Register as Citizen
              </Link>
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0 6px' }}>
              <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Demo Login (Development Accounts)
              </span>
              <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
            </div>
            <div style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', marginBottom: '14px' }}>
              Pre-seeded operational test accounts (Dev Mode)
            </div>

            {/* Demo role buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {DEMO_ROLES.map(({ role, color, desc }) => (
                <button
                  key={role}
                  onClick={() => handleDemoLogin(role)}
                  disabled={demoLoading !== ''}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 14px', border: `1px solid ${color}30`,
                    borderRadius: '8px', background: `${color}08`,
                    cursor: demoLoading !== '' ? 'not-allowed' : 'pointer',
                    opacity: demoLoading !== '' && demoLoading !== role ? 0.5 : 1,
                    transition: 'all 0.15s', textAlign: 'left',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${color}18`; }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${color}08`; }}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                    {demoLoading === role ? '…' : role.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{role}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>{desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 14px',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '13px',
  color: '#111827',
  background: '#fff',
  outline: 'none',
};
