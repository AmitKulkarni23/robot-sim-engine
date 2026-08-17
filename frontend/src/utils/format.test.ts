import { describe, it, expect } from 'vitest';
import { formatRelativeTime, formatBuildNumber, classifyDelta } from './format';

describe('formatRelativeTime', () => {
  describe('when the timestamp is in the past', () => {
    it('should show "just now" when the timestamp is less than a minute old', () => {
      const now = new Date('2026-08-16T12:00:00Z');
      const timestamp = new Date('2026-08-16T11:59:40Z').toISOString();
      expect(formatRelativeTime(timestamp, now)).toBe('just now');
    });

    it('should show minutes ago when the timestamp is under an hour old', () => {
      const now = new Date('2026-08-16T12:00:00Z');
      const timestamp = new Date('2026-08-16T11:42:00Z').toISOString();
      expect(formatRelativeTime(timestamp, now)).toBe('18 min ago');
    });

    it('should show hours ago when the timestamp is under a day old', () => {
      const now = new Date('2026-08-16T12:00:00Z');
      const timestamp = new Date('2026-08-16T09:00:00Z').toISOString();
      expect(formatRelativeTime(timestamp, now)).toBe('3 hr ago');
    });
  });
});

describe('formatBuildNumber', () => {
  describe('when given a build number', () => {
    it('should prefix the build number with a hash symbol', () => {
      expect(formatBuildNumber(184)).toBe('#184');
    });
  });
});

describe('classifyDelta', () => {
  describe('when the delta percentage is provided', () => {
    it('should classify as "pos" when the value is positive', () => {
      expect(classifyDelta(5.6)).toBe('pos');
    });

    it('should classify as "neg" when the value is negative', () => {
      expect(classifyDelta(-12.8)).toBe('neg');
    });

    it('should classify as "neutral" when the value is zero', () => {
      expect(classifyDelta(0)).toBe('neutral');
    });

    it('should classify as "neutral" when the value is null', () => {
      expect(classifyDelta(null)).toBe('neutral');
    });
  });
});
