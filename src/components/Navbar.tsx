import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, BookOpen, FileText, Calendar, Settings, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { AppLogoIcon } from './AppLogoIcon';
import { LiquidGlass } from './LiquidGlass';

interface NavbarProps {
  activeTab: number;
  setActiveTab: (tab: number) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isIntroActive?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed = false,
  onToggleCollapse,
  isIntroActive = false,
}) => {
  const { config } = useStudy();
  const isDark = config.themeMode !== 'light';
  const isOled = config.themeMode === 'oled';
  const isSideNav = config.navPosition === 'side';

  const [showFloatingBar, setShowFloatingBar] = useState(!isIntroActive);

  useEffect(() => {
    if (isIntroActive) {
      setShowFloatingBar(false);
    } else {
      const timer = setTimeout(() => {
        setShowFloatingBar(true);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isIntroActive]);

  let accentHex = config.accentColor || '#6366f1';
  if (accentHex === '#000000') {
    accentHex = isOled ? '#ffffff' : isDark ? '#ffffff' : '#0f172a';
  }

  const userName = config.userName || 'Learner';

  const navItems = [
    { index: 0, label: 'Review', icon: CheckCircle },
    { index: 1, label: 'Library', icon: BookOpen },
    { index: 2, label: 'Notes', icon: FileText },
    { index: 3, label: 'Schedule', icon: Calendar },
    { index: 4, label: 'Settings', icon: Settings },
  ];

  const activeBg = accentHex === '#ffffff' ? (isDark ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.12)') : `${accentHex}20`;
  const activeBorder = accentHex === '#ffffff' ? (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.4)') : `${accentHex}60`;

  const headerTextColor = isDark
    ? (accentHex.toLowerCase() === '#ffffff' || accentHex.toLowerCase() === '#fff' ? '#ffffff' : accentHex)
    : (accentHex.toLowerCase() === '#ffffff' || accentHex.toLowerCase() === '#fff' ? '#0f172a' : accentHex);

  const navRef = useRef<HTMLElement | null>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pillTop, setPillTop] = useState<number>(0);
  const [pillHeight, setPillHeight] = useState<number>(44);

  const bottomNavRef = useRef<HTMLElement | null>(null);
  const bottomButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [bottomPillLeft, setBottomPillLeft] = useState<number>(0);
  const [bottomPillWidth, setBottomPillWidth] = useState<number>(44);
  const [bottomPillHeight, setBottomPillHeight] = useState<number>(44);

  const [isMobileScreen, setIsMobileScreen] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);

  useEffect(() => {
    const updatePillPosition = () => {
      setIsMobileScreen(window.innerWidth < 640);
      const activeBtn = buttonRefs.current[activeTab];
      const navContainer = navRef.current;
      if (activeBtn && navContainer) {
        const btnRect = activeBtn.getBoundingClientRect();
        const navRect = navContainer.getBoundingClientRect();
        setPillTop(btnRect.top - navRect.top);
        setPillHeight(btnRect.height);
      }

      const activeBottomBtn = bottomButtonRefs.current[activeTab];
      const bottomNavContainer = bottomNavRef.current;
      if (activeBottomBtn && bottomNavContainer) {
        const btnRect = activeBottomBtn.getBoundingClientRect();
        const navRect = bottomNavContainer.getBoundingClientRect();
        setBottomPillLeft(btnRect.left - navRect.left);
        setBottomPillWidth(btnRect.width);
        setBottomPillHeight(btnRect.height);
      }
    };

    updatePillPosition();
    const timer = setTimeout(updatePillPosition, 50);
    window.addEventListener('resize', updatePillPosition);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePillPosition);
    };
  }, [activeTab, isCollapsed, isSideNav, showFloatingBar]);

  return (
    <>
      {/* 1. Left Sidebar Container — Apple Glass (visionOS / Liquid Glassmorphism) */}
      <div
        className={`fixed top-0 left-0 h-screen z-50 transition-all duration-300 ease-in-out hidden md:flex flex-col justify-between ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isSideNav ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'
        }`}
      >
        <LiquidGlass
          refraction={0.10}
          aberration={0.09}
          bevelWidth={0.24}
          bevelDepth={0.18}
          frost={0}
          tilt={true}
          className="w-full h-full"
        >
          <aside
            className={`w-full h-full backdrop-blur-3xl transition-all duration-300 ease-in-out flex flex-col justify-between relative ${
              isCollapsed ? 'p-2.5' : 'p-4'
            } ${
              isOled
                ? 'bg-black/20 border-r border-white/25 text-slate-100 shadow-[15px_0_50px_rgba(0,0,0,0.8)]'
                : isDark
                ? 'bg-[#18181b]/25 border-r border-white/20 text-zinc-100 shadow-[15px_0_50px_rgba(0,0,0,0.5)]'
                : 'bg-white/25 border-r border-slate-900/20 text-slate-900 shadow-[15px_0_40px_rgba(31,38,135,0.12)]'
            }`}
          >
            {/* Sidebar Collapse/Expand Handle on the Right Border Line (Only when isSideNav) */}
            {isSideNav && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className={`absolute -right-3.5 top-[24px] z-[60] w-7 h-7 rounded-full border border-white/40 dark:border-white/20 shadow-lg backdrop-blur-2xl flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95 ${
                  isOled
                    ? 'bg-black/90 text-slate-200 hover:bg-slate-900'
                    : isDark
                    ? 'bg-[#27272a] text-slate-200 hover:bg-[#323236]'
                    : 'bg-white/90 text-slate-800 hover:bg-white'
                }`}
                title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              >
                {isCollapsed ? <PanelLeftOpen className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
              </button>
            )}

            <div className="space-y-3">
              {/* Header with clear glass separator line */}
              <div className={`flex items-center pt-2 pb-2 transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'px-2 gap-2.5'}`}>
                <div
                  className="w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 shadow-sm transition-transform hover:scale-105 ml-0.5"
                  style={{ backgroundColor: activeBg, borderColor: activeBorder, color: accentHex }}
                >
                  <AppLogoIcon color={accentHex} className="w-6.5 h-6.5 animate-pulse" />
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0 overflow-hidden whitespace-nowrap">
                    <h2
                      className="text-xs font-black tracking-tight leading-none whitespace-nowrap overflow-hidden text-ellipsis"
                      style={{ color: headerTextColor }}
                    >
                      Welcome back, {userName}! 👋
                    </h2>
                  </div>
                )}
              </div>

              {/* Small Horizontal Separator Line following accent color */}
              <div className="w-full h-[1px] my-3 transition-colors duration-300" style={{ backgroundColor: `${accentHex}45` }} />

              {/* Nav Items List with 60FPS Sliding Active Pill */}
              <div className="pt-1">
                <nav ref={navRef} className="relative flex flex-col gap-2">
                  {/* Sliding Background Pill */}
                  <div
                    className={`absolute rounded-full transition-all duration-300 ease-out pointer-events-none z-0 shadow-lg backdrop-blur-xl ${
                      isCollapsed ? 'left-1/2 -translate-x-1/2 w-11' : 'left-0 right-0'
                    }`}
                    style={{
                      top: 0,
                      height: `${pillHeight}px`,
                      transform: `translateY(${pillTop}px)`,
                      backgroundColor: accentHex === '#ffffff' ? (isDark ? 'rgba(255,255,255,0.22)' : 'rgba(15,23,42,0.12)') : `${accentHex}28`,
                      borderColor: 'transparent',
                      boxShadow: `0 4px 20px ${accentHex}30`,
                    }}
                  />

                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isSelected = activeTab === item.index;

                    return (
                      <button
                        key={item.index}
                        ref={(el) => { buttonRefs.current[item.index] = el; }}
                        onClick={() => setActiveTab(item.index)}
                        title={isCollapsed ? item.label : undefined}
                        className={`relative z-10 flex items-center gap-3 h-11 rounded-full text-xs font-bold transition-colors duration-300 cursor-pointer select-none border border-transparent ${
                          isCollapsed ? 'w-11 justify-center mx-auto' : 'w-full px-4'
                        } ${
                          isSelected
                            ? 'font-black scale-[1.02]'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-white/10 hover:scale-[1.02] active:scale-95'
                        } ${
                          !isSelected && !isDark ? 'text-slate-700 hover:text-slate-950 hover:bg-black/5' : ''
                        }`}
                        style={isSelected ? { color: headerTextColor } : {}}
                      >
                        <Icon className={`w-5 h-5 shrink-0 transition-transform duration-300 ${isSelected ? 'scale-115' : ''}`} style={isSelected ? { color: headerTextColor } : {}} />
                        {!isCollapsed && <span className="animate-fade-in truncate">{item.label}</span>}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          </aside>
        </LiquidGlass>
      </div>

      {/* 2. Floating Bottom Navigation Bar — Apple Glass with Sliding Active Pill */}
      <div
        className={`fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] inset-x-0 z-[9999] flex justify-center px-2 pointer-events-none transition-all duration-700 ease-out transform ${
          !isSideNav && showFloatingBar
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-16'
        }`}
      >
        <LiquidGlass
          refraction={0.10}
          aberration={0.09}
          bevelWidth={0.24}
          bevelDepth={0.18}
          frost={0}
          tilt={true}
        >
          <nav
            ref={bottomNavRef}
            className={`pointer-events-auto flex items-center gap-1 p-1 rounded-full backdrop-blur-md max-sm:backdrop-blur-none relative border max-w-[96vw] transition-all duration-300 ${
              isOled
                ? 'bg-black/12 border-white/30 text-slate-100 shadow-[0_25px_60px_rgba(0,0,0,0.8),inset_0_1.5px_1px_rgba(255,255,255,0.45)] max-sm:bg-black max-sm:border-2 max-sm:border-zinc-700 max-sm:shadow-2xl'
                : isDark
                ? 'bg-[#18181b]/15 border-white/25 text-zinc-100 shadow-[0_25px_60px_rgba(0,0,0,0.6),inset_0_1.5px_1px_rgba(255,255,255,0.4)] max-sm:bg-[#18181b] max-sm:border-2 max-sm:border-zinc-600 max-sm:shadow-2xl'
                : 'bg-white/18 border-slate-900/20 text-slate-900 shadow-[0_20px_40px_rgba(0,0,0,0.1),inset_0_1.5px_1px_rgba(255,255,255,0.9)] max-sm:bg-white max-sm:border-2 max-sm:border-slate-400 max-sm:shadow-2xl'
            }`}
          >
            {/* 60FPS Fluid Sliding Active Background Pill */}
            {(() => {
              if (isMobileScreen) {
                // Phone Mobile: Full solid color / high-contrast black & white
                const isWhiteOrBlackAccent = !accentHex || accentHex.toLowerCase() === '#ffffff' || accentHex.toLowerCase() === '#000000' || accentHex.toLowerCase() === '#0f172a';
                const phonePillBg = isWhiteOrBlackAccent ? (isDark ? '#ffffff' : '#0f172a') : accentHex;
                const phonePillShadow = isWhiteOrBlackAccent
                  ? (isDark ? '0 4px 20px rgba(255,255,255,0.35)' : '0 4px 20px rgba(15,23,42,0.35)')
                  : `0 4px 20px ${accentHex}50`;

                return (
                  <div
                    className="absolute rounded-full transition-all duration-300 ease-out pointer-events-none z-0 shadow-lg"
                    style={{
                      left: `${bottomPillLeft}px`,
                      width: `${bottomPillWidth}px`,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      height: `${bottomPillHeight}px`,
                      backgroundColor: phonePillBg,
                      boxShadow: phonePillShadow,
                    }}
                  />
                );
              } else {
                // PC Desktop: Accent Tinting & Glassmorphism
                const pcPillBg = accentHex === '#ffffff' ? (isDark ? 'rgba(255,255,255,0.22)' : 'rgba(15,23,42,0.12)') : `${accentHex}35`;
                const pcPillShadow = `0 4px 20px ${accentHex}40`;

                return (
                  <div
                    className="absolute rounded-full transition-all duration-300 ease-out pointer-events-none z-0 shadow-lg backdrop-blur-xl"
                    style={{
                      left: `${bottomPillLeft}px`,
                      width: `${bottomPillWidth}px`,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      height: `${bottomPillHeight}px`,
                      backgroundColor: pcPillBg,
                      boxShadow: pcPillShadow,
                    }}
                  />
                );
              }
            })()}

            {navItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.index;
              const isWhiteOrBlackAccent = !accentHex || accentHex.toLowerCase() === '#ffffff' || accentHex.toLowerCase() === '#000000' || accentHex.toLowerCase() === '#0f172a';
              const mobileTextColor = isWhiteOrBlackAccent ? (isDark ? '#0f172a' : '#ffffff') : '#ffffff';
              const activeTextColor = isMobileScreen ? mobileTextColor : headerTextColor;

              return (
                <button
                  key={item.index}
                  ref={(el) => { bottomButtonRefs.current[item.index] = el; }}
                  onClick={() => setActiveTab(item.index)}
                  title={item.label}
                  className={`h-10 relative z-10 flex items-center justify-center transition-colors duration-300 ease-out cursor-pointer select-none border-0 ${
                    isSelected
                      ? 'px-3.5 rounded-full font-black scale-[1.02] gap-2'
                      : 'w-10 rounded-full text-slate-400 hover:text-slate-100 hover:scale-105 active:scale-95'
                  } ${
                    !isSelected && !isDark ? 'text-slate-700 hover:text-slate-950' : ''
                  }`}
                  style={isSelected ? { color: activeTextColor } : {}}
                >
                  <Icon className={`w-5 h-5 shrink-0 transition-transform duration-300 ${isSelected ? 'scale-110' : ''}`} style={isSelected ? { color: activeTextColor } : {}} />
                  {isSelected && (
                    <span className="whitespace-nowrap animate-fade-in text-xs font-black tracking-tight" style={{ color: activeTextColor }}>{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </LiquidGlass>
      </div>
    </>
  );
};
