import type { TelemetryData } from '@/types/telemetry';
import { apiFetch } from './client';

export const getTelemetry = async (runId: string): Promise<TelemetryData> => {
  const response = await apiFetch(`/runs/${encodeURIComponent(runId)}/telemetry`);
  if (!response.ok) {
    throw new Error(`Failed to fetch telemetry: ${response.status}`);
  }
  const { url } = (await response.json()) as { url: string };
  const telemetryResponse = await fetch(url);
  if (!telemetryResponse.ok) {
    throw new Error(`Failed to fetch telemetry data: ${telemetryResponse.status}`);
  }
  return telemetryResponse.json();
};
