import type { Scenario } from '@/types/scenario';

// TODO: replace mock data with real Lambda Function URL calls once
// docs/specs/api-contracts.md defines the scenarios endpoint contract.

const MOCK_SCENARIOS: Scenario[] = [
  {
    id: 'box-pickup-standard-5kg',
    name: 'Box pickup — standard 5kg',
    status: 'published',
    description: 'Grasp and lift a fixed 5kg box from a table to a shelf at 1.1m height.',
    robotModel: 'unitree-g1',
    updatedAt: '2026-08-10T09:00:00Z',
    runCount: 62,
    passRate: 0.94,
  },
  {
    id: 'box-pickup-randomized-weight',
    name: 'Box pickup — randomized weight',
    status: 'published',
    description: 'Grasp and lift a box with weight randomized between 3kg and 12kg per run.',
    robotModel: 'unitree-g1',
    updatedAt: '2026-08-14T15:30:00Z',
    runCount: 38,
    passRate: 0.71,
  },
  {
    id: 'walk-to-station-b',
    name: 'Walk to station B',
    status: 'published',
    description: 'Bipedal walk from staging area to station B, 6m over a flat factory floor.',
    robotModel: 'unitree-g1',
    updatedAt: '2026-08-01T12:00:00Z',
    runCount: 120,
    passRate: 0.98,
  },
  {
    id: 'pallet-stack-3-box',
    name: 'Pallet stack — 3 box sequence',
    status: 'published',
    description: 'Stack three boxes of varying size onto a pallet in a fixed sequence.',
    robotModel: 'unitree-g1',
    updatedAt: '2026-08-12T08:45:00Z',
    runCount: 27,
    passRate: 0.82,
  },
  {
    id: 'obstacle-avoidance-cones',
    name: 'Obstacle avoidance — cones',
    status: 'draft',
    description: 'Navigate a corridor of randomly placed cones without contact.',
    robotModel: 'unitree-g1',
    updatedAt: '2026-08-16T11:00:00Z',
    runCount: 4,
    passRate: 0.5,
  },
  {
    id: 'stair-climb-single-flight',
    name: 'Stair climb — single flight',
    status: 'draft',
    description: 'Ascend and descend a single 12-step flight of stairs.',
    robotModel: 'unitree-g1',
    updatedAt: '2026-07-28T10:00:00Z',
    runCount: 9,
    passRate: 0.44,
  },
  {
    id: 'box-pickup-legacy-4kg',
    name: 'Box pickup — legacy 4kg',
    status: 'archived',
    description: 'Superseded by "Box pickup — standard 5kg". Kept for regression history.',
    robotModel: 'unitree-g1',
    updatedAt: '2026-06-02T10:00:00Z',
    runCount: 210,
    passRate: 0.96,
  },
];

/** Fetches the full list of scenarios. */
export const getScenarios = async (): Promise<Scenario[]> => [...MOCK_SCENARIOS];
