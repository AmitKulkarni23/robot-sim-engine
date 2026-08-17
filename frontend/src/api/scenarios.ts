import type { Scenario } from '@/types/scenario';

const API_URL = import.meta.env.VITE_API_URL as string;

/** Fetches the full list of scenarios. */
export const getScenarios = async (): Promise<Scenario[]> => {
  const response = await fetch(`${API_URL}/scenarios`);
  if (!response.ok) {
    throw new Error(`Failed to fetch scenarios: ${response.status}`);
  }
  return response.json();
};
