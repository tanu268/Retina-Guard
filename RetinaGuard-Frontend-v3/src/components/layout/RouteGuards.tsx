import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Spinner } from '../ui';
import type { Role } from '../../types';

function FullPageSpinner({ label }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-slate-400">
      <Spinner size={26} />
      {label && <p className="text-[13px]">{label}</p>}
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageSpinner label="Restoring your session…" />;
  if (!isAuthenticated) return <Navigate to="/" state={{ from: location }} replace />;
  return <>{children}</>;
}

/**
 * Role gate. This is the check that silently failed before: GET /auth/me
 * returns `{ user }`, and reading it as a bare user made `user.role` undefined
 * after every page refresh, locking people out of their own workspace.
 */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, isLoading, hasRole } = useAuth();

  if (isLoading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/" replace />;
  if (!hasRole(...roles)) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <h1 className="text-[19px] font-semibold text-slate-900">
          This workspace is not available to your role
        </h1>
        <p className="text-[13px] text-slate-500 mt-2">
          You are signed in as a {user.role}. Ask an administrator if you need access.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

export { FullPageSpinner };
