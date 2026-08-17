export type ScenarioStatus = 'draft' | 'published' | 'archived';

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
