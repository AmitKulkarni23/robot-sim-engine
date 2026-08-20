export type Verdict = 'pass' | 'fail' | 'running';

export type MetricStatus = 'pass' | 'fail' | 'changed' | 'neutral';

export type DeltaDirection = 'pos' | 'neg' | 'neutral';

export interface MetricValue {
  name: string;
  unit: string;
  current: number;
  previous: number | null;
  deltaPct: number | null;
  status: MetricStatus;
}

export interface Violation {
  id: string;
  severity: 'error' | 'warning';
  title: string;
  description: string;
  timeLabel: string;
}

export interface Run {
  id: string;
  scenarioId: string;
  scenarioName: string;
  verdict: Verdict;
  verdictReason?: string;
  timestamp: string;
  buildNumber: number;
  robotModel: string;
  durationSeconds: number;
  stepsSimulated: number;
  failureAt?: string;
  keyMetricLabel: string;
  keyMetricDeltaDirection: DeltaDirection;
  metrics: MetricValue[];
  violations: Violation[];
  controllerVersion?: string;
}
