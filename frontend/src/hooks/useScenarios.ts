import { useCallback, useEffect, useState } from 'react';
import { getScenarios } from '@/api/scenarios';
import type { Scenario } from '@/types/scenario';

export interface UseScenariosResult {
  data: Scenario[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useScenarios = (): UseScenariosResult => {
  const [data, setData] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;

    const fetchScenarios = async () => {
      setLoading(true);
      try {
        const scenarios = await getScenarios();
        if (!cancelled) {
          setData(scenarios);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch scenarios');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchScenarios();

    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  return { data, loading, error, refetch };
};
