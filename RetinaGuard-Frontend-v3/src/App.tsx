import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SyncProvider } from './contexts/SyncContext';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { FullPageSpinner, RequireAuth, RequireRole } from './components/layout/RouteGuards';
import { GlobalBackground } from './components/background/GlobalBackground';
import { useLocation } from 'react-router-dom';
import { ROLE_HOME } from './services/authService';
import { Spinner } from './components/ui';

/* Lazy routes — the landing page is the only bundle a visitor must download.
   Each workspace is split so a technician's tablet never fetches the admin
   charting bundle. */
const Landing = lazy(() => import('./pages/landing/Landing'));
const Login = lazy(() => import('./pages/landing/Login'));

const TechnicianDashboard = lazy(() => import('./pages/technician/TechnicianDashboard'));
const PatientRegistration = lazy(() => import('./pages/technician/PatientRegistration'));
const ImageCapture = lazy(() => import('./pages/technician/ImageCapture'));
const AiAnalysis = lazy(() => import('./pages/technician/AiAnalysis'));

const ReviewQueue = lazy(() => import('./pages/reviewer/ReviewQueue'));
const ReviewWorkspace = lazy(() => import('./pages/reviewer/ReviewWorkspace'));

const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminCapacity = lazy(() => import('./pages/admin/AdminCapacity'));
const AdminAudit = lazy(() => import('./pages/admin/AdminAudit'));

const PatientsList = lazy(() => import('./pages/shared/PatientsList'));
const PatientDetail = lazy(() => import('./pages/shared/PatientDetail'));
const CasesList = lazy(() => import('./pages/shared/CasesList'));
const CaseDetail = lazy(() => import('./pages/shared/CaseDetail'));
const ReportPage = lazy(() => import('./pages/shared/ReportPage'));
const SyncMonitor = lazy(() => import('./pages/shared/SyncMonitor'));

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-24 text-slate-300">
      <Spinner size={24} />
    </div>
  );
}

/** Sends an authenticated person to their own workspace. */
function RoleHome() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/" replace />;
  return <Navigate to={ROLE_HOME[user.role] ?? '/app/technician'} replace />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>
        <Suspense fallback={<PageFallback />}>{children}</Suspense>
      </AppShell>
    </RequireAuth>
  );
}

/**
 * The single background mount point for the whole application. Sits above the
 * router so it is never remounted on navigation, and reads the current route
 * only to decide veil strength: the landing page shows the gradient close to
 * full strength, application routes sit behind a heavier veil so clinical
 * tables keep AA contrast.
 */
function BackgroundLayer() {
  const { pathname } = useLocation();
  return <GlobalBackground intensity={pathname === '/' ? 'full' : 'muted'} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <BackgroundLayer />
        <AuthProvider>
          <SyncProvider>
            <Suspense fallback={<FullPageSpinner />}>
              <Routes>
                {/* Public */}
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />

                {/* Workspace */}
                <Route path="/app" element={<Shell><RoleHome /></Shell>} />

                {/* Technician */}
                <Route path="/app/technician" element={
                  <Shell><RequireRole roles={['technician']}><TechnicianDashboard /></RequireRole></Shell>
                } />
                <Route path="/app/technician/register" element={
                  <Shell><RequireRole roles={['technician']}><PatientRegistration /></RequireRole></Shell>
                } />
                <Route path="/app/technician/capture" element={
                  <Shell><RequireRole roles={['technician']}><ImageCapture /></RequireRole></Shell>
                } />
                <Route path="/app/technician/capture/:consultationId" element={
                  <Shell><RequireRole roles={['technician']}><ImageCapture /></RequireRole></Shell>
                } />
                <Route path="/app/technician/analysis" element={
                  <Shell><RequireRole roles={['technician']}><AiAnalysis /></RequireRole></Shell>
                } />
                <Route path="/app/technician/analysis/:consultationId" element={
                  <Shell><RequireRole roles={['technician']}><AiAnalysis /></RequireRole></Shell>
                } />

                {/* Reviewer */}
                <Route path="/app/review/queue" element={
                  <Shell><RequireRole roles={['reviewer']}><ReviewQueue /></RequireRole></Shell>
                } />
                <Route path="/app/review/:consultationId" element={
                  <Shell><RequireRole roles={['reviewer']}><ReviewWorkspace /></RequireRole></Shell>
                } />
                <Route path="/app/review/:consultationId/report" element={
                  <Shell><ReportPage /></Shell>
                } />

                {/* Admin */}
                <Route path="/app/admin" element={
                  <Shell><RequireRole roles={['admin', 'district']}><AdminOverview /></RequireRole></Shell>
                } />
                <Route path="/app/admin/users" element={
                  <Shell><RequireRole roles={['admin']}><AdminUsers /></RequireRole></Shell>
                } />
                <Route path="/app/admin/capacity" element={
                  <Shell><RequireRole roles={['admin', 'district']}><AdminCapacity /></RequireRole></Shell>
                } />
                <Route path="/app/admin/audit" element={
                  <Shell><RequireRole roles={['admin', 'district']}><AdminAudit /></RequireRole></Shell>
                } />
                <Route path="/app/admin/sync" element={
                  <Shell><RequireRole roles={['admin', 'district']}><SyncMonitor /></RequireRole></Shell>
                } />

                {/* Shared records */}
                <Route path="/app/patients" element={<Shell><RequireRole roles={['technician', 'reviewer', 'district']}><PatientsList /></RequireRole></Shell>} />
                <Route path="/app/patients/:patientId" element={<Shell><RequireRole roles={['technician', 'reviewer', 'district']}><PatientDetail /></RequireRole></Shell>} />
                <Route path="/app/cases" element={<Shell><RequireRole roles={['technician', 'reviewer', 'district']}><CasesList /></RequireRole></Shell>} />
                <Route path="/app/cases/:consultationId" element={<Shell><RequireRole roles={['technician', 'reviewer', 'district']}><CaseDetail /></RequireRole></Shell>} />
                <Route path="/app/sync" element={<Shell><RequireRole roles={['technician', 'district']}><SyncMonitor /></RequireRole></Shell>} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </SyncProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
