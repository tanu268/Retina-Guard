import { useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useQuery } from '../../lib/query';
import { adminService, consultationService } from '../../services/api';
import { formatNumber } from '../../lib/format';
import { Alert, Card, Field, Input, SectionHeader } from '../../components/ui';
import { MetricCard } from '../../components/clinical/indicators';
import { IconAlert, IconBrain, IconClock, IconQueue, IconUsers } from '../../components/ui/icons';

/* ═══════════════════════════════════════════════════════════════════════════
   Capacity planning.

   Every figure on this page is either MEASURED (from the API) or derived from
   an explicit ASSUMPTION the administrator sets below. Nothing is presented as
   a validated benchmark, because none of it has been validated at a real site.
   The provenance labels are part of the interface, not decoration.
   ═══════════════════════════════════════════════════════════════════════════ */

function ProvenanceTag({ kind }: { kind: 'MEASURED' | 'ASSUMPTION' | 'DERIVED' }) {
  const styles = {
    MEASURED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ASSUMPTION: 'bg-amber-50 text-amber-700 border-amber-200',
    DERIVED: 'bg-slate-100 text-slate-600 border-slate-200',
  }[kind];
  return (
    <span className={`inline-flex items-center h-5 px-1.5 rounded border text-[9.5px] font-semibold tracking-[0.06em] ${styles}`}>
      {kind}
    </span>
  );
}

export default function AdminCapacity() {
  const [patientsPerDay, setPatientsPerDay] = useState('40');
  const [reviewMinutes, setReviewMinutes] = useState('4');
  const [reviewerHours, setReviewerHours] = useState('6');
  const [referableRate, setReferableRate] = useState('22');

  const { data: dashboard } = useQuery({ queryFn: () => adminService.dashboard() });
  const { data: consultations } = useQuery({ queryFn: () => consultationService.list({ limit: 200 }) });

  const cases = useMemo(() => consultations?.items ?? [], [consultations]);

  const perDay = Number(patientsPerDay) || 0;
  const minutesPerReview = Number(reviewMinutes) || 1;
  const hoursAvailable = Number(reviewerHours) || 1;
  const referable = (Number(referableRate) || 0) / 100;

  const casesNeedingReview = perDay * referable;
  const reviewMinutesNeeded = casesNeedingReview * minutesPerReview;
  const reviewMinutesAvailable = hoursAvailable * 60;
  const utilisation = reviewMinutesAvailable > 0 ? reviewMinutesNeeded / reviewMinutesAvailable : 0;
  const reviewersNeeded = Math.ceil(reviewMinutesNeeded / reviewMinutesAvailable) || 0;

  // Queue depth over an 8-hour day under the stated assumptions.
  const queueModel = useMemo(() => {
    const hours = Array.from({ length: 9 }, (_, i) => i);
    const arrivalPerHour = perDay / 8;
    const servicePerHour = reviewMinutesAvailable / 8 / minutesPerReview;
    let depth = 0;
    return hours.map((h) => {
      if (h > 0) depth = Math.max(0, depth + arrivalPerHour * referable - servicePerHour);
      return { hour: `${9 + h}:00`, depth: Number(depth.toFixed(1)), arrivals: Number((arrivalPerHour * referable).toFixed(1)) };
    });
  }, [perDay, reviewMinutesAvailable, minutesPerReview, referable]);

  const statusCounts = dashboard?.caseStatusCounts ?? {};
  const observedBacklog = (statusCounts.awaiting_review ?? 0) + (statusCounts.analysis_complete ?? 0);

  return (
    <div className="space-y-7">
      <SectionHeader
        eyebrow="Administration"
        title="Capacity planning"
        description="A staffing model for this facility. Inputs are assumptions you set; outputs are labelled accordingly."
      />

      <Alert tone="warning" title="This model has not been validated at a live site" icon={<IconAlert size={17} />}>
        Figures below are derived from the assumptions you enter, not from field measurement.
        Only the observed backlog and case counts are measured values.
      </Alert>

      <Card>
        <h2 className="text-[14px] font-semibold text-slate-900 mb-1">Assumptions</h2>
        <p className="text-[12px] text-slate-500 mb-5">Adjust these to match your facility</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Field label="Patients screened per day" hint="Across all technicians">
            <Input type="number" min={0} value={patientsPerDay} onChange={(e) => setPatientsPerDay(e.target.value)} />
          </Field>
          <Field label="Referable rate" hint="Percent needing review">
            <Input type="number" min={0} max={100} value={referableRate} onChange={(e) => setReferableRate(e.target.value)} />
          </Field>
          <Field label="Minutes per review" hint="Reviewer time per case">
            <Input type="number" min={1} value={reviewMinutes} onChange={(e) => setReviewMinutes(e.target.value)} />
          </Field>
          <Field label="Reviewer hours per day" hint="Total available">
            <Input type="number" min={1} value={reviewerHours} onChange={(e) => setReviewerHours(e.target.value)} />
          </Field>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Cases needing review per day" value={Math.round(casesNeedingReview)}
          tone="brand" icon={<IconQueue size={16} />}
          sublabel={<span className="flex items-center gap-1.5"><ProvenanceTag kind="DERIVED" /></span>}
        />
        <MetricCard
          label="Reviewer minutes needed" value={Math.round(reviewMinutesNeeded)}
          tone="neutral" icon={<IconClock size={16} />}
          sublabel={<span className="flex items-center gap-1.5"><ProvenanceTag kind="DERIVED" /></span>}
        />
        <MetricCard
          label="Reviewer utilisation" value={Math.round(utilisation * 100)} suffix="%"
          tone={utilisation > 1 ? 'danger' : utilisation > 0.8 ? 'warning' : 'success'}
          icon={<IconBrain size={16} />}
          sublabel={
            <span className="flex items-center gap-1.5">
              <ProvenanceTag kind="DERIVED" />
              {utilisation > 1 && <span className="text-red-600 font-medium">Over capacity</span>}
            </span>
          }
        />
        <MetricCard
          label="Reviewers required" value={reviewersNeeded}
          tone="neutral" icon={<IconUsers size={16} />}
          sublabel={<span className="flex items-center gap-1.5"><ProvenanceTag kind="DERIVED" /></span>}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900">Modelled queue depth</h3>
              <p className="text-[12px] text-slate-500 mt-0.5">Across a nine-hour screening day</p>
            </div>
            <ProvenanceTag kind="DERIVED" />
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={queueModel} margin={{ top: 5, right: 5, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Line type="monotone" dataKey="depth" name="Queue depth" stroke="#4338CA" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="arrivals" name="Arrivals/hr" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900">Observed backlog</h3>
              <p className="text-[12px] text-slate-500 mt-0.5">Actual cases on this node right now</p>
            </div>
            <ProvenanceTag kind="MEASURED" />
          </div>
          <div className="flex items-baseline gap-3 mb-5">
            <span className="text-[40px] font-semibold text-slate-900 tnum leading-none">{observedBacklog}</span>
            <span className="text-[13px] text-slate-500">cases awaiting a decision</span>
          </div>
          <div style={{ height: 170 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={Object.entries(statusCounts).map(([k, v]) => ({ name: k.replace(/_/g, ' '), value: v }))}
                margin={{ top: 5, right: 5, left: -18, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9.5, fill: '#94a3b8' }} axisLine={false} tickLine={false} angle={-18} textAnchor="end" height={48} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="value" fill="#4338CA" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[12px] text-slate-500 mt-4">
            {formatNumber(cases.length)} total cases recorded on this edge node.
          </p>
        </Card>
      </div>
    </div>
  );
}
