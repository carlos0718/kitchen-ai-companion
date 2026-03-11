import { Navigate } from 'react-router-dom';
import { getAdminSession } from '@/lib/adminAuth';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const session = getAdminSession();

  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
