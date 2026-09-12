import { motion } from 'framer-motion';
import { useState } from 'react';
import { useQuery } from '../../lib/query';
import { syncService } from '../../services/api';
import { useSync } from '../../contexts/SyncContext';
import { formatRelative, isTrue, titleCase } from '../../lib/format';
import {
  Alert, Button, Card, EmptyState, SectionHeader, SkeletonRows, stagger, staggerItem,
} from '../../components/ui';
import { MetricCard, StatusBadge } from '../../components/clinical/indicators';
import { IconAlert, IconCheck, IconClock, IconSync, IconX } from '../../components/ui/icons';

/* ═══════════════════════════════════════════════════════════════════════════
   Offline sync queue.

   The four states the brief asks for map to real backend values: pending,
   synced, conflict, failed. `districtConfigured: false` means this node runs
   standalone by choice — that is a deployment mode, not an error, and the UI
   says so rather than showing a red alarm.
   ═══════════════════════════════════════════════════════════════════════════ */

const STATE_META: Record<string, { tone: 'warning' | 'success' | 'danger' | 'neutral'; label: string; hint: string }> = {
  pending: { tone: 'warning', label: 'Pending', hint: 'Waiting in the outbox' },
  synced: { tone: 'success', label: 'Synced', hint: 'Accepted by the district node' },
  conflict: { tone: 'danger', label: 'Conflict', hint: 'District has a newer version' },
  failed: { tone: 'danger', label: 'Failed', hint: 'Push errored — will retry' },
};

export default function SyncMonitor() {
  const { syncStatus, triggerSync, isSyncing, refresh, lastCheckedAt } = useSync();
  const [pushResult, setPushResult] = useState<string | null>(null);

  const { data: conflicts, isLoading: loadingConflicts, refetch: refetchConflicts } = useQuery({
    queryFn: () => syncService.conflicts(),
    refetchIntervalMs: 30_000,
  });

  const byStatus = syncStatus?.queue?.byStatus ?? {};
  const byEntity = syncStatus?.queue?.byEntity ?? [];
  const configured = isTrue(syncStatus?.districtConfigured);

  const runPush = async () => {
    setPushResult(null);
    const result = await syncService.push().catch(() => null);
    if (result && isTrue(result.skipped)) {
      setPushResult(`Push skipped — ${result.reason ?? 'no district node configured'}.`);
    } else if (result) {
      setPushResult(`Pushed ${result.pushed ?? 0} records · ${result.conflicts ?? 0} conflicts · ${result.failed ?? 0} failed.`);
    }
    await refresh();
    await refetchConflicts();
  };

  return (
    <div className="space-y-7">
      <SectionHeader
        eyebrow="Offline-first"
        title="Sync queue"
        description="Work is committed locally first. This is what is still waiting to reach the district node."
        actions={
          <Button onClick={triggerSync} loading={isSyncing} icon={!isSyncing ? <IconSync size={16} /> : undefined}>
            Sync now
          </Button>
        }
      />

      {!configured && (
        <Alert tone="info" title="This node is running standalone" icon={<IconCheck size={17} />}>
          No district node is configured, so records stay local. This is a valid
          deployment mode — a single PHC does not need a district tier to screen patients.
        </Alert>
      )}

      {pushResult && (
        <Alert tone="neutral" title="Push complete">{pushResult}</Alert>
      )}

      <motion.div variants={stagger} initial="initial" animate="animate" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(['pending', 'synced', 'conflict', 'failed'] as const).map((state) => {
          const meta = STATE_META[state];
          const count = byStatus[state] ?? 0;
          return (
            <motion.div key={state} variants={staggerItem}>
              <MetricCard
                label={meta.label}
                value={count}
                tone={count > 0 ? meta.tone : 'neutral'}
                icon={
                  state === 'pending' ? <IconClock size={16} />
                    : state === 'synced' ? <IconCheck size={16} />
                    : state === 'conflict' ? <IconAlert size={16} />
                    : <IconX size={16} />
                }
                sublabel={meta.hint}
              />
            </motion.div>
          );
        })}
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card padded={false}>
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-[15px] font-semibold text-slate-900">Queue by record type</h2>
            <p className="text-[12px] text-slate-500 mt-0.5">
              {lastCheckedAt ? `Last checked ${formatRelative(lastCheckedAt.toISOString())}` : 'Checking…'}
            </p>
          </div>
          <div className="p-3">
            {byEntity.length === 0 ? (
              <EmptyState
                icon={<IconCheck size={24} />}
                title="Outbox is empty"
                description="Everything on this node has been accepted, or there is nothing to send."
              />
            ) : (
              <ul className="space-y-1">
                {byEntity.map((e, i) => {
                  const meta = STATE_META[e.status] ?? STATE_META.pending;
                  return (
                    <li key={`${e.entity_type}-${e.status}-${i}`} className="px-3 py-3 rounded-none hover:bg-slate-50 transition-colors flex items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-slate-900">{titleCase(e.entity_type)}</p>
                        {e.oldest && (
                          <p className="text-[11.5px] text-slate-500 mt-0.5">
                            Oldest queued {formatRelative(e.oldest)}
                          </p>
                        )}
                      </div>
                      <StatusBadge tone={meta.tone} size="sm">{meta.label}</StatusBadge>
                      <span className="text-[15px] font-semibold text-slate-900 tnum w-10 text-right shrink-0">
                        {e.count}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <h2 className="text-[15px] font-semibold text-slate-900 mb-4">Node status</h2>
            <dl className="space-y-3">
              <div className="flex items-center justify-between">
                <dt className="text-[13px] text-slate-500">Site</dt>
                <dd className="text-[13px] font-medium text-slate-900 clinical-id">{syncStatus?.siteId ?? '—'}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[13px] text-slate-500">District node</dt>
                <dd>
                  <StatusBadge tone={configured ? 'success' : 'neutral'} size="sm">
                    {configured ? 'Configured' : 'Standalone'}
                  </StatusBadge>
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[13px] text-slate-500">Health</dt>
                <dd>
                  <StatusBadge
                    tone={syncStatus?.health === 'ok' ? 'success' : syncStatus?.health === 'degraded' ? 'warning' : 'danger'}
                    size="sm"
                  >
                    {titleCase(syncStatus?.health ?? 'unknown')}
                  </StatusBadge>
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[13px] text-slate-500">Last sync run</dt>
                <dd className="text-[13px] text-slate-700">
                  {syncStatus?.lastRunAt ? formatRelative(syncStatus.lastRunAt) : 'Never'}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[13px] text-slate-500">Oldest pending</dt>
                <dd className="text-[13px] text-slate-700">
                  {syncStatus?.queue?.oldestPendingAt ? formatRelative(syncStatus.queue.oldestPendingAt) : '—'}
                </dd>
              </div>
            </dl>
            <Button variant="outline" size="sm" fullWidth className="mt-5" onClick={runPush}>
              Run push now
            </Button>
          </Card>

          <Card>
            <h2 className="text-[15px] font-semibold text-slate-900 mb-1">Conflicts</h2>
            <p className="text-[12px] text-slate-500 mb-4">
              Records the district node rejected because it holds a newer version
            </p>
            {loadingConflicts ? (
              <SkeletonRows rows={2} />
            ) : !conflicts || conflicts.length === 0 ? (
              <p className="text-[13px] text-slate-500">No conflicts on this node.</p>
            ) : (
              <ul className="space-y-2">
                {conflicts.map((c) => (
                  <li key={c.id} className="rounded-none border border-red-200 bg-red-50 px-3.5 py-3">
                    <p className="text-[13px] font-medium text-red-900">{titleCase(c.entity_type)}</p>
                    <p className="text-[11px] text-red-700 clinical-id mt-0.5 truncate">{c.entity_id}</p>
                    {c.last_error && (
                      <p className="text-[11.5px] text-red-800/90 mt-1.5 leading-relaxed">{c.last_error}</p>
                    )}
                    <p className="text-[11px] text-red-600 mt-1 tnum">
                      {c.attempts} attempt{c.attempts === 1 ? '' : 's'} · {formatRelative(c.updated_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
