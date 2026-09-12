import { motion } from 'framer-motion';
import { cx, formatMs, formatPercent, isTrue } from '../../lib/format';
import {
  AI_RESULT_HEADING, DR_GRADES, HUMAN_REVIEW_NOTICE, LESION_LABELS,
  MANDATORY_DISCLAIMER, PIPELINE_STAGES, QUALITY_METRIC_LABELS, gradeByCode,
} from '../../lib/clinical';
import type { AnalysisResult, QualityMetrics, LesionEvidence } from '../../types';
import { Card, DataRow, Divider } from '../ui';
import { IconAlert, IconShield, IconInfo } from '../ui/icons';
import {
  AbstentionNotice, ConfidenceMeter, GradeBadge, PriorityChip,
} from './indicators';

/* ═══════════════════════════════════════════════════════════════════════════
   Every surface that presents an AI output composes from this file, so the
   mandatory disclaimer and the "human review required" notice cannot be
   omitted by a page that forgets them.
   ═══════════════════════════════════════════════════════════════════════════ */

/** The banner that must accompany every AI screening output. */
export function ScreeningDisclaimer({
  compact, className,
}: { compact?: boolean; className?: string }) {
  return (
    <div
      role="note"
      className={cx(
        'rounded-none border border-indigo-200 bg-indigo-50/70 px-4 py-3 flex items-start gap-3',
        className,
      )}
    >
      <IconShield size={18} className="text-[#4338CA] shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-indigo-950 flex flex-wrap items-center gap-x-2">
          {AI_RESULT_HEADING}
          <span className="text-indigo-400 font-normal" aria-hidden="true">·</span>
          <span className="text-[#4338CA]">{HUMAN_REVIEW_NOTICE}</span>
        </p>
        {!compact && (
          <p className="text-[12px] text-indigo-900/80 mt-1 leading-relaxed">
            {MANDATORY_DISCLAIMER}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Grade probability distribution ────────────────────────────────────────

/**
 * The full 5-class distribution, not just the argmax.
 *
 * A single grade hides how close the runner-up was. A reviewer deciding whether
 * to override needs to see that grade 2 scored 0.41 against grade 1's 0.44.
 */
export function GradeDistribution({
  probabilities, selected,
}: {
  probabilities: number[] | null | undefined;
  selected: number | null | undefined;
}) {
  if (!probabilities?.length) return null;

  return (
    <div className="space-y-2">
      {DR_GRADES.map((grade, i) => {
        const p = probabilities[i] ?? 0;
        const isSelected = grade.code === selected;
        return (
          <div key={grade.code} className="flex items-center gap-3">
            <span className={cx(
              'text-[12px] w-[104px] shrink-0 truncate',
              isSelected ? 'font-semibold text-slate-900' : 'text-slate-500',
            )}>
              {grade.label}
            </span>
            <div className="flex-1 h-2 rounded-none bg-slate-100 overflow-hidden">
              <motion.div
                className="h-full rounded-none"
                style={{ background: isSelected ? '#4338CA' : '#cbd5e1' }}
                initial={{ width: 0 }}
                animate={{ width: `${p * 100}%` }}
                transition={{ duration: 0.5, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <span className={cx(
              'text-[12px] tnum w-12 text-right shrink-0',
              isSelected ? 'font-semibold text-slate-900' : 'text-slate-400',
            )}>
              {formatPercent(p, 1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Quality metrics ───────────────────────────────────────────────────────

export function QualityMetricBars({ metrics }: { metrics: QualityMetrics | null | undefined }) {
  if (!metrics) return null;
  const entries = Object.entries(metrics) as Array<[keyof QualityMetrics, number]>;

  return (
    <div className="space-y-3">
      {entries.map(([key, value], i) => {
        const meta = QUALITY_METRIC_LABELS[key] ?? { label: key, hint: '' };
        const low = value < 0.5;
        return (
          <div key={key}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-[12px] text-slate-600" title={meta.hint}>{meta.label}</span>
              <span className={cx('text-[12px] tnum font-medium', low ? 'text-amber-600' : 'text-slate-700')}>
                {formatPercent(value, 0)}
              </span>
            </div>
            <div className="h-1.5 rounded-none bg-slate-100 overflow-hidden">
              <motion.div
                className="h-full rounded-none"
                style={{ background: low ? '#d97706' : '#4338CA' }}
                initial={{ width: 0 }}
                animate={{ width: `${value * 100}%` }}
                transition={{ duration: 0.45, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Lesion summary ────────────────────────────────────────────────────────

export function LesionSummary({ lesions }: { lesions: LesionEvidence[] | null | undefined }) {
  const list = lesions ?? [];

  if (list.length === 0) {
    return (
      <p className="text-[13px] text-slate-500">
        No lesions were detected by the evidence layer in this image.
      </p>
    );
  }

  const grouped = list.reduce<Record<string, LesionEvidence[]>>((acc, l) => {
    (acc[l.type] ||= []).push(l);
    return acc;
  }, {});

  return (
    <div className="space-y-2.5">
      {Object.entries(grouped).map(([type, items]) => {
        const meanConfidence = items.reduce((s, l) => s + l.confidence, 0) / items.length;
        return (
          <div key={type} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-slate-800 truncate">
                {LESION_LABELS[type as keyof typeof LESION_LABELS] ?? type}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {Array.from(new Set(items.map((l) => l.quadrant))).join(', ')}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[15px] font-semibold text-slate-900 tnum">{items.length}</p>
              <p className="text-[11px] text-slate-400 tnum">{formatPercent(meanConfidence, 0)} mean</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Stage timings ─────────────────────────────────────────────────────────

/**
 * Measured per-stage latency. These are the only legitimate input to the
 * Simulink capacity model, so they are labelled as measured and never
 * interpolated or rounded into something prettier than the data.
 */
export function StageTimings({ timings }: { timings: Record<string, number> | null | undefined }) {
  if (!timings) return null;
  const total = timings.total ?? 0;
  const stages = PIPELINE_STAGES.filter((s) => typeof timings[s.key] === 'number');

  if (stages.length === 0) return null;
  const maxStage = Math.max(...stages.map((s) => timings[s.key]));

  return (
    <div className="space-y-2">
      {stages.map((stage) => {
        const ms = timings[stage.key];
        const share = maxStage > 0 ? ms / maxStage : 0;
        return (
          <div key={stage.key} className="flex items-center gap-3">
            <span className="text-[12px] text-slate-600 w-[118px] shrink-0 truncate">{stage.label}</span>
            <div className="flex-1 h-1.5 rounded-none bg-slate-100 overflow-hidden">
              <motion.div
                className="h-full rounded-none bg-slate-400"
                initial={{ width: 0 }} animate={{ width: `${share * 100}%` }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <span className="text-[11px] tnum text-slate-500 w-[62px] text-right shrink-0">
              {formatMs(ms)}
            </span>
          </div>
        );
      })}
      {total > 0 && (
        <>
          <Divider className="!my-3" />
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-slate-700">Total pipeline</span>
            <span className="text-[13px] font-semibold text-slate-900 tnum">{formatMs(total)}</span>
          </div>
        </>
      )}
    </div>
  );
}

// ── Warnings ──────────────────────────────────────────────────────────────

export function WarningList({ warnings }: { warnings: string[] | null | undefined }) {
  if (!warnings?.length) return null;
  return (
    <div className="rounded-none border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-2.5">
        <IconAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-amber-900 mb-1">
            {warnings.length === 1 ? 'Pipeline warning' : `${warnings.length} pipeline warnings`}
          </p>
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-[12px] text-amber-800/90 leading-relaxed">{w}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── Composite result panel ────────────────────────────────────────────────

export function AnalysisResultPanel({
  analysis, compact,
}: { analysis: AnalysisResult; compact?: boolean }) {
  const abstained = isTrue(analysis.abstained) || analysis.status === 'abstained';
  const grade = gradeByCode(analysis.dr_grade_code);

  return (
    <div className="space-y-4">
      <ScreeningDisclaimer compact={compact} />

      {abstained ? (
        <AbstentionNotice reason={analysis.abstain_reason} />
      ) : (
        <Card className="!p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-1.5">
                Screening result
              </p>
              <p className="text-[26px] font-semibold tracking-[-0.02em] text-slate-900 leading-tight">
                {grade?.label ?? 'No grade issued'}
              </p>
              {grade && <p className="text-[13px] text-slate-500 mt-1">{grade.description}</p>}
            </div>
            <PriorityChip priority={analysis.triage_priority} size="lg" />
          </div>

          <ConfidenceMeter value={analysis.confidence} />

          <Divider className="!my-4" />

          <dl>
            <DataRow
              label="Referable probability"
              value={formatPercent(analysis.referable_probability, 1)}
            />
            <DataRow
              label="Referable"
              value={
                isTrue(analysis.referable)
                  ? <span className="text-amber-700">Yes — refer for examination</span>
                  : <span className="text-emerald-700">Not indicated by this screening</span>
              }
            />
            <DataRow label="Model version" value={analysis.model_version} mono />
          </dl>
        </Card>
      )}

      <WarningList warnings={analysis.warnings} />

      {!abstained && analysis.grade_probabilities && (
        <Card className="!p-5">
          <p className="text-[13px] font-semibold text-slate-800 mb-1">Grade distribution</p>
          <p className="text-[12px] text-slate-500 mb-4">
            Calibrated probability across the five ICDR classes.
          </p>
          <GradeDistribution
            probabilities={analysis.grade_probabilities}
            selected={analysis.dr_grade_code}
          />
        </Card>
      )}

      {isTrue(analysis.audit_sampled) && (
        <div className="rounded-none border border-cyan-200 bg-cyan-50 px-4 py-3 flex items-start gap-2.5">
          <IconInfo size={16} className="text-cyan-600 shrink-0 mt-0.5" />
          <p className="text-[12px] text-cyan-900 leading-relaxed">
            <span className="font-semibold">Selected for quality audit.</span>{' '}
            This case was randomly sampled from the auto-cleared pool so false
            negatives on the low-grade path stay visible.
          </p>
        </div>
      )}
    </div>
  );
}

export { GradeBadge };
