import type { TelemetryData } from '@/types/telemetry';
import { apiFetch } from './client';

export const getTelemetry = async (runId: string): Promise<TelemetryData> => {
  const response = await apiFetch(`/runs/${encodeURIComponent(runId)}/telemetry`);
  if (!response.ok) {
    throw new Error(`Failed to fetch telemetry: ${response.status}`);
  }
  return response.json();
};
