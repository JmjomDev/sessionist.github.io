import React, { useEffect, useRef } from 'react';
import liquidGL from 'liquid-gl';

interface LiquidGlassProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  refraction?: number;
  aberration?: number;
  frost?: number;
  tilt?: boolean;
  bevelWidth?: number;
  bevelDepth?: number;
}

export const LiquidGlass: React.FC<LiquidGlassProps> = ({
  children,
  className = '',
  style = {},
  refraction = 0.07,
  aberration = 0.08,
  frost = 0.02,
  tilt = true,
  bevelWidth = 0.20,
  bevelDepth = 0.15,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // On mobile touch devices, bypass WebGL body snapshotting for buttery-smooth native touch scrolling
    const isTouchDevice =
      typeof window !== 'undefined' &&
      (window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches);

    if (isTouchDevice) return;

    try {
      instanceRef.current = liquidGL({
        snapshot: 'body',
        target: containerRef.current,
        resolution: 2.0,
        refraction,
        aberration,
        bevelDepth,
        bevelWidth,
        frost,
        shadow: true,
        specular: true,
        reveal: 'fade',
        tilt,
        tiltFactor: 4,
        tiltEase: 400,
        magnify: 1.0,
      });
    } catch (err) {
      console.warn('LiquidGL initialization fallback:', err);
    }

    return () => {
      if (instanceRef.current && typeof instanceRef.current.destroy === 'function') {
        instanceRef.current.destroy();
      }
    };
  }, [refraction, aberration, frost, tilt, bevelWidth, bevelDepth]);

  return (
    <div
      ref={containerRef}
      className={`liquid-glass-pane relative transition-all duration-300 ${className}`}
      style={style}
    >
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
};
