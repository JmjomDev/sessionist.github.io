import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import {
  Moon,
  MoonStar,
  Sun,
  Check,
  RefreshCw,
  Layout,
  Palette,
  User,
  Database,
  ShieldAlert,
  Sparkles,
  Brain,
  Clock,
  AlertTriangle,
  Type,
  Cloud,
  PanelBottom,
  PanelLeft,
  Loader2,
  LogOut,
  Key,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useStudy } from '../context/StudyContext';
import { CustomSelect } from './CustomSelect';
import { getNotificationPermissionState, requestNotificationPermissions } from '../utils/notificationService';
import { AccountCard } from './AccountCard';
import { GeminiApiKeyModal } from './GeminiApiKeyModal';
import { getAccentStyle } from '../utils/themeUtils';
import { CURRENT_VERSION, checkForUpdates, type UpdateInfo } from '../config/versionConfig';

const PRESET_ACCENTS = [
  { name: 'Black / White', hex: '#ffffff' },
  { name: 'Teal', hex: '#0891b2' },
  { name: 'Royal Blue', hex: '#334ACA' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Amber', hex: '#f59e0b' },
];

interface SettingsTabProps {
  onShowAuthModal?: () => void;
  onShowUpdateModal?: (update: UpdateInfo) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ onShowAuthModal, onShowUpdateModal }) => {
  const {
    config,
    updateThemeMode,
    updateAccentColor,
    updateUserName,
    updateNavPosition,
    updateFontSize,
    updateAlgoMode,
    updateFixedDays,
    updateWeeklyRestDay,
    updateGeminiApiKey,
    resetLocalDataOnly,
    currentUser,
    syncStatus,
    lastSyncedAt,
    setCurrentUser,
  } = useStudy();

  const isDark = config.themeMode !== 'light';
  const isOled = config.themeMode === 'oled';

  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const [weekendDay, setWeekendDay] = useState<string>(
    config.weeklyRestDay || 'none'
  );

  let accentHex = config.accentColor || '#6366f1';
  if (accentHex === '#ffffff' || accentHex === '#000000') {
    accentHex = isDark ? '#ffffff' : '#0f172a';
  }
  const isWhiteAccent = accentHex === '#ffffff';

  const [nameInput, setNameInput] = useState(config.userName || '');
  const [fixedDaysInput, setFixedDaysInput] = useState({
    hard: config.fixedHard,
    good: config.fixedGood,
    easy: config.fixedEasy,
  });

  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatusMsg, setUpdateStatusMsg] = useState<string | null>(null);
  const [notifPermissionStatus, setNotifPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  React.useEffect(() => {
    getNotificationPermissionState().then(setNotifPermissionStatus);
  }, []);

  const handleRequestNotifPermission = async () => {
    const granted = await requestNotificationPermissions();
    setNotifPermissionStatus(granted ? 'granted' : 'denied');
    if (granted) {
      showToast('✓ Local Push Notifications Enabled!');
    } else {
      showToast('⚠️ Notification permissions denied in phone settings.');
    }
  };

  const handleManualUpdateCheck = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatusMsg(null);
    const update = await checkForUpdates();
    setIsCheckingUpdate(false);
    if (update) {
      onShowUpdateModal?.(update);
    } else {
      setUpdateStatusMsg('✓ You are on the latest version of Sessionist!');
      setTimeout(() => setUpdateStatusMsg(null), 4500);
    }
  };

  // Sub-menu tabs
  const [settingsMenu, setSettingsMenu] = useState<'theme' | 'account'>('theme');



  // 2-Step / 3-Step Reset Warning States
  const [showResetWarning1, setShowResetWarning1] = useState(false);
  const [showResetWarning2, setShowResetWarning2] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');

  // Step 3 Cloud Reset Warning State (for logged-in users)
  const [showCloudResetWarning, setShowCloudResetWarning] = useState(false);
  const [cloudResetConfirmInput, setCloudResetConfirmInput] = useState('');
  const [isWipingCloud, setIsWipingCloud] = useState(false);
  const [activeAlgoTooltip, setActiveAlgoTooltip] = useState<'smart' | 'fixed' | null>(null);
  const [algoTooltipPos, setAlgoTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  const handleInfoClick = (type: 'smart' | 'fixed', e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (activeAlgoTooltip === type) {
      setActiveAlgoTooltip(null);
      setAlgoTooltipPos(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const tooltipWidth = 260;
      const left = Math.max(16, Math.min(rect.left - tooltipWidth / 2 + 8, window.innerWidth - tooltipWidth - 16));
      const top = Math.max(16, rect.top - 110);
      setAlgoTooltipPos({ top, left });
      setActiveAlgoTooltip(type);
    }
  };



  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserName(nameInput);
    showToast('User name updated!');
  };

  const handleSaveFixedDays = (e: React.FormEvent) => {
    e.preventDefault();
    updateFixedDays({
      hard: Math.max(1, fixedDaysInput.hard),
      good: Math.max(1, fixedDaysInput.good),
      easy: Math.max(1, fixedDaysInput.easy),
    });
    showToast('Fixed interval days saved!');
  };

  // 2-Step / 3-Step Reset Workflow
  const handleFirstResetConfirm = () => {
    setShowResetWarning1(false);
    setShowResetWarning2(true);
    setResetConfirmInput('');
  };

  const handleFinalResetConfirm = async () => {
    if (resetConfirmInput.trim().toUpperCase() !== 'DELETE') {
      showToast("Please type 'DELETE' to confirm.");
      return;
    }

    setIsWipingCloud(true);
    try {
      if (currentUser?.uid) {
        await setDoc(
          doc(db, 'users', currentUser.uid),
          {
            studyData: [],
            examData: [],
            subjectReviewsData: [],
            subjectsData: [],
            restDaysData: [],
            totalReviewsCount: 0,
            algoMode: 'smart',
            fixedDays: { easy: 7, medium: 3, hard: 1 },
            lastModified: serverTimestamp(),
          },
          { merge: true }
        );
      }
      resetLocalDataOnly();
      setShowResetWarning2(false);
      setResetConfirmInput('');
      showToast('All account cloud data has been reset!');
    } catch (err) {
      console.error('Failed to wipe cloud account data:', err);
      resetLocalDataOnly();
      setShowResetWarning2(false);
      showToast('Local data reset!');
    } finally {
      setIsWipingCloud(false);
    }
  };

  const handleSignOutDeviceResetOnly = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Error signing out during reset', e);
    } finally {
      setShowCloudResetWarning(false);
      resetLocalDataOnly();
      showToast('Signed out & local device data cleared!');
    }
  };

  const handleWipeCloudAndResetLocal = async () => {
    if (cloudResetConfirmInput.trim().toUpperCase() !== 'DELETE CLOUD') {
      showToast("Please type 'DELETE CLOUD' to confirm.");
      return;
    }
    setIsWipingCloud(true);
    try {
      if (currentUser?.uid) {
        await setDoc(
          doc(db, 'users', currentUser.uid),
          {
            studyData: [],
            examData: [],
            subjectReviewsData: [],
            subjectsData: [],
            restDaysData: [],
            totalReviewsCount: 0,
            algoMode: 'smart',
            lastModified: serverTimestamp(),
          },
          { merge: true } // PRESERVE isActivated, activationCode, email, displayName!
        );
      }
    } catch (e) {
      console.error('Error wiping cloud data', e);
    } finally {
      setIsWipingCloud(false);
      setShowCloudResetWarning(false);
      setCloudResetConfirmInput('');
      resetLocalDataOnly();
      showToast('✨ Account study data reset! Fresh workspace ready.');
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {toastMessage &&
        ReactDOM.createPortal(
          <div
            className="fixed bottom-28 sm:bottom-24 left-1/2 -translate-x-1/2 z-[100001] px-5 py-3 max-w-[90vw] w-max rounded-[28px] text-xs font-black shadow-2xl border border-white/25 backdrop-blur-2xl animate-pop-in select-none pointer-events-none flex items-center justify-center gap-2 text-center break-words leading-relaxed"
            style={{ backgroundColor: accentHex, color: isWhiteAccent ? '#0f172a' : '#ffffff' }}
          >
            <span>{toastMessage}</span>
          </div>,
          document.body
        )}

      {/* ── Sub-menu Tab Switcher ── */}
      <div className={`relative h-12 p-1.5 flex gap-1.5 items-center rounded-full select-none ${isOled ? 'bg-black border border-zinc-800' : isDark ? 'bg-[#27272a]/80 border border-zinc-700/60' : 'bg-slate-100 border border-slate-200'}`}>
        {/* 60FPS Fluid Sliding Active Background Pill */}
        <div
          className="absolute h-9 rounded-full transition-all duration-300 ease-out pointer-events-none z-0 shadow-md"
          style={{
            left: settingsMenu === 'theme' ? '6px' : 'calc(50% + 3px)',
            width: 'calc(50% - 9px)',
            ...getAccentStyle(accentHex, isDark),
          }}
        />

        {[
          { id: 'theme' as const, label: 'Personalization', icon: Palette },
          { id: 'account' as const, label: 'Account & Data', icon: Cloud },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = settingsMenu === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSettingsMenu(tab.id)}
              className={`relative z-10 flex-1 h-9 rounded-full text-xs font-extrabold transition-colors duration-300 cursor-pointer flex items-center justify-center gap-2 select-none ${
                isActive
                  ? isWhiteAccent
                    ? isDark ? 'text-slate-900 font-black' : 'text-slate-100 font-black'
                    : 'text-white font-black'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Animated Tab Content Container */}
      <div key={settingsMenu} className={settingsMenu === 'account' ? 'animate-slide-left space-y-6' : 'animate-slide-right space-y-6'}>
        {/* Compact Notification Warning Banner — shown ONLY when push notifications are disabled */}
        {notifPermissionStatus !== 'granted' && (
          <div className="px-4 py-2.5 rounded-2xl border border-amber-500/40 bg-amber-500/15 text-amber-300 text-xs font-semibold flex items-center justify-between gap-3 animate-fade-in shadow-md">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span className="truncate">
                Push Notifications Disabled. Enable permissions in phone settings so exam reminders work properly.
              </span>
            </div>
            <button
              type="button"
              onClick={handleRequestNotifPermission}
              className="px-3 py-1 rounded-xl text-[11px] font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shrink-0 cursor-pointer active:scale-95 transition-all"
            >
              Enable Alerts
            </button>
          </div>
        )}

        {settingsMenu === 'account' ? (
          <>
            {/* 1. Account & Cloud Sync Card */}
            <AccountCard
              user={currentUser ? {
                email: currentUser.email || '',
                displayName: config.userName || currentUser.email?.split('@')[0] || '',
                uid: currentUser.uid,
              } : null}
              syncStatus={syncStatus}
              lastSyncedAt={lastSyncedAt}
              accentHex={accentHex}
              isDark={isDark}
              isOled={isOled}
              onSignInClick={() => onShowAuthModal?.()}
              onSignOut={() => setCurrentUser(null)}
            />

            {/* 2. Gemini AI Flashcards Key Configuration */}
            <div
              className={`p-6 rounded-3xl border-[0.25px] backdrop-blur-md space-y-3 transition-colors ${
                isOled
                  ? 'bg-black border-slate-800/40 text-slate-100'
                  : isDark
                  ? 'bg-[#27272a]/70 border-zinc-700/60 text-zinc-100'
                  : 'bg-white border-slate-200 shadow-xs text-slate-900'
              }`}
            >
              <h3 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5" style={{ color: accentHex }}>
                <Key className="w-4 h-4" /> Gemini AI Integration (Flashcards)
              </h3>

              <div
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-colors ${
                  isOled
                    ? 'border-zinc-800 bg-zinc-900/60 text-zinc-100'
                    : isDark
                    ? 'border-zinc-700/40 bg-[#1c1c20]/60 text-zinc-100'
                    : 'border-slate-200 bg-slate-100/70 text-slate-900'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs sm:text-sm">API Key Status:</span>
                    {config.geminiApiKey ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        Active ✓
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-400">
                        Not Configured
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-slate-400 mt-1 truncate">
                    {config.geminiApiKey
                      ? `${config.geminiApiKey.slice(0, 7)}••••••••••••${config.geminiApiKey.slice(-4)}`
                      : 'Configure your free Google Gemini API key to enable AI PDF deck extraction.'}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(true)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer border flex items-center justify-center gap-1.5 whitespace-nowrap"
                  style={getAccentStyle(accentHex, isDark)}
                >
                  <Key className="w-3.5 h-3.5" />
                  Configure Gemini API Key
                </button>
              </div>
            </div>

            {/* 3. Personalization — name field only shown when NOT signed in */}
            {!currentUser && (
              <div
                className={`p-6 rounded-3xl border-[0.25px] backdrop-blur-md space-y-4 transition-colors ${
                  isOled
                    ? 'bg-black border-slate-800/40 text-slate-100'
                    : isDark
                    ? 'bg-[#242428] border-zinc-700/60 text-zinc-100'
                    : 'bg-white border-slate-200 shadow-xs text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5" style={{ color: accentHex }} />
                  <h3 className="text-sm font-extrabold">Learner Profile Name</h3>
                </div>

                <form onSubmit={handleSaveName} className="flex items-center gap-3">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Enter your name..."
                    className={`flex-1 px-4 py-3 rounded-full border text-xs font-bold focus:outline-none transition-colors ${
                      isOled
                        ? 'bg-black border-slate-700 text-slate-100 placeholder-slate-500'
                        : isDark
                        ? 'bg-[#242428] border-zinc-700/60 text-zinc-100 placeholder-zinc-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 font-bold'
                    }`}
                  />
                  <button
                    type="submit"
                    className="px-6 py-3.5 rounded-full font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer shrink-0 border"
                    style={getAccentStyle(accentHex, isDark)}
                  >
                    Save Name
                  </button>
                </form>
              </div>
            )}

            {/* 3. Spaced Repetition Algorithm Settings */}
            <div
              className={`p-6 rounded-3xl border-[0.25px] backdrop-blur-md space-y-4 transition-colors ${
                isOled
                  ? 'bg-black border-slate-800/40 text-slate-100'
                  : isDark
                  ? 'bg-[#27272a]/70 border-zinc-700/60 text-zinc-100'
                  : 'bg-white border-slate-200 shadow-xs text-slate-900'
              }`}
            >
              <h3 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5" style={{ color: accentHex }}>
                <Brain className="w-4 h-4" /> Spaced Repetition Algorithm Mode
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Smart SM-2 Mode */}
                <div
                  onClick={() => updateAlgoMode('smart')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 ease-out flex flex-col justify-between ${
                    config.algoMode === 'smart'
                      ? isDark
                        ? 'bg-[#242428] scale-[1.01]'
                        : 'bg-slate-100/90 scale-[1.01] shadow-xs'
                      : isDark
                      ? 'bg-[#1c1c20] border-zinc-700/60 hover:bg-[#242428]'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-900'
                  }`}
                  style={config.algoMode === 'smart' ? { borderColor: accentHex } : {}}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" style={{ color: accentHex }} /> Smart SM-2 Algorithm
                      </span>
                      {/* Small "i" Info Circle */}
                      <button
                        type="button"
                        onClick={(e) => handleInfoClick('smart', e)}
                        className="w-4.5 h-4.5 rounded-full border border-zinc-500/60 flex items-center justify-center text-[10px] font-black text-zinc-400 hover:text-white hover:border-zinc-300 transition-all cursor-pointer select-none shrink-0"
                        title="Algorithm Info"
                      >
                        i
                      </button>
                    </div>
                    {config.algoMode === 'smart' && <Check className="w-4 h-4 stroke-[3]" style={{ color: accentHex }} />}
                  </div>
                </div>

                {/* Fixed Interval Mode */}
                <div
                  onClick={() => updateAlgoMode('fixed')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 ease-out flex flex-col justify-between ${
                    config.algoMode === 'fixed'
                      ? isDark
                        ? 'bg-[#242428] scale-[1.01]'
                        : 'bg-slate-100/90 scale-[1.01] shadow-xs'
                      : isDark
                      ? 'bg-[#1c1c20] border-zinc-700/60 hover:bg-[#242428]'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-900'
                  }`}
                  style={config.algoMode === 'fixed' ? { borderColor: accentHex } : {}}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm flex items-center gap-1.5">
                        <Clock className="w-4 h-4" style={{ color: accentHex }} /> Fixed Interval Mode
                      </span>
                      {/* Small "i" Info Circle */}
                      <button
                        type="button"
                        onClick={(e) => handleInfoClick('fixed', e)}
                        className="w-4.5 h-4.5 rounded-full border border-zinc-500/60 flex items-center justify-center text-[10px] font-black text-zinc-400 hover:text-white hover:border-zinc-300 transition-all cursor-pointer select-none shrink-0"
                        title="Algorithm Info"
                      >
                        i
                      </button>
                    </div>
                    {config.algoMode === 'fixed' && <Check className="w-4 h-4 stroke-[3]" style={{ color: accentHex }} />}
                  </div>
                </div>
              </div>

              {/* Portal Tooltip Popup rendered directly on body */}
              {activeAlgoTooltip && algoTooltipPos && ReactDOM.createPortal(
                <div
                  className="fixed z-[100000] w-[260px] p-3.5 rounded-2xl border border-zinc-700/90 bg-[#18181c] text-xs text-zinc-100 shadow-2xl animate-pop-in leading-relaxed select-none"
                  style={{ top: `${algoTooltipPos.top}px`, left: `${algoTooltipPos.left}px` }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-700/60 font-extrabold text-[11px] uppercase tracking-wider text-zinc-400">
                    <span>{activeAlgoTooltip === 'smart' ? 'Smart SM-2 Algorithm' : 'Fixed Interval Mode'}</span>
                    <button
                      type="button"
                      onClick={() => setActiveAlgoTooltip(null)}
                      className="w-5 h-5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-zinc-300 leading-normal">
                    {activeAlgoTooltip === 'smart'
                      ? 'Dynamically calculates review intervals based on SuperMemo SM-2 memory curves, Ease Factors (EF), and grade history.'
                      : 'Uses simple fixed day increments (e.g. Hard = 1d, Medium = 3d, Easy = 7d) without adaptive ease factor adjustments.'}
                  </p>
                </div>,
                document.body
              )}

              {/* Fixed Interval Options Sub-Panel */}
              {config.algoMode === 'fixed' && (
                <div
                  className={`p-4 rounded-2xl border space-y-3 mt-3 animate-fade-in ${
                    isDark ? 'bg-[#1c1c20] border-zinc-700/60' : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  <h4 className="text-xs font-extrabold uppercase tracking-wider" style={{ color: accentHex }}>
                    Configure Fixed Interval Days
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-rose-400 mb-1">Hard (Days)</label>
                      <input
                        type="number"
                        min="1"
                        value={fixedDaysInput.hard}
                        onChange={(e) => setFixedDaysInput({ ...fixedDaysInput, hard: parseInt(e.target.value) || 1 })}
                        className={`w-full px-4 py-2.5 rounded-full border-[0.25px] text-xs font-bold ${
                          isDark ? 'bg-[#1a1a1e] border-zinc-700/60 text-zinc-100' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-amber-400 mb-1">Medium (Days)</label>
                      <input
                        type="number"
                        min="1"
                        value={fixedDaysInput.good}
                        onChange={(e) => setFixedDaysInput({ ...fixedDaysInput, good: parseInt(e.target.value) || 1 })}
                        className={`w-full px-4 py-2.5 rounded-full border-[0.25px] text-xs font-bold ${
                          isDark ? 'bg-[#1a1a1e] border-zinc-700/60 text-zinc-100' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-emerald-400 mb-1">Easy (Days)</label>
                      <input
                        type="number"
                        min="1"
                        value={fixedDaysInput.easy}
                        onChange={(e) => setFixedDaysInput({ ...fixedDaysInput, easy: parseInt(e.target.value) || 1 })}
                        className={`w-full px-4 py-2.5 rounded-full border-[0.25px] text-xs font-bold ${
                          isDark ? 'bg-[#1a1a1e] border-zinc-700/60 text-zinc-100' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveFixedDays}
                    className="px-5 py-2.5 rounded-full font-bold text-xs shadow cursor-pointer active:scale-95 border"
                    style={getAccentStyle(accentHex, isDark)}
                  >
                    Save Interval Rules
                  </button>
                </div>
              )}
            </div>

            {/* 4. App Version & Updates */}
            <div
              className={`p-6 rounded-3xl border-[0.25px] backdrop-blur-md space-y-3 transition-colors ${
                isOled
                  ? 'bg-black border-slate-800/40 text-slate-100'
                  : isDark
                  ? 'bg-[#27272a]/70 border-zinc-700/60 text-zinc-100'
                  : 'bg-white border-slate-200 shadow-xs text-slate-900'
              }`}
            >
              <h3 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5" style={{ color: accentHex }}>
                <Sparkles className="w-4 h-4" /> App Version & Updates
              </h3>

              <div
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border transition-colors ${
                  isOled
                    ? 'border-zinc-800 bg-zinc-900/60 text-zinc-100'
                    : isDark
                    ? 'border-zinc-700/40 bg-[#1c1c20]/60 text-zinc-100'
                    : 'border-slate-200 bg-slate-100/70 text-slate-900'
                }`}
              >
                <div className="min-w-0">
                  <p className="font-extrabold text-xs sm:text-sm flex items-center gap-1.5 flex-wrap">
                    <span>Sessionist</span>
                    <span
                      className={`text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded-full border transition-colors ${
                        isOled
                          ? 'border-zinc-800 bg-zinc-900 text-zinc-300'
                          : isDark
                          ? 'border-zinc-700 bg-[#242428] text-zinc-300'
                          : 'border-slate-300 bg-slate-200 text-slate-700'
                      }`}
                    >
                      v{CURRENT_VERSION}
                    </span>
                  </p>
                  {updateStatusMsg && (
                    <p className="text-[10px] sm:text-xs font-extrabold text-emerald-400 mt-0.5 animate-fade-in break-words">
                      {updateStatusMsg}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleManualUpdateCheck}
                  disabled={isCheckingUpdate}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-full font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5 disabled:opacity-60 border whitespace-nowrap"
                  style={getAccentStyle(accentHex, isDark)}
                >
                  {isCheckingUpdate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {isCheckingUpdate ? 'Checking...' : 'Check for Updates'}
                </button>
              </div>
            </div>

            {/* 5. Data Management (Most Down Card) */}
            <div
              className={`p-6 rounded-3xl border-[0.25px] backdrop-blur-md space-y-4 transition-colors ${
                isOled
                  ? 'bg-black border-slate-800/40 text-slate-100'
                  : isDark
                  ? 'bg-[#27272a]/70 border-zinc-700/60 text-zinc-100'
                  : 'bg-white border-slate-200 shadow-xs text-slate-900'
              }`}
            >
              <h3 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5" style={{ color: accentHex }}>
                <Database className="w-4 h-4" /> Data Management
              </h3>

              <div className="flex items-center justify-center w-full">
                <button
                  type="button"
                  onClick={() => setShowResetWarning1(true)}
                  className="w-full sm:w-auto px-8 py-3 rounded-full bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ShieldAlert className="w-4 h-4" /> Reset All Data
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* 0. User Profile / Display Name — only shown when NOT logged in with an account */}
            {!currentUser && (
              <div
                className={`p-6 rounded-3xl border-[0.25px] backdrop-blur-md space-y-4 transition-colors ${
                  isOled
                    ? 'bg-black border-slate-800/40 text-slate-100'
                    : isDark
                    ? 'bg-[#27272a]/70 border-zinc-700/60 text-zinc-100'
                    : 'bg-white border-slate-200 shadow-xs text-slate-900'
                }`}
              >
                <h3 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5" style={{ color: accentHex }}>
                  <User className="w-4 h-4" /> Display Name
                </h3>

                <form onSubmit={handleSaveName} className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Enter your name..."
                    className={`flex-1 px-6 py-3.5 rounded-full border-[0.25px] text-xs font-semibold focus:outline-none ${
                      isOled
                        ? 'bg-black border-slate-700 text-slate-100 placeholder-slate-500'
                        : isDark
                        ? 'bg-[#242428] border-zinc-700/60 text-zinc-100 placeholder-zinc-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 font-bold'
                    }`}
                  />
                  <button
                    type="submit"
                    className="px-6 py-3.5 rounded-full font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer shrink-0 border"
                    style={getAccentStyle(accentHex, isDark)}
                  >
                    Save Name
                  </button>
                </form>
              </div>
            )}

            {/* 1. Theme & Accent Customization */}
            <div
              className={`p-6 rounded-3xl border-[0.25px] backdrop-blur-md space-y-4 transition-colors ${
                isOled
                  ? 'bg-black border-slate-800/40 text-slate-100'
                  : isDark
                  ? 'bg-[#27272a]/70 border-zinc-700/60 text-zinc-100'
                  : 'bg-white border-slate-200 shadow-xs text-slate-900'
              }`}
            >
              <h3 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5" style={{ color: accentHex }}>
                <Palette className="w-4 h-4" /> Theme & Accent Customization
              </h3>

              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Left Side: 3-Stop Theme Segmented Slider */}
                <div className="w-full md:w-1/2 space-y-2">
                  <label className={`block text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                    Theme
                  </label>
                  <div
                    className={`relative p-1 rounded-full border-[0.25px] flex items-center transition-colors ${
                      isOled
                        ? 'bg-black border-slate-800'
                        : isDark
                        ? 'bg-[#1a1a1e] border-zinc-700/60'
                        : 'bg-slate-200/90 border-slate-300'
                    }`}
                  >
                    <div
                      className={`absolute top-1 bottom-1 w-[calc(33.333%-4px)] rounded-full transition-all duration-300 ease-out shadow-md ${
                        config.themeMode === 'light'
                          ? 'left-1'
                          : config.themeMode === 'dark'
                          ? 'left-[calc(33.333%+2px)]'
                          : 'left-[calc(66.666%+2px)]'
                      }`}
                      style={{
                        backgroundColor: (accentHex === '#ffffff' || accentHex === '#000000') ? (isDark ? '#ffffff' : '#0f172a') : accentHex,
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => updateThemeMode('light')}
                      className={`relative z-10 flex-1 py-2.5 rounded-full text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none ${
                        config.themeMode === 'light'
                          ? ((accentHex === '#ffffff' || accentHex === '#000000') && !isDark ? 'text-white' : isWhiteAccent ? 'text-slate-900' : 'text-white')
                          : isDark
                          ? 'text-slate-400 hover:text-slate-200'
                          : 'text-slate-700 hover:text-slate-900'
                      }`}
                    >
                      <Sun className="w-4 h-4" /> Light
                    </button>

                    <button
                      type="button"
                      onClick={() => updateThemeMode('dark')}
                      className={`relative z-10 flex-1 py-2.5 rounded-full text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none ${
                        config.themeMode === 'dark'
                          ? ((accentHex === '#ffffff' || accentHex === '#000000') && isDark ? 'text-slate-900' : isWhiteAccent ? 'text-slate-900' : 'text-white')
                          : isDark
                          ? 'text-slate-400 hover:text-slate-200'
                          : 'text-slate-700 hover:text-slate-900'
                      }`}
                    >
                      <Moon className="w-4 h-4" /> Dark
                    </button>

                    <button
                      type="button"
                      onClick={() => updateThemeMode('oled')}
                      className={`relative z-10 flex-1 py-2.5 rounded-full text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none ${
                        config.themeMode === 'oled'
                          ? ((accentHex === '#ffffff' || accentHex === '#000000') && isDark ? 'text-slate-900' : isWhiteAccent ? 'text-slate-900' : 'text-white')
                          : isDark
                          ? 'text-slate-400 hover:text-slate-200'
                          : 'text-slate-700 hover:text-slate-900'
                      }`}
                    >
                      <MoonStar className="w-4 h-4" /> Night
                    </button>
                  </div>
                </div>

                {/* Right Side: Accent Color Squircles */}
                <div className="w-full md:w-1/2 space-y-2">
                  <label className={`block text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                    Accent Color
                  </label>
                  <div className="grid grid-cols-4 justify-items-center sm:flex sm:items-center sm:justify-between gap-2.5 sm:gap-2">
                    {PRESET_ACCENTS.map((swatch) => {
                      const isMonochrome = swatch.hex === '#ffffff' || swatch.hex === '#000000';
                      const isSelected = config.accentColor === swatch.hex || (isMonochrome && (config.accentColor === '#ffffff' || config.accentColor === '#000000'));
                      
                      const displayColor = isMonochrome ? (isDark ? '#ffffff' : '#0f172a') : swatch.hex;
                      const checkColor = isMonochrome ? (isDark ? '#0f172a' : '#ffffff') : '#ffffff';

                      return (
                        <button
                          key={swatch.name}
                          type="button"
                          onClick={() => updateAccentColor(isMonochrome ? (isDark ? '#ffffff' : '#000000') : swatch.hex)}
                          title={swatch.name}
                          className={`aspect-square h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs transition-all cursor-pointer ${
                            isSelected ? 'ring-2 ring-indigo-500 scale-110 shadow-lg' : 'hover:scale-110 opacity-80 hover:opacity-100'
                          } ${isMonochrome && isDark ? 'border border-slate-300 shadow-xs' : ''}`}
                          style={{ backgroundColor: displayColor, color: checkColor }}
                        >
                          {isSelected && <Check className="w-4 h-4 stroke-[3]" style={{ color: checkColor }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Navigation Layout Position (Desktop/Laptop Only) */}
            <div
              className={`hidden md:block p-6 rounded-3xl border-[0.25px] backdrop-blur-md space-y-4 transition-colors ${
                isOled
                  ? 'bg-black border-slate-800/40 text-slate-100'
                  : isDark
                  ? 'bg-[#27272a]/70 border-zinc-700/60 text-zinc-100'
                  : 'bg-white border-slate-200 shadow-xs text-slate-900'
              }`}
            >
              <h3 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5" style={{ color: accentHex }}>
                <Layout className="w-4 h-4" /> Navigation Layout
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateNavPosition('bottom')}
                  className={`p-3.5 rounded-full border text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    config.navPosition === 'bottom'
                      ? 'shadow-md'
                      : isDark
                      ? 'bg-[#1a1a1e] border-zinc-700/60 text-zinc-400 hover:bg-[#242428]'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                  style={config.navPosition === 'bottom' ? { backgroundColor: accentHex, color: isWhiteAccent ? '#0f172a' : '#ffffff', borderColor: 'transparent' } : {}}
                >
                  <PanelBottom className="w-4 h-4" />
                  <span>Floating Bar</span>
                </button>

                <button
                  type="button"
                  onClick={() => updateNavPosition('side')}
                  className={`p-3.5 rounded-full border text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    config.navPosition === 'side'
                      ? 'shadow-md'
                      : isDark
                      ? 'bg-[#1a1a1e] border-zinc-700/60 text-zinc-400 hover:bg-[#242428]'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                  style={config.navPosition === 'side' ? { backgroundColor: accentHex, color: isWhiteAccent ? '#0f172a' : '#ffffff', borderColor: 'transparent' } : {}}
                >
                  <PanelLeft className="w-4 h-4" />
                  <span>Left Sidebar</span>
                </button>
              </div>
            </div>

            {/* 3. Font Size Scale Slider (Desktop/Tablet Only) */}
            <div
              className={`hidden sm:block p-6 rounded-3xl border-[0.25px] backdrop-blur-md space-y-4 transition-colors ${
                isOled
                  ? 'bg-black border-slate-800/40 text-slate-100'
                  : isDark
                  ? 'bg-[#27272a]/70 border-zinc-700/60 text-zinc-100'
                  : 'bg-white border-slate-200 shadow-xs text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5" style={{ color: accentHex }}>
                  <Type className="w-4 h-4" /> Font Size Scale
                </h3>
                <span className="text-xs font-bold px-3 py-1 rounded-full border border-zinc-700/60 bg-[#242428] text-zinc-200">
                  {(() => {
                    const val = typeof config.fontSize === 'number' ? config.fontSize : config.fontSize === 'large' ? 26 : config.fontSize === 'medium' ? 22 : 18;
                    if (val >= 25) return 'Large';
                    if (val <= 19) return 'Normal';
                    if (val === 20) return 'Normal +';
                    if (val === 22) return 'Balanced';
                    return 'Large -';
                  })()}
                </span>
              </div>

              <div className="space-y-3 pt-2">
                <input
                  type="range"
                  min={18}
                  max={26}
                  step={2}
                  value={
                    typeof config.fontSize === 'number'
                      ? Math.round(config.fontSize / 2) * 2
                      : config.fontSize === 'large'
                      ? 26
                      : config.fontSize === 'medium'
                      ? 22
                      : 18
                  }
                  onChange={(e) => updateFontSize(parseInt(e.target.value, 10))}
                  className="w-full h-2.5 rounded-lg appearance-none cursor-pointer bg-zinc-700/60"
                  style={{ accentColor: accentHex }}
                />

                <div className="flex items-center justify-between text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider px-1">
                  <span>Normal</span>
                  <span>Large</span>
                </div>
              </div>
            </div>

            {/* 4. Weekly Rest Day Setting */}
            <div
              className={`p-4 sm:p-6 rounded-3xl border-[0.25px] backdrop-blur-md transition-colors space-y-2.5 ${
                isOled
                  ? 'bg-black border-slate-800/40 text-slate-100'
                  : isDark
                  ? 'bg-[#242428] border-zinc-700/60 text-zinc-100'
                  : 'bg-white border-slate-200 shadow-xs text-slate-900'
              }`}
            >
              <h3 className={`text-sm sm:text-base font-black flex items-center gap-2 ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                🏖️ Weekend Day
              </h3>

              <div className="flex items-center gap-2 sm:gap-3 w-full min-w-0 pt-0.5">
                <div className="shrink-0">
                  <CustomSelect
                    options={[
                      { value: 'none', label: 'None' },
                      { value: 'friday', label: 'Friday' },
                      { value: 'saturday', label: 'Saturday' },
                      { value: 'sunday', label: 'Sunday' },
                      { value: 'monday', label: 'Monday' },
                      { value: 'tuesday', label: 'Tuesday' },
                      { value: 'wednesday', label: 'Wednesday' },
                      { value: 'thursday', label: 'Thursday' },
                    ]}
                    value={config.weeklyRestDay && config.weeklyRestDay !== 'none' ? config.weeklyRestDay : weekendDay}
                    onChange={(val: string) => {
                      setWeekendDay(val);
                      if (val === 'none') {
                        updateWeeklyRestDay('none');
                      } else if (config.weeklyRestDay && config.weeklyRestDay !== 'none') {
                        updateWeeklyRestDay(val as any);
                      }
                    }}
                    placeholder="Choose..."
                    className="w-auto min-w-[132px] text-xs font-bold"
                  />
                </div>

                <div
                  onClick={() => {
                    const isCurrentlyRest = Boolean(config.weeklyRestDay && config.weeklyRestDay !== 'none');
                    if (isCurrentlyRest) {
                      updateWeeklyRestDay('none');
                    } else {
                      const dayToSet = weekendDay === 'none' ? 'friday' : weekendDay;
                      setWeekendDay(dayToSet);
                      updateWeeklyRestDay(dayToSet as any);
                    }
                  }}
                  className="flex items-center gap-1.5 sm:gap-2 cursor-pointer select-none group min-w-0 flex-1"
                >
                  <div
                    className={`w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                      config.weeklyRestDay && config.weeklyRestDay !== 'none'
                        ? 'shadow-sm scale-105'
                        : isDark
                        ? 'border-zinc-700 bg-[#1a1a1e] group-hover:border-zinc-500'
                        : 'border-slate-300 bg-slate-100 group-hover:border-slate-400'
                    }`}
                    style={
                      config.weeklyRestDay && config.weeklyRestDay !== 'none'
                        ? { backgroundColor: accentHex, borderColor: accentHex }
                        : {}
                    }
                  >
                    {config.weeklyRestDay && config.weeklyRestDay !== 'none' && (
                      <Check
                        className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]"
                        style={{ color: isWhiteAccent ? '#0f172a' : '#ffffff' }}
                      />
                    )}
                  </div>
                  <span className={`text-[11px] sm:text-xs font-bold leading-tight ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                    Always mark as REST
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ══ Modals (Portals, outside tab container) ══ */}

      {/* 1st Step Reset Warning Modal */}
      {showResetWarning1 &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 z-[999] w-screen h-screen flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
            <div
              className={`w-full max-w-md p-6 rounded-3xl border-[0.25px] shadow-2xl space-y-4 animate-pop-in ${
                isOled
                  ? 'bg-black border-slate-800/60 text-slate-100'
                  : isDark
                  ? 'bg-[#242428] border-zinc-700/80 text-zinc-100'
                  : 'bg-white border-slate-300 text-slate-900 shadow-2xl'
              }`}
            >
              <div className="flex items-center gap-2.5 text-rose-500">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
                <h3 className="text-base font-black">Reset Cloud Account Data?</h3>
              </div>

              <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-300' : 'text-slate-700 font-medium'}`}>
                Are you sure you want to completely erase all your subjects, lectures, exams, notes, and study progress from your cloud account? This will permanently wipe your account database!
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-700/40">
                <button
                  type="button"
                  onClick={() => setShowResetWarning1(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition-colors ${
                    isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFirstResetConfirm}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-md cursor-pointer active:scale-95"
                >
                  Proceed →
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 2nd Step Final Warning Modal */}
      {showResetWarning2 &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 z-[999] w-screen h-screen flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
            <div
              className={`w-full max-w-md p-6 rounded-3xl border-2 border-rose-500/80 shadow-2xl space-y-4 animate-pop-in ${
                isOled
                  ? 'bg-black text-slate-100'
                  : isDark
                  ? 'bg-[#242428] text-zinc-100'
                  : 'bg-white text-slate-900 shadow-2xl'
              }`}
            >
              <div className="flex items-center gap-2.5 text-rose-500">
                <ShieldAlert className="w-7 h-7 animate-pulse" />
                <h3 className="text-base font-black">Final Confirmation</h3>
              </div>

              <p className={`text-xs leading-relaxed font-bold ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>
                THIS ACTION CANNOT BE UNDONE! To confirm total wipeout of all data, please type <strong className="underline uppercase">DELETE</strong> below:
              </p>

              <input
                type="text"
                value={resetConfirmInput}
                onChange={(e) => setResetConfirmInput(e.target.value)}
                placeholder="Type 'DELETE' to confirm..."
                className={`w-full px-4 py-3 rounded-2xl border-2 text-xs font-mono font-black focus:outline-none uppercase ${
                  isDark ? 'bg-[#1f1f23] border-rose-500/50 text-rose-400' : 'bg-rose-50 border-rose-400 text-rose-950'
                }`}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-700/40">
                <button
                  type="button"
                  onClick={() => setShowResetWarning2(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition-colors ${
                    isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                  }`}
                >
                  Abort / Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFinalResetConfirm}
                  disabled={resetConfirmInput.trim().toUpperCase() !== 'DELETE'}
                  className={`px-4 py-2 rounded-xl font-extrabold text-xs shadow-md transition-all ${
                    resetConfirmInput.trim().toUpperCase() === 'DELETE'
                      ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer active:scale-95 shadow-rose-600/40'
                      : 'bg-rose-950 text-rose-500 opacity-50 cursor-not-allowed border border-rose-800'
                  }`}
                >
                  PERMANENTLY RESET DATA
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 3rd Step Cloud Reset Warning Modal (Logged-In Users Only) */}
      {showCloudResetWarning &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 z-[999] w-screen h-screen flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
            <div
              className={`w-full max-w-md p-6 rounded-3xl border-2 border-rose-500 shadow-2xl space-y-4 animate-pop-in ${
                isOled
                  ? 'bg-black text-slate-100'
                  : isDark
                  ? 'bg-[#242428] text-zinc-100'
                  : 'bg-white text-slate-900 shadow-2xl'
              }`}
            >
              <div className="flex items-center gap-2.5 text-rose-500">
                <Cloud className="w-7 h-7 animate-bounce text-rose-500" />
                <h3 className="text-base font-black">Account & Cloud Data Reset</h3>
              </div>

              <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-300' : 'text-slate-700 font-medium'}`}>
                Signed in as <strong className="text-rose-400">{currentUser?.email}</strong>. Choose how you want to reset your data:
              </p>

              <div className={`p-3.5 rounded-2xl text-xs space-y-2.5 border ${isDark ? 'bg-slate-800/60 border-slate-700/80 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                <div className="space-y-1">
                  <p className="font-extrabold text-[11px] uppercase tracking-wider text-rose-400">1. Permanent Cloud Data Wipeout</p>
                  <p className="text-[11px] leading-normal text-slate-400">
                    Permanently deletes all your synced cloud database from Cloud Firestore online AND wipes local data on this device.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-700/40 space-y-1">
                  <p className="font-extrabold text-[11px] uppercase tracking-wider text-amber-400">2. Remove Data From This Device Only</p>
                  <p className="text-[11px] leading-normal text-slate-400">
                    Signs you out of your account and erases local data from this specific device. Your online cloud backup remains safe and untouched.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                  To confirm Cloud Data Wipeout, type <span className="underline font-black">DELETE CLOUD</span> below:
                </label>
                <input
                  type="text"
                  value={cloudResetConfirmInput}
                  onChange={(e) => setCloudResetConfirmInput(e.target.value)}
                  placeholder="Type 'DELETE CLOUD'..."
                  className={`w-full px-4 py-2.5 rounded-2xl border-2 text-xs font-mono font-black focus:outline-none uppercase ${
                    isDark ? 'bg-slate-800 border-rose-500/50 text-rose-400' : 'bg-rose-50 border-rose-400 text-rose-950'
                  }`}
                />
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/40">
                <button
                  type="button"
                  onClick={handleWipeCloudAndResetLocal}
                  disabled={isWipingCloud || cloudResetConfirmInput.trim().toUpperCase() !== 'DELETE CLOUD'}
                  className={`w-full py-2.5 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 ${
                    cloudResetConfirmInput.trim().toUpperCase() === 'DELETE CLOUD'
                      ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer active:scale-95 shadow-rose-600/40'
                      : 'bg-rose-950/60 text-rose-500/50 cursor-not-allowed border border-rose-900/50'
                  }`}
                >
                  {isWipingCloud ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                  {isWipingCloud ? 'Wiping Cloud Data...' : 'DELETE CLOUD & LOCAL DATA'}
                </button>

                <button
                  type="button"
                  onClick={handleSignOutDeviceResetOnly}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                  }`}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Remove Data From This Device Only (Sign Out & Clear)
                </button>

                <button
                  type="button"
                  onClick={() => setShowCloudResetWarning(false)}
                  className="w-full py-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer text-center"
                >
                  Cancel / Abort
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Gemini API Key Edit Modal */}
      {showApiKeyModal && (
        <GeminiApiKeyModal
          initialKey={config.geminiApiKey || ''}
          accentHex={accentHex}
          isDark={isDark}
          isOled={isOled}
          onSave={(key) => {
            updateGeminiApiKey(key);
            setShowApiKeyModal(false);
            showToast('Gemini API Key saved and synced to cloud! ✨');
          }}
          onClose={() => setShowApiKeyModal(false)}
        />
      )}
    </div>
  );
};
