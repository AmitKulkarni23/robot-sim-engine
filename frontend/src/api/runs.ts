import type { Run } from '@/types/run';

const API_URL = import.meta.env.VITE_API_URL as string;

/** Fetches the full list of simulation runs, ordered newest first. */
export const getRuns = async (): Promise<Run[]> => {
  const response = await fetch(`${API_URL}/runs`);
  if (!response.ok) {
    throw new Error(`Failed to fetch runs: ${response.status}`);
  }
  return response.json();
};

/** Fetches a single run by its ID. */
export const getRunById = async (runId: string): Promise<Run | undefined> => {
  const response = await fetch(`${API_URL}/runs/${encodeURIComponent(runId)}`);
  if (response.status === 404) {
    return undefined;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch run: ${response.status}`);
  }
  return response.json();
};
