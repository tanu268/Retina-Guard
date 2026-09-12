import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '../../lib/query';
import { consultationService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSync } from '../../contexts/SyncContext';
import { formatRelative, parseDate } from '../../lib/format';
import { OPEN_STATUSES } from '../../lib/clinical';
import { Button, Card, EmptyState, SectionHeader, SkeletonCard, SkeletonRows, stagger, staggerItem } from '../../components/ui';
import {
  ConsultationStatusBadge, MetricCard, PriorityChip,
} from '../../components/clinical/indicators';
import {
  IconArrowRight, IconBrain, IconCamera, IconFile, IconSync, IconUserPlus,
} from '../../components/ui/icons';
import type { Consultation } from '../../types';

export default function TechnicianDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pendingCount, networkState, syncStatus } = useSync();

  const { data, isLoading } = useQuery({
    queryFn: () => consultationService.list({ limit: 50 }),
    refetchIntervalMs: 30_000,
  });

  const cases = data?.items ?? [];

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const todayCases = cases.filter((c) => {
    const d = parseDate(c.created_at);
    return d ? d >= startOfToday : false;
  });

  const pendingCapture = cases.filter((c) => OPEN_STATUSES.includes(c.status));
  const analysed = cases.filter((c) => c.status === 'analysis_complete' || c.status === 'awaiting_review');
  const recent = [...cases]
    .sort((a, b) => (parseDate(b.created_at)?.getTime() ?? 0) - (parseDate(a.created_at)?.getTime() ?? 0))
    .slice(0, 8);

  const firstName = user?.full_name?.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-7">
      <SectionHeader
        eyebrow="Technician workspace"
        title={`Good day, ${firstName}`}
        description={`Screening at ${syncStatus?.siteId ?? user?.facility_id ?? 'this facility'}. Work is saved locally and syncs when the district node is reachable.`}
        actions={
          <Button onClick={() => navigate('/app/technician/register')} icon={<IconUserPlus size={16} />}>
            New screening
          </Button>
        }
      />

      <motion.div
        variants={stagger} initial="initial" animate="animate"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <motion.div variants={staggerItem}>
              <MetricCard
                label="Patients today" value={todayCases.length} tone="brand"
                icon={<IconUserPlus size={16} />}
                sublabel={`${cases.length} cases on this node`}
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <MetricCard
                label="Pending capture" value={pendingCapture.length} tone="warning"
                icon={<IconCamera size={16} />}
                sublabel={pendingCapture.length > 0 ? 'Needs a fundus image' : 'Nothing waiting'}
                onClick={() => navigate('/app/technician/capture')}
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <MetricCard
                label="AI analysis complete" value={analysed.length} tone="success"
                icon={<IconBrain size={16} />}
                sublabel="Awaiting reviewer decision"
              />
            </motion.div>
            <motion.div variants={staggerItem}>
              <MetricCard
                label="Queued to sync" value={pendingCount} tone={pendingCount > 0 ? 'warning' : 'neutral'}
                icon={<IconSync size={16} />}
                sublabel={networkState === 'offline' ? 'Offline — held in outbox' : 'Outbox depth'}
                onClick={() => navigate('/app/sync')}
              />
            </motion.div>
          </>
        )}
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card padded={false}>
          <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">Recent activity</h2>
              <p className="text-[12px] text-slate-500 mt-0.5">Latest cases created on this edge node</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/app/cases')}>
              View all
            </Button>
          </div>

          <div className="p-3">
            {isLoading ? (
              <SkeletonRows rows={5} />
            ) : recent.length === 0 ? (
              <EmptyState
                title="No screenings yet"
                description="Register a patient to start the first case on this node."
                action={
                  <Button onClick={() => navigate('/app/technician/register')} icon={<IconUserPlus size={16} />}>
                    Register patient
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-1">
                {recent.map((c: Consultation) => (
                  <li key={c.id}>
                    <button
                      onClick={() => navigate(`/app/cases/${c.id}`)}
                      className="w-full text-left px-3 py-3 rounded-none hover:bg-slate-50 transition-colors flex items-center gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-slate-900 clinical-id truncate">
                          {c.case_number}
                        </p>
                        <p className="text-[12px] text-slate-500 mt-0.5">
                          {formatRelative(c.created_at)}
                        </p>
                      </div>
                      <PriorityChip priority={c.triage_priority} size="sm" showLabel={false} />
                      <ConsultationStatusBadge status={c.status} size="sm" />
                      <span className="text-slate-300 shrink-0"><IconArrowRight size={15} /></span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <h2 className="text-[15px] font-semibold text-slate-900 mb-1">Start a task</h2>
            <p className="text-[12px] text-slate-500 mb-5">Common actions for this shift</p>
            <div className="space-y-2">
              {[
                { label: 'Register a new patient', to: '/app/technician/register', icon: <IconUserPlus size={16} /> },
                { label: 'Capture retinal images', to: '/app/technician/capture', icon: <IconCamera size={16} /> },
                { label: 'Run AI analysis', to: '/app/technician/analysis', icon: <IconBrain size={16} /> },
                { label: 'Review sync queue', to: '/app/sync', icon: <IconSync size={16} /> },
              ].map((action) => (
                <button
                  key={action.to}
                  onClick={() => navigate(action.to)}
                  className="w-full flex items-center gap-3 px-3.5 h-11 rounded-none border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
                >
                  <span className="text-slate-400 shrink-0">{action.icon}</span>
                  <span className="text-[13px] font-medium text-slate-700 flex-1">{action.label}</span>
                  <span className="text-slate-300"><IconArrowRight size={14} /></span>
                </button>
              ))}
            </div>
          </Card>

          <Card className="!bg-indigo-50/60 !border-indigo-100">
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-none bg-white text-[#4338CA] flex items-center justify-center shrink-0">
                <IconFile size={16} />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-indigo-950">Screening, not diagnosis</p>
                <p className="text-[12px] text-indigo-900/75 mt-1.5 leading-relaxed">
                  Never tell a patient their result. Every case is adjudicated by a
                  qualified reviewer before any referral decision is issued.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
