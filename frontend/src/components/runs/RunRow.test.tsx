import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { buildTheme } from '@/config/theme';
import RunRow from './RunRow';
import type { Run } from '@/types/run';

const mockRun: Run = {
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
};

const renderRunRow = (props: Partial<React.ComponentProps<typeof RunRow>> = {}) => {
  const onSelect = vi.fn();
  render(
    <ThemeProvider theme={buildTheme('light')}>
      <RunRow run={mockRun} selected={false} onSelect={onSelect} {...props} />
    </ThemeProvider>
  );
  return { onSelect };
};

describe('RunRow', () => {
  describe('when rendered', () => {
    it('should display the run hash, scenario name, and verdict badge', () => {
      renderRunRow();
      expect(screen.getByText('a3f7c21')).toBeInTheDocument();
      expect(screen.getByText('Box pickup — randomized weight')).toBeInTheDocument();
      expect(screen.getByText('Fail')).toBeInTheDocument();
      expect(screen.getByText('-12% grip')).toBeInTheDocument();
    });
  });

  describe('when the row is clicked', () => {
    it('should call onSelect with the run id', async () => {
      const user = userEvent.setup();
      const { onSelect } = renderRunRow();
      await user.click(screen.getByRole('button', { name: /Box pickup — randomized weight/ }));
      expect(onSelect).toHaveBeenCalledWith('a3f7c21');
    });
  });
});
