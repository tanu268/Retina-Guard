import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '../../lib/query';
import {
  analysisService, auditService, consultationService, imageService, patientService,
} from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateTime, formatRelative, isTrue, titleCase } from '../../lib/format';
import { STATUS_LABELS } from '../../lib/clinical';
import {
  Button, Card, DataRow, Divider, EmptyState, SectionHeader, Skeleton,
} from '../../components/ui';
import { RetinaViewer } from '../../components/clinical/RetinaViewer';
import { AnalysisResultPanel, LesionSummary, StageTimings } from '../../components/clinical/ResultPanel';
import {
  ConsultationStatusBadge, PriorityChip, QualityBadge, SyncStateBadge,
} from '../../components/clinical/indicators';
import { IconArrowLeft, IconBrain, IconCamera, IconFile, IconHistory } from '../../components/ui/icons';
import type { AnalysisResult, ExplainabilityLayers } from '../../types';

export default function CaseDetail() {
  const { consultationId } = useParams<{ consultationId: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [layers, setLayers] = useState<ExplainabilityLayers | null>(null);

  const { data: consultation, isLoading } = useQuery({
    queryFn: () => consultationService.get(consultationId!),
    enabled: Boolean(consultationId),
    deps: [consultationId],
  });

  const { data: images } = useQuery({
    queryFn: () => imageService.listByConsultation(consultationId!),
    enabled: Boolean(consultationId),
    deps: [consultationId],
  });

  const { data: patient } = useQuery({
    queryFn: () => patientService.get(consultation!.patient_id),
    enabled: Boolean(consultation?.patient_id),
    deps: [consultation?.patient_id],
  });

  const { data: auditEntries } = useQuery({
    queryFn: () => auditService.trail(consultationId!),
    enabled: Boolean(consultationId),
    deps: [consultationId],
  });

  // The consultation row carries no analysis id, so the analysis is located
  // through the review endpoint's case view when one exists.
  useEffect(() => {
    if (!consultationId) return;
    let cancelled = false;
    import('../../services/api').then(({ reviewService }) =>
      reviewService.getCase(consultationId)
        .then((res) => {
          if (cancelled) return;
          const a = res.analyses?.[0] ?? null;
          setAnalysis(a);
          if (a) {
            analysisService.getExplainability(a.id)
              .then((l) => { if (!cancelled) setLayers(l); })
              .catch(() => undefined);
          }
        })
        .catch(() => undefined));
    return () => { cancelled = true; };
  }, [consultationId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-[420px] rounded-none" />
      </div>
    );
  }

  if (!consultation) {
    return (
      <EmptyState
        title="Case not found"
        description="It may have been closed or removed from this node."
        action={<Button onClick={() => navigate('/app/cases')}>Back to cases</Button>}
      />
    );
  }

  const primaryImage = (images ?? []).find((i) => i.status !== 'superseded') ?? null;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/app/cases')} icon={<IconArrowLeft size={15} />}>
        Cases
      </Button>

      <SectionHeader
        eyebrow="Case record"
        title={patient?.full_name ?? consultation.case_number}
        description={patient ? `${patient.age ?? '—'} years · ${titleCase(patient.gender ?? '')} · ${patient.village ?? '—'}` : undefined}
        actions={
          <>
            <PriorityChip priority={consultation.triage_priority} />
            <ConsultationStatusBadge status={consultation.status} />
          </>
        }
      />

      <div className="grid lg:grid-cols-[1fr_400px] gap-5 items-start">
        <div className="space-y-5">
          {analysis ? (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-semibold text-slate-900">Evidence</h2>
                <QualityBadge grade={primaryImage?.quality_grade ?? null} />
              </div>
              <RetinaViewer
                laterality={primaryImage?.laterality ?? null}
                anatomy={analysis.anatomy}
                lesions={analysis.lesions}
                gradcamRegions={layers?.gradcam?.payload?.regions ?? null}
                seed={analysis.id.charCodeAt(0) * 31 + analysis.id.charCodeAt(1)}
              />
              <Divider className="!my-5" />
              <h3 className="text-[13px] font-semibold text-slate-800 mb-3">Lesion evidence</h3>
              <LesionSummary lesions={analysis.lesions} />
            </Card>
          ) : (
            <Card>
              <EmptyState
                icon={<IconBrain size={24} />}
                title="No analysis has been run on this case"
                description={
                  primaryImage
                    ? 'An image is available. Analysis can be run from the technician workspace.'
                    : 'Capture a fundus image before analysis can run.'
                }
                action={
                  hasRole('technician', 'admin') ? (
                    <Button
                      onClick={() => navigate(
                        primaryImage
                          ? `/app/technician/analysis/${consultation.id}`
                          : `/app/technician/capture/${consultation.id}`,
                      )}
                      icon={primaryImage ? <IconBrain size={15} /> : <IconCamera size={15} />}
                    >
                      {primaryImage ? 'Run analysis' : 'Capture image'}
                    </Button>
                  ) : undefined
                }
                className="!border-0 !bg-transparent !py-6"
              />
            </Card>
          )}

          {analysis && (
            <Card>
              <h3 className="text-[13px] font-semibold text-slate-800 mb-1">Stage timings</h3>
              <p className="text-[12px] text-slate-500 mb-4">Measured latency on this node</p>
              <StageTimings timings={analysis.stage_timings_ms} />
            </Card>
          )}

          {auditEntries && auditEntries.length > 0 && (
            <Card padded={false}>
              <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2.5">
                <IconHistory size={16} className="text-slate-400" />
                <div>
                  <h2 className="text-[15px] font-semibold text-slate-900">Case history</h2>
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    {auditEntries.length} recorded {auditEntries.length === 1 ? 'action' : 'actions'}
                  </p>
                </div>
              </div>
              <ol className="p-3">
                {auditEntries.map((e, i) => (
                  <li key={e.id} className="flex gap-3.5 px-3 py-2.5">
                    <div className="flex flex-col items-center shrink-0">
                      <span className="w-2 h-2 rounded-full bg-[#4338CA] mt-1.5" />
                      {i < auditEntries.length - 1 && <span className="w-px flex-1 bg-slate-200 mt-1" />}
                    </div>
                    <div className="min-w-0 pb-1">
                      <p className="text-[13px] font-medium text-slate-900">{titleCase(e.action)}</p>
                      <p className="text-[11.5px] text-slate-500 mt-0.5">
                        {formatDateTime(e.created_at)}
                        {e.actor_role && ` · ${titleCase(e.actor_role)}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          {analysis && <AnalysisResultPanel analysis={analysis} compact />}

          <Card>
            <h2 className="text-[15px] font-semibold text-slate-900 mb-4">Case details</h2>
            <dl>
              <DataRow label="Case number" value={consultation.case_number} mono />
              <DataRow label="Status" value={STATUS_LABELS[consultation.status]} />
              <DataRow label="Identity confirmed" value={isTrue(consultation.identity_confirmed) ? 'Yes' : 'No'} />
              <DataRow label="Recapture attempts" value={consultation.recapture_attempts} />
              <DataRow label="Created" value={formatRelative(consultation.created_at)} />
              <DataRow label="Sync state" value={<SyncStateBadge state={consultation.sync_state} />} />
            </dl>
          </Card>

          {patient && (
            <Card>
              <h2 className="text-[15px] font-semibold text-slate-900 mb-4">Patient</h2>
              <dl>
                <DataRow label="Patient code" value={patient.patient_code} mono />
                <DataRow label="Phone" value={patient.phone ?? '—'} mono />
                <DataRow label="Diabetes type" value={titleCase(patient.diabetes_type ?? '')} />
                <DataRow label="Duration" value={patient.diabetes_duration_years != null ? `${patient.diabetes_duration_years} years` : '—'} />
                <DataRow label="HbA1c" value={patient.hba1c != null ? `${patient.hba1c}%` : '—'} />
              </dl>
            </Card>
          )}

          {(consultation.status === 'review_complete' || consultation.status === 'closed') && (
            <Button
              fullWidth variant="outline"
              onClick={() => navigate(`/app/review/${consultation.id}/report`)}
              icon={<IconFile size={16} />}
            >
              View screening report
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
