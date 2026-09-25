import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ScanEye, ShieldCheck, Stethoscope, UserCog } from 'lucide-react';
import { Alert, Button } from '../../components/ui';
import { GlowCard } from '../../components/ui/spotlight-card';
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
  { id: 'technician', label: 'Technician', blurb: 'Register patients, capture retinal images, and submit cases for review.', icon: ScanEye, image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=800&auto=format&fit=crop' },
  { id: 'reviewer', label: 'Ophthalmologist', blurb: 'Validate AI findings against the evidence and issue the final report.', icon: Stethoscope, image: 'https://images.unsplash.com/photo-1584982751601-97d883f510f4?q=80&w=800&auto=format&fit=crop' },
  { id: 'admin', label: 'Administrator', blurb: 'Manage users, monitor capacity, and oversee the screening network.', icon: UserCog, image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop' },
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
            items={ROLES.map(({ id, label, blurb, icon: Icon, image }) => ({
              id,
              title: label,
              subtitle: blurb,
              imageUrl: image,
              icon: (
                <span className="flex h-11 w-11 items-center justify-center border border-white/20 bg-white/10 rounded-lg text-white backdrop-blur-sm shadow-sm transition-transform duration-300 group-hover:scale-110">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
              )
            }))}
            onItemClick={(id) => chooseRole(id as Exclude<Role, 'district'>)}
          />
        </div>

        <p className="mt-10 flex items-center gap-2 font-ui text-[13px] text-[var(--color-ink-subtle)]">
          <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
          AI-assisted screening aid — every result requires human review.
        </p>
      </div>
    </div>
  );
}
