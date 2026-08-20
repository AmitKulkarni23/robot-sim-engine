import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTour, resetTour, resetAllTours } from './useTour';

vi.mock('driver.js', () => {
  const mockInstance = {
    drive: vi.fn(),
    destroy: vi.fn(),
  };
  return {
    driver: vi.fn((config: Record<string, unknown>) => {
      (mockInstance as Record<string, unknown>)._config = config;
      return mockInstance;
    }),
  };
});

vi.mock('driver.js/dist/driver.css', () => ({}));

const { driver: mockDriverFactory } = await import('driver.js');

function getMockInstance() {
  const calls = vi.mocked(mockDriverFactory).mock.results;
  return calls[calls.length - 1]?.value as { drive: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn>; _config: Record<string, unknown> };
}

function createMockStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
}

describe('useTour', () => {
  let mockStorage: Storage;

  beforeEach(() => {
    mockStorage = createMockStorage();
    Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true, configurable: true });
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('when tour has not been completed before', () => {
    it('should report isCompleted as false', () => {
      const { result } = renderHook(() =>
        useTour({ tourId: 'test-tour', steps: [], autoStart: false })
      );
      expect(result.current.isCompleted).toBe(false);
    });

    it('should auto-start tour after delay when autoStart is true and element exists', () => {
      const element = document.createElement('div');
      element.setAttribute('data-tour', 'test-el');
      document.body.appendChild(element);

      renderHook(() =>
        useTour({
          tourId: 'test-tour',
          steps: [{ element: '[data-tour="test-el"]', popover: { title: 'Hi', description: 'Desc' } }],
          autoStart: true,
          autoStartDelay: 500,
        })
      );

      expect(mockDriverFactory).not.toHaveBeenCalled();
      act(() => { vi.advanceTimersByTime(500); });
      expect(mockDriverFactory).toHaveBeenCalled();
      expect(getMockInstance().drive).toHaveBeenCalled();

      document.body.removeChild(element);
    });

    it('should not auto-start when element selector does not match DOM', () => {
      renderHook(() =>
        useTour({
          tourId: 'test-tour',
          steps: [{ element: '[data-tour="nonexistent"]', popover: { title: 'Hi', description: 'Desc' } }],
          autoStart: true,
          autoStartDelay: 100,
        })
      );

      act(() => { vi.advanceTimersByTime(100); });
      expect(mockDriverFactory).not.toHaveBeenCalled();
    });
  });

  describe('when tour has been completed before', () => {
    it('should report isCompleted as true', () => {
      localStorage.setItem('tour_completed_test-tour', 'true');
      const { result } = renderHook(() =>
        useTour({ tourId: 'test-tour', steps: [], autoStart: false })
      );
      expect(result.current.isCompleted).toBe(true);
    });

    it('should not auto-start when tour was already completed', () => {
      localStorage.setItem('tour_completed_test-tour', 'true');
      renderHook(() =>
        useTour({
          tourId: 'test-tour',
          steps: [{ popover: { title: 'Hi', description: 'Desc' } }],
          autoStart: true,
          autoStartDelay: 100,
        })
      );

      act(() => { vi.advanceTimersByTime(100); });
      expect(mockDriverFactory).not.toHaveBeenCalled();
    });
  });

  describe('when startTour is called manually', () => {
    it('should create and drive a new tour instance', () => {
      const { result } = renderHook(() =>
        useTour({
          tourId: 'manual-tour',
          steps: [{ popover: { title: 'Step 1', description: 'Desc' } }],
          autoStart: false,
        })
      );

      act(() => { result.current.startTour(); });
      expect(mockDriverFactory).toHaveBeenCalled();
      expect(getMockInstance().drive).toHaveBeenCalled();
    });

    it('should mark tour completed in localStorage when driver is destroyed', () => {
      const { result } = renderHook(() =>
        useTour({
          tourId: 'complete-tour',
          steps: [{ popover: { title: 'Step 1', description: 'Desc' } }],
          autoStart: false,
        })
      );

      act(() => { result.current.startTour(); });
      const config = getMockInstance()._config as { onDestroyed?: () => void };
      act(() => { config.onDestroyed?.(); });
      expect(localStorage.getItem('tour_completed_complete-tour')).toBe('true');
    });
  });

  describe('when reset is called', () => {
    it('should remove completed state from localStorage', () => {
      localStorage.setItem('tour_completed_reset-tour', 'true');
      const { result } = renderHook(() =>
        useTour({ tourId: 'reset-tour', steps: [], autoStart: false })
      );

      act(() => { result.current.reset(); });
      expect(localStorage.getItem('tour_completed_reset-tour')).toBeNull();
    });
  });

  describe('when resetTour utility is called', () => {
    it('should clear specific tour from localStorage', () => {
      localStorage.setItem('tour_completed_my-tour', 'true');
      resetTour('my-tour');
      expect(localStorage.getItem('tour_completed_my-tour')).toBeNull();
    });
  });

  describe('when resetAllTours is called', () => {
    it('should clear all tour entries from localStorage while keeping unrelated keys', () => {
      localStorage.setItem('tour_completed_tour-a', 'true');
      localStorage.setItem('tour_completed_tour-b', 'true');
      localStorage.setItem('unrelated_key', 'keep');
      resetAllTours();
      expect(localStorage.getItem('tour_completed_tour-a')).toBeNull();
      expect(localStorage.getItem('tour_completed_tour-b')).toBeNull();
      expect(localStorage.getItem('unrelated_key')).toBe('keep');
    });
  });
});
