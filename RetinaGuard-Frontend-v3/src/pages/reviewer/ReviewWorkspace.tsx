import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '../../lib/query';
import { analysisService, imageService, reviewService } from '../../services/api';
import { HttpError } from '../../lib/http';
import { cx, formatPercent, isTrue } from '../../lib/format';
import {
  DR_GRADES, REFERRAL_URGENCIES, REVIEW_DECISIONS, gradeByCode, lintClinicalText,
} from '../../lib/clinical';
import {
  Alert, Button, Card, DataRow, Divider, EmptyState, Field, SectionHeader,
  Select, Skeleton, Textarea,
} from '../../components/ui';
import { RetinaViewer } from '../../components/clinical/RetinaViewer';
import {
  AbstentionNotice, ConfidenceMeter, DisagreementFlag, PriorityChip, QualityBadge,
} from '../../components/clinical/indicators';
import {
  GradeDistribution, LesionSummary, ScreeningDisclaimer, WarningList,
} from '../../components/clinical/ResultPanel';
import {
  IconAlert, IconArrowLeft, IconCheck, IconFile, IconStethoscope,
} from '../../components/ui/icons';
import type {
  DrGradeCode, ExplainabilityLayers, ReferralUrgency, ReviewDecision,
} from '../../types';

/* ═══════════════════════════════════════════════════════════════════════════
   Review workspace — where the human-in-the-loop control is actually exercised.

   Two defects from the previous build are fixed here:

   1. The decision form had no grade selector, and submitted { decision, notes }.
      `reviewerGradeCode` is required, so every submission returned 422 and no
      adjudication was ever recorded.

   2. Fundus images were read from `consultation.images`, a key GET /review/:id
      does not return, so the reviewer saw no evidence at all. Images come from
      imageService.listByConsultation; explainability from the analysis.
   ═══════════════════════════════════════════════════════════════════════════ */

export default function ReviewWorkspace() {
  const { consultationId } = useParams<{ consultationId: string }>();
  const navigate = useNavigate();

  const [reviewerGrade, setReviewerGrade] = useState<DrGradeCode | null>(null);
  const [decision, setDecision] = useState<ReviewDecision | ''>('');
  const [urgency, setUrgency] = useState<ReferralUrgency | ''>('');
  const [overrideReason, setOverrideReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [layers, setLayers] = useState<ExplainabilityLayers | null>(null);

  // Recorded so the backend can compute how long adjudication took.
  const [startedAt] = useState(() => new Date().toISOString());

  const { data, isLoading, error } = useQuery({
    queryFn: () => reviewService.getCase(consultationId!),
    enabled: Boolean(consultationId),
    deps: [consultationId],
  });

  const { data: images } = useQuery({
    queryFn: () => imageService.listByConsultation(consultationId!),
    enabled: Boolean(consultationId),
    deps: [consultationId],
  });

  const consultation = data?.consultation ?? null;
  const analysis = data?.analyses?.[0] ?? null;
  const existingReview = data?.review ?? null;

  useEffect(() => {
    if (!analysis) return;
    let cancelled = false;
    analysisService.getExplainability(analysis.id)
      .then((l) => { if (!cancelled) setLayers(l); })
      .catch(() => { if (!cancelled) setLayers(null); });
    return () => { cancelled = true; };
  }, [analysis]);

  // Pre-select the AI's grade as the starting point. The reviewer changes it to
  // override — which makes an override a deliberate act rather than a default.
  useEffect(() => {
    if (analysis && reviewerGrade === null && analysis.dr_grade_code !== null) {
      setReviewerGrade(analysis.dr_grade_code);
    }
  }, [analysis, reviewerGrade]);

  const primaryImage = (images ?? []).find((i) => i.status !== 'superseded') ?? null;

  const aiGrade = analysis?.dr_grade_code ?? null;
  const isOverride = reviewerGrade !== null && aiGrade !== null && reviewerGrade !== aiGrade;
  const abstained = analysis ? isTrue(analysis.abstained) || analysis.status === 'abstained' : false;

  // Client-side mirror of the backend linter, so a reviewer sees the problem
  // while typing instead of losing their notes to a 409 on submit.
  const noteViolations = useMemo(() => lintClinicalText(notes), [notes]);
  const overrideViolations = useMemo(() => lintClinicalText(overrideReason), [overrideReason]);
  const hasViolations = noteViolations.length > 0 || overrideViolations.length > 0;

  const canSubmit =
    reviewerGrade !== null && decision !== '' && !hasViolations && !submitting && !existingReview;

  const submit = async () => {
    if (!consultationId || reviewerGrade === null || decision === '' || !canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await reviewService.decide(consultationId, {
        reviewerGradeCode: reviewerGrade,
        decision,
        referralUrgency: urgency || undefined,
        overrideReason: isOverride ? overrideReason.trim() || undefined : undefined,
        notes: notes.trim() || undefined,
        reviewStartedAt: startedAt,
      });
      setDone(true);
      setTimeout(() => navigate(`/app/review/${consultationId}/report`), 1200);
    } catch (err) {
      if (err instanceof HttpError && err.code === 'CLINICAL_SAFETY_VIOLATION') {
        const details = err.details as { violations?: Array<{ term: string; suggestion: string }> } | undefined;
        const terms = details?.violations?.map((v) => `"${v.term}" → "${v.suggestion}"`).join(', ');
        setSubmitError(
          `Prohibited clinical language. RetinaGuard reports screening results, not diagnoses.${terms ? ` Replace ${terms}.` : ''}`,
        );
      } else if (err instanceof HttpError && err.status === 409) {
        setSubmitError('This case has already been adjudicated. Only one decision per case is permitted.');
      } else {
        setSubmitError(err instanceof Error ? err.message : 'The decision could not be recorded.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-80" />
        <div className="grid lg:grid-cols-2 gap-5">
          <Skeleton className="h-[560px] rounded-none" />
          <Skeleton className="h-[560px] rounded-none" />
        </div>
      </div>
    );
  }

  if (error || !consultation) {
    return (
      <EmptyState
        title="Case could not be loaded"
        description="The consultation may have been closed or removed from this node."
        action={<Button onClick={() => navigate('/app/review/queue')}>Back to queue</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/review/queue')} icon={<IconArrowLeft size={15} />}>
          Queue
        </Button>
      </div>

      <SectionHeader
        eyebrow="Adjudication"
        title={consultation.patient_name}
        description={`${consultation.age ?? '—'} years · ${consultation.gender ?? 'not stated'} · ${consultation.village ?? 'village not recorded'}, ${consultation.district ?? '—'}`}
        actions={<PriorityChip priority={consultation.triage_priority} size="lg" />}
      />

      {existingReview && (
        <Alert tone="info" title="This case has already been adjudicated" icon={<IconCheck size={17} />}
          action={
            <Button size="sm" variant="outline" onClick={() => navigate(`/app/review/${consultationId}/report`)}>
              View report
            </Button>
          }
        >
          Decision recorded as <strong>{REVIEW_DECISIONS[existingReview.decision]?.label ?? existingReview.decision}</strong>.
          One adjudication is permitted per case.
        </Alert>
      )}

      <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-5 items-start">
        {/* ── Left: evidence ─────────────────────────────────────────── */}
        <div className="space-y-5">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[15px] font-semibold text-slate-900">Evidence</h2>
                <p className="text-[12px] text-slate-500 mt-0.5 clinical-id">
                  {consultation.case_number}
                </p>
              </div>
              <QualityBadge grade={primaryImage?.quality_grade ?? null} />
            </div>

            <RetinaViewer
              laterality={primaryImage?.laterality ?? null}
              anatomy={analysis?.anatomy ?? null}
              lesions={analysis?.lesions ?? null}
              gradcamRegions={layers?.gradcam?.payload?.regions ?? null}
              seed={analysis ? analysis.id.charCodeAt(0) * 31 + analysis.id.charCodeAt(1) : 42}
              initialLayers={['gradcam', 'anatomy']}
            />

            {layers?.gradcam && (
              <div className="mt-4">
                <DisagreementFlag
                  flagged={layers.gradcam.disagreement_flag}
                  note={layers.gradcam.disagreement_note}
                />
              </div>
            )}

            <Divider className="!my-5" />

            <h3 className="text-[13px] font-semibold text-slate-800 mb-3">Lesion evidence</h3>
            <LesionSummary lesions={analysis?.lesions ?? null} />
          </Card>

          {analysis && (
            <Card>
              <h3 className="text-[13px] font-semibold text-slate-800 mb-1">Grade distribution</h3>
              <p className="text-[12px] text-slate-500 mb-4">
                How close the runner-up was matters when you are deciding whether to override.
              </p>
              <GradeDistribution
                probabilities={analysis.grade_probabilities}
                selected={analysis.dr_grade_code}
              />
              <Divider className="!my-4" />
              <dl>
                <DataRow label="Model version" value={analysis.model_version} mono />
                <DataRow label="Model hash" value={analysis.model_hash} mono />
                <DataRow label="Referable probability" value={formatPercent(analysis.referable_probability, 1)} />
              </dl>
            </Card>
          )}
        </div>

        {/* ── Right: AI output + decision ────────────────────────────── */}
        <div className="space-y-5">
          <ScreeningDisclaimer />

          {analysis ? (
            abstained ? (
              <AbstentionNotice reason={analysis.abstain_reason} />
            ) : (
              <Card>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-1.5">
                  AI screening output
                </p>
                <p className="text-[24px] font-semibold tracking-[-0.02em] text-slate-900 leading-tight mb-4">
                  {gradeByCode(analysis.dr_grade_code)?.label ?? 'No grade issued'}
                </p>
                <ConfidenceMeter value={analysis.confidence} />
              </Card>
            )
          ) : (
            <Alert tone="warning" title="No analysis on this case" icon={<IconAlert size={17} />}>
              Adjudicate from the image and clinical context alone, or send the case back for repeat imaging.
            </Alert>
          )}

          <WarningList warnings={analysis?.warnings ?? null} />

          {/* Decision form */}
          <Card>
            <div className="flex items-center gap-2.5 mb-5">
              <span className="w-8 h-8 rounded-none bg-indigo-50 text-[#4338CA] flex items-center justify-center">
                <IconStethoscope size={16} />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold text-slate-900">Clinical decision</h2>
                <p className="text-[12px] text-slate-500">Your grade and decision are recorded against the AI output</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* The grade selector whose absence made every submission fail. */}
              <Field
                label="Your grade"
                required
                hint={aiGrade !== null ? 'Pre-set to the AI grade. Change it to record an override.' : 'No AI grade was issued for this case.'}
              >
                <div className="grid grid-cols-5 gap-1.5">
                  {DR_GRADES.map((g) => {
                    const selected = reviewerGrade === g.code;
                    const isAi = aiGrade === g.code;
                    return (
                      <button
                        key={g.code}
                        type="button"
                        disabled={Boolean(existingReview)}
                        onClick={() => setReviewerGrade(g.code)}
                        title={`${g.label} — ${g.description}`}
                        className={cx(
                          'relative rounded-none border px-2 py-2.5 text-center transition-all duration-200',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                          selected
                            ? 'border-[#4338CA] bg-indigo-50 ring-1 ring-[#4338CA]'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                        )}
                      >
                        <span className={cx(
                          'block text-[17px] font-semibold tnum leading-none',
                          selected ? 'text-[#4338CA]' : 'text-slate-700',
                        )}>
                          {g.code}
                        </span>
                        <span className={cx(
                          'block text-[9.5px] mt-1 leading-tight',
                          selected ? 'text-[#4338CA]' : 'text-slate-500',
                        )}>
                          {g.short.replace('Grade ', 'G')}
                        </span>
                        {isAi && (
                          <span
                            className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-1.5 py-px rounded-none bg-slate-700 text-white text-[8.5px] font-semibold tracking-wide"
                            aria-label="AI grade"
                          >
                            AI
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {reviewerGrade !== null && (
                  <p className="text-[12px] text-slate-600 mt-2">
                    {gradeByCode(reviewerGrade)?.label} — {gradeByCode(reviewerGrade)?.description}
                  </p>
                )}
              </Field>

              <AnimatePresence>
                {isOverride && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.24 }}
                  >
                    <Alert tone="warning" title="You are overriding the AI grade" icon={<IconAlert size={16} />}>
                      AI graded <strong>{gradeByCode(aiGrade)?.label}</strong>; you selected{' '}
                      <strong>{gradeByCode(reviewerGrade)?.label}</strong>. Record why below —
                      overrides are how the model gets corrected.
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              <Field label="Decision" required>
                <div className="grid sm:grid-cols-2 gap-1.5">
                  {(Object.keys(REVIEW_DECISIONS) as ReviewDecision[]).map((d) => {
                    const selected = decision === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={Boolean(existingReview)}
                        onClick={() => setDecision(d)}
                        className={cx(
                          'rounded-none border px-3.5 py-3 text-left transition-all duration-200',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                          selected
                            ? 'border-[#4338CA] bg-indigo-50 ring-1 ring-[#4338CA]'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                        )}
                      >
                        <span className={cx(
                          'block text-[13px] font-semibold',
                          selected ? 'text-[#4338CA]' : 'text-slate-800',
                        )}>
                          {REVIEW_DECISIONS[d].label}
                        </span>
                        <span className="block text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {REVIEW_DECISIONS[d].description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Field>

              {decision === 'refer' && (
                <Field label="Referral urgency" hint="How soon the patient should be seen">
                  <Select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as ReferralUrgency)}
                    disabled={Boolean(existingReview)}
                  >
                    <option value="">Select urgency</option>
                    {(Object.keys(REFERRAL_URGENCIES) as ReferralUrgency[]).map((u) => (
                      <option key={u} value={u}>
                        {REFERRAL_URGENCIES[u].label} — {REFERRAL_URGENCIES[u].description}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              {isOverride && (
                <Field
                  label="Override reason"
                  error={overrideViolations.length > 0
                    ? `Prohibited term: ${overrideViolations.map((v) => v.term).join(', ')}`
                    : null}
                >
                  <Textarea
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="What did you see that the model did not?"
                    invalid={overrideViolations.length > 0}
                    disabled={Boolean(existingReview)}
                    maxLength={1000}
                  />
                </Field>
              )}

              <Field
                label="Clinical notes"
                hint="Screening language only — this text is linted before it is stored"
                error={noteViolations.length > 0
                  ? `Prohibited term: ${noteViolations.map((v) => v.term).join(', ')}`
                  : null}
              >
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observations relevant to the decision"
                  invalid={noteViolations.length > 0}
                  disabled={Boolean(existingReview)}
                  maxLength={2000}
                />
              </Field>

              {/* Live suggestions, in place, before the note is lost to a 409. */}
              <AnimatePresence>
                {hasViolations && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Alert tone="danger" title="Rephrase before submitting" icon={<IconAlert size={16} />}>
                      <ul className="space-y-1 mt-1">
                        {[...noteViolations, ...overrideViolations].map((v) => (
                          <li key={v.term} className="text-[12px]">
                            Replace <strong>"{v.term}"</strong> with "{v.suggestion}"
                          </li>
                        ))}
                      </ul>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              {submitError && (
                <Alert tone="danger" title="Decision not recorded" icon={<IconAlert size={16} />}>
                  {submitError}
                </Alert>
              )}
            </div>
          </Card>

          {/* Sticky actions */}
          <div className="sticky bottom-4">
            <Card className="!py-3.5 shadow-[0_8px_16px_-4px_rgb(15_23_42/0.06),0_24px_48px_-12px_rgb(15_23_42/0.14)]">
              {done ? (
                <p className="text-[13px] font-medium text-emerald-700 flex items-center gap-2 justify-center py-1">
                  <IconCheck size={16} /> Decision recorded — opening the report
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline" className="flex-1"
                    onClick={() => navigate('/app/review/queue')}
                  >
                    Back to queue
                  </Button>
                  <Button
                    onClick={submit}
                    disabled={!canSubmit}
                    loading={submitting}
                    icon={!submitting ? <IconFile size={15} /> : undefined}
                  >
                    {isOverride ? 'Record override' : 'Record decision'}
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
