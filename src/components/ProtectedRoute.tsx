import { type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, type UserRole } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    allowedRoles?: UserRole[];
    children?: ReactNode;
}

const ProtectedRoute = ({ allowedRoles, children }: ProtectedRouteProps) => {
    const { session, role, requiresPasswordChange, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    // Require authentication
    if (!session) {
        return <Navigate to="/login" replace />;
    }

    if (requiresPasswordChange && location.pathname !== '/change-password') {
        return <Navigate to="/change-password" replace />;
    }

    if (!requiresPasswordChange && location.pathname === '/change-password') {
        return <Navigate to="/" replace />;
    }

    // Require specific roles
    if (allowedRoles && (!role || !allowedRoles.includes(role))) {
        // If they have no role or not the right one, bounce to root (or login)
        return <Navigate to="/" replace />;
    }

    return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
