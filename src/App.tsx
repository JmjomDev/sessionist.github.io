import React, { useState, useEffect } from 'react';
import { StudyProvider, useStudy } from './context/StudyContext';
import { Navbar } from './components/Navbar';
import { DashboardTab } from './components/DashboardTab';
import { LibraryTab } from './components/LibraryTab';
import { NotesTab } from './components/NotesTab';
import { ScheduleTab } from './components/ScheduleTab';
import { SettingsTab } from './components/SettingsTab';
import { OnboardingModal } from './components/OnboardingModal';
import { AuthModal } from './components/AuthModal';
import { UpdateModal } from './components/UpdateModal';
import { ActivationGate } from './components/ActivationGate';
import { AdminPage, ADMIN_UID } from './components/AdminPage';
import { BannedModal } from './components/BannedModal';
import { checkForUpdates, type UpdateInfo } from './config/versionConfig';
import { AppLogoIcon } from './components/AppLogoIcon';
import { CustomCursor } from './components/CustomCursor';
import { useCloudSync } from './hooks/useCloudSync';
import { useActivation } from './hooks/useActivation';
import { useIntroController } from './hooks/useIntroController';
import { IntroOverlay } from './components/intro/IntroOverlay';
import { IntroStage } from './types/intro';
import { HoldToConfirmModal } from './components/HoldToConfirmModal';

import { StatusBar, Style } from '@capacitor/status-bar';
import { requestNotificationPermissions } from './utils/notificationService';

const TAB_TITLES = [
  'Daily Review',
  'Library & Log',
  'Notes',
  'Schedule',
  'Settings',
];

const MainAppContent: React.FC = () => {
  const [activeTab, setActiveTabState] = useState(0);
  const [isSideNavCollapsed, setIsSideNavCollapsed] = useState(false);
  const [tabSlideDirection, setTabSlideDirection] = useState<'left' | 'right' | 'up' | 'down'>('left');

  const {
    config,
    isLoading,
    currentUser,
    setCurrentUser,
    setSyncStatus,
    setLastSyncedAt,
    getCloudPayload,
    restoreFromCloudPayload,
    pendingSubjectFocusName,
    confirmSubjectFocus,
    cancelSubjectFocus,
  } = useStudy();

  const themeMode = config.themeMode || 'light';
  const isDark = themeMode !== 'light';
  const isOled = themeMode === 'oled';
  const isSideNav = config.navPosition === 'side';
  const fontSize = config.fontSize || 'default';

  let accentHex = config.accentColor || '#6366f1';
  if (accentHex === '#000000') {
    accentHex = isOled ? '#ffffff' : isDark ? '#ffffff' : '#0f172a';
  }

  // Conflict modal visibility
  const [showAdmin, setShowAdmin] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState<UpdateInfo | null>(null);

  // Onboarding preview state for real-time cursor & accent tracking
  // Default to light + black accent to match onboarding defaults
  const [onboardingPreviewAccent, setOnboardingPreviewAccent] = useState<string | null>('#0f172a');
  const [onboardingPreviewTheme, setOnboardingPreviewTheme] = useState<'dark' | 'oled' | 'light' | null>('light');

  const activeCustomAccent = onboardingPreviewAccent || accentHex;
  const activeCustomIsDark = onboardingPreviewTheme ? onboardingPreviewTheme !== 'light' : isDark;

  // Activation check — real-time from Firestore
  const { status: activationStatus, activateWithCode } = useActivation(currentUser);

  // Check for app updates on startup
  useEffect(() => {
    checkForUpdates().then((update) => {
      if (update) setAvailableUpdate(update);
    });
  }, []);

  // When user is signed in, reset onboarding preview overrides
  useEffect(() => {
    if (currentUser) {
      setOnboardingPreviewAccent(null);
      setOnboardingPreviewTheme(null);
    }
  }, [currentUser]);

  // Configure Native Mobile Status Bar & Request Notification Permissions
  useEffect(() => {
    try {
      StatusBar.setOverlaysWebView({ overlay: false });
      StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
    } catch {
      // web fallback
    }
    requestNotificationPermissions();
  }, [isDark]);

  // Secret admin page shortcut: Ctrl+Shift+A (only works for developer account UID)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A' && currentUser?.uid === ADMIN_UID) {
        setShowAdmin((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentUser]);

  // Cloud sync hook (Smart Merge enabled)
  const cloudPayload = getCloudPayload();
  const { isAuthReady } = useCloudSync({
    currentData: cloudPayload,
    onCloudData: restoreFromCloudPayload,
    onUserChange: (user) => {
      setCurrentUser(user);
    },
    onSyncStatusChange: setSyncStatus,
    onLastSyncedChange: setLastSyncedAt,
  });

  // Check readiness of auth, local store, and activation status
  const isAppReady = !isLoading && isAuthReady && (!currentUser || activationStatus !== 'checking');

  // Sessionist Intro Animation State Machine Controller (seamlessly handles background loading during welcome)
  const { stage, isIntroActive, skip } = useIntroController({
    autoStart: true,
    isReady: isAppReady,
  });

  const handleTabChange = (newTab: number) => {
    if (newTab !== activeTab) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      setTabSlideDirection(newTab > activeTab ? 'left' : 'right');
      setActiveTabState(newTab);
    }
  };

  const isAppUnlocked = !!currentUser && activationStatus === 'activated' && config.hasCompletedOnboarding;

  // Lock body scroll when app is locked (during auth / activation gate / onboarding / banned screens)
  useEffect(() => {
    if (!isAppUnlocked) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isAppUnlocked]);

  // Dynamic Root Font Size Engine & Theme Body Sync
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.style.transition = 'font-size 0.2s ease-in-out';
    const updateRootFontSize = () => {
      let pxVal = 18;
      if (typeof fontSize === 'number') {
        pxVal = Math.min(26, Math.max(18, fontSize));
      } else if (fontSize === 'large') {
        pxVal = 26;
      } else if (fontSize === 'medium') {
        pxVal = 22;
      } else {
        pxVal = 18;
      }

      const isMobile = window.innerWidth < 640;
      if (isMobile) {
        root.style.fontSize = `${pxVal}px`;
      } else {
        const calculatedRootPx = 16.5 + ((pxVal - 18) / 8) * 7.3;
        root.style.fontSize = `${calculatedRootPx}px`;
      }
    };

    updateRootFontSize();
    window.addEventListener('resize', updateRootFontSize);

    if (themeMode === 'oled') {
      body.style.backgroundColor = '#000000';
    } else if (isDark) {
      body.style.backgroundColor = '#1c1c1f';
    } else {
      body.style.backgroundColor = '#f8fafc';
    }
    return () => {
      window.removeEventListener('resize', updateRootFontSize);
    };
  }, [fontSize, themeMode, isDark]);

  // Ensure app always starts scrolled at the very top (0, 0) after welcome animation or loading
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [stage, isIntroActive, isLoading]);

  const isWhiteOrBlack = !accentHex || accentHex === '#ffffff' || accentHex === '#000000' || accentHex === '#0f172a';
  const glowColor = isWhiteOrBlack ? (isDark ? '#ffffff' : '#0f172a') : accentHex;

  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-hidden no-scrollbar bg-[#0A0A0A]">
      {/* High-Level Root Stack Overlay: IntroView sits on top of MainAppView */}
      {isIntroActive && (
        <IntroOverlay stage={stage} onSkip={skip} allowSkip={isAppReady} accentHex={accentHex} themeMode={themeMode} isDark={isDark} />
      )}

      {/* Main App Dashboard View with Stage 3 Bottom-to-Top App Reveal */}
      <div
        className={`min-h-screen w-full max-w-full overflow-x-hidden no-scrollbar flex flex-col transition-[padding-left] duration-500 ease-in-out ${
          themeMode === 'oled'
            ? 'bg-black text-slate-100'
            : isDark
            ? 'bg-[#1c1c1f] text-zinc-100'
            : 'bg-slate-100/90 text-slate-900'
        } ${isSideNav ? (isSideNavCollapsed ? 'md:pl-20' : 'md:pl-64') : 'md:pl-0'} ${
          stage === IntroStage.appReveal ? 'animate-opal-app-reveal' : ''
        }`}
      >
        {/* Custom Accent Circle Cursor for Fine-Pointer Devices (Laptop/Desktop) */}
        <CustomCursor accentHex={activeCustomAccent} isDark={activeCustomIsDark} />

        {/* Admin Page — Ctrl+Shift+A to toggle */}
        {showAdmin && currentUser && (
          <AdminPage
            currentUid={currentUser.uid}
            accentHex={accentHex}
            isDark={isDark}
            isOled={isOled}
            onClose={() => setShowAdmin(false)}
          />
        )}

        {/* 1. Auth Modal — shown ONLY when auth has finished initializing and user is not signed in */}
        {isAuthReady && !currentUser && (
          <AuthModal
            onDismiss={() => {}}
            accentHex={accentHex}
            isDark={isDark}
            isOled={isOled}
            defaultName={config.userName || ''}
          />
        )}

        {/* Banned Screen — shown when user status is banned */}
        {currentUser && activationStatus === 'banned' && (
          <BannedModal
            currentUser={currentUser}
            isDark={isDark}
            isOled={isOled}
          />
        )}

        {/* 2. Activation Gate — signed in but pending activation */}
        {currentUser && activationStatus === 'pending' && (
          <ActivationGate
            currentUser={currentUser}
            accentHex={accentHex}
            isDark={isDark}
            isOled={isOled}
            onActivate={activateWithCode}
          />
        )}

        {/* 3. Onboarding Setup Wizard — STRICTLY ONLY after entering a correct activation code */}
        {currentUser && activationStatus === 'activated' && !config.hasCompletedOnboarding && (
          <OnboardingModal
            onPreviewAccentChange={(hex) => setOnboardingPreviewAccent(hex)}
            onPreviewThemeChange={(theme) => setOnboardingPreviewTheme(theme)}
          />
        )}

        {/* Main App Content — strictly hidden & non-scrollable until account is activated & onboarding completed */}
        <div
          className={`relative w-full flex-1 flex flex-col transition-opacity duration-700 ${
            isAppUnlocked
              ? 'opacity-100 animate-fade-in'
              : 'opacity-0 pointer-events-none hidden'
          }`}
        >
          {/* Ambient Background Neon Glowing Spots */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden transition-opacity duration-700 z-0">
            <div
              className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[140px] opacity-25 animate-neon-orb-1 transition-all duration-700"
              style={{ backgroundColor: glowColor }}
            />
            <div
              className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full blur-[140px] opacity-20 animate-neon-orb-2 transition-all duration-700"
              style={{ backgroundColor: glowColor }}
            />
          </div>

          {/* Main Container — Cards side padding restored */}
          <div className="relative max-w-4xl w-full mx-auto px-3 sm:px-4 pt-3 sm:pt-6 pb-28 sm:pb-12 flex-1">
            {/* Header Title Bar — Header logo & text shifted to top-left corner */}
            <div
              className={`transition-all duration-500 ease-in-out overflow-hidden transform ${
                !isSideNav ? 'max-h-24 opacity-100 translate-y-0 mb-3 sm:mb-6' : 'max-h-0 opacity-0 -translate-y-4 mb-0'
              }`}
            >
              <header className="-mx-1.5 sm:mx-0 flex items-center justify-between pt-1 pb-2.5 px-1.5 sm:px-6 border-b border-zinc-800/40">
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => {
                      if (currentUser?.uid === ADMIN_UID) setShowAdmin(true);
                    }}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border-[0.25px] shadow-xs transition-all ${
                      currentUser?.uid === ADMIN_UID ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
                    }`}
                    style={{
                      backgroundColor: `${glowColor}20`,
                      borderColor: `${glowColor}40`,
                      color: glowColor,
                    }}
                    title={currentUser?.uid === ADMIN_UID ? 'Open Admin Panel' : undefined}
                  >
                    <AppLogoIcon color={glowColor} className="w-8 h-8 animate-pulse" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black tracking-tight" style={{ fontFamily: "'Quadrillion', sans-serif" }}>
                      {TAB_TITLES[activeTab]}
                    </h1>
                    {config.userName && (
                      <p className={`text-[11px] font-bold ${config.themeMode === 'light' ? 'text-slate-700' : 'text-slate-400'}`}>
                        Welcome back, {config.userName}! 👋
                      </p>
                    )}
                  </div>
                </div>
              </header>
            </div>

            {/* Full-Page Direction-Aware Slide Animation Keyed by activeTab */}
            <main
              key={activeTab}
              className={`w-full max-w-full overflow-x-hidden transition-all duration-300 ${
                tabSlideDirection === 'down'
                  ? 'animate-slide-down-page'
                  : tabSlideDirection === 'up'
                  ? 'animate-slide-up-page'
                  : tabSlideDirection === 'left'
                  ? 'animate-slide-left'
                  : 'animate-slide-right'
              }`}
            >
              {activeTab === 0 && <DashboardTab />}
              {activeTab === 1 && <LibraryTab onNavigateToReview={() => handleTabChange(0)} />}
              {activeTab === 2 && <NotesTab />}
              {activeTab === 3 && <ScheduleTab onNavigateToReview={() => handleTabChange(0)} />}
              {activeTab === 4 && <SettingsTab />}
            </main>
          </div>
        </div>

        {/* Navigation Bar (Side or Bottom) — glides up from bottom after 400ms delay once app unlocks */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          isCollapsed={isSideNavCollapsed}
          onToggleCollapse={() => setIsSideNavCollapsed(!isSideNavCollapsed)}
          isIntroActive={isIntroActive || !isAppUnlocked}
        />

        {/* Update Checker Modal */}
        {availableUpdate && (
          <UpdateModal
            updateInfo={availableUpdate}
            onDismiss={() => setAvailableUpdate(null)}
            accentHex={accentHex}
            isDark={isDark}
            isOled={isOled}
          />
        )}
        {/* Hold to Confirm Subject Focus Modal */}
        {pendingSubjectFocusName && (
          <HoldToConfirmModal
            subjectName={pendingSubjectFocusName}
            onConfirm={() => {
              confirmSubjectFocus();
              handleTabChange(0);
            }}
            onCancel={cancelSubjectFocus}
          />
        )}
      </div>
    </div>
  );
};

export function App() {
  return (
    <StudyProvider>
      <MainAppContent />
    </StudyProvider>
  );
}

export default App;
