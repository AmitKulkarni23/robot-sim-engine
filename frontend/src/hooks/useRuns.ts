import { useEffect, useRef, useState } from 'react';
import { getRuns } from '@/api/runs';
import type { Run } from '@/types/run';

const POLL_INTERVAL_MS = 3000;

export interface UseRunsResult {
  data: Run[];
  loading: boolean;
  error: string | null;
}

export const useRuns = (): UseRunsResult => {
  const [data, setData] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchRuns = async (isInitial = false) => {
      if (isInitial) setLoading(true);
      try {
        const runs = await getRuns();
        if (!cancelled) {
          setData(runs);
          setError(null);

          const hasRunning = runs.some((r) => r.verdict === 'running');
          if (hasRunning) {
            pollTimer.current = setTimeout(() => fetchRuns(false), POLL_INTERVAL_MS);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch runs');
        }
      } finally {
        if (isInitial && !cancelled) {
          setLoading(false);
        }
      }
    };

    fetchRuns(true);

    return () => {
      cancelled = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  return { data, loading, error };
};
