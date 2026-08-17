import React from 'react';
import { IntroStage } from '../../types/intro';
import { AppLogoIcon } from '../AppLogoIcon';
import quadrillionFontUrl from 'C:/Users/gamal/Downloads/quadrillion/Quadrillion Sb.otf?url';

interface IntroOverlayProps {
  stage: IntroStage;
  onSkip: () => void;
  allowSkip?: boolean;
  accentHex?: string;
  themeMode?: string;
  isDark?: boolean;
}

/**
 * Custom High-End App Intro View & Sequence for "Sessionist"
 * Inspired by the Opal App Intro animation sequence.
 */
export const IntroOverlay: React.FC<IntroOverlayProps> = ({
  stage,
  onSkip,
  allowSkip = true,
  accentHex = '#6366f1',
  themeMode = 'dark',
  isDark = true,
}) => {
  // Inject custom Quadrillion font dynamically via Vite bundled asset URL
  React.useEffect(() => {
    const styleId = 'quadrillion-font-style';
    if (!document.getElementById(styleId)) {
      const fontStyle = document.createElement('style');
      fontStyle.id = styleId;
      fontStyle.textContent = `
        @font-face {
          font-family: 'Quadrillion';
          src: url('${quadrillionFontUrl}') format('opentype');
          font-weight: normal;
          font-style: normal;
        }
      `;
      document.head.appendChild(fontStyle);
    }
  }, []);

  // Force window scroll to top during intro sequence
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [stage]);

  // If intro finished completely, unmount overlay
  if (stage === IntroStage.complete) {
    return null;
  }

  const isSlideTextStage =
    stage === IntroStage.logoSlideTextReveal ||
    stage === IntroStage.fadeOut ||
    stage === IntroStage.appReveal;

  const isFadeOutStage = stage === IntroStage.fadeOut;
  const isAppRevealStage = stage === IntroStage.appReveal;

  const isOled = themeMode === 'oled';
  const isLight = !isDark && !isOled;

  const isWhiteOrBlack = !accentHex || accentHex === '#ffffff' || accentHex === '#000000' || accentHex === '#0f172a';
  const activeAccent = isWhiteOrBlack ? (isLight ? '#0f172a' : '#ffffff') : accentHex;

  return (
    <div
      onClick={() => {
        if (allowSkip) onSkip();
      }}
      aria-label="Skip Intro Sequence"
      role="button"
      tabIndex={0}
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden select-none transition-opacity duration-700 ${
        allowSkip ? 'cursor-pointer' : 'cursor-default'
      } ${
        isOled ? 'bg-black text-slate-100' : isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0A0A0A] text-slate-100'
      } ${isAppRevealStage ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      {/* Subtle Ambient Radial Backlight */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div
          className="w-[450px] h-[450px] rounded-full blur-[130px] opacity-25 transition-all duration-1000 transform scale-125 animate-pulse"
          style={{ backgroundColor: activeAccent }}
        />
      </div>

      {/* Main Intro Stage Wrapper */}
      <div
        className={`relative flex items-center justify-center transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) ${
          isFadeOutStage ? 'animate-opal-blur-fade-out' : ''
        }`}
      >
        {/* Opal-Style Combined Logo + Text Layout Container */}
        <div className="relative flex items-center justify-center transition-all duration-800 cubic-bezier(0.16, 1, 0.3, 1) transform">
          {/* Outline "S" Icon Container (Positioned on top z-20 so text slides out from behind it) */}
          <div
            className={`relative z-20 flex items-center justify-center shrink-0 transition-all duration-800 cubic-bezier(0.16, 1, 0.3, 1) ${
              stage === IntroStage.logoPulse ? 'animate-opal-logo-pulse' : ''
            }`}
          >
            <AppLogoIcon
              color={activeAccent}
              useNewOutline={false}
              className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 relative z-20"
              style={{
                filter: `drop-shadow(0 0 25px ${activeAccent}aa)`,
              }}
            />
          </div>

          {/* Typography Text "ESSIONIST" (Physically slides OUT from left to right behind the S logo) */}
          <div
            className={`relative z-10 flex items-center overflow-hidden transition-all duration-800 cubic-bezier(0.16, 1, 0.3, 1) ${
              isSlideTextStage
                ? 'max-w-[75vw] sm:max-w-[500px] opacity-100 ml-1 sm:ml-1.5'
                : 'max-w-0 opacity-0 ml-0'
            }`}
          >
            <span
              className={`font-black text-2xl sm:text-4xl md:text-5xl tracking-[0.02em] uppercase whitespace-nowrap drop-shadow-lg transition-all duration-800 cubic-bezier(0.16, 1, 0.3, 1) ${
                isSlideTextStage ? 'translate-x-0 opacity-100' : 'translate-x-[-100%] opacity-0'
              }`}
              style={{
                fontFamily: "'Quadrillion', sans-serif",
                color: isLight ? '#0f172a' : '#ffffff',
              }}
            >
              essionist
            </span>
          </div>
        </div>
      </div>

      {/* Subtle Skip Gesture Hint */}
      <div
        className={`absolute bottom-8 sm:bottom-12 transition-all duration-500 ${
          isAppRevealStage ? 'opacity-0 translate-y-4' : 'opacity-40 hover:opacity-80'
        }`}
      >
        <p className={`text-[11px] font-bold tracking-[0.2em] uppercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          Tap anywhere to skip
        </p>
      </div>
    </div>
  );
};
