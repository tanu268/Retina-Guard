import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '../../lib/query';
import { reviewService } from '../../services/api';
import { cx, formatElapsed, formatPercent, isTrue } from '../../lib/format';
import { TRIAGE_ORDER, TRIAGE_TIERS, gradeByCode } from '../../lib/clinical';
import {
  Button, EmptyState, SectionHeader, SkeletonRows, Tabs, stagger, staggerItem,
} from '../../components/ui';
import {
  PriorityChip, QualityBadge, StatusBadge, WaitingTime,
} from '../../components/clinical/indicators';
import { GlowCard } from '../../components/ui/spotlight-card';
import { IconArrowRight, IconQueue, IconRefresh, IconAlert } from '../../components/ui/icons';
import type { ReviewQueueItem, TriagePriority } from '../../types';

const TIER_ACCENT: Record<TriagePriority, string> = {
  P0: '#dc2626', P1: '#ea580c', P2: '#ca8a04', P3: '#059669',
};

function QueueCard({ item, onOpen }: { item: ReviewQueueItem; onOpen: () => void }) {
  const grade = gradeByCode(item.dr_grade_code);
  const abstained = isTrue(item.abstained);

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -2 }}
    >
      <GlowCard
        customSize
        glowColor="blue"
        onClick={onOpen}
        className={cx(
          'w-full text-left bg-white border border-slate-200 p-5 cursor-pointer',
          'shadow-[0_1px_2px_0_rgb(15_23_42/0.04),0_1px_3px_0_rgb(15_23_42/0.06)]',
          'transition-shadow duration-200 hover:shadow-[0_4px_8px_-2px_rgb(15_23_42/0.05),0_12px_28px_-6px_rgb(15_23_42/0.10)]',
          'relative overflow-hidden',
        )}
      >
        <span
        className="absolute left-0 inset-y-0 w-1"
        style={{ background: TIER_ACCENT[item.triage_priority] }}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-slate-900 truncate">{item.patient_name}</p>
          <p className="text-[12px] text-slate-500 mt-0.5">
            <span className="tnum">{item.age ?? '—'}</span> yrs
            {item.gender && <span className="capitalize"> · {item.gender}</span>}
            <span className="clinical-id"> · {item.patient_code}</span>
          </p>
        </div>
        <PriorityChip priority={item.triage_priority} size="sm" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {abstained ? (
          <StatusBadge tone="warning" size="sm" icon={<IconAlert size={12} />}>
            Abstained — no grade
          </StatusBadge>
        ) : (
          <StatusBadge tone={grade?.referable ? 'warning' : 'success'} size="sm">
            {grade?.label ?? 'No grade'}
          </StatusBadge>
        )}
        <QualityBadge grade={item.quality_grade} size="sm" />
        {isTrue(item.audit_sampled) && (
          <StatusBadge tone="info" size="sm">Audit sample</StatusBadge>
        )}
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] text-slate-400 mb-0.5">Model confidence</p>
          <p className={cx(
            'text-[15px] font-semibold tnum',
            item.confidence !== null && item.confidence < 0.7 ? 'text-amber-600' : 'text-slate-900',
          )}>
            {formatPercent(item.confidence, 1)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-slate-400 mb-0.5">Waiting</p>
          <WaitingTime since={item.consultation_date} elapsed={formatElapsed(item.consultation_date)} />
        </div>
        <span className="text-slate-300 shrink-0 mb-0.5"><IconArrowRight size={16} /></span>
      </div>

      <p className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400 clinical-id truncate">
        {item.case_number}
      </p>
      </GlowCard>
    </motion.div>
  );
}

export default function ReviewQueue() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<TriagePriority | 'all'>('all');

  // Returns { items, pagination }. The previous client looked for a `queue`
  // key that does not exist, so this screen always rendered as empty.
  const { data, isLoading, refetch, isRefreshing } = useQuery({
    queryFn: () => reviewService.queue({ limit: 100 }),
    refetchIntervalMs: 20_000,
  });

  const items = useMemo(() => data?.items ?? [], [data]);

  const grouped = useMemo(() => {
    const map: Record<TriagePriority, ReviewQueueItem[]> = { P0: [], P1: [], P2: [], P3: [] };
    items.forEach((i) => {
      if (map[i.triage_priority]) map[i.triage_priority].push(i);
    });
    return map;
  }, [items]);

  const visibleTiers = filter === 'all' ? TRIAGE_ORDER : [filter];
  const total = items.length;

  return (
    <div className="space-y-7">
      <SectionHeader
        eyebrow="Reviewer workspace"
        title="Review queue"
        description="Ordered by triage tier, then by how long each case has waited. Every case here needs a human decision."
        actions={
          <Button
            variant="outline" size="sm" onClick={refetch} loading={isRefreshing}
            icon={!isRefreshing ? <IconRefresh size={14} /> : undefined}
          >
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={filter}
          onChange={(val) => setFilter(val as TriagePriority | 'all')}
          tabs={[
            { id: 'all' as const, label: 'All', count: total },
            ...TRIAGE_ORDER.map((t) => ({
              id: t,
              label: `${t} ${TRIAGE_TIERS[t].label}`,
              count: grouped[t].length,
              accent: TIER_ACCENT[t],
            })),
          ]}
        />
        {grouped.P0.length > 0 && (
          <p className="text-[12px] font-medium text-red-600 flex items-center gap-1.5">
            <IconAlert size={14} />
            {grouped.P0.length} urgent {grouped.P0.length === 1 ? 'case needs' : 'cases need'} same-day review
          </p>
        )}
      </div>

      {isLoading ? (
        <SkeletonRows rows={4} />
      ) : total === 0 ? (
        <EmptyState
          icon={<IconQueue size={26} />}
          title="The review queue is clear"
          description="No cases are waiting for adjudication. New screenings appear here automatically."
        />
      ) : (
        <div className="space-y-8">
          {visibleTiers.map((tier) => {
            const tierItems = grouped[tier];
            if (tierItems.length === 0) return null;
            const meta = TRIAGE_TIERS[tier];

            return (
              <section key={tier}>
                <div className="flex items-center gap-3 mb-4">
                  <PriorityChip priority={tier} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-slate-700">{meta.targetWindow}</p>
                    <p className="text-[11.5px] text-slate-500 truncate">{meta.meaning}</p>
                  </div>
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-[12px] text-slate-400 tnum shrink-0">
                    {tierItems.length} {tierItems.length === 1 ? 'case' : 'cases'}
                  </span>
                </div>

                <motion.div
                  variants={stagger} initial="initial" animate="animate"
                  className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                >
                  {tierItems.map((item) => (
                    <QueueCard
                      key={item.consultation_id}
                      item={item}
                      onOpen={() => navigate(`/app/review/${item.consultation_id}`)}
                    />
                  ))}
                </motion.div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
