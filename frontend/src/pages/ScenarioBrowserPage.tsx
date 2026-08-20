import React, { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import TopBar from '@/components/layout/TopBar';
import ScenarioRow from '@/components/scenarios/ScenarioRow';
import FilterTabs from '@/components/common/FilterTabs';
import { useScenarios } from '@/hooks/useScenarios';
import { useRuns } from '@/hooks/useRuns';
import { useTour } from '@/hooks/useTour';
import { TOUR_IDS, scenariosTourSteps } from '@/tours';
import type { ScenarioStatus } from '@/types/scenario';
import type { Run } from '@/types/run';

type ScenarioFilter = 'all' | ScenarioStatus;

const FILTER_OPTIONS: { value: ScenarioFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'queued', label: 'Queued' },
  { value: 'archived', label: 'Archived' },
];

const ScenarioBrowserPage: React.FC = () => {
  const { data: scenarios, loading, error, refetch } = useScenarios();
  const { data: runs } = useRuns();
  const [filter, setFilter] = useState<ScenarioFilter>('all');

  const pageTour = useTour({
    tourId: TOUR_IDS.SCENARIOS,
    steps: scenariosTourSteps,
    autoStart: !loading,
    autoStartDelay: 800,
  });

  const filteredScenarios = useMemo(
    () => (filter === 'all' ? scenarios : scenarios.filter((scenario) => scenario.status === filter)),
    [scenarios, filter]
  );

  const runsByScenario = useMemo(() => {
    const map = new Map<string, Run[]>();
    for (const run of runs) {
      const list = map.get(run.scenarioId) ?? [];
      list.push(run);
      map.set(run.scenarioId, list);
    }
    return map;
  }, [runs]);

  return (
    <>
      <TopBar breadcrumb={['unitree-g1', 'scenarios']} onStartTour={() => {
        pageTour.reset();
        pageTour.startTour();
      }} />
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
            <CircularProgress size={28} />
          </Box>
        )}
        {!loading && error && <Typography color="error">{error}</Typography>}
        {!loading && !error && (
          <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 600 }}>Scenarios</Typography>
              <Box data-tour="scenarios-filter">
                <FilterTabs options={FILTER_OPTIONS} value={filter} onChange={setFilter} />
              </Box>
            </Box>
            <Box data-tour="scenarios-list" sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, backgroundColor: 'background.paper' }}>
              {filteredScenarios.map((scenario) => (
                <ScenarioRow
                  key={scenario.id}
                  scenario={scenario}
                  runs={runsByScenario.get(scenario.id) ?? []}
                  onStatusChange={refetch}
                />
              ))}
              {filteredScenarios.length === 0 && (
                <Box sx={{ p: 3 }}>
                  <Typography color="text.secondary">No scenarios match this filter.</Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </>
  );
};

export default ScenarioBrowserPage;
