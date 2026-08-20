import React, { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import RunRow from './RunRow';
import FilterTabs from '../common/FilterTabs';
import type { Run, Verdict } from '@/types/run';

type RunFilter = 'all' | Verdict;

type RunsListProps = {
  runs: Run[];
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
};

const FILTER_OPTIONS: { value: RunFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pass', label: 'Pass' },
  { value: 'fail', label: 'Fail' },
];

const RunsList: React.FC<RunsListProps> = ({ runs, selectedRunId, onSelectRun }) => {
  const theme = useTheme();
  const [filter, setFilter] = useState<RunFilter>('all');

  const filteredRuns = useMemo(
    () => (filter === 'all' ? runs : runs.filter((run) => run.verdict === filter)),
    [runs, filter]
  );

  return (
    <Box
      data-tour="runs-list"
      sx={{
        width: 420,
        minWidth: 420,
        borderRight: `1px solid ${theme.palette.divider}`,
        overflowY: 'auto',
        backgroundColor: theme.palette.background.paper,
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: `1px solid ${theme.palette.divider}`,
          position: 'sticky',
          top: 0,
          backgroundColor: theme.palette.background.paper,
          zIndex: 1,
        }}
      >
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Run History</Typography>
        <Typography sx={{ fontSize: 11, color: theme.palette.text.disabled, fontFamily: 'monospace' }}>
          {filteredRuns.length} runs
        </Typography>
        <Box sx={{ ml: 'auto' }} data-tour="runs-filter">
          <FilterTabs options={FILTER_OPTIONS} value={filter} onChange={setFilter} />
        </Box>
      </Box>

      {filteredRuns.map((run) => (
        <RunRow key={run.id} run={run} selected={run.id === selectedRunId} onSelect={onSelectRun} />
      ))}
    </Box>
  );
};

export default RunsList;
