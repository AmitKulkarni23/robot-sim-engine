import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import TopBar from '@/components/layout/TopBar';
import ScenarioRow from '@/components/scenarios/ScenarioRow';
import { useScenarios } from '@/hooks/useScenarios';
import { useRuns } from '@/hooks/useRuns';
import { useTour } from '@/hooks/useTour';
import { TOUR_IDS, scenariosTourSteps } from '@/tours';
import type { Run } from '@/types/run';

const ScenarioBrowserPage: React.FC = () => {
  const { data: scenarios, loading, error, refetch } = useScenarios();
  const { data: runs } = useRuns();

  const pageTour = useTour({
    tourId: TOUR_IDS.SCENARIOS,
    steps: scenariosTourSteps,
    autoStart: !loading,
    autoStartDelay: 800,
  });

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
            </Box>
            <Box data-tour="scenarios-list" sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, backgroundColor: 'background.paper' }}>
              {scenarios.map((scenario) => (
                <ScenarioRow
                  key={scenario.id}
                  scenario={scenario}
                  runs={runsByScenario.get(scenario.id) ?? []}
                  onStatusChange={refetch}
                />
              ))}
              {scenarios.length === 0 && (
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
