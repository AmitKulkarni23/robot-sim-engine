import { useEffect, useState } from 'react';
import { getRuns } from '@/api/runs';
import type { Run } from '@/types/run';

export interface UseRunsResult {
  data: Run[];
  loading: boolean;
  error: string | null;
}

export const useRuns = (): UseRunsResult => {
  const [data, setData] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchRuns = async () => {
      setLoading(true);
      try {
        const runs = await getRuns();
        if (!cancelled) {
          setData(runs);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch runs');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchRuns();

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
};
