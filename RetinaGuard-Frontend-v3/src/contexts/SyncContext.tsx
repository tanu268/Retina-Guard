import {
  createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode,
} from 'react';
import { syncService } from '../services/api';
import { isTrue } from '../lib/format';
import type { SyncStatus } from '../types';
import { getAllOutboxRecords, saveToOutbox } from '../lib/idb';
import { patientService, consultationService, imageService } from '../services/api';

export type NetworkState = 'online' | 'offline' | 'syncing' | 'degraded';

interface SyncContextValue {
  networkState: NetworkState;
  syncStatus: SyncStatus | null;
  isOnline: boolean;
  pendingCount: number;
  failedCount: number;
  conflictCount: number;
  lastCheckedAt: Date | null;
  isSyncing: boolean;
  triggerSync: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [networkState, setNetworkState] = useState<NetworkState>(
    navigator.onLine ? 'online' : 'offline',
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [localOutboxCount, setLocalOutboxCount] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const onOnline = () => setNetworkState('online');
    const onOffline = () => setNetworkState('offline');
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const status = await syncService.status();
      if (!mounted.current) return;
      setSyncStatus(status);
      setLastCheckedAt(new Date());
      if (status.health === 'attention_required') setNetworkState('degraded');
      else if (navigator.onLine) setNetworkState('online');
    } catch {
      if (!mounted.current) return;
      // Unreachable edge server is functionally offline from the UI's side.
      setNetworkState('offline');
    }

    // Also update local outbox count
    try {
      const records = await getAllOutboxRecords();
      if (mounted.current) setLocalOutboxCount(records.filter(r => r.status === 'PENDING').length);
    } catch (e) {
      // Ignore IDB errors
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 20_000);
    return () => clearInterval(id);
  }, [refresh]);

  const triggerSync = useCallback(async () => {
    setIsSyncing(true);
    setNetworkState('syncing');
    try {
      // First, sync local outbox to backend
      const records = await getAllOutboxRecords();
      for (const record of records) {
        if (record.status === 'PENDING') {
          try {
             if (record.patient) await patientService.create(record.patient, record.patient.id);
             if (record.consultation) await consultationService.create({ patientId: record.consultation.patientId, identityConfirmed: true, notes: record.consultation.notes }, record.case_uuid);
             if (record.image) {
                // Check if consultation exists to attach image
                await imageService.upload(record.image.consultationId, record.image.laterality as any, record.image.file);
             }
             record.status = 'SYNCED';
             await saveToOutbox(record);
          } catch (e: any) {
             if (e.isOffline || e.code === 'NETWORK_ERROR') {
                // Still offline
                throw e;
             }
             record.status = 'REJECTED';
             record.error_message = e.message;
             await saveToOutbox(record);
          }
      }
      }
      // Then trigger backend sync
      await syncService.push();
    } catch {
      // Push failure is expected when the edge node is unreachable or offline.
    } finally {
      if (mounted.current) setIsSyncing(false);
      await refresh();
    }
  }, [refresh]);

  const byStatus = syncStatus?.queue?.byStatus ?? {};
  const pendingCount = (byStatus.pending ?? 0) + localOutboxCount;
  const failedCount = byStatus.failed ?? 0;
  const conflictCount = byStatus.conflict ?? 0;

  const value = useMemo<SyncContextValue>(() => ({
    networkState,
    syncStatus,
    isOnline: networkState === 'online' || networkState === 'syncing',
    pendingCount,
    failedCount,
    conflictCount,
    lastCheckedAt,
    isSyncing,
    triggerSync,
    refresh,
  }), [networkState, syncStatus, pendingCount, failedCount, conflictCount,
      lastCheckedAt, isSyncing, triggerSync, refresh]);

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
}

/** District sync being unconfigured is a deployment choice, not a fault —
 *  a single edge node is designed to run without it. */
// eslint-disable-next-line react-refresh/only-export-components
export function isDistrictConfigured(status: SyncStatus | null): boolean {
  return isTrue(status?.districtConfigured);
}
