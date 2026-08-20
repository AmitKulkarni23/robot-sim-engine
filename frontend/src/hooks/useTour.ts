import { useCallback, useEffect, useRef } from 'react';
import { driver, type DriveStep, type Config, type PopoverDOM } from 'driver.js';
import 'driver.js/dist/driver.css';

const STORAGE_KEY_PREFIX = 'tour_completed_';

function isTourCompleted(tourId: string): boolean {
  try {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}${tourId}`) === 'true';
  } catch {
    return false;
  }
}

function markTourCompleted(tourId: string): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${tourId}`, 'true');
  } catch {
    // localStorage unavailable — silently skip
  }
}

export function resetTour(tourId: string): void {
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${tourId}`);
  } catch {
    // noop
  }
}

export function resetAllTours(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY_PREFIX)) keys.push(key);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // noop
  }
}

type UseTourOptions = {
  tourId: string;
  steps: DriveStep[];
  autoStart?: boolean;
  autoStartDelay?: number;
  driverConfig?: Partial<Config>;
};

export function useTour({ tourId, steps, autoStart = true, autoStartDelay = 500, driverConfig }: UseTourOptions) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  const startTour = useCallback(() => {
    if (driverRef.current) {
      driverRef.current.destroy();
    }

    const instance = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayColor: 'rgba(0, 0, 0, 0.6)',
      stagePadding: 8,
      stageRadius: 8,
      popoverClass: 'rse-tour-popover',
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Finish',
      ...driverConfig,
      steps,
      onPopoverRender: (popover: PopoverDOM, opts) => {
        const skipBtn = document.createElement('button');
        skipBtn.textContent = 'Skip Tutorial';
        skipBtn.className = 'rse-tour-skip-btn';
        Object.assign(skipBtn.style, {
          background: 'none',
          border: 'none',
          color: '#888',
          fontSize: '12px',
          cursor: 'pointer',
          padding: '4px 0',
          textDecoration: 'underline',
        });
        skipBtn.addEventListener('click', () => {
          instance.destroy();
        });
        popover.footer.insertBefore(skipBtn, popover.footer.firstChild);
        driverConfig?.onPopoverRender?.(popover, opts);
      },
      onDestroyed: (...args) => {
        markTourCompleted(tourId);
        driverConfig?.onDestroyed?.(...args);
      },
    });

    driverRef.current = instance;
    instance.drive();
  }, [tourId, steps, driverConfig]);

  useEffect(() => {
    if (!autoStart || isTourCompleted(tourId) || steps.length === 0) return;

    const timer = setTimeout(() => {
      const firstStep = steps[0];
      const selector = firstStep?.element;
      if (typeof selector === 'string' && !document.querySelector(selector)) return;
      startTour();
    }, autoStartDelay);

    return () => clearTimeout(timer);
  }, [tourId, autoStart, autoStartDelay, steps, startTour]);

  useEffect(() => {
    return () => {
      driverRef.current?.destroy();
    };
  }, []);

  return {
    startTour,
    isCompleted: isTourCompleted(tourId),
    reset: () => resetTour(tourId),
  };
}
