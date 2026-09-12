import { motion, type HTMLMotionProps } from 'framer-motion';
import {
  forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes,
  type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react';
import { cx } from '../../lib/format';

/* ═══════════════════════════════════════════════════════════════════════════
   Primitives. Every surface in the app composes from these — no page defines
   its own button, card, or field.
   ═══════════════════════════════════════════════════════════════════════════ */

// Motion presets. 180–300ms, per the design brief: perceptible, never showy.
export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.2 },
};

export const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};

export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const } },
};

// ── Card ────────────────────────────────────────────────

/**
 * One card, five variants. Every card surface in the application composes from
 * this — dashboard, patient, analytics, statistics, information, profile,
 * record and empty-state cards all resolve here.
 *
 * The construction carries over from the supplied glass-card spec: an outer
 * surface, an inset translucent panel, a lit top edge, and staggered hover
 * transitions on inner elements. The literal geometry does not carry over —
 * the global directive makes the system square, so the 50px radius and the
 * 30° rotate3d become a squared surface and a restrained lift.
 *
 * `showcase` keeps the 3D tilt for the landing page only, where visual drama
 * is the point and there is no clinical data to read.
 */
export type CardVariant = 'default' | 'glass' | 'elevated' | 'interactive' | 'dashboard' | 'showcase';

const CARD_VARIANTS: Record<CardVariant, string> = {
  default: 'bg-white border border-[var(--color-border)] shadow-[var(--shadow-sm)]',
  glass: 'glass border border-white/50',
  elevated: 'bg-white border border-[var(--color-border)] shadow-[var(--shadow-lg)]',
  interactive:
    'bg-white border border-[var(--color-border)] shadow-[var(--shadow-sm)] ' +
    'transition-[box-shadow,transform,border-color] duration-[var(--duration-normal)] ease-[var(--ease-out-quart)] ' +
    'hover:shadow-[var(--shadow-lg)] hover:border-[var(--color-border-strong)] hover:-translate-y-0.5',
  dashboard:
    'bg-white border border-[var(--color-border)] shadow-[var(--shadow-xs)] ' +
    'transition-colors duration-[var(--duration-fast)] hover:border-[var(--color-border-strong)]',
  showcase:
    'group/card relative bg-white border border-[var(--color-border)] shadow-[var(--shadow-md)] ' +
    '[transform-style:preserve-3d] transition-[transform,box-shadow] duration-[var(--duration-slow)] ' +
    'ease-[var(--ease-out-quart)] hover:shadow-[var(--shadow-xl)]',
};

export function Card({
  children, className, padded = true, interactive = false, variant, ...rest
}: {
  children: ReactNode; className?: string; padded?: boolean;
  /** Retained for backward compatibility — equivalent to variant="interactive". */
  interactive?: boolean;
  variant?: CardVariant;
} & HTMLMotionProps<'div'>) {
  const resolved: CardVariant = variant ?? (interactive ? 'interactive' : 'default');
  return (
    <motion.div
      className={cx(
        'rounded-none',
        CARD_VARIANTS[resolved],
        padded && 'p-6',
        className,
      )}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

// ── Button ────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-primary)] text-white border border-[var(--color-primary)] ' +
    'hover:bg-[var(--color-primary-hover)] hover:border-[var(--color-primary-hover)] ' +
    'active:bg-[var(--color-primary-active)] shadow-[var(--shadow-xs)]',
  secondary:
    'bg-[var(--color-brand-100)] text-[var(--color-brand-900)] border border-transparent ' +
    'hover:bg-[var(--color-brand-200)] active:bg-[var(--color-brand-300)]',
  ghost:
    'bg-transparent text-[var(--color-ink-muted)] border border-transparent ' +
    'hover:bg-[var(--color-hover)] hover:text-[var(--color-ink)]',
  danger:
    'bg-[var(--color-danger)] text-white border border-[var(--color-danger)] ' +
    'hover:bg-[#991b1b] active:bg-[#7f1d1d]',
  success:
    'bg-[var(--color-success)] text-white border border-[var(--color-success)] ' +
    'hover:bg-[#065f46] active:bg-[#064e3b]',
  outline:
    'bg-white/80 text-[var(--color-brand-900)] border border-[var(--color-border-strong)] ' +
    'hover:bg-[var(--color-hover)] hover:border-[var(--color-primary)]',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-[13px] gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-13 px-7 text-[15px] gap-2.5',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, fullWidth, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center font-ui font-medium rounded-none',
        'transition-[background-color,border-color,color,box-shadow,transform]',
        'duration-[var(--duration-fast)] ease-[var(--ease-in-out-soft)] active:translate-y-px',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size={size === 'lg' ? 18 : 14} /> : icon}
      {children}
    </button>
  );
});

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      className={cx('animate-spin', className)} aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ── Form fields ───────────────────────────────────────────────────────────

export function Field({
  label, hint, error, required, children, className,
}: {
  label: string; hint?: string; error?: string | null;
  required?: boolean; children: ReactNode; className?: string;
}) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label className="text-[13px] font-medium text-slate-700">
        {label}
        {required && <span className="text-red-600 ml-0.5" aria-hidden="true">*</span>}
      </label>
      {children}
      {error
        ? <p className="text-[12px] text-red-600 flex items-center gap-1" role="alert">{error}</p>
        : hint ? <p className="text-[12px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

const FIELD_BASE =
  'w-full h-10 px-3 rounded-none border bg-white text-sm text-slate-900 placeholder:text-slate-400 '
  + 'transition-colors duration-150 disabled:bg-slate-50 disabled:text-slate-500';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cx(
          FIELD_BASE,
          invalid ? 'border-red-400 focus:border-red-500' : 'border-slate-300 focus:border-[#4338CA]',
          className,
        )}
        {...rest}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ className, invalid, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={cx(
          FIELD_BASE, 'appearance-none pr-9 cursor-pointer',
          'bg-[url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%2364748b" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>\')] bg-no-repeat bg-[right_0.75rem_center]',
          invalid ? 'border-red-400' : 'border-slate-300 focus:border-[#4338CA]',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cx(
          'w-full px-3 py-2.5 rounded-none border bg-white text-sm text-slate-900 resize-y',
          'placeholder:text-slate-400 transition-colors duration-150 min-h-[88px]',
          invalid ? 'border-red-400 focus:border-red-500' : 'border-slate-300 focus:border-[#4338CA]',
          className,
        )}
        {...rest}
      />
    );
  },
);

// ── Section header ────────────────────────────────────────────────────────

export function SectionHeader({
  eyebrow, title, description, actions, className,
}: {
  eyebrow?: string; title: string; description?: string;
  actions?: ReactNode; className?: string;
}) {
  return (
    <div className={cx('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4338CA] mb-1.5">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.02em] text-slate-900">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────

export function EmptyState({
  icon, title, description, action, className,
}: {
  icon?: ReactNode; title: string; description?: string;
  action?: ReactNode; className?: string;
}) {
  return (
    <div className={cx(
      'flex flex-col items-center justify-center text-center py-14 px-6',
      'rounded-none border border-dashed border-slate-300 bg-slate-50/60',
      className,
    )}>
      {icon && <div className="mb-3 text-slate-400">{icon}</div>}
      <p className="text-[15px] font-medium text-slate-700">{title}</p>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton rounded-none', className)} aria-hidden="true" />;
}

export function SkeletonCard() {
  return (
    <Card>
      <Skeleton className="h-3 w-24 mb-4" />
      <Skeleton className="h-8 w-20 mb-3" />
      <Skeleton className="h-3 w-32" />
    </Card>
  );
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-none" />
      ))}
    </div>
  );
}

// ── Alert ─────────────────────────────────────────────────────────────────

type AlertTone = 'info' | 'warning' | 'danger' | 'success' | 'neutral';

const ALERT_TONES: Record<AlertTone, string> = {
  info: 'bg-cyan-50 border-cyan-200 text-cyan-900',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  danger: 'bg-red-50 border-red-200 text-red-900',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  neutral: 'bg-slate-50 border-slate-200 text-slate-700',
};

export function Alert({
  tone = 'info', title, children, icon, className, action,
}: {
  tone?: AlertTone; title?: string; children?: ReactNode;
  icon?: ReactNode; className?: string; action?: ReactNode;
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cx('rounded-none border px-4 py-3.5 flex gap-3', ALERT_TONES[tone], className)}
    >
      {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
      <div className="min-w-0 flex-1">
        {title && <p className="text-sm font-semibold mb-0.5">{title}</p>}
        {children && <div className="text-[13px] leading-relaxed opacity-90">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────

export function Tabs<T extends string>({
  tabs, value, onChange, className,
}: {
  tabs: Array<{ id: T; label: string; count?: number; disabled?: boolean; accent?: string }>;
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cx('inline-flex items-center gap-1 p-1 bg-slate-100 rounded-none', className)}
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={cx(
              'relative px-3.5 h-8 rounded-none text-[13px] font-medium transition-colors duration-200',
              'disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5',
              active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {active && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 bg-white rounded-none shadow-[0_1px_2px_0_rgb(15_23_42/0.06)]"
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
            {tab.accent && (
              <span
                className="relative z-10 w-1.5 h-1.5 rounded-full"
                style={{ background: tab.accent }}
                aria-hidden="true"
              />
            )}
            <span className="relative z-10">{tab.label}</span>
            {tab.count !== undefined && (
              <span className={cx(
                'relative z-10 text-[11px] px-1.5 py-0.5 rounded-none tnum',
                active ? 'bg-slate-100 text-slate-600' : 'bg-slate-200/70 text-slate-500',
              )}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────

export function Toggle({
  checked, onChange, label, accent, disabled,
}: {
  checked: boolean; onChange: (v: boolean) => void;
  label: string; accent?: string; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'inline-flex items-center gap-2.5 px-3 h-9 rounded-none border text-[13px] font-medium',
        'transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed',
        checked ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-50 border-slate-200 text-slate-500',
      )}
    >
      <span
        className={cx('w-3 h-3 rounded-none border-2 transition-colors duration-200')}
        style={{
          background: checked ? (accent ?? '#4338CA') : 'transparent',
          borderColor: checked ? (accent ?? '#4338CA') : '#cbd5e1',
        }}
        aria-hidden="true"
      />
      {label}
    </button>
  );
}

// ── Progress ──────────────────────────────────────────────────────────────

export function ProgressBar({
  value, tone = '#4338CA', height = 6, className, ariaLabel,
}: {
  value: number; tone?: string; height?: number; className?: string; ariaLabel?: string;
}) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div
      className={cx('w-full rounded-none bg-slate-200 overflow-hidden', className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <motion.div
        className="h-full rounded-none"
        style={{ background: tone }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────

export function Divider({ className, label }: { className?: string; label?: string }) {
  if (label) {
    return (
      <div className={cx('flex items-center gap-3', className)}>
        <div className="h-px bg-slate-200 flex-1" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</span>
        <div className="h-px bg-slate-200 flex-1" />
      </div>
    );
  }
  return <div className={cx('h-px bg-slate-200', className)} />;
}

// ── Data row ──────────────────────────────────────────────────────────────

export function DataRow({
  label, value, mono, className,
}: {
  label: string; value: ReactNode; mono?: boolean; className?: string;
}) {
  return (
    <div className={cx('flex items-baseline justify-between gap-4 py-2', className)}>
      <dt className="text-[13px] text-slate-500 shrink-0">{label}</dt>
      <dd className={cx('text-[13px] font-medium text-slate-900 text-right min-w-0 truncate', mono && 'clinical-id')}>
        {value}
      </dd>
    </div>
  );
}
