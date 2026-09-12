import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSync } from '../../contexts/SyncContext';
import { cx, initials, titleCase } from '../../lib/format';
import type { Role } from '../../types';
import { Button } from '../ui';
import { SyncIndicator } from '../clinical/indicators';
import {
  IconAlert, IconBrain, IconCamera, IconChart, IconDashboard, IconDatabase,
  IconFile, IconHistory, IconLogout, IconMenu, IconPatients, IconQueue,
  IconSync, IconUserPlus, IconUsers, IconX, RetinaMark,
} from '../ui/icons';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  roles: Role[];
  end?: boolean;
}

interface NavGroup { label: string; items: NavItem[] }

/**
 * Administrators see the Administration group only — no Screening, Review, or
 * Records. Those are operational surfaces (capturing images, grading cases,
 * browsing individual patient records); the admin role is scoped to running
 * the network, not working cases. District retains Records + Administration,
 * since district-level users still need to look up individual patients.
 */
const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Screening',
    items: [
      { to: '/app/technician', label: 'Dashboard', icon: <IconDashboard size={17} />, roles: ['technician'], end: true },
      { to: '/app/technician/register', label: 'Register patient', icon: <IconUserPlus size={17} />, roles: ['technician'] },
      { to: '/app/technician/capture', label: 'Image capture', icon: <IconCamera size={17} />, roles: ['technician'] },
      { to: '/app/technician/analysis', label: 'AI analysis', icon: <IconBrain size={17} />, roles: ['technician'] },
    ],
  },
  {
    label: 'Review',
    items: [
      { to: '/app/review/queue', label: 'Review queue', icon: <IconQueue size={17} />, roles: ['reviewer'] },
    ],
  },
  {
    label: 'Records',
    items: [
      { to: '/app/patients', label: 'Patients', icon: <IconPatients size={17} />, roles: ['technician', 'reviewer', 'district'] },
      { to: '/app/cases', label: 'Cases', icon: <IconFile size={17} />, roles: ['technician', 'reviewer', 'district'] },
      { to: '/app/sync', label: 'Offline sync', icon: <IconSync size={17} />, roles: ['technician', 'district'] },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/app/admin', label: 'Overview', icon: <IconChart size={17} />, roles: ['admin', 'district'], end: true },
      { to: '/app/admin/users', label: 'Users', icon: <IconUsers size={17} />, roles: ['admin'] },
      { to: '/app/admin/capacity', label: 'Capacity', icon: <IconDatabase size={17} />, roles: ['admin', 'district'] },
      { to: '/app/admin/audit', label: 'Audit trail', icon: <IconHistory size={17} />, roles: ['admin', 'district'] },
      { to: '/app/admin/sync', label: 'Sync monitor', icon: <IconAlert size={17} />, roles: ['admin', 'district'] },
    ],
  },
];

const ROLE_TITLES: Record<Role, string> = {
  technician: 'Technician',
  reviewer: 'Reviewer',
  admin: 'Administrator',
  district: 'District',
};

function NavLinks({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const groups = NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) }))
    .filter((g) => g.items.length > 0);

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-6 scrollbar-none">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) => cx(
                  'group relative flex items-center gap-3 h-9 px-3 rounded-none text-[13px] font-medium',
                  'transition-colors duration-150',
                  isActive
                    ? 'bg-white text-[#4338CA] shadow-[0_1px_2px_0_rgb(15_23_42/0.06)]'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900',
                )}
              >
                {({ isActive }) => (
                  <>
                    <span className={cx('shrink-0', isActive ? 'text-[#4338CA]' : 'text-slate-400 group-hover:text-slate-600')}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 shrink-0">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 group"
          aria-label="RetinaGuard home"
        >
          <span className="w-9 h-9 rounded-none bg-[#4338CA] text-white flex items-center justify-center shrink-0">
            <RetinaMark size={20} />
          </span>
          <span className="text-left">
            <span className="block text-[15px] font-semibold tracking-[-0.02em] text-slate-900 leading-tight">
              RetinaGuard
            </span>
            <span className="block text-[11px] text-slate-500 leading-tight">
              {user.facility_id ?? 'Edge node'}
            </span>
          </span>
        </button>
      </div>

      <NavLinks role={user.role} onNavigate={onNavigate} />

      <div className="p-3 shrink-0 border-t border-slate-200/70">
        <div className="flex items-center gap-3 px-2 py-2">
          <span className="w-9 h-9 rounded-none bg-slate-200 text-slate-600 text-[12px] font-semibold flex items-center justify-center shrink-0">
            {initials(user.full_name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-slate-900 truncate">{user.full_name}</p>
            <p className="text-[11px] text-slate-500 truncate">
              {ROLE_TITLES[user.role]}
              {user.registration_no && <span className="clinical-id"> · {user.registration_no}</span>}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-none text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center shrink-0"
            aria-label="Sign out"
            title="Sign out"
          >
            <IconLogout size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const { networkState, pendingCount, triggerSync, isSyncing, syncStatus } = useSync();
  const { user } = useAuth();

  // Close the drawer on navigation — otherwise it lingers over the new page.
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2 focus:bg-white focus:rounded-none focus:shadow-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[248px] bg-slate-100/70 border-r border-slate-200/80 flex-col z-30">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              className="lg:hidden fixed inset-0 bg-slate-900/40 z-40"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              className="lg:hidden fixed inset-y-0 left-0 w-[272px] bg-slate-100 z-50 flex flex-col shadow-2xl"
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              role="dialog" aria-modal="true" aria-label="Navigation"
            >
              <button
                onClick={() => setDrawerOpen(false)}
                className="absolute top-4 right-3 w-8 h-8 rounded-none text-slate-500 hover:bg-slate-200 flex items-center justify-center"
                aria-label="Close navigation"
              >
                <IconX size={17} />
              </button>
              <SidebarContent onNavigate={() => setDrawerOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-[248px]">
        {/* Top bar */}
        <header className="sticky top-0 z-20 glass border-b border-slate-200/70">
          <div className="h-14 px-4 sm:px-6 flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden w-9 h-9 rounded-none text-slate-600 hover:bg-slate-100 flex items-center justify-center shrink-0"
              aria-label="Open navigation"
            >
              <IconMenu size={18} />
            </button>

            <div className="lg:hidden flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-none bg-[#4338CA] text-white flex items-center justify-center shrink-0">
                <RetinaMark size={16} />
              </span>
              <span className="text-[14px] font-semibold text-slate-900 truncate">RetinaGuard</span>
            </div>

            <div className="hidden lg:flex items-center gap-2 min-w-0">
              <span className="text-[13px] text-slate-500">
                {syncStatus?.siteId ?? user?.facility_id ?? 'Edge node'}
              </span>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-2 shrink-0">
              <SyncIndicator state={networkState} pending={pendingCount} compact />
              <Button
                size="sm" variant="outline" onClick={triggerSync} loading={isSyncing}
                icon={!isSyncing ? <IconSync size={14} /> : undefined}
                className="hidden sm:inline-flex"
              >
                Sync now
              </Button>
            </div>
          </div>
        </header>

        <main id="main" className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1440px] mx-auto">
          {children}
        </main>

        <footer className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1440px] mx-auto">
          <p className="text-[11px] text-slate-400">
            RetinaGuard · AI-assisted screening and triage aid ·{' '}
            {titleCase(user?.role ?? '')} workspace · Every result requires human review
          </p>
        </footer>
      </div>
    </div>
  );
}
