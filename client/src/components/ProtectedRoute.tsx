import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) return <p className="center-message">Carregando...</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}