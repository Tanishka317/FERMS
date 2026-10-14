import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
  '/incidents/triage': ['Administrator', 'Dispatcher'],
  '/incidents/report': ['Administrator', 'Dispatcher', 'Citizen'],
  '/dispatch': ['Administrator', 'Dispatcher'],
  '/units': ['Administrator', 'Dispatcher', 'Analyst'],
  '/stations': ['Administrator', 'Dispatcher', 'Analyst'],
  '/live-tracking': ['Administrator', 'Dispatcher'],
  '/field-dashboard': ['Administrator', 'Field Officer'],
  '/citizen-dashboard': ['Citizen', 'Administrator'],
  '/notifications': ['Administrator', 'Dispatcher', 'Field Officer', 'Analyst'],
  '/analytics': ['Administrator', 'Dispatcher', 'Analyst'],
  '/reports': ['Administrator', 'Analyst'],
  '/users': ['Administrator'],
  '/settings': ['Administrator', 'Dispatcher', 'Field Officer', 'Analyst', 'Citizen'],
};

export default function ProtectedRoute({ children, path }) {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (path) {
    const allowed = ROLE_ACCESS[path];
    if (allowed && !allowed.includes(user.role)) {
      const home = ROLE_HOME[user.role] || '/dashboard';
      return <Navigate to={home} replace />;
    }
  }

  return children;
}

export { ROLE_HOME };
