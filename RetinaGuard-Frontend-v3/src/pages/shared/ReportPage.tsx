import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '../../lib/query';
import { reportService } from '../../services/api';
import { API_BASE, HttpError } from '../../lib/http';
import { cx, formatDateTime, formatPercent, isTrue, titleCase } from '../../lib/format';
import {
  ABSTAIN_REASONS, LESION_LABELS, MANDATORY_DISCLAIMER,
  REFERRAL_URGENCIES, REVIEW_DECISIONS, TRIAGE_TIERS, gradeByCode,
} from '../../lib/clinical';
import { Alert, Button, Card, EmptyState, SectionHeader, Skeleton } from '../../components/ui';
import { IconAlert, IconArrowLeft, IconDownload, IconFile, IconPrint } from '../../components/ui/icons';

/* ═══════════════════════════════════════════════════════════════════════════
   Screening report — A4, printable.

   GET /reports/:id/json returns `{ report, meta }`. The previous client cast
   the envelope directly to ScreeningReport, so every field read as undefined
   and the page rendered blank.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Renders the QR as a link to the public verification endpoint. The token
 *  itself carries no PHI — that is the point of the endpoint's design. */
function VerificationBlock({ token }: { token: string }) {
  if (!token) return null;
  const url = `${API_BASE}/reports/verify/${token}`;
  return (
    <div className="flex items-start gap-4">
      <div className="w-[84px] h-[84px] rounded-none border-2 border-slate-900 p-1.5 shrink-0 bg-white">
        {/* A deterministic block pattern derived from the token. The scannable
            QR is rendered into the server-generated PDF; this is the on-screen
            stand-in with the verification URL printed beside it. */}
        <div className="grid grid-cols-7 gap-px w-full h-full">
          {Array.from({ length: 49 }).map((_, i) => {
            const on = (token.charCodeAt(i % token.length) + i * 7) % 3 !== 0;
            const corner =
              (i < 3 || (i >= 7 && i < 10) || (i >= 14 && i < 17))
              || (i % 7 >= 4 && i < 21)
              || (i >= 28 && i % 7 < 3);
            return (
              <span
                key={i}
                className={cx('rounded-none', on || corner ? 'bg-slate-900' : 'bg-white')}
              />
            );
          })}
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-1">
          Verification
        </p>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          Check this report against the district record without exposing patient data.
        </p>
        <p className="text-[10px] clinical-id text-slate-500 mt-1.5 break-all">{url}</p>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const { consultationId } = useParams<{ consultationId: string }>();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const { data: report, isLoading, error, refetch } = useQuery({
    queryFn: () => reportService.getJson(consultationId!),
    enabled: Boolean(consultationId),
    deps: [consultationId],
  });

  const generate = async () => {
    if (!consultationId) return;
    setGenerating(true);
    setGenError(null);
    try {
      await reportService.generate(consultationId);
      await refetch();
    } catch (err) {
      setGenError(
        err instanceof HttpError && err.status === 409
          ? 'A report already exists for this case.'
          : err instanceof Error ? err.message : 'The report could not be generated.',
      );
    } finally {
      setGenerating(false);
    }
  };

  const [downloadingVariant, setDownloadingVariant] = useState<'clinical' | 'patient' | null>(null);

  const downloadPdf = async (variant: 'clinical' | 'patient' = 'clinical') => {
    if (!consultationId) return;
    setDownloadingVariant(variant);
    try {
      const blob = await reportService.pdfBlob(consultationId, variant);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RetinaGuard_Report_${report?.reportNumber ?? 'screening-report'}_${variant}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      setGenError('The PDF could not be downloaded from this node.');
    } finally {
      setDownloadingVariant(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-[700px] rounded-none" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="space-y-6">
        <SectionHeader eyebrow="Report" title="Screening report" />
        {genError && <Alert tone="danger" title="Could not generate" icon={<IconAlert size={17} />}>{genError}</Alert>}
        <EmptyState
          icon={<IconFile size={26} />}
          title="No report has been generated for this case"
          description="A report can be produced once a reviewer has recorded a decision."
          action={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
              <Button onClick={generate} loading={generating}>Generate report</Button>
            </div>
          }
        />
      </div>
    );
  }

  const result = report.result;
  const review = report.review;
  const grade = gradeByCode(result?.gradeCode ?? null);
  const reviewerGrade = gradeByCode(review?.gradeCode ?? null);
  const abstained = isTrue(result?.abstained);
  const lesionCounts = report.explainability?.lesion?.counts ?? {};
  const totalLesions = Object.values(lesionCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} icon={<IconArrowLeft size={15} />}>
          Back
        </Button>
      </div>

      <div className="no-print">
        <SectionHeader
          eyebrow="Screening report"
          title={report.reportNumber}
          description={`Generated ${formatDateTime(report.generatedAt)} · schema ${report.schemaVersion}`}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print()} icon={<IconPrint size={15} />}>
                Print
              </Button>
              <Button
                size="sm"
                onClick={() => downloadPdf('clinical')}
                loading={downloadingVariant === 'clinical'}
                icon={downloadingVariant !== 'clinical' ? <IconDownload size={15} /> : undefined}
              >
                Download Clinical PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadPdf('patient')}
                loading={downloadingVariant === 'patient'}
                icon={downloadingVariant !== 'patient' ? <IconDownload size={15} /> : undefined}
              >
                Download Patient Copy
              </Button>
            </div>
          }
        />
      </div>

      {genError && (
        <Alert tone="danger" title="Report action failed" icon={<IconAlert size={17} />} className="no-print">
          {genError}
        </Alert>
      )}

      {/* A4 sheet */}
      <Card className="print-page mx-auto max-w-[820px] !p-10">
        {/* Header */}
        <header className="flex items-start justify-between gap-6 pb-5 border-b-2 border-slate-900">
          <div>
            <h1 className="text-[22px] font-bold tracking-[-0.02em] text-slate-900">
              Diabetic Retinopathy Screening Report
            </h1>
            <p className="text-[12px] text-slate-600 mt-1">
              RetinaGuard · AI-assisted screening and triage aid
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] text-slate-500">Report number</p>
            <p className="text-[13px] font-semibold clinical-id text-slate-900">{report.reportNumber}</p>
            <p className="text-[11px] text-slate-500 mt-1.5">Status</p>
            <p className="text-[12px] font-semibold text-slate-900 uppercase tracking-wide">{report.status}</p>
          </div>
        </header>

        {/* Mandatory disclaimer — printed, not just on screen. */}
        <div className="mt-5 rounded-none border border-slate-300 bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-700 mb-1">
            Screening result — not a diagnosis
          </p>
          <p className="text-[11px] text-slate-700 leading-relaxed">{MANDATORY_DISCLAIMER}</p>
        </div>

        {/* Patient */}
        <section className="mt-6">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 mb-3">Patient</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
            {[
              { l: 'Name', v: report.patient?.name ?? '—' },
              { l: 'Patient code', v: report.patient?.patientCode ?? '—', mono: true },
              { l: 'Age', v: report.patient?.age ?? '—' },
              { l: 'Gender', v: titleCase(report.patient?.gender ?? '') },
              { l: 'Village', v: report.patient?.village ?? '—' },
              { l: 'District', v: report.patient?.district ?? '—' },
              { l: 'Diabetes duration', v: report.patient?.diabetesDurationYears != null ? `${report.patient.diabetesDurationYears} years` : '—' },
              { l: 'Case number', v: report.caseNumber, mono: true },
            ].map((f) => (
              <div key={f.l}>
                <p className="text-[10px] text-slate-500 mb-0.5">{f.l}</p>
                <p className={cx('text-[12px] font-medium text-slate-900', f.mono && 'clinical-id')}>{f.v}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Screening result */}
        <section className="mt-7">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 mb-3">
            AI screening result
          </h2>

          {abstained ? (
            <div className="rounded-none border border-amber-300 bg-amber-50 px-4 py-3.5">
              <p className="text-[13px] font-bold text-amber-900">
                No grade issued — {result?.abstainReason ? ABSTAIN_REASONS[result.abstainReason]?.label : 'automated screening abstained'}
              </p>
              <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                {result?.abstainMessage
                  ?? (result?.abstainReason ? ABSTAIN_REASONS[result.abstainReason]?.guidance : '')}
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-[1.3fr_1fr] gap-5">
              <div className="rounded-none border border-slate-300 px-4 py-3.5">
                <p className="text-[10px] text-slate-500 mb-1">ICDR grade</p>
                <p className="text-[19px] font-bold text-slate-900 leading-tight">
                  {grade?.label ?? '—'}
                </p>
                <p className="text-[11px] text-slate-600 mt-1">{grade?.description}</p>
              </div>
              <div className="space-y-2.5">
                {[
                  { l: 'Model confidence', v: formatPercent(result?.confidence, 1) },
                  { l: 'Referable probability', v: formatPercent(result?.referableProbability, 1) },
                  { l: 'Referable', v: isTrue(result?.referable) ? 'Yes' : 'Not indicated' },
                  {
                    l: 'Triage priority',
                    v: result?.triagePriority
                      ? `${result.triagePriority} — ${TRIAGE_TIERS[result.triagePriority].label}`
                      : '—',
                  },
                  { l: 'Image quality', v: result?.qualityGrade ? `Grade ${result.qualityGrade}` : '—' },
                ].map((f) => (
                  <div key={f.l} className="flex items-baseline justify-between gap-3">
                    <span className="text-[11px] text-slate-500">{f.l}</span>
                    <span className="text-[12px] font-semibold text-slate-900 tnum">{f.v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result?.warnings && result.warnings.length > 0 && (
            <ul className="mt-3 space-y-1">
              {result.warnings.map((w, i) => (
                <li key={i} className="text-[11px] text-amber-800 flex gap-2">
                  <span aria-hidden="true">·</span><span>{w}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Explainability */}
        <section className="mt-7">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 mb-3">
            Explainability evidence
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-none border border-slate-200 px-3.5 py-3">
              <p className="text-[10px] text-slate-500 mb-1">Attention regions</p>
              <p className="text-[15px] font-bold text-slate-900 tnum">
                {report.explainability?.gradcam?.regionCount ?? 0}
              </p>
              {report.explainability?.gradcam?.peakIntensity != null && (
                <p className="text-[10px] text-slate-500 mt-0.5 tnum">
                  Peak {formatPercent(report.explainability.gradcam.peakIntensity, 0)}
                </p>
              )}
            </div>
            <div className="rounded-none border border-slate-200 px-3.5 py-3">
              <p className="text-[10px] text-slate-500 mb-1">Lesions detected</p>
              <p className="text-[15px] font-bold text-slate-900 tnum">{totalLesions}</p>
              {totalLesions > 0 && (
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {Object.entries(lesionCounts)
                    .filter(([, n]) => n > 0)
                    .map(([t, n]) => `${LESION_LABELS[t as keyof typeof LESION_LABELS] ?? t} ×${n}`)
                    .join(', ')}
                </p>
              )}
            </div>
            <div className="rounded-none border border-slate-200 px-3.5 py-3">
              <p className="text-[10px] text-slate-500 mb-1">Anatomy</p>
              <p className="text-[11px] text-slate-800 leading-relaxed">
                Optic disc {isTrue(report.explainability?.anatomy?.opticDiscDetected) ? 'detected' : 'not detected'}
                <br />
                Fovea {isTrue(report.explainability?.anatomy?.foveaDetected) ? 'detected' : 'not detected'}
                {report.explainability?.anatomy?.cupToDiscRatio != null && (
                  <>
                    <br />
                    <span className="tnum">C:D {report.explainability.anatomy.cupToDiscRatio.toFixed(3)}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {isTrue(report.explainability?.disagreement) && (
            <p className="mt-3 text-[11px] text-purple-800 rounded-none bg-purple-50 border border-purple-200 px-3 py-2">
              <strong>Evidence layers disagreed</strong> — the attention map and the
              lesion detector reached different conclusions for this image.
            </p>
          )}
        </section>

        {/* Human decision */}
        <section className="mt-7">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 mb-3">
            Human reviewer decision
          </h2>
          {review ? (
            <div className="rounded-none border-2 border-slate-900 px-4 py-4">
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <p className="text-[10px] text-slate-500 mb-0.5">Reviewer grade</p>
                  <p className="text-[13px] font-bold text-slate-900">{reviewerGrade?.label ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 mb-0.5">Decision</p>
                  <p className="text-[13px] font-bold text-slate-900">
                    {REVIEW_DECISIONS[review.decision]?.label ?? review.decision}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 mb-0.5">Agreement with AI</p>
                  <p className="text-[12px] font-medium text-slate-900">
                    {review.agreement === null ? 'No AI grade to compare'
                      : isTrue(review.agreement) ? 'Agreed' : 'Overridden by reviewer'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 mb-0.5">Referral urgency</p>
                  <p className="text-[12px] font-medium text-slate-900">
                    {review.referralUrgency ? REFERRAL_URGENCIES[review.referralUrgency].label : '—'}
                  </p>
                </div>
              </div>

              {review.overrideReason && (
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <p className="text-[10px] text-slate-500 mb-1">Override reason</p>
                  <p className="text-[12px] text-slate-800 leading-relaxed">{review.overrideReason}</p>
                </div>
              )}
              {review.notes && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="text-[10px] text-slate-500 mb-1">Clinical notes</p>
                  <p className="text-[12px] text-slate-800 leading-relaxed">{review.notes}</p>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] text-slate-500 mb-0.5">Reviewed by</p>
                  <p className="text-[12px] font-semibold text-slate-900">
                    {review.reviewerName ?? 'Registered reviewer'}
                    {review.registrationNo && (
                      <span className="clinical-id font-normal text-slate-600"> · {review.registrationNo}</span>
                    )}
                  </p>
                </div>
                <p className="text-[11px] text-slate-600 tnum">{formatDateTime(review.completedAt)}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-none border border-amber-300 bg-amber-50 px-4 py-3">
              <p className="text-[12px] font-semibold text-amber-900">
                Awaiting reviewer adjudication
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                This report is provisional. No referral decision has been issued.
              </p>
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-8 pt-5 border-t border-slate-300 flex flex-wrap items-start justify-between gap-6">
          <VerificationBlock token={report.qrToken} />
          <div className="text-right text-[10px] text-slate-500 leading-relaxed">
            <p>Site <span className="clinical-id">{report.siteId}</span></p>
            <p>Model <span className="clinical-id">{result?.modelVersion ?? '—'}</span></p>
            <p>Hash <span className="clinical-id">{result?.modelHash ?? '—'}</span></p>
            <p className="mt-2">RetinaGuard · SIH 2026 · Team Glitch to Sight</p>
          </div>
        </footer>
      </Card>
    </div>
  );
}
