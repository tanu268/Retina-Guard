import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useQuery } from '../../lib/query';
import { adminService, consultationService } from '../../services/api';
import { formatBytes, formatPercent, formatRelative, isTrue, parseDate } from '../../lib/format';
import { DR_GRADES, STATUS_LABELS, TRIAGE_ORDER, TRIAGE_TIERS } from '../../lib/clinical';
import {
  Alert, Card, SectionHeader, SkeletonCard, stagger, staggerItem,
} from '../../components/ui';
import { MetricCard, StatusBadge } from '../../components/clinical/indicators';
import {
  IconAlert, IconBrain, IconCheck, IconDatabase, IconHistory, IconPatients,
  IconSync, IconUsers,
} from '../../components/ui/icons';
import type { ConsultationStatus } from '../../types';

const GRADE_COLORS = ['#059669', '#84cc16', '#ca8a04', '#ea580c', '#dc2626'];
const TIER_COLORS: Record<string, string> = {
  P0: '#dc2626', P1: '#ea580c', P2: '#ca8a04', P3: '#059669',
};

const CHART_AXIS = { fontSize: 11, fill: '#94a3b8' };

function ChartCard({
  title, description, children, height = 240,
}: {
  title: string; description?: string; children: React.ReactElement; height?: number;
}) {
  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-[14px] font-semibold text-slate-900">{title}</h3>
        {description && <p className="text-[12px] text-slate-500 mt-0.5">{description}</p>}
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  fontSize: 12,
  boxShadow: '0 4px 12px -2px rgb(15 23 42 / 0.08)',
};

export default function AdminOverview() {
  const { data: dashboard, isLoading, error } = useQuery({
    queryFn: () => adminService.dashboard(),
    refetchIntervalMs: 30_000,
  });

  const { data: consultations } = useQuery({
    queryFn: () => consultationService.list({ limit: 200 }),
    refetchIntervalMs: 60_000,
  });

  const cases = useMemo(() => consultations?.items ?? [], [consultations]);

  // Throughput over the last 14 days, bucketed by creation date.
  const throughput = useMemo(() => {
    const days: Array<{ date: string; label: string; cases: number; reviewed: number }> = [];
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push({
        date: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        cases: 0,
        reviewed: 0,
      });
    }
    const index = new Map(days.map((d) => [d.date, d]));
    cases.forEach((c) => {
      const created = parseDate(c.created_at);
      if (!created) return;
      const key = created.toISOString().slice(0, 10);
      const bucket = index.get(key);
      if (!bucket) return;
      bucket.cases += 1;
      if (c.status === 'review_complete' || c.status === 'closed') bucket.reviewed += 1;
    });
    return days;
  }, [cases]);

  const gradeData = useMemo(() => {
    const source = dashboard?.gradeDistribution ?? [];
    return DR_GRADES.map((g) => ({
      name: g.short,
      label: g.label,
      value: source.find((s) => s.grade === g.code)?.count ?? 0,
      fill: GRADE_COLORS[g.code],
    }));
  }, [dashboard]);

  const statusData = useMemo(() => {
    const counts = dashboard?.caseStatusCounts ?? {};
    return (Object.keys(counts) as ConsultationStatus[])
      .map((k) => ({ name: STATUS_LABELS[k] ?? k, value: counts[k] ?? 0 }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [dashboard]);

  const triageData = useMemo(() => {
    const counts: Record<string, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };
    cases.forEach((c) => { if (c.triage_priority) counts[c.triage_priority] += 1; });
    return TRIAGE_ORDER.map((t) => ({
      name: `${t} ${TRIAGE_TIERS[t].label}`,
      value: counts[t],
      fill: TIER_COLORS[t],
    })).filter((d) => d.value > 0);
  }, [cases]);

  const totalCases = cases.length;
  const completed = cases.filter((c) => c.status === 'review_complete' || c.status === 'closed').length;
  const overview = dashboard?.overview;
  const districtStats = dashboard?.districtStats ?? [];
  const recentActivity = dashboard?.recentActivity ?? [];
  const storage = dashboard?.storage;
  const matlab = dashboard?.matlab;

  return (
    <div className="space-y-7">
      <SectionHeader
        eyebrow="Administrator workspace"
        title="Administration overview"
        description={`Edge node ${dashboard?.site?.id ?? '—'} · device ${dashboard?.site?.device ?? '—'}`}
      />

      {error && (
        <Alert tone="danger" title="Dashboard data unavailable" icon={<IconAlert size={17} />}>
          {error.message}
        </Alert>
      )}

      {matlab && !isTrue(matlab.available) && (
        <Alert tone="warning" title="MATLAB runtime not attached" icon={<IconAlert size={17} />}>
          The analysis pipeline is running through the <strong>{matlab.adapter}</strong> adapter.
          {matlab.note ? ` ${matlab.note}` : ' Results are structurally valid but are not produced by the trained model.'}
        </Alert>
      )}

      <motion.div
        variants={stagger} initial="initial" animate="animate"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <motion.div variants={staggerItem}>
              <MetricCard label="Total patients" value={overview?.totalPatients ?? 0} tone="brand"
                icon={<IconPatients size={16} />} sublabel="Registered on this node" />
            </motion.div>
            <motion.div variants={staggerItem}>
              <MetricCard label="Screenings completed" value={overview?.screeningsCompleted ?? 0} tone="success"
                icon={<IconCheck size={16} />}
                sublabel={totalCases > 0 ? `${formatPercent(completed / totalCases, 0)} of all cases adjudicated` : 'No cases yet'} />
            </motion.div>
            <motion.div variants={staggerItem}>
              <MetricCard label="Active users" value={overview?.activeUsers ?? 0} tone="neutral"
                icon={<IconUsers size={16} />}
                sublabel={overview
                  ? `${overview.totalTechnicians} tech · ${overview.totalReviewers} reviewer · ${overview.totalAdministrators} admin`
                  : undefined} />
            </motion.div>
            <motion.div variants={staggerItem}>
              <MetricCard
                label="Storage free"
                value={storage ? formatBytes(storage.freeBytes) : '—'}
                tone={storage && isTrue(storage.low) ? 'danger' : 'neutral'}
                icon={<IconDatabase size={16} />}
                sublabel={storage ? `${storage.freePercent.toFixed(1)}% of ${formatBytes(storage.totalBytes)}` : undefined}
              />
            </motion.div>
          </>
        )}
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          title="Screening throughput"
          description="Cases created and adjudicated over the last 14 days"
          height={250}
        >
          <AreaChart data={throughput} margin={{ top: 5, right: 5, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="grad-cases" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4338CA" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#4338CA" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="grad-reviewed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#059669" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="label" tick={CHART_AXIS} axisLine={false} tickLine={false} interval={2} />
            <YAxis tick={CHART_AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
            <Area type="monotone" dataKey="cases" name="Created" stroke="#4338CA" strokeWidth={2} fill="url(#grad-cases)" />
            <Area type="monotone" dataKey="reviewed" name="Adjudicated" stroke="#059669" strokeWidth={2} fill="url(#grad-reviewed)" />
          </AreaChart>
        </ChartCard>

        <ChartCard
          title="Grade distribution"
          description="ICDR grades issued by the screening pipeline"
          height={250}
        >
          <BarChart data={gradeData} margin={{ top: 5, right: 5, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={CHART_AXIS} axisLine={false} tickLine={false} />
            <YAxis tick={CHART_AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number, _n, item) => [v, (item?.payload as { label?: string })?.label ?? '']}
            />
            <Bar dataKey="value" name="Cases" radius={[6, 6, 0, 0]}>
              {gradeData.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard
          title="Triage distribution"
          description="Cases by priority tier — colour is paired with the tier name throughout"
          height={250}
        >
          <PieChart>
            <Pie
              data={triageData} dataKey="value" nameKey="name"
              cx="50%" cy="50%" innerRadius={58} outerRadius={92} paddingAngle={3}
            >
              {triageData.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
          </PieChart>
        </ChartCard>

        <ChartCard
          title="Case pipeline"
          description="Where cases currently sit in the workflow"
          height={250}
        >
          <LineChart data={statusData} margin={{ top: 5, right: 5, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={{ ...CHART_AXIS, fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={54} />
            <YAxis tick={CHART_AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="value" name="Cases" stroke="#4338CA" strokeWidth={2.5} dot={{ r: 3.5, fill: '#4338CA' }} />
          </LineChart>
        </ChartCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-8 h-8 rounded-none bg-slate-100 text-slate-500 flex items-center justify-center">
              <IconBrain size={16} />
            </span>
            <h3 className="text-[14px] font-semibold text-slate-900">Analysis pipeline</h3>
          </div>
          <dl className="space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-[13px] text-slate-500">Adapter</dt>
              <dd className="text-[13px] font-medium text-slate-900 clinical-id">{matlab?.adapter ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[13px] text-slate-500">Adapter available</dt>
              <dd><StatusBadge tone={isTrue(matlab?.available) ? 'success' : 'warning'} size="sm">
                {isTrue(matlab?.available) ? 'Yes' : 'No'}
              </StatusBadge></dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[13px] text-slate-500">MATLAB runtime</dt>
              <dd><StatusBadge tone={isTrue(matlab?.matlabRuntime) ? 'success' : 'neutral'} size="sm">
                {isTrue(matlab?.matlabRuntime) ? 'Attached' : 'Not attached'}
              </StatusBadge></dd>
            </div>
          </dl>
        </Card>

        <Card>
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-8 h-8 rounded-none bg-slate-100 text-slate-500 flex items-center justify-center">
              <IconSync size={16} />
            </span>
            <h3 className="text-[14px] font-semibold text-slate-900">District sync</h3>
          </div>
          <dl className="space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-[13px] text-slate-500">Configured</dt>
              <dd><StatusBadge tone={isTrue(dashboard?.sync?.districtConfigured) ? 'success' : 'neutral'} size="sm">
                {isTrue(dashboard?.sync?.districtConfigured) ? 'Yes' : 'Standalone node'}
              </StatusBadge></dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[13px] text-slate-500">Health</dt>
              <dd><StatusBadge
                tone={dashboard?.sync?.health === 'ok' ? 'success' : dashboard?.sync?.health === 'degraded' ? 'warning' : 'danger'}
                size="sm"
              >
                {dashboard?.sync?.health ?? '—'}
              </StatusBadge></dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[13px] text-slate-500">Outbox depth</dt>
              <dd className="text-[13px] font-medium text-slate-900 tnum">
                {dashboard?.sync?.queue?.byStatus?.pending ?? 0}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-8 h-8 rounded-none bg-slate-100 text-slate-500 flex items-center justify-center">
              <IconDatabase size={16} />
            </span>
            <h3 className="text-[14px] font-semibold text-slate-900">Storage</h3>
          </div>
          {storage ? (
            <>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-[13px] text-slate-500">Used</span>
                <span className="text-[13px] font-medium text-slate-900 tnum">
                  {formatBytes(storage.totalBytes - storage.freeBytes)} / {formatBytes(storage.totalBytes)}
                </span>
              </div>
              <div className="h-2 rounded-none bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-none transition-all duration-500"
                  style={{
                    width: `${100 - storage.freePercent}%`,
                    background: isTrue(storage.low) ? '#dc2626' : '#4338CA',
                  }}
                />
              </div>
              <p className="text-[12px] text-slate-500 mt-2 tnum">
                {storage.freePercent.toFixed(1)}% free
              </p>
              {isTrue(storage.low) && (
                <p className="text-[12px] text-red-600 mt-2 font-medium">
                  Low disk — sync and archive before capturing more images.
                </p>
              )}
            </>
          ) : (
            <p className="text-[13px] text-slate-500">Storage information unavailable.</p>
          )}
        </Card>
      </div>

      {/* District distribution and recent activity — both computed live. */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          title="District-wise patients"
          description="Where registered patients are located"
          height={Math.max(200, Math.min(districtStats.length, 8) * 32 + 40)}
        >
          {districtStats.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-[13px] text-[var(--color-ink-subtle)]">No patients registered yet.</p>
            </div>
          ) : (
            <BarChart
              data={districtStats.slice(0, 8)}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={CHART_AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis
                type="category" dataKey="district" tick={CHART_AXIS}
                axisLine={false} tickLine={false} width={110}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="count" name="Patients" fill="#1E3A6E" radius={0} barSize={16} />
            </BarChart>
          )}
        </ChartCard>

        <Card>
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center bg-[var(--color-brand-50)] text-[var(--color-brand-800)]">
              <IconHistory size={16} />
            </span>
            <div>
              <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">Recent activity</h3>
              <p className="text-[12px] text-[var(--color-ink-subtle)]">
                Action metadata only — no patient detail
              </p>
            </div>
          </div>

          {recentActivity.length === 0 ? (
            <p className="text-[13px] text-[var(--color-ink-subtle)]">No recorded activity yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {recentActivity.slice(0, 8).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-[var(--color-ink)]">
                      {a.action.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())}
                    </p>
                    <p className="text-[12px] text-[var(--color-ink-subtle)]">
                      {a.entityType}{a.actorRole ? ` · ${a.actorRole}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-[12px] text-[var(--color-ink-subtle)]">
                    {formatRelative(a.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
