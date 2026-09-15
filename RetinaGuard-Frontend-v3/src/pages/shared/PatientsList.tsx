import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '../../lib/query';
import { patientService } from '../../services/api';
import { formatRelative, titleCase } from '../../lib/format';
import {
  Button, EmptyState, Input, SectionHeader, SkeletonRows, stagger, staggerItem,
} from '../../components/ui';
import { SyncStateBadge } from '../../components/clinical/indicators';
import { GlowCard } from '../../components/ui/spotlight-card';
import { IconArrowRight, IconPatients, IconSearch, IconUserPlus } from '../../components/ui/icons';

export default function PatientsList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryFn: () => patientService.list({ page, limit: 20, q: search || undefined }),
    deps: [page, search],
  });

  const patients = data?.items ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-7">
      <SectionHeader
        eyebrow="Records"
        title="Patients"
        description="Everyone registered on this edge node"
        actions={
          <Button onClick={() => navigate('/app/technician/register')} icon={<IconUserPlus size={16} />}>
            Register patient
          </Button>
        }
      />

      <div className="relative max-w-md">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <IconSearch size={16} />
        </span>
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name, code or village"
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <SkeletonRows rows={6} />
      ) : patients.length === 0 ? (
        <EmptyState
          icon={<IconPatients size={26} />}
          title={search ? 'No patients match that search' : 'No patients registered yet'}
          description={search ? 'Try a different name, code or village.' : 'Register the first patient to begin screening.'}
          action={!search ? (
            <Button onClick={() => navigate('/app/technician/register')}>Register patient</Button>
          ) : undefined}
        />
      ) : (
        <>
          <motion.div variants={stagger} initial="initial" animate="animate" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {patients.map((p) => (
              <motion.div
                key={p.id}
                variants={staggerItem}
                whileHover={{ y: -2 }}
              >
                <GlowCard
                  customSize
                  glowColor="blue"
                  onClick={() => navigate(`/app/patients/${p.id}`)}
                  className="text-left bg-white border border-slate-200 p-5 shadow-[0_1px_2px_0_rgb(15_23_42/0.04),0_1px_3px_0_rgb(15_23_42/0.06)] transition-shadow duration-200 hover:shadow-[0_4px_8px_-2px_rgb(15_23_42/0.05),0_12px_28px_-6px_rgb(15_23_42/0.10)] cursor-pointer"
                >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-slate-900 truncate">{p.full_name}</p>
                    <p className="text-[12px] text-slate-500 clinical-id mt-0.5">{p.patient_code}</p>
                  </div>
                  <SyncStateBadge state={p.sync_state} />
                </div>
                <dl className="grid grid-cols-2 gap-3 text-[12px]">
                  <div>
                    <dt className="text-slate-400 mb-0.5">Age</dt>
                    <dd className="text-slate-800 font-medium tnum">{p.age ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 mb-0.5">Gender</dt>
                    <dd className="text-slate-800 font-medium">{titleCase(p.gender ?? '')}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 mb-0.5">Village</dt>
                    <dd className="text-slate-800 font-medium truncate">{p.village ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 mb-0.5">Diabetes</dt>
                    <dd className="text-slate-800 font-medium">
                      {p.diabetes_duration_years != null ? `${p.diabetes_duration_years} yrs` : titleCase(p.diabetes_type ?? '')}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11.5px] text-slate-400">Registered {formatRelative(p.created_at)}</span>
                  <span className="text-slate-300"><IconArrowRight size={14} /></span>
                </div>
                </GlowCard>
              </motion.div>
            ))}
          </motion.div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-slate-500 tnum">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} patients
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={!pagination.hasPrev} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button size="sm" variant="outline" disabled={!pagination.hasNext} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
