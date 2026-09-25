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

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {ROLES.map(({ id, label, blurb, icon: Icon }, i) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 * i, ease: [0.25, 1, 0.5, 1] }}
            >
              <GlowCard customSize glowColor="blue" className="flex h-full flex-col w-full bg-white border border-[var(--color-border)]">
                <div className="flex flex-1 flex-col p-7">
                  <span className="flex h-11 w-11 items-center justify-center border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] text-[var(--color-primary)]">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <h2 className="mt-6 font-display text-h3 font-semibold text-[var(--color-brand-950)]">
                    {label}
                  </h2>
                  <p className="mt-3 flex-1 font-body text-sm leading-[var(--leading-body)] text-[var(--color-ink-muted)]">
                    {blurb}
                  </p>
                  <Button
                    variant="primary"
                    fullWidth
                    className="mt-7"
                    loading={pending === id}
                    disabled={pending !== null && pending !== id}
                    onClick={() => chooseRole(id)}
                  >
                    Continue as {label}
                  </Button>
                </div>
              </GlowCard>
            </motion.div>
          ))}
        </div>

        <p className="mt-10 flex items-center gap-2 font-ui text-[13px] text-[var(--color-ink-subtle)]">
          <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
          AI-assisted screening aid — every result requires human review.
        </p>
      </div>
    </div>
  );
}
