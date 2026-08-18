export type ScenarioStatus = 'draft' | 'published' | 'archived' | 'queued' | 'completed';

export interface Scenario {
  id: string;
  name: string;
  status: ScenarioStatus;
  description: string;
  robotModel: string;
  updatedAt: string;
  runCount: number;
  passRate: number;
}

export interface ScenarioDetail extends Scenario {
  version: number;
  yamlContent: string;
}

export interface CreateScenarioResponse {
  id: string;
  version: number;
  name: string;
  status: ScenarioStatus;
}
