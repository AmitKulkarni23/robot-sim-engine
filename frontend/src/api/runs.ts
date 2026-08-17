import type { Run } from '@/types/run';
import { apiFetch } from './client';

export const getRuns = async (): Promise<Run[]> => {
  const response = await apiFetch('/runs');
  if (!response.ok) {
    throw new Error(`Failed to fetch runs: ${response.status}`);
  }
  return response.json();
};

export const getRunById = async (runId: string): Promise<Run | undefined> => {
  const response = await apiFetch(`/runs/${encodeURIComponent(runId)}`);
  if (response.status === 404) {
    return undefined;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch run: ${response.status}`);
  }
  return response.json();
};
