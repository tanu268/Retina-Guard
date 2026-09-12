import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '../../lib/query';
import { consultationService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatRelative } from '../../lib/format';
import { STATUS_LABELS } from '../../lib/clinical';
import {
  Card, EmptyState, SectionHeader, SkeletonRows, Tabs, stagger, staggerItem,
} from '../../components/ui';
import {
  ConsultationStatusBadge, PriorityChip, SyncStateBadge,
} from '../../components/clinical/indicators';
import { IconArrowRight, IconFile } from '../../components/ui/icons';
import type { ConsultationStatus } from '../../types';

const FILTERS: Array<{ id: ConsultationStatus | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'capture_pending', label: STATUS_LABELS.capture_pending },
  { id: 'awaiting_review', label: STATUS_LABELS.awaiting_review },
  { id: 'review_complete', label: STATUS_LABELS.review_complete },
];

export default function CasesList() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [filter, setFilter] = useState<ConsultationStatus | 'all'>('all');

  const { data, isLoading } = useQuery({
    queryFn: () => consultationService.list({ limit: 100, status: filter === 'all' ? undefined : filter }),
    deps: [filter],
    refetchIntervalMs: 30_000,
  });

  const cases = data?.items ?? [];

  const openCase = (id: string) => {
    if (hasRole('reviewer')) navigate(`/app/review/${id}`);
    else navigate(`/app/cases/${id}`);
  };

  return (
    <div className="space-y-7">
      <SectionHeader
        eyebrow="Records"
        title="Cases"
        description="Screening sessions recorded on this edge node"
      />

      <Tabs value={filter} onChange={setFilter} tabs={FILTERS} />

      {isLoading ? (
        <SkeletonRows rows={6} />
      ) : cases.length === 0 ? (
        <EmptyState
          icon={<IconFile size={26} />}
          title="No cases match this filter"
          description="Screening sessions appear here as soon as they are created."
        />
      ) : (
        <Card padded={false}>
          <motion.ul variants={stagger} initial="initial" animate="animate" className="divide-y divide-slate-50">
            {cases.map((c) => (
              <motion.li key={c.id} variants={staggerItem}>
                <button
                  onClick={() => openCase(c.id)}
                  className="w-full text-left px-5 py-4 hover:bg-slate-50/70 transition-colors flex flex-wrap items-center gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-slate-900 clinical-id truncate">{c.case_number}</p>
                    <p className="text-[12px] text-slate-500 mt-0.5">Created {formatRelative(c.created_at)}</p>
                  </div>
                  <PriorityChip priority={c.triage_priority} size="sm" />
                  <ConsultationStatusBadge status={c.status} size="sm" />
                  <SyncStateBadge state={c.sync_state} />
                  <span className="text-slate-300 shrink-0"><IconArrowRight size={15} /></span>
                </button>
              </motion.li>
            ))}
          </motion.ul>
        </Card>
      )}
    </div>
  );
}
