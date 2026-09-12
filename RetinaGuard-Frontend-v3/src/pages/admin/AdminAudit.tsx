import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '../../lib/query';
import { auditService, consultationService } from '../../services/api';
import { formatDateTime, titleCase } from '../../lib/format';
import {
  Alert, Button, Card, EmptyState, Field, SectionHeader, Select, SkeletonRows,
} from '../../components/ui';
import { StatusBadge } from '../../components/clinical/indicators';
import { IconAlert, IconCheck, IconHistory, IconShield } from '../../components/ui/icons';

/**
 * Audit trail with hash-chain verification.
 *
 * The chain is the reason the audit log is trustworthy: each entry stores the
 * previous entry's hash, so a silent edit breaks the chain and the verify
 * endpoint reports where. Surfacing `brokenAt` matters more than a green tick.
 */
export default function AdminAudit() {
  const [caseId, setCaseId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; entries: number; brokenAt?: number | null } | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const { data: consultations } = useQuery({
    queryFn: () => consultationService.list({ limit: 100 }),
  });

  const { data: entries, isLoading } = useQuery({
    queryFn: () => auditService.trail(caseId),
    enabled: Boolean(caseId),
    deps: [caseId],
  });

  const verify = async () => {
    setVerifying(true);
    setVerifyError(null);
    setVerifyResult(null);
    try {
      setVerifyResult(await auditService.verify(caseId || undefined));
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Verification could not run.');
    } finally {
      setVerifying(false);
    }
  };

  const cases = consultations?.items ?? [];

  return (
    <div className="space-y-7">
      <SectionHeader
        eyebrow="Administration"
        title="Audit trail"
        description="Every clinical action is recorded in a hash-linked chain. Editing history breaks the chain and verification reports where."
        actions={
          <Button onClick={verify} loading={verifying} icon={!verifying ? <IconShield size={16} /> : undefined}>
            Verify chain
          </Button>
        }
      />

      {verifyError && (
        <Alert tone="danger" title="Verification failed" icon={<IconAlert size={17} />}>{verifyError}</Alert>
      )}

      {verifyResult && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
          <Alert
            tone={verifyResult.valid ? 'success' : 'danger'}
            title={verifyResult.valid ? 'Chain intact' : 'Chain broken'}
            icon={verifyResult.valid ? <IconCheck size={17} /> : <IconAlert size={17} />}
          >
            {verifyResult.valid
              ? `${verifyResult.entries} entries verified. Every hash links correctly to its predecessor.`
              : `Verification failed at sequence ${verifyResult.brokenAt ?? 'unknown'} of ${verifyResult.entries} entries. Records after this point cannot be trusted.`}
          </Alert>
        </motion.div>
      )}

      <Card>
        <Field label="Case" hint="Select a case to inspect its recorded actions">
          <Select value={caseId} onChange={(e) => setCaseId(e.target.value)}>
            <option value="">All cases (chain verification only)</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>{c.case_number}</option>
            ))}
          </Select>
        </Field>
      </Card>

      {!caseId ? (
        <EmptyState
          icon={<IconHistory size={26} />}
          title="Select a case to view its audit trail"
          description="Chain verification can run across all cases without selecting one."
        />
      ) : isLoading ? (
        <SkeletonRows rows={6} />
      ) : !entries || entries.length === 0 ? (
        <EmptyState title="No audit entries for this case" />
      ) : (
        <Card padded={false}>
          <ol className="divide-y divide-slate-100">
            {entries.map((e, i) => (
              <motion.li
                key={e.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22, delay: Math.min(i * 0.03, 0.3) }}
                className="px-5 py-4"
              >
                <div className="flex items-start gap-4">
                  <span className="w-7 h-7 rounded-none bg-slate-100 text-slate-500 text-[11px] font-semibold flex items-center justify-center shrink-0 tnum mt-0.5">
                    {e.sequence}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="text-[13px] font-semibold text-slate-900">{titleCase(e.action)}</p>
                      <StatusBadge tone="neutral" size="sm">{titleCase(e.entity_type)}</StatusBadge>
                      {e.actor_role && (
                        <StatusBadge tone="brand" size="sm">{titleCase(e.actor_role)}</StatusBadge>
                      )}
                    </div>
                    <p className="text-[12px] text-slate-500">{formatDateTime(e.created_at)}</p>
                    {e.reason && (
                      <p className="text-[12px] text-slate-600 mt-1.5 leading-relaxed">{e.reason}</p>
                    )}
                    <p className="text-[10px] text-slate-400 clinical-id mt-2 truncate" title={e.hash}>
                      {e.hash.slice(0, 32)}…
                    </p>
                  </div>
                </div>
              </motion.li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
