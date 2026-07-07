import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { canAccess, getHomeRoute } from '@/lib/roles';

export default function RoleRoute({ module, children }) {
  const { user } = useAuth();
  const role = user?.role || 'driver';
  if (!canAccess(role, module)) {
    return <Navigate to={getHomeRoute(role)} replace />;
  }
  return children;
}