import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { buildTheme } from '@/config/theme';
import CompareSelector from './CompareSelector';
import type { Run } from '@/types/run';

const runs: Run[] = [
  {
    id: 'a3f7c21',
    scenarioId: 'box-pickup-randomized-weight',
    scenarioName: 'Box pickup — randomized weight',
    verdict: 'fail',
    timestamp: '2026-08-16T11:58:00Z',
    buildNumber: 184,
    robotModel: 'unitree-g1',
    durationSeconds: 14.3,
    stepsSimulated: 7142,
    keyMetricLabel: '-12% grip',
    keyMetricDeltaDirection: 'neg',
    metrics: [],
    violations: [],
  },
  {
    id: 'e9b4d08',
    scenarioId: 'box-pickup-standard-5kg',
    scenarioName: 'Box pickup — standard 5kg',
    verdict: 'pass',
    timestamp: '2026-08-16T11:42:00Z',
    buildNumber: 184,
    robotModel: 'unitree-g1',
    durationSeconds: 9.1,
    stepsSimulated: 4550,
    keyMetricLabel: '+3% speed',
    keyMetricDeltaDirection: 'pos',
    metrics: [],
    violations: [],
  },
];

const renderSelector = () => {
  const onChangeBaseline = vi.fn();
  const onChangeCandidate = vi.fn();
  render(
    <ThemeProvider theme={buildTheme('light')}>
      <CompareSelector
        runs={runs}
        baselineRunId="a3f7c21"
        candidateRunId="e9b4d08"
        onChangeBaseline={onChangeBaseline}
        onChangeCandidate={onChangeCandidate}
      />
    </ThemeProvider>
  );
  return { onChangeBaseline, onChangeCandidate };
};

describe('CompareSelector', () => {
  describe('when the baseline run dropdown changes', () => {
    it('should call onChangeBaseline with the newly selected run id', async () => {
      const user = userEvent.setup();
      const { onChangeBaseline } = renderSelector();
      await user.click(screen.getByRole('combobox', { name: /Baseline run/ }));
      await user.click(await screen.findByRole('option', { name: /e9b4d08/ }));
      expect(onChangeBaseline).toHaveBeenCalledWith('e9b4d08');
    });
  });

  describe('when the candidate run dropdown changes', () => {
    it('should call onChangeCandidate with the newly selected run id', async () => {
      const user = userEvent.setup();
      const { onChangeCandidate } = renderSelector();
      await user.click(screen.getByRole('combobox', { name: /Candidate run/ }));
      await user.click(await screen.findByRole('option', { name: /a3f7c21/ }));
      expect(onChangeCandidate).toHaveBeenCalledWith('a3f7c21');
    });
  });
});
