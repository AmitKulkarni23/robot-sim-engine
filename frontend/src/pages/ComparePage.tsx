import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import TopBar from '@/components/layout/TopBar';
import CompareSelector from '@/components/compare/CompareSelector';
import CompareMetricsTable from '@/components/compare/CompareMetricsTable';
import { useRuns } from '@/hooks/useRuns';

const ComparePage: React.FC = () => {
  const { data: runs, loading, error } = useRuns();
  const [baselineRunId, setBaselineRunId] = useState<string>('');
  const [candidateRunId, setCandidateRunId] = useState<string>('');

  useEffect(() => {
    if (runs.length >= 2 && !baselineRunId && !candidateRunId) {
      setBaselineRunId(runs[1].id);
      setCandidateRunId(runs[0].id);
    }
  }, [runs, baselineRunId, candidateRunId]);

  const baselineRun = runs.find((run) => run.id === baselineRunId) ?? null;
  const candidateRun = runs.find((run) => run.id === candidateRunId) ?? null;

  return (
    <>
      <TopBar breadcrumb={['unitree-g1', 'compare']} />
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
            <CircularProgress size={28} />
          </Box>
        )}
        {!loading && error && <Typography color="error">{error}</Typography>}
        {!loading && !error && (
          <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            <Typography sx={{ fontSize: 16, fontWeight: 600, mb: 2 }}>Build Comparison</Typography>
            <Box sx={{ mb: 3 }}>
              <CompareSelector
                runs={runs}
                baselineRunId={baselineRunId}
                candidateRunId={candidateRunId}
                onChangeBaseline={setBaselineRunId}
                onChangeCandidate={setCandidateRunId}
              />
            </Box>
            {baselineRun && candidateRun ? (
              <CompareMetricsTable baseline={baselineRun} candidate={candidateRun} />
            ) : (
              <Typography color="text.secondary">Select two runs to compare.</Typography>
            )}
          </Box>
        )}
      </Box>
    </>
  );
};

export default ComparePage;
