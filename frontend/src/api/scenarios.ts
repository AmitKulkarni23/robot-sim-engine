import type { Scenario, ScenarioDetail, CreateScenarioResponse } from '@/types/scenario';
import { apiFetch } from './client';

export const getScenarios = async (): Promise<Scenario[]> => {
  const response = await apiFetch('/scenarios');
  if (!response.ok) {
    throw new Error(`Failed to fetch scenarios: ${response.status}`);
  }
  return response.json();
};

export const getScenario = async (id: string): Promise<ScenarioDetail> => {
  const response = await apiFetch(`/scenarios/${encodeURIComponent(id)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch scenario: ${response.status}`);
  }
  return response.json();
};

export const createScenario = async (yamlContent: string): Promise<CreateScenarioResponse> => {
  const response = await apiFetch('/scenarios', {
    method: 'POST',
    body: JSON.stringify({ yaml_content: yamlContent }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = body.details || body.error || `HTTP ${response.status}`;
    throw new Error(detail);
  }
  return response.json();
};
