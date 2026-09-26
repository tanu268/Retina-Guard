import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ScanEye, ShieldCheck, Stethoscope, UserCog } from 'lucide-react';
import { Alert } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_HOME } from '../../services/authService';
import type { Role } from '../../types';

/**
 * Sign-in.
 *
 * The role picker previously lived on the landing page. The new landing
 * structure has no such section, but removing the picker outright would leave
 * no way into the workspace — so it moves here, behind the "Start Screening"
 * call to action, restyled to the current design system. No authentication
 * logic changed: this calls the same `loginAsRole` as before.
 */

import HoverRevealCards from '../../components/ui/cards';

const ROLES: { id: Exclude<Role, 'district'>; label: string; blurb: string; icon: typeof ScanEye; image: string }[] = [
  { id: 'technician', label: 'Technician', blurb: 'Register patients, capture retinal images, and submit cases for review.', icon: ScanEye, image: '/img/technician.jpg' },
  { id: 'reviewer', label: 'Ophthalmologist', blurb: 'Validate AI findings against the evidence and issue the final report.', icon: Stethoscope, image: '/img/ophthalmologist.jpg' },
  { id: 'admin', label: 'Administrator', blurb: 'Manage users, monitor capacity, and oversee the screening network.', icon: UserCog, image: '/img/administrator.jpg' },
];

export default function Login() {
  const navigate = useNavigate();
  const { loginAsRole, user } = useAuth();
  const [_pending, setPending] = useState<string | null>(null);
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
          ? err.message
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

        <div className="mt-10">
          <HoverRevealCards 
            items={ROLES.map(({ id, label, blurb, icon, image }) => ({
              id,
              title: label,
              subtitle: blurb,
              imageUrl: image,
              icon: icon,
              onClick: () => chooseRole(id as Exclude<Role, 'district'>)
            }))}
          />
        </div>

      </div>
    </div>
  );
}
