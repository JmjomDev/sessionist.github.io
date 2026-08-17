import { useState, useEffect, useCallback, useRef } from 'react';
import { IntroStage } from '../types/intro';
import type { IntroControllerOptions } from '../types/intro';

const DEFAULT_PULSE_DURATION = 1200; // Stage 0 logo breathing pulse duration
const DEFAULT_REVEAL_HOLD_DURATION = 1200; // Stage 1 hold duration with expanded text
const DEFAULT_FADE_OUT_DURATION = 650; // Stage 2 blur fade-out duration
const DEFAULT_APP_REVEAL_DURATION = 750; // Stage 3 bottom-to-top reveal animation duration

export function useIntroController(options: IntroControllerOptions = {}) {
  const {
    onComplete,
    isReady = true,
    pulseDuration = DEFAULT_PULSE_DURATION,
    revealHoldDuration = DEFAULT_REVEAL_HOLD_DURATION,
    fadeOutDuration = DEFAULT_FADE_OUT_DURATION,
    appRevealDuration = DEFAULT_APP_REVEAL_DURATION,
  } = options;

  const [stage, setStage] = useState<IntroStage>(IntroStage.logoPulse);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCurrentTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Skip gesture: Jump directly to complete for instant returning user access
  const skip = useCallback(() => {
    if (!isReady) return; // Wait until Firebase Auth / Data has loaded
    clearCurrentTimer();
    setStage(IntroStage.complete);
  }, [clearCurrentTimer, isReady]);

  // Restart intro manually (e.g. from Settings preview button)
  const restart = useCallback(() => {
    clearCurrentTimer();
    startTimeRef.current = Date.now();
    setStage(IntroStage.logoPulse);
  }, [clearCurrentTimer]);

  useEffect(() => {
    clearCurrentTimer();

    switch (stage) {
      case IntroStage.logoPulse: {
        if (!isReady) {
          // If auth or data is still initializing in the background, hold the breathing pulse animation
          return;
        }

        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, pulseDuration - elapsed);

        timerRef.current = setTimeout(() => {
          setStage(IntroStage.logoSlideTextReveal);
        }, remaining);
        break;
      }

      case IntroStage.logoSlideTextReveal: {
        timerRef.current = setTimeout(() => {
          setStage(IntroStage.fadeOut);
        }, revealHoldDuration);
        break;
      }

      case IntroStage.fadeOut: {
        timerRef.current = setTimeout(() => {
          setStage(IntroStage.appReveal);
        }, fadeOutDuration);
        break;
      }

      case IntroStage.appReveal: {
        timerRef.current = setTimeout(() => {
          setStage(IntroStage.complete);
          if (onComplete) {
            onComplete();
          }
        }, appRevealDuration);
        break;
      }

      case IntroStage.complete:
        break;
    }

    return () => {
      clearCurrentTimer();
    };
  }, [
    stage,
    isReady,
    pulseDuration,
    revealHoldDuration,
    fadeOutDuration,
    appRevealDuration,
    onComplete,
    clearCurrentTimer,
  ]);

  return {
    stage,
    isIntroActive: stage !== IntroStage.complete,
    skip,
    restart,
    setStage,
  };
}
