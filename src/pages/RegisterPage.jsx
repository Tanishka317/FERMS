import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Flame, Eye, EyeOff, AlertCircle, CheckCircle2, Shield, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../services/userService';
import { ROLE_HOME } from '../routes/ProtectedRoute';

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function handleChange(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  }

  function validate() {
    const { name, email, password, confirmPassword } = formData;
    if (!name || name.trim().length < 2) {
      return 'Please enter your full name (at least 2 characters).';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      return 'Please enter a valid email address.';
    }
    if (!password || password.length < 8) {
      return 'Password must be at least 8 characters long.';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match. Please verify both entries.';
    }
    return null;
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const response = await registerUser({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      setSuccess('Account created successfully! Redirecting...');
      
      // If server returned user and token, log them in or redirect to login
      if (response && response.user && response.token) {
        login(response.user, response.token);
        setTimeout(() => {
          navigate(ROLE_HOME[response.user.role] || '/citizen-dashboard');
        }, 1200);
      } else {
        setTimeout(() => {
          navigate('/login', {
            state: { registeredMessage: 'Registration complete. Please sign in with your credentials.' },
          });
        }, 1200);
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#0f1923' }}>
      {/* Left Panel - Command Center Identity */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 48px',
          background: 'linear-gradient(135deg, #0f1923 0%, #162d40 100%)',
          borderRight: '1px solid #1e2d3d',
          maxWidth: '520px',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '48px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              background: '#dc2626',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 20px rgba(220,38,38,0.35)',
            }}
          >
            <Flame size={30} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>FERMS</div>
            <div
              style={{
                fontSize: '11px',
                color: '#64748b',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Fire Emergency Response Management System
            </div>
          </div>
        </div>

        <h2 style={{ color: '#e2e8f0', fontSize: '26px', fontWeight: 700, margin: '0 0 16px', lineHeight: 1.3 }}>
          Community Safety.<br />Rapid Reporting.
        </h2>
        <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.7, margin: '0 0 36px' }}>
          Register as a citizen to quickly report fire emergencies, share GPS locations with first responders, and monitor live response status from your local command center.
        </p>

        {/* Feature bullets */}
        {[
          'Report fire emergencies directly to active dispatchers',
          'Track live response status and responding fire units',
          'Access verified emergency safety guidelines and incident logs',
        ].map((feat) => (
          <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>{feat}</span>
          </div>
        ))}

        {/* Role restriction notice */}
        <div
          style={{
            marginTop: '40px',
            background: '#1e2d3d',
            border: '1px solid #2d3f50',
            borderRadius: '8px',
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Shield size={14} color="#60a5fa" />
            <span style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Staff & Operations Notice
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
            Public self-registration creates a <strong>Citizen</strong> profile. Dispatcher, Field Officer, Analyst, and Administrator accounts require verification and assignment by authorized FERMS administrators.
          </p>
        </div>
      </div>

      {/* Right Panel - Registration Form */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          background: '#f8fafc',
        }}
      >
        <div style={{ width: '100%', maxWidth: '440px' }}>
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '40px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#111827' }}>Create Citizen Account</h1>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#f0fdf4',
                  color: '#15803d',
                  border: '1px solid #86efac',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <User size={12} /> Citizen
              </span>
            </div>
            <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#6b7280' }}>
              Fill in your details below to register on FERMS.
            </p>

            {/* Error banner */}
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '16px',
                }}
              >
                <AlertCircle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: '#991b1b', lineHeight: 1.4 }}>{error}</span>
              </div>
            )}

            {/* Success banner */}
            {success && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '16px',
                }}
              >
                <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: '#15803d', fontWeight: 600 }}>{success}</span>
              </div>
            )}

            <form onSubmit={handleRegister}>
              {/* Full Name */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="reg-name"
                  style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}
                >
                  Full Name
                </label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  autoComplete="name"
                  disabled={loading}
                  style={inputStyle}
                />
              </div>

              {/* Email Address */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="reg-email"
                  style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}
                >
                  Email Address
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="citizen@example.com"
                  autoComplete="email"
                  disabled={loading}
                  style={inputStyle}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="reg-password"
                  style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}
                >
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="reg-password"
                    type={showPw ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                    disabled={loading}
                    style={{ ...inputStyle, paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#9ca3af',
                    }}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#6b7280' }}>
                  Must contain at least 8 characters.
                </span>
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: '24px' }}>
                <label
                  htmlFor="reg-confirm-password"
                  style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}
                >
                  Confirm Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="reg-confirm-password"
                    type={showConfirmPw ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    disabled={loading}
                    style={{ ...inputStyle, paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw((s) => !s)}
                    aria-label={showConfirmPw ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#9ca3af',
                    }}
                  >
                    {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'background 0.15s ease',
                  boxShadow: '0 2px 10px rgba(22,163,74,0.25)',
                }}
              >
                {loading ? 'Creating Account…' : 'Create Citizen Account'}
              </button>
            </form>

            {/* Back to Login link */}
            <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: '#6b7280' }}>
              Already have an account?{' '}
              <Link
                to="/login"
                style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}
              >
                Sign in here
              </Link>
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
