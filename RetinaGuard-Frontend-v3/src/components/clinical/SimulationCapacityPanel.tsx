import { useState, useCallback } from 'react';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useQuery } from '../../lib/query';
import { http } from '../../lib/http';
import { Card } from '../ui';
import { MetricCard } from './indicators';
import { IconAlert, IconBrain, IconQueue, IconUsers } from '../ui/icons';

/*
 * API service for simulation endpoints
 */
const simulationApi = {
  results: async () => {
    return http.get<any>('/simulation/results');
  },
  run: async () => {
    return http.post<any>('/simulation/run', {});
  },
};

/* Source badge helpers */
function getSourceMeta(source: string | undefined) {
  if (source === 'live-matlab') {
    return { label: 'Live MATLAB Result', color: 'bg-emerald-100 text-emerald-800' };
  }
  if (source === 'latest_results') {
    return { label: 'Previous MATLAB Result', color: 'bg-blue-100 text-blue-800' };
  }
  if (source === 'demo_csv') {
    return { label: 'Verified Experiment Result', color: 'bg-amber-100 text-amber-800' };
  }
  return { label: 'Unknown Source', color: 'bg-slate-100 text-slate-600' };
}

export function SimulationCapacityPanel() {
  const { data: simData, isLoading, error, refetch } = useQuery({ queryFn: simulationApi.results });

  const [runState, setRunState]     = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [runError, setRunError]     = useState<string | null>(null);
  const [liveData, setLiveData]     = useState<any | null>(null);

  const handleRunSimulation = useCallback(async () => {
    if (runState === 'running') return;
    setRunState('running');
    setRunError(null);
    setLiveData(null);
    try {
      const result = await simulationApi.run();
      setLiveData(result);
      setRunState('success');
      // Also invalidate cached results so header badge updates if user navigates away and back
      refetch?.();
    } catch (err: any) {
      setRunState('error');
      setRunError(err?.message || 'Simulation failed. Check MATLAB is installed and accessible.');
    }
  }, [runState, refetch]);

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center h-48">
          <p className="text-sm text-slate-500">Loading simulation data...</p>
        </div>
      </Card>
    );
  }

  if (error || !simData) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center h-48 space-y-2">
          <IconAlert size={24} className="text-amber-500" />
          <p className="text-sm font-medium text-slate-900">Simulation Unavailable</p>
          <p className="text-xs text-slate-500">{error?.message || 'No data returned'}</p>
        </div>
      </Card>
    );
  }

  // Prefer live run results over cached page-load results
  const displayData    = liveData ?? simData;
  const { summaries, source } = displayData;
  const currentScenario       = summaries?.[0];
  const sourceMeta            = getSourceMeta(source);

  if (!currentScenario) {
    return (
      <Card>
        <p className="text-sm text-slate-500">No simulation scenarios found.</p>
      </Card>
    );
  }

  const utilData = [
    { name: 'Capture',    value: Math.round(currentScenario.mean_capture_util  * 100) },
    { name: 'AI Server',  value: Math.round(currentScenario.mean_ai_util       * 100) },
    { name: 'Reviewer',   value: Math.round(currentScenario.mean_reviewer_util * 100) },
  ];

  // Button label & style based on runState
  const btnLabel: Record<typeof runState, string> = {
    idle:    'Run Simulation',
    running: 'Running Simulation…',
    success: 'Simulation Complete',
    error:   'Retry Simulation',
  };
  const btnBase   = 'px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  const btnStyle  = runState === 'running'
    ? `${btnBase} bg-indigo-100 text-indigo-500 cursor-not-allowed border border-indigo-200`
    : runState === 'success'
    ? `${btnBase} bg-emerald-600 text-white border border-emerald-700 hover:bg-emerald-700 focus:ring-emerald-500`
    : runState === 'error'
    ? `${btnBase} bg-red-600 text-white border border-red-700 hover:bg-red-700 focus:ring-red-500`
    : `${btnBase} bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 hover:text-indigo-600 focus:ring-indigo-500`;

  return (
    <div className="space-y-5 mt-8 border-t border-slate-200 pt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Simulink Capacity Model</h2>
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${sourceMeta.color}`}>
          {sourceMeta.label}
        </span>
      </div>

      {/* Run error banner */}
      {runState === 'error' && runError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <IconAlert size={16} className="mt-0.5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-800">Simulation Failed</p>
            <p className="text-xs text-red-600 mt-0.5">{runError}</p>
          </div>
        </div>
      )}

      {/* Run success banner */}
      {runState === 'success' && liveData && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <span className="mt-0.5 shrink-0 text-emerald-600 font-bold">✓</span>
          <div>
            <p className="text-sm font-medium text-emerald-800">Simulation Complete — Results Updated</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              Source: <strong>{liveData.simulation?.model ?? 'RetinaGuard_SimEvents_Day2'}</strong>
              {liveData.simulation?.generated_at ? ` · Run at ${liveData.simulation.generated_at}` : ''}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Throughput (Cases/shift)" value={Math.round(currentScenario.mean_patients_done)}
          tone="brand" icon={<IconQueue size={16} />}
          sublabel={<span className="flex items-center gap-1.5 text-xs text-slate-500">Simulated capacity</span>}
        />
        <MetricCard
          label="Reviewer Utilisation" value={Math.round(currentScenario.mean_reviewer_util * 100)} suffix="%"
          tone={currentScenario.mean_reviewer_util > 1 ? 'danger' : currentScenario.mean_reviewer_util > 0.8 ? 'warning' : 'success'}
          icon={<IconBrain size={16} />}
          sublabel={<span className="flex items-center gap-1.5 text-xs text-slate-500">Simulated workload</span>}
        />
        <MetricCard
          label="Mean Queue Length" value={Number(currentScenario.mean_reviewer_queue_len.toFixed(1))}
          tone="neutral" icon={<IconUsers size={16} />}
          sublabel={<span className="flex items-center gap-1.5 text-xs text-slate-500">Cases waiting for review</span>}
        />
        <MetricCard
          label="Bottleneck" value={currentScenario.bottleneck}
          tone="warning" icon={<IconAlert size={16} />}
          sublabel={<span className="flex items-center gap-1.5 text-xs text-slate-500">Constraining resource</span>}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900">Resource Utilisation</h3>
              <p className="text-[12px] text-slate-500 mt-0.5">Average usage across the shift</p>
            </div>
            <span className="inline-flex items-center h-5 px-1.5 rounded border text-[9.5px] font-semibold tracking-[0.06em] bg-indigo-50 text-indigo-700 border-indigo-200">
              SIMULATED
            </span>
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={utilData}
                margin={{ top: 5, right: 5, left: -18, bottom: 0 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={true} vertical={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(val) => [`${val}%`, 'Utilisation']} />
                <Bar dataKey="value" fill="#4338CA" radius={[0, 5, 5, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="flex flex-col h-full">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-[14px] font-semibold text-slate-900">Scenario Configuration</h3>
                <p className="text-[12px] text-slate-500 mt-0.5">Active simulation parameters</p>
              </div>
            </div>
            <div className="flex-1 bg-slate-50 rounded-lg p-4 font-mono text-[11px] text-slate-600 overflow-auto">
              <div className="grid grid-cols-2 gap-y-2">
                <div>Scenario Name:</div><div className="font-semibold">{currentScenario.name}</div>
                {currentScenario.stop_time_min && <><div>Shift Length:</div><div className="font-semibold">{currentScenario.stop_time_min} mins</div></>}
                {currentScenario.n_replications && <><div>Replications:</div><div className="font-semibold">{currentScenario.n_replications}</div></>}
                {currentScenario.mean_wait_capture_min !== undefined && <><div>Avg Wait (Capture):</div><div className="font-semibold">{currentScenario.mean_wait_capture_min.toFixed(1)} mins</div></>}
                {currentScenario.mean_wait_reviewer_min !== undefined && <><div>Avg Wait (Review):</div><div className="font-semibold">{currentScenario.mean_wait_reviewer_min.toFixed(1)} mins</div></>}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              {/* Running spinner */}
              {runState === 'running' && (
                <span className="flex items-center gap-2 text-xs text-indigo-600">
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  MATLAB running…
                </span>
              )}
              {runState !== 'running' && <span />}

              <button
                id="btn-run-simulation"
                className={btnStyle}
                disabled={runState === 'running'}
                onClick={handleRunSimulation}
              >
                {btnLabel[runState]}
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
