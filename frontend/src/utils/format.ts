import type { DeltaDirection } from '@/types/run';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Formats an ISO timestamp as a short relative time string, e.g. "18 min ago".
 */
export const formatRelativeTime = (isoTimestamp: string, now: Date = new Date()): string => {
  const diffMs = now.getTime() - new Date(isoTimestamp).getTime();

  if (diffMs < MINUTE_MS) return 'just now';
  if (diffMs < HOUR_MS) return `${Math.floor(diffMs / MINUTE_MS)} min ago`;
  if (diffMs < DAY_MS) return `${Math.floor(diffMs / HOUR_MS)} hr ago`;
  return `${Math.floor(diffMs / DAY_MS)} d ago`;
};

/** Formats a build number with a leading hash, e.g. 184 -> "#184". */
export const formatBuildNumber = (buildNumber: number): string => `#${buildNumber}`;

/** Classifies a delta percentage into a direction for coloring. */
export const classifyDelta = (deltaPct: number | null): DeltaDirection => {
  if (deltaPct === null || deltaPct === 0) return 'neutral';
  return deltaPct > 0 ? 'pos' : 'neg';
};
