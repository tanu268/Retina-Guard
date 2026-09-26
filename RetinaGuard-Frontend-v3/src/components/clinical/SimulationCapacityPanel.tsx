import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useQuery } from '../../lib/query';
import { Card } from '../ui';
import { MetricCard } from './indicators';
import { IconAlert, IconBrain, IconQueue, IconUsers } from '../ui/icons';

/* 
 * API service for simulation endpoints
 */
const simulationApi = {
  results: async () => {
    const res = await fetch('http://localhost:3000/simulation/results', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    if (!res.ok) throw new Error('Failed to fetch simulation results');
    return res.json();
  }
};

export function SimulationCapacityPanel() {
  const { data: simData, isLoading, error } = useQuery({ queryFn: simulationApi.results });

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

  const { summaries, source } = simData;
  const currentScenario = summaries?.[0]; // Default to first scenario

  if (!currentScenario) {
    return (
      <Card>
        <p className="text-sm text-slate-500">No simulation scenarios found.</p>
      </Card>
    );
  }

  // Determine source label
  const sourceLabel = source === 'latest_results' ? 'Live MATLAB / Simulink result' :
                     source === 'demo_csv' ? 'Verified experiment result' : 
                     'Unknown Source';
                     
  const sourceColor = source === 'latest_results' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800';

  const utilData = [
    { name: 'Capture', value: Math.round(currentScenario.mean_capture_util * 100) },
    { name: 'AI Server', value: Math.round(currentScenario.mean_ai_util * 100) },
    { name: 'Reviewer', value: Math.round(currentScenario.mean_reviewer_util * 100) }
  ];

  return (
    <div className="space-y-5 mt-8 border-t border-slate-200 pt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Simulink Capacity Model</h2>
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${sourceColor}`}>
          {sourceLabel}
        </span>
      </div>

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
            
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                <button 
                  className="px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={() => alert("Simulation triggered (MATLAB integration requires CLI access)")}
                >
                  Run Simulation
                </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

