import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import MainLayout from './layouts/MainLayout';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import IncidentsPage from './pages/IncidentsPage';
import IncidentDetailPage from './pages/IncidentDetailPage';
import ReportIncidentPage from './pages/ReportIncidentPage';
import TriagePage from './pages/TriagePage';
import DispatchPage from './pages/DispatchPage';
import UnitsPage from './pages/UnitsPage';
import UnitDetailPage from './pages/UnitDetailPage';
import StationsPage from './pages/StationsPage';
import LiveTrackingPage from './pages/LiveTrackingPage';
import FieldDashboardPage from './pages/FieldDashboardPage';
import CitizenDashboardPage from './pages/CitizenDashboardPage';
import NotificationsPage from './pages/NotificationsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import LoadingSpinner from './components/LoadingSpinner';

const ROLE_HOME = {
  Administrator: '/dashboard',
  Dispatcher: '/dashboard',
  'Field Officer': '/field-dashboard',
  Citizen: '/citizen-dashboard',
  Analyst: '/analytics',
};

const ROLE_ACCESS = {
  '/dashboard': ['Administrator', 'Dispatcher', 'Analyst'],
  '/incidents': ['Administrator', 'Dispatcher', 'Analyst'],
  '/incidents/:id': ['Administrator', 'Dispatcher', 'Analyst', 'Field Officer', 'Citizen'],
  '/incidents/report': ['Administrator', 'Dispatcher', 'Citizen', 'Field Officer'],
  '/incidents/triage': ['Administrator', 'Dispatcher'],
  '/dispatch': ['Administrator', 'Dispatcher'],
  '/units': ['Administrator', 'Dispatcher', 'Analyst'],
  '/stations': ['Administrator', 'Dispatcher', 'Analyst'],
  '/live-tracking': ['Administrator', 'Dispatcher'],
  '/field-dashboard': ['Administrator', 'Field Officer'],
  '/citizen-dashboard': ['Citizen', 'Administrator'],
  '/notifications': ['Administrator', 'Dispatcher', 'Field Officer', 'Analyst'],
  '/analytics': ['Administrator', 'Dispatcher', 'Analyst'],
  '/users': ['Administrator'],
  '/settings': ['Administrator', 'Dispatcher', 'Field Officer', 'Analyst', 'Citizen'],
};

function RequireAuth({ children, allowedPath }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1923' }}>
        <LoadingSpinner text="Authenticating..." />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (allowedPath && ROLE_ACCESS[allowedPath] && !ROLE_ACCESS[allowedPath].includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role] || '/login'} replace />;
  }
  return children;
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1923' }}>
        <LoadingSpinner text="Checking session..." />
      </div>
    );
  }
  if (user) {
    return <Navigate to={ROLE_HOME[user.role] || '/dashboard'} replace />;
  }
  return children;
}

function RedirectToHome() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1923' }}>
        <LoadingSpinner text="Loading..." />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[user.role] || '/dashboard'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
      <Route path="/" element={<RedirectToHome />} />

      <Route
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<RequireAuth allowedPath="/dashboard"><DashboardPage /></RequireAuth>} />

        <Route path="/incidents" element={<RequireAuth allowedPath="/incidents"><IncidentsPage /></RequireAuth>} />
        <Route path="/incidents/report" element={<RequireAuth allowedPath="/incidents/report"><ReportIncidentPage /></RequireAuth>} />
        <Route path="/incidents/triage" element={<RequireAuth allowedPath="/incidents/triage"><TriagePage /></RequireAuth>} />
        <Route path="/incidents/:id" element={<RequireAuth allowedPath="/incidents/:id"><IncidentDetailPage /></RequireAuth>} />

        <Route path="/dispatch" element={<RequireAuth allowedPath="/dispatch"><DispatchPage /></RequireAuth>} />

        <Route path="/units" element={<RequireAuth allowedPath="/units"><UnitsPage /></RequireAuth>} />
        <Route path="/units/:id" element={<RequireAuth allowedPath="/units"><UnitDetailPage /></RequireAuth>} />

        <Route path="/stations" element={<RequireAuth allowedPath="/stations"><StationsPage /></RequireAuth>} />
        <Route path="/live-tracking" element={<RequireAuth allowedPath="/live-tracking"><LiveTrackingPage /></RequireAuth>} />
        <Route path="/field-dashboard" element={<RequireAuth allowedPath="/field-dashboard"><FieldDashboardPage /></RequireAuth>} />
        <Route path="/citizen-dashboard" element={<RequireAuth allowedPath="/citizen-dashboard"><CitizenDashboardPage /></RequireAuth>} />
        <Route path="/notifications" element={<RequireAuth allowedPath="/notifications"><NotificationsPage /></RequireAuth>} />
        <Route path="/analytics" element={<RequireAuth allowedPath="/analytics"><AnalyticsPage /></RequireAuth>} />
        <Route path="/reports" element={<RequireAuth allowedPath="/analytics"><AnalyticsPage /></RequireAuth>} />
        <Route path="/users" element={<RequireAuth allowedPath="/users"><UsersPage /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth allowedPath="/settings"><SettingsPage /></RequireAuth>} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
