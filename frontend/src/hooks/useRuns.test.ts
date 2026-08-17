import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRuns } from './useRuns';

vi.mock('@/api/runs', () => ({
  getRuns: vi.fn().mockResolvedValue([
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
  ]),
}));

describe('useRuns', () => {
  describe('when the hook mounts', () => {
    it('should start with loading true and no data', () => {
      const { result } = renderHook(() => useRuns());
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toEqual([]);
    });

    it('should populate data and set loading false after runs are fetched', async () => {
      const { result } = renderHook(() => useRuns());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data[0].id).toBe('a3f7c21');
      expect(result.current.error).toBeNull();
    });
  });
});
