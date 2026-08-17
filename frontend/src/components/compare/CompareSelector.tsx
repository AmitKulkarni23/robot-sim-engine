import React from 'react';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import type { Run } from '@/types/run';

type CompareSelectorProps = {
  runs: Run[];
  baselineRunId: string;
  candidateRunId: string;
  onChangeBaseline: (runId: string) => void;
  onChangeCandidate: (runId: string) => void;
};

const runOptionLabel = (run: Run) => `${run.id} — ${run.scenarioName}`;

const CompareSelector: React.FC<CompareSelectorProps> = ({
  runs,
  baselineRunId,
  candidateRunId,
  onChangeBaseline,
  onChangeCandidate,
}) => {
  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <FormControl size="small" sx={{ minWidth: 260 }}>
        <InputLabel id="baseline-run-label">Baseline run</InputLabel>
        <Select
          labelId="baseline-run-label"
          label="Baseline run"
          value={baselineRunId}
          onChange={(event: SelectChangeEvent) => onChangeBaseline(event.target.value)}
        >
          {runs.map((run) => (
            <MenuItem key={run.id} value={run.id}>
              {runOptionLabel(run)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 260 }}>
        <InputLabel id="candidate-run-label">Candidate run</InputLabel>
        <Select
          labelId="candidate-run-label"
          label="Candidate run"
          value={candidateRunId}
          onChange={(event: SelectChangeEvent) => onChangeCandidate(event.target.value)}
        >
          {runs.map((run) => (
            <MenuItem key={run.id} value={run.id}>
              {runOptionLabel(run)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default CompareSelector;
