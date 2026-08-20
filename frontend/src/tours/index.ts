import type { DriveStep } from 'driver.js';

export const TOUR_IDS = {
  SIDEBAR: 'sidebar-nav',
  RUNS: 'runs-page',
  SCENARIOS: 'scenarios-page',
  SCENARIO_EDITOR: 'scenario-editor-page',
  FACTORY_FLOOR: 'factory-floor-page',
} as const;

export const sidebarTourSteps: DriveStep[] = [
  {
    element: '[data-tour="sidebar"]',
    popover: {
      title: 'Navigation',
      description: 'Main navigation panel. Access all sections of Robot Sim Engine from here.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="nav-runs"]',
    popover: {
      title: 'Runs',
      description: 'View simulation run history, results, and telemetry data.',
      side: 'right',
    },
  },
  {
    element: '[data-tour="nav-scenarios"]',
    popover: {
      title: 'Scenarios',
      description: 'Browse, create, and manage simulation scenarios.',
      side: 'right',
    },
  },
  {
    element: '[data-tour="nav-factory-floor"]',
    popover: {
      title: 'Factory Floor',
      description: 'Visual map of the MuJoCo simulation environment — objects, zones, and waypoints.',
      side: 'right',
    },
  },
  {
    element: '[data-tour="nav-code-diff"]',
    popover: {
      title: 'Code Diff',
      description: 'Compare scenario versions and code changes side-by-side.',
      side: 'right',
    },
  },
  {
    element: '[data-tour="theme-toggle"]',
    popover: {
      title: 'Theme Toggle',
      description: 'Switch between light and dark mode.',
      side: 'bottom',
    },
  },
];

export const runsTourSteps: DriveStep[] = [
  {
    element: '[data-tour="runs-list"]',
    popover: {
      title: 'Run History',
      description: 'All simulation runs listed here. Click any run to see its details.',
      side: 'right',
    },
  },
  {
    element: '[data-tour="runs-filter"]',
    popover: {
      title: 'Filter Runs',
      description: 'Filter by verdict — show all runs, only passes, or only failures.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="run-detail"]',
    popover: {
      title: 'Run Details',
      description: 'Detailed results for the selected run — metrics, violations, telemetry charts.',
      side: 'left',
    },
  },
];

export const scenariosTourSteps: DriveStep[] = [
  {
    element: '[data-tour="scenarios-filter"]',
    popover: {
      title: 'Filter Scenarios',
      description: 'Filter scenarios by status — published, draft, queued, or archived.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="new-scenario-btn"]',
    popover: {
      title: 'Create Scenario',
      description: 'Create a new simulation scenario with YAML configuration.',
      side: 'left',
    },
  },
  {
    element: '[data-tour="scenarios-list"]',
    popover: {
      title: 'Scenario List',
      description: 'All scenarios shown here. Click to edit, queue, or view details.',
      side: 'top',
    },
  },
];

export const scenarioEditorTourSteps: DriveStep[] = [
  {
    element: '[data-tour="template-select"]',
    popover: {
      title: 'Template Selector',
      description: 'Start from a blank template or load an existing scenario as a starting point.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="yaml-editor"]',
    popover: {
      title: 'YAML Editor',
      description: 'Edit scenario configuration here. Hover over field names for documentation. Defines robot model, task, objects, and randomization.',
      side: 'top',
    },
  },
  {
    element: '[data-tour="save-scenario-btn"]',
    popover: {
      title: 'Save Scenario',
      description: 'Save your scenario. It will be validated and stored for simulation runs.',
      side: 'top',
    },
  },
];

export const factoryFloorTourSteps: DriveStep[] = [
  {
    element: '[data-tour="floor-svg"]',
    popover: {
      title: 'Factory Floor Map',
      description: 'Top-down view of the MuJoCo simulation environment. Hover objects for details. Grid squares = 1 meter.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="floor-legend"]',
    popover: {
      title: 'Legend',
      description: 'Reference for all object types on the floor — tables, shelves, cones, racks, and more.',
      side: 'top',
    },
  },
];
