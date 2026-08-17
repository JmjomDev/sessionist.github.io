/**
 * Sessionist App Intro Stages (Inspired by Opal App Intro)
 */
export const IntroStage = {
  /** Stage 0: Gentle breathing pulse of the S logo on dark background (#0A0A0A) */
  logoPulse: 'logoPulse',
  /** Stage 1: Logo slides left & "essionist" text expands/fades in to form balanced centered logo+text */
  logoSlideTextReveal: 'logoSlideTextReveal',
  /** Stage 2: Gaussian blur fade-out of combined logo + text */
  fadeOut: 'fadeOut',
  /** Stage 3: Overlay slides bottom-to-top while main app dashboard reveals upward with spring curve */
  appReveal: 'appReveal',
  /** Stage 4: Intro sequence complete, overlay unmounted */
  complete: 'complete',
} as const;

export type IntroStage = (typeof IntroStage)[keyof typeof IntroStage];

export interface IntroControllerOptions {
  autoStart?: boolean;
  onComplete?: () => void;
  /** Duration (ms) for Stage 0 (logo pulse) before auto-advancing to Stage 1 */
  pulseDuration?: number;
  /** Duration (ms) for Stage 1 (logo slide + text reveal) hold time before auto-advancing to Stage 2 */
  revealHoldDuration?: number;
  /** Duration (ms) for Stage 2 (blur fade-out) before auto-advancing to Stage 3 */
  fadeOutDuration?: number;
  /** Duration (ms) for Stage 3 (app reveal transition) before completing */
  appRevealDuration?: number;
  /** Optional readiness gate (e.g. auth & cloud sync loaded) before advancing from logoPulse */
  isReady?: boolean;
}
