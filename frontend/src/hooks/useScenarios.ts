import { useEffect, useState } from 'react';
import { getScenarios } from '@/api/scenarios';
import type { Scenario } from '@/types/scenario';

export interface UseScenariosResult {
  data: Scenario[];
  loading: boolean;
  error: string | null;
}

export const useScenarios = (): UseScenariosResult => {
  const [data, setData] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, []);

  return { data, loading, error };
};
