import { motion } from 'framer-motion';
import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '../../lib/query';
import { analysisService, consultationService, imageService } from '../../services/api';
import { useSync } from '../../contexts/SyncContext';

import {
  Alert, Button, Card, Divider, EmptyState, SectionHeader, Skeleton,
} from '../../components/ui';
import { RetinaViewer } from '../../components/clinical/RetinaViewer';
import {
  AnalysisResultPanel, LesionSummary, StageTimings, ScreeningDisclaimer,
} from '../../components/clinical/ResultPanel';
import { DisagreementFlag } from '../../components/clinical/indicators';
import {
  IconAlert, IconArrowRight, IconBrain, IconCamera, IconCheck, IconSync,
} from '../../components/ui/icons';
import type { AnalysisResponse, ExplainabilityLayers, ImageRecord } from '../../types';

export default function AiAnalysis() {
  const { consultationId } = useParams<{ consultationId: string }>();
  const navigate = useNavigate();
  const { triggerSync, isSyncing } = useSync();

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [layers, setLayers] = useState<ExplainabilityLayers | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { data: consultation, isLoading: loadingCase, refetch: refetchCase } = useQuery({
    queryFn: () => consultationService.get(consultationId!),
    enabled: Boolean(consultationId),
    deps: [consultationId],
  });

  const { data: images, isLoading: loadingImages } = useQuery({
    queryFn: () => imageService.listByConsultation(consultationId!),
    enabled: Boolean(consultationId),
    deps: [consultationId],
  });

  const gradeable = (images ?? []).filter(
    (i) => i.status !== 'superseded' && i.quality_grade !== 'C',
  );
  const primary: ImageRecord | null = gradeable[0] ?? null;

  const runAnalysis = useCallback(async () => {
    if (!primary || !consultationId) return;
    setRunning(true);
    setError(null);
    try {
      const res = await analysisService.run(primary.id, consultationId);
      setResult(res);
      // Explainability is a separate call: the run response carries the grade,
      // the layers carry the coordinates the viewer draws from.
      try {
        setLayers(await analysisService.getExplainability(res.analysis.id));
      } catch {
        setLayers(null);
      }
      refetchCase();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis could not complete.');
    } finally {
      setRunning(false);
    }
  }, [primary, consultationId, refetchCase]);

  const submitForReview = useCallback(async () => {
    if (!consultationId) return;
    try {
      await consultationService.update(consultationId, { status: 'awaiting_review' });
      setSubmitted(true);
      refetchCase();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit for review.');
    }
  }, [consultationId, refetchCase]);

  if (loadingCase || loadingImages) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <div className="grid lg:grid-cols-2 gap-5">
          <Skeleton className="h-[520px] rounded-none" />
          <Skeleton className="h-[520px] rounded-none" />
        </div>
      </div>
    );
  }

  if (!consultationId || !consultation) {
    return (
      <EmptyState
        title="No screening session selected"
        description="Open a case from the dashboard to run analysis."
        action={<Button onClick={() => navigate('/app/technician')}>Back to dashboard</Button>}
      />
    );
  }

  if (!primary) {
    return (
      <div className="space-y-6">
        <SectionHeader
          eyebrow="Step 3 of the screening workflow"
          title="AI analysis"
        />
        <EmptyState
          icon={<IconCamera size={26} />}
          title="No gradeable image on this case"
          description="Analysis needs at least one image that passed the quality gate. Capture an image before continuing."
          action={
            <Button onClick={() => navigate(`/app/technician/capture/${consultationId}`)}>
              Go to capture
            </Button>
          }
        />
      </div>
    );
  }

  const analysis = result?.analysis ?? null;

  return (
    <div className="space-y-7">
      <SectionHeader
        eyebrow="Step 3 of the screening workflow"
        title="AI analysis"
        description="Runs entirely on this edge node. The result is a screening output and is not shown to the patient."
        actions={
          !analysis ? (
            <Button onClick={runAnalysis} loading={running} icon={!running ? <IconBrain size={16} /> : undefined}>
              Run analysis
            </Button>
          ) : undefined
        }
      />

      {error && (
        <Alert tone="danger" title="Analysis could not complete" icon={<IconAlert size={17} />}>
          {error}
        </Alert>
      )}

      {!analysis && !running && (
        <Card className="!bg-slate-50/70">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 justify-between">
            <div className="flex items-start gap-4">
              <span className="w-11 h-11 rounded-none bg-white border border-slate-200 text-[#4338CA] flex items-center justify-center shrink-0">
                <IconBrain size={20} />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-slate-900">
                  Ready to analyse {primary.laterality === 'left' ? 'left' : 'right'} eye
                </p>
                <p className="text-[13px] text-slate-500 mt-1 max-w-lg leading-relaxed">
                  The pipeline runs preprocessing, anatomy detection, DR grading,
                  lesion evidence and Grad-CAM. A low-confidence or contradictory
                  result abstains rather than publishing a grade.
                </p>
              </div>
            </div>
            <Button onClick={runAnalysis} loading={running} icon={<IconBrain size={16} />}>
              Run analysis
            </Button>
          </div>
        </Card>
      )}

      {running && (
        <Card>
          <div className="flex items-center gap-4">
            <motion.span
              className="w-11 h-11 rounded-none bg-indigo-100 text-[#4338CA] flex items-center justify-center shrink-0"
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <IconBrain size={20} />
            </motion.span>
            <div className="flex-1">
              <p className="text-[14px] font-medium text-slate-900">Running the screening pipeline…</p>
              <p className="text-[12px] text-slate-500 mt-0.5">
                Preprocessing → anatomy → grading → lesions → Grad-CAM
              </p>
            </div>
          </div>
        </Card>
      )}

      {analysis && (
        <>
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-5 items-start">
            {/* Left — evidence */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[15px] font-semibold text-slate-900">Evidence layers</h2>
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    Attention, lesions and anatomy, drawn from measured coordinates
                  </p>
                </div>
              </div>

              <RetinaViewer
                laterality={primary.laterality}
                anatomy={analysis.anatomy}
                lesions={analysis.lesions}
                gradcamRegions={layers?.gradcam?.payload?.regions ?? null}
                seed={analysis.id.charCodeAt(0) * 31 + analysis.id.charCodeAt(1)}
                initialLayers={['gradcam']}
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
              <LesionSummary lesions={analysis.lesions} />
            </Card>

            {/* Right — result */}
            <div className="space-y-5">
              <AnalysisResultPanel analysis={analysis} />

              <Card>
                <h3 className="text-[13px] font-semibold text-slate-800 mb-1">Stage timings</h3>
                <p className="text-[12px] text-slate-500 mb-4">
                  Measured latency per pipeline stage on this node
                </p>
                <StageTimings timings={analysis.stage_timings_ms} />
              </Card>
            </div>
          </div>

          {/* Actions */}
          <Card className="sticky bottom-4 !py-4 shadow-[0_8px_16px_-4px_rgb(15_23_42/0.06),0_24px_48px_-12px_rgb(15_23_42/0.14)]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
              <div className="min-w-0">
                {submitted ? (
                  <p className="text-[13px] font-medium text-emerald-700 flex items-center gap-2">
                    <IconCheck size={15} /> Submitted to the review queue
                  </p>
                ) : (
                  <p className="text-[13px] text-slate-600">
                    The result is saved on this node. Submitting places it in the
                    reviewer's priority queue.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline" size="sm" onClick={triggerSync} loading={isSyncing}
                  icon={!isSyncing ? <IconSync size={14} /> : undefined}
                >
                  Sync now
                </Button>
                <Button
                  variant="secondary" size="sm"
                  onClick={() => navigate(`/app/cases/${consultationId}`)}
                >
                  Save and close
                </Button>
                <Button
                  size="sm" onClick={submitForReview} disabled={submitted}
                  icon={<IconArrowRight size={14} />}
                >
                  {submitted ? 'Submitted' : 'Submit for review'}
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}

      {!analysis && <ScreeningDisclaimer />}
    </div>
  );
}
