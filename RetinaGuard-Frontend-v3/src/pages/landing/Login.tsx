import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ScanEye, ShieldCheck, Stethoscope, UserCog } from 'lucide-react';
import { Alert, Button } from '../../components/ui';
import HoverRevealCards from '../../components/ui/cards';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_HOME } from '../../services/authService';
import type { Role } from '../../types';
import imgTechnician from '../../assets/Technician.jpeg';
import imgOphthalmologist from '../../assets/Opthmologist.jpeg';
import imgAdministrator from '../../assets/Administrator.jpeg';

/**
 * Sign-in.
 *
 * The role picker previously lived on the landing page. The new landing
 * structure has no such section, but removing the picker outright would leave
 * no way into the workspace — so it moves here, behind the "Start Screening"
 * call to action, restyled to the current design system. No authentication
 * logic changed: this calls the same `loginAsRole` as before.
 */

const ROLES: { id: Exclude<Role, 'district'>; label: string; blurb: string; icon: typeof ScanEye }[] = [
  { id: 'technician', label: 'Technician', blurb: 'Register patients, capture retinal images, and submit cases for review.', icon: ScanEye },
  { id: 'reviewer', label: 'Ophthalmologist', blurb: 'Validate AI findings against the evidence and issue the final report.', icon: Stethoscope },
  { id: 'admin', label: 'Administrator', blurb: 'Manage users, monitor capacity, and oversee the screening network.', icon: UserCog },
];

export default function Login() {
  const navigate = useNavigate();
  const { loginAsRole, user } = useAuth();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chooseRole = async (role: Exclude<Role, 'district'>) => {
    setError(null);
    if (user?.role === role) {
      navigate(ROLE_HOME[role]);
      return;
    }
    setPending(role);
    try {
      const authed = await loginAsRole(role);
      navigate(ROLE_HOME[authed.role] ?? '/app');
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} Check that the edge server is running on port 4000.`
          : 'Could not enter the workspace.',
      );
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-5 py-20">
      <div className="w-full max-w-4xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-ui text-sm text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-brand-900)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
          className="mt-8"
        >
          <p className="eyebrow">Sign In</p>
          <h1 className="display mt-4 text-h1 text-[var(--color-brand-950)]">
            Choose your workspace
          </h1>
          <p className="mt-4 max-w-2xl font-body text-base leading-[var(--leading-body)] text-[var(--color-ink-muted)]">
            Each role opens a different part of the screening workflow.
          </p>
        </motion.div>

        {error && (
          <div className="mt-8">
            <Alert tone="danger" title="Could not sign in">{error}</Alert>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 1, 0.5, 1] }}
          className="mt-10"
        >
          <HoverRevealCards
            className="!p-0 !max-w-none grid-cols-1 md:grid-cols-3 gap-6"
            items={ROLES.map((r, i) => ({
              id: r.id,
              title: r.label,
              subtitle: r.blurb,
              icon: r.icon,
              imageUrl: i === 0 
                ? imgTechnician
                : i === 1 
                ? imgOphthalmologist
                : imgAdministrator,
              onClick: () => chooseRole(r.id),
            }))}
          />
        </motion.div>
      </div>
    </div>
  );
}
