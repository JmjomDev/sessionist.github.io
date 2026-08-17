import React, { useEffect, useState } from 'react';

interface CustomCursorProps {
  accentHex: string;
  isDark: boolean;
}

export const CustomCursor: React.FC<CustomCursorProps> = ({ accentHex, isDark }) => {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [trailingPos, setTrailingPos] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isFinePointer, setIsFinePointer] = useState(false);

  useEffect(() => {
    // Detect laptop / desktop fine-pointer devices (mice & trackpads)
    const mediaQuery = window.matchMedia('(pointer: fine)');
    setIsFinePointer(mediaQuery.matches);

    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsFinePointer(e.matches);
    };

    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, []);

  useEffect(() => {
    if (!isFinePointer) return;

    let animId: number;
    let targetX = -100;
    let targetY = -100;
    let currentX = -100;
    let currentY = -100;

    const onMouseMove = (e: MouseEvent | PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      setPos({ x: targetX, y: targetY });

      if (!isVisible) setIsVisible(true);

      // Check if target is an interactive element
      const target = e.target as HTMLElement | null;
      if (target) {
        const isInteractive =
          target.tagName === 'BUTTON' ||
          target.tagName === 'A' ||
          target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA' ||
          target.getAttribute('role') === 'button' ||
          target.classList.contains('cursor-pointer') ||
          target.closest('button') !== null ||
          target.closest('a') !== null;
        setIsHovered(isInteractive);
      }
    };

    const onMouseDown = () => setIsClicked(true);
    const onMouseUp = () => setIsClicked(false);
    const onMouseLeave = () => setIsVisible(false);
    const onMouseEnter = () => setIsVisible(true);

    // Lerp loop for silky-smooth trailing outer circle
    const render = () => {
      currentX += (targetX - currentX) * 0.28;
      currentY += (targetY - currentY) * 0.28;
      setTrailingPos({ x: currentX, y: currentY });
      animId = requestAnimationFrame(render);
    };

    const onScroll = () => {
      if (!isVisible) setIsVisible(true);
    };

    window.addEventListener('mousemove', onMouseMove, { capture: true, passive: true });
    window.addEventListener('pointermove', onMouseMove as EventListener, { capture: true, passive: true });
    window.addEventListener('mousedown', onMouseDown, { capture: true, passive: true });
    window.addEventListener('mouseup', onMouseUp, { capture: true, passive: true });
    window.addEventListener('dragover', onMouseMove as EventListener, { capture: true, passive: true });
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', onMouseMove, { capture: true } as any);
      window.removeEventListener('pointermove', onMouseMove as EventListener, { capture: true } as any);
      window.removeEventListener('mousedown', onMouseDown, { capture: true } as any);
      window.removeEventListener('mouseup', onMouseUp, { capture: true } as any);
      window.removeEventListener('dragover', onMouseMove as EventListener, { capture: true } as any);
      window.removeEventListener('scroll', onScroll, { capture: true } as any);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      cancelAnimationFrame(animId);
    };
  }, [isFinePointer, isVisible]);

  if (!isFinePointer || !isVisible) return null;

  const isBlackVariant = accentHex === '#000000' || accentHex === '#0f172a';
  const glowColor = isBlackVariant ? (isDark ? '#ffffff' : '#0f172a') : accentHex;

  return (
    <>
      {/* Hide native browser cursor unconditionally across all elements and scrollbars on fine-pointer devices */}
      <style>{`
        @media (pointer: fine) {
          *, *::before, *::after, html, body, div, button, input, select, textarea, canvas, svg, a, ::-webkit-scrollbar, ::-webkit-scrollbar-thumb, ::-webkit-scrollbar-track, ::-webkit-scrollbar-corner {
            cursor: none !important;
          }
        }
      `}</style>

      {/* Main Inner Accent Circle */}
      <div
        className="fixed top-0 left-0 z-[999999] pointer-events-none rounded-full transition-transform duration-75 ease-out shadow-sm"
        style={{
          width: isHovered ? '26px' : isClicked ? '16px' : '20px',
          height: isHovered ? '26px' : isClicked ? '16px' : '20px',
          transform: `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) scale(${
            isClicked ? 0.8 : isHovered ? 1.2 : 1
          })`,
          backgroundColor: `${glowColor}30`,
          border: `2px solid ${glowColor}`,
          boxShadow: `0 0 12px ${glowColor}60`,
        }}
      />

      {/* Fluid Trailing Outer Accent Ring */}
      <div
        className="fixed top-0 left-0 z-[999998] pointer-events-none rounded-full transition-all duration-150 ease-out"
        style={{
          width: isHovered ? '42px' : '30px',
          height: isHovered ? '42px' : '30px',
          transform: `translate3d(${trailingPos.x}px, ${trailingPos.y}px, 0) translate(-50%, -50%)`,
          backgroundColor: `${glowColor}12`,
          border: `1.5px solid ${glowColor}45`,
          opacity: isVisible ? 1 : 0,
        }}
      />
    </>
  );
};
