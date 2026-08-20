import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '@/components/layout/TopBar';
import RunsList from '@/components/runs/RunsList';
import RunDetail from '@/components/runs/RunDetail';
import { useRuns } from '@/hooks/useRuns';
import { useTour } from '@/hooks/useTour';
import { TOUR_IDS, sidebarTourSteps, runsTourSteps } from '@/tours';

const RunsPage: React.FC = () => {
  const { data: runs, loading, error } = useRuns();
  const { runId } = useParams();
  const navigate = useNavigate();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(runId ?? null);

  const sidebarTour = useTour({
    tourId: TOUR_IDS.SIDEBAR,
    steps: sidebarTourSteps,
    autoStart: !loading,
    autoStartDelay: 600,
  });
  const pageTour = useTour({
    tourId: TOUR_IDS.RUNS,
    steps: runsTourSteps,
    autoStart: !loading && sidebarTour.isCompleted,
    autoStartDelay: 800,
  });

  useEffect(() => {
    if (!selectedRunId && runs.length > 0) {
      setSelectedRunId(runs[0].id);
    }
  }, [runs, selectedRunId]);

  const handleSelectRun = (id: string) => {
    setSelectedRunId(id);
    navigate(`/runs/${id}`, { replace: true });
  };

  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? null;

  return (
    <>
      <TopBar breadcrumb={['unitree-g1', 'factory-cell-alpha']} onStartTour={() => {
        sidebarTour.reset();
        pageTour.reset();
        sidebarTour.startTour();
      }} />
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {loading && (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        )}
        {!loading && error && (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="error">{error}</Typography>
          </Box>
        )}
        {!loading && !error && (
          <>
            <RunsList runs={runs} selectedRunId={selectedRunId} onSelectRun={handleSelectRun} />
            {selectedRun ? (
              <RunDetail run={selectedRun} />
            ) : (
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary">Select a run to view its details.</Typography>
              </Box>
            )}
          </>
        )}
      </Box>
    </>
  );
};

export default RunsPage;
