import { motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cx, formatPercent, isTrue } from '../../lib/format';
import {
  ABSTAIN_REASONS, QUALITY_GRADES, STATUS_LABELS, TRIAGE_TIERS, gradeByCode,
} from '../../lib/clinical';
import type {
  AbstainReason, ConsultationStatus, DrGradeCode, QualityGrade, SqlBool, SyncState, TriagePriority,
} from '../../types';
import { GlowCard } from '../ui/spotlight-card';
import { IconAlert, IconCheck, IconClock, IconSync, IconWifiOff } from '../ui/icons';

/* ═══════════════════════════════════════════════════════════════════════════
   Clinical indicators.

   Non-negotiable rule enforced here: triage priority is NEVER communicated by
   colour alone. Every priority surface renders the tier code and a word.
   ═══════════════════════════════════════════════════════════════════════════ */

const TRIAGE_STYLES: Record<TriagePriority, { fg: string; bg: string; ring: string }> = {
  P0: { fg: 'var(--color-p0)', bg: 'transparent', ring: 'var(--color-hairline)' },
  P1: { fg: 'var(--color-p1)', bg: 'transparent', ring: 'var(--color-hairline)' },
  P2: { fg: 'var(--color-p2)', bg: 'transparent', ring: 'var(--color-hairline)' },
  P3: { fg: 'var(--color-p3)', bg: 'transparent', ring: 'var(--color-hairline)' },
};

export function PriorityChip({
  priority, size = 'md', showLabel = true, className,
}: {
  priority: TriagePriority | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}) {
  if (!priority) {
    return (
      <span className={cx('inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-pearl)] border border-[var(--color-hairline)] text-[var(--color-ink-muted-48)] font-medium',
        size === 'sm' ? 'h-6 px-2 text-[11px]' : 'h-7 px-2.5 text-xs', className)}>
        Not triaged
      </span>
    );
  }

  const tier = TRIAGE_TIERS[priority];
  const style = TRIAGE_STYLES[priority];
  const sizeCx = size === 'sm' ? 'h-6 px-2 text-[11px] gap-1'
    : size === 'lg' ? 'h-9 px-3.5 text-sm gap-2'
    : 'h-7 px-2.5 text-xs gap-1.5';

  return (
    <span
      className={cx('inline-flex items-center rounded-full font-semibold border', sizeCx, className)}
      style={{ color: 'var(--color-ink)', background: style.bg, borderColor: style.ring }}
      title={`${priority} — ${tier.meaning} ${tier.targetWindow}.`}
    >
      <span
        className={cx('rounded-full shrink-0', size === 'lg' ? 'w-2 h-2' : 'w-1.5 h-1.5')}
        style={{ background: style.fg }}
        aria-hidden="true"
      />
      <span className="tnum">{priority}</span>
      {/* The word is mandatory: colour alone is not an accessible signal. */}
      {showLabel && <span className="font-medium opacity-90">{tier.label}</span>}
    </span>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-transparent text-[var(--color-ink-muted-48)] border-[var(--color-hairline)]',
  success: 'bg-transparent text-[var(--color-p3)] border-[var(--color-hairline)]',
  warning: 'bg-transparent text-[var(--color-p2)] border-[var(--color-hairline)]',
  danger: 'bg-transparent text-[var(--color-p0)] border-[var(--color-hairline)]',
  info: 'bg-transparent text-[var(--color-primary-on-dark)] border-[var(--color-hairline)]',
  brand: 'bg-transparent text-[var(--color-primary)] border-[var(--color-hairline)]',
};

export function StatusBadge({
  tone = 'neutral', children, icon, size = 'md', className,
}: {
  tone?: BadgeTone; children: ReactNode; icon?: ReactNode;
  size?: 'sm' | 'md'; className?: string;
}) {
  return (
    <span className={cx(
      'inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap',
      size === 'sm' ? 'h-6 px-2 text-[11px]' : 'h-7 px-2.5 text-xs',
      BADGE_TONES[tone], className,
    )}>
      {icon}
      {children}
    </span>
  );
}

const STATUS_TONES: Record<ConsultationStatus, BadgeTone> = {
  registered: 'neutral',
  capture_pending: 'info',
  quality_failed: 'danger',
  analysis_pending: 'info',
  analysis_complete: 'brand',
  awaiting_review: 'warning',
  review_complete: 'success',
  closed: 'neutral',
  cancelled: 'neutral',
};

export function ConsultationStatusBadge({ status, size }: { status: ConsultationStatus; size?: 'sm' | 'md' }) {
  return (
    <StatusBadge tone={STATUS_TONES[status] ?? 'neutral'} size={size}>
      {STATUS_LABELS[status] ?? status}
    </StatusBadge>
  );
}

// ── DR grade ──────────────────────────────────────────────────────────────

export function GradeBadge({
  code, size = 'md', showLabel = true,
}: {
  code: DrGradeCode | null | undefined; size?: 'sm' | 'md'; showLabel?: boolean;
}) {
  const grade = gradeByCode(code);
  if (!grade) return <StatusBadge tone="neutral" size={size}>No grade issued</StatusBadge>;
  return (
    <StatusBadge tone={grade.referable ? 'warning' : 'success'} size={size}>
      <span className="tnum font-semibold">{grade.short}</span>
      {showLabel && <span className="opacity-80">· {grade.label}</span>}
    </StatusBadge>
  );
}

// ── Quality gauge ─────────────────────────────────────────────────────────

const QUALITY_COLORS: Record<QualityGrade, string> = {
  A: '#059669', B: '#d97706', C: '#dc2626',
};

/**
 * Radial quality gauge. The letter grade is the primary read; the numeric
 * score is secondary. A technician glancing at this between patients needs
 * "can I proceed" answered in under a second.
 */
export function QualityGauge({
  grade, score, size = 132, showGuidance = true,
}: {
  grade: QualityGrade | null | undefined;
  score: number | null | undefined;
  size?: number;
  showGuidance?: boolean;
}) {
  const pct = typeof score === 'number' ? Math.max(0, Math.min(1, score)) : 0;
  const colour = grade ? QUALITY_COLORS[grade] : '#94a3b8';
  const stroke = 9;
  const r = (size - stroke) / 2 - 4;
  const circumference = 2 * Math.PI * r;
  // 270° arc, leaving a gap at the bottom so the letter has room to breathe.
  const arcFraction = 0.75;
  const dash = circumference * arcFraction;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-[225deg]">
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke="#e2e8f0" strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
          />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={colour} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${dash * pct} ${circumference}`}
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${dash * pct} ${circumference}` }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[34px] font-bold leading-none" style={{ color: colour }}>
            {grade ?? '—'}
          </span>
          <span className="text-[12px] text-slate-500 tnum mt-1">
            {typeof score === 'number' ? formatPercent(score, 1) : 'Not assessed'}
          </span>
        </div>
      </div>
      {showGuidance && grade && (
        <p className="text-[12px] text-slate-500 text-center max-w-[190px] leading-relaxed">
          {QUALITY_GRADES[grade].guidance}
        </p>
      )}
    </div>
  );
}

export function QualityBadge({ grade, size }: { grade: QualityGrade | null | undefined; size?: 'sm' | 'md' }) {
  if (!grade) return <StatusBadge tone="neutral" size={size}>Quality not assessed</StatusBadge>;
  const tone: BadgeTone = grade === 'A' ? 'success' : grade === 'B' ? 'warning' : 'danger';
  return <StatusBadge tone={tone} size={size}>Quality {grade}</StatusBadge>;
}

// ── Confidence meter ──────────────────────────────────────────────────────

/**
 * Confidence with the abstention threshold drawn on the track.
 *
 * Showing the threshold is the point: a bare percentage invites a reviewer to
 * form their own sense of "high enough". The line makes the system's actual
 * decision boundary visible.
 */
export function ConfidenceMeter({
  value, threshold = 0.7, label = 'Model confidence', compact = false,
}: {
  value: number | null | undefined; threshold?: number; label?: string; compact?: boolean;
}) {
  const v = typeof value === 'number' ? Math.max(0, Math.min(1, value)) : null;
  const below = v !== null && v < threshold;
  const colour = v === null ? '#94a3b8' : below ? '#d97706' : '#4338CA';

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-2">
        <span className={cx('text-slate-500', compact ? 'text-[11px]' : 'text-[13px]')}>{label}</span>
        <span
          className={cx('font-semibold tnum', compact ? 'text-sm' : 'text-lg')}
          style={{ color: colour }}
        >
          {v === null ? '—' : formatPercent(v, 1)}
        </span>
      </div>

      <div className="relative">
        <div className={cx('w-full rounded-none bg-slate-200 overflow-hidden', compact ? 'h-1.5' : 'h-2.5')}>
          <motion.div
            className="h-full rounded-none"
            style={{ background: colour }}
            initial={{ width: 0 }}
            animate={{ width: `${(v ?? 0) * 100}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <div
          className="absolute top-0 bottom-0 w-px bg-slate-500"
          style={{ left: `${threshold * 100}%` }}
          aria-hidden="true"
        >
          <span className="absolute -top-1 -left-[3px] w-[7px] h-[7px] rounded-full bg-slate-500" />
        </div>
      </div>

      {!compact && (
        <p className="text-[11px] text-slate-400 mt-1.5 tnum">
          Abstention threshold {formatPercent(threshold, 0)}
          {below && <span className="text-amber-600 font-medium"> — below threshold</span>}
        </p>
      )}
    </div>
  );
}

// ── Abstention notice ─────────────────────────────────────────────────────

export function AbstentionNotice({ reason }: { reason: AbstainReason | null | undefined }) {
  const detail = reason ? ABSTAIN_REASONS[reason] : null;
  return (
    <div className="rounded-none border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <IconAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-900">
            No grade issued — {detail?.label ?? 'automated screening abstained'}
          </p>
          <p className="text-[13px] text-amber-800/90 mt-1 leading-relaxed">
            {detail?.guidance
              ?? 'The automated screening did not reach a confident result for this image.'}
            {' '}The case has been placed in the human review queue.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Sync indicator ────────────────────────────────────────────────────────

export function SyncIndicator({
  state, pending, compact,
}: {
  state: 'online' | 'offline' | 'syncing' | 'degraded';
  pending: number;
  compact?: boolean;
}) {
  const config = {
    online: { tone: 'success' as BadgeTone, icon: <IconCheck size={13} />, label: 'Synced' },
    syncing: { tone: 'info' as BadgeTone, icon: <IconSync size={13} className="animate-spin" />, label: 'Syncing' },
    offline: { tone: 'warning' as BadgeTone, icon: <IconWifiOff size={13} />, label: 'Offline' },
    degraded: { tone: 'danger' as BadgeTone, icon: <IconAlert size={13} />, label: 'Attention' },
  }[state];

  return (
    <StatusBadge tone={config.tone} icon={config.icon} size={compact ? 'sm' : 'md'}>
      {config.label}
      {pending > 0 && <span className="tnum opacity-75">· {pending} queued</span>}
    </StatusBadge>
  );
}

export function SyncStateBadge({ state }: { state: SyncState }) {
  const map: Record<SyncState, { tone: BadgeTone; label: string }> = {
    pending: { tone: 'warning', label: 'Pending' },
    synced: { tone: 'success', label: 'Synced' },
    conflict: { tone: 'danger', label: 'Conflict' },
  };
  const cfg = map[state] ?? map.pending;
  return <StatusBadge tone={cfg.tone} size="sm">{cfg.label}</StatusBadge>;
}

// ── Animated counter ──────────────────────────────────────────────────────

/**
 * Counts up to a value. Deliberately short (600ms) and eased out: a metric
 * that keeps animating while someone is trying to read it is a nuisance.
 */
export function AnimatedCounter({
  value, duration = 600, className, suffix, decimals = 0,
}: {
  value: number; duration?: number; className?: string; suffix?: string; decimals?: number;
}) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { setDisplay(value); fromRef.current = value; return; }

    const from = fromRef.current;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (value - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = value;
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  return (
    <span className={cx('tnum', className)}>
      {display.toFixed(decimals)}{suffix}
    </span>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────

export function MetricCard({
  label, value, sublabel, icon, tone = 'neutral', decimals = 0, suffix, onClick, loading,
}: {
  label: string;
  value: number | string;
  sublabel?: ReactNode;
  icon?: ReactNode;
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger';
  decimals?: number;
  suffix?: string;
  onClick?: () => void;
  loading?: boolean;
}) {
  const toneStyles = {
    neutral: { icon: 'bg-[var(--color-surface-pearl)] text-[var(--color-ink-muted-48)]', value: 'text-[var(--color-ink)]' },
    brand: { icon: 'bg-[var(--color-primary-on-dark)] text-white', value: 'text-[var(--color-ink)]' },
    success: { icon: 'bg-[var(--color-p3)] text-white', value: 'text-[var(--color-ink)]' },
    warning: { icon: 'bg-[var(--color-p2)] text-white', value: 'text-[var(--color-ink)]' },
    danger: { icon: 'bg-[var(--color-p0)] text-white', value: 'text-[var(--color-ink)]' },
  }[tone];

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      onClick={onClick}
      className={cx(
        'w-full text-left transition-colors duration-[var(--duration-fast)] cursor-pointer',
        onClick && 'hover:bg-[var(--color-surface-pearl)] group',
      )}
    >
      <GlowCard customSize glowColor="blue" className={cx(
        'rounded-[var(--radius-lg)] bg-[var(--color-canvas)] border border-[var(--color-hairline)] p-5 text-left w-full shadow-none transition-colors',
        onClick && 'group-hover:border-[var(--color-ink-muted-48)]'
      )}>
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <span className="text-body font-medium text-[var(--color-ink-muted-48)] leading-tight">{label}</span>
        {icon && (
          <span className={cx('w-8 h-8 rounded-full flex items-center justify-center shrink-0', toneStyles.icon)}>
            {icon}
          </span>
        )}
      </div>
      {loading ? (
        <div className="skeleton h-8 w-20 rounded-[var(--radius-sm)]" />
      ) : (
        <div className={cx('text-display-lg font-semibold tracking-tight', toneStyles.value)}>
          {typeof value === 'number'
            ? <AnimatedCounter value={value} decimals={decimals} suffix={suffix} />
            : value}
        </div>
      )}
      {sublabel && <div className="text-caption text-[var(--color-ink-muted-48)] mt-2">{sublabel}</div>}
      </GlowCard>
    </Wrapper>
  );
}

// ── Waiting time ──────────────────────────────────────────────────────────

export function WaitingTime({ since, elapsed }: { since?: string | null; elapsed: string }) {
  const isStale = (() => {
    if (!since) return false;
    const d = new Date(since.replace(' ', 'T') + (since.includes('T') ? '' : 'Z'));
    return !Number.isNaN(d.getTime()) && Date.now() - d.getTime() > 24 * 3600 * 1000;
  })();

  return (
    <span className={cx(
      'inline-flex items-center gap-1.5 text-[13px] tnum',
      isStale ? 'text-amber-600 font-medium' : 'text-slate-500',
    )}>
      <IconClock size={13} />
      {elapsed}
    </span>
  );
}

// ── Disagreement flag ─────────────────────────────────────────────────────

export function DisagreementFlag({ flagged, note }: { flagged: SqlBool; note?: string | null }) {
  if (!isTrue(flagged)) return null;
  return (
    <div className="rounded-none border border-purple-200 bg-purple-50 px-3.5 py-2.5 flex items-start gap-2.5">
      <IconAlert size={15} className="text-purple-600 shrink-0 mt-0.5" />
      <div className="text-[12px] text-purple-900 leading-relaxed">
        <span className="font-semibold">Evidence layers disagree.</span>{' '}
        {note || 'The attention map and the lesion detector reached different conclusions for this image.'}
      </div>
    </div>
  );
}
