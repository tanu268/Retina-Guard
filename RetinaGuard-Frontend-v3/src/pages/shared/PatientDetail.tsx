import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '../../lib/query';
import { consultationService, patientService } from '../../services/api';
import { formatRelative, titleCase } from '../../lib/format';
import {
  Button, Card, DataRow, EmptyState, SectionHeader, Skeleton, SkeletonRows,
} from '../../components/ui';
import {
  ConsultationStatusBadge, PriorityChip, SyncStateBadge,
} from '../../components/clinical/indicators';
import { IconArrowLeft, IconArrowRight, IconCamera } from '../../components/ui/icons';

export default function PatientDetail() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();

  const { data: patient, isLoading } = useQuery({
    queryFn: () => patientService.get(patientId!),
    enabled: Boolean(patientId),
    deps: [patientId],
  });

  const { data: consultations, isLoading: loadingCases } = useQuery({
    queryFn: () => consultationService.list({ limit: 50 }),
  });

  const patientCases = (consultations?.items ?? []).filter((c) => c.patient_id === patientId);

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-9 w-64" /><Skeleton className="h-72 rounded-none" /></div>;
  }

  if (!patient) {
    return (
      <EmptyState
        title="Patient not found"
        action={<Button onClick={() => navigate('/app/patients')}>Back to patients</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/app/patients')} icon={<IconArrowLeft size={15} />}>
        Patients
      </Button>

      <SectionHeader
        eyebrow="Patient record"
        title={patient.full_name}
        description={`${patient.age ?? '—'} years · ${titleCase(patient.gender ?? '')} · ${patient.village ?? '—'}, ${patient.district ?? '—'}`}
        actions={<SyncStateBadge state={patient.sync_state} />}
      />

      <div className="grid lg:grid-cols-[400px_1fr] gap-5 items-start">
        <Card>
          <h2 className="text-[15px] font-semibold text-slate-900 mb-4">Details</h2>
          <dl>
            <DataRow label="Patient code" value={patient.patient_code} mono />
            <DataRow label="Phone" value={patient.phone ?? '—'} mono />
            <DataRow label="Village" value={patient.village ?? '—'} />
            <DataRow label="District" value={patient.district ?? '—'} />
            <DataRow label="State" value={patient.state ?? '—'} />
            <DataRow label="Diabetes type" value={titleCase(patient.diabetes_type ?? '')} />
            <DataRow label="Duration" value={patient.diabetes_duration_years != null ? `${patient.diabetes_duration_years} years` : '—'} />
            <DataRow label="HbA1c" value={patient.hba1c != null ? `${patient.hba1c}%` : '—'} />
            <DataRow label="Registered" value={formatRelative(patient.created_at)} />
          </dl>
        </Card>

        <Card padded={false}>
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">Screening history</h2>
              <p className="text-[12px] text-slate-500 mt-0.5">
                {patientCases.length} {patientCases.length === 1 ? 'case' : 'cases'} on this node
              </p>
            </div>
          </div>
          <div className="p-3">
            {loadingCases ? (
              <SkeletonRows rows={3} />
            ) : patientCases.length === 0 ? (
              <EmptyState
                icon={<IconCamera size={24} />}
                title="No screenings yet"
                description="This patient has been registered but not screened."
                className="!border-0 !bg-transparent"
              />
            ) : (
              <ul className="space-y-1">
                {patientCases.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => navigate(`/app/cases/${c.id}`)}
                      className="w-full text-left px-3 py-3 rounded-none hover:bg-slate-50 transition-colors flex flex-wrap items-center gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-slate-900 clinical-id truncate">{c.case_number}</p>
                        <p className="text-[11.5px] text-slate-500 mt-0.5">{formatRelative(c.created_at)}</p>
                      </div>
                      <PriorityChip priority={c.triage_priority} size="sm" showLabel={false} />
                      <ConsultationStatusBadge status={c.status} size="sm" />
                      <span className="text-slate-300"><IconArrowRight size={15} /></span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
