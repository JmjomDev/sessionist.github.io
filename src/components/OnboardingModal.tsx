import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Moon, MoonStar, Sun, Check, ArrowRight } from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { AppLogoIcon } from './AppLogoIcon';

const ACCENT_COLORS = [
  { hex: '#ffffff', name: 'Black / White' },
  { hex: '#0891b2', name: 'Teal' },
  { hex: '#334ACA', name: 'Royal Blue' },
  { hex: '#6366f1', name: 'Indigo' },
  { hex: '#10b981', name: 'Emerald' },
  { hex: '#a855f7', name: 'Purple' },
  { hex: '#f43f5e', name: 'Rose' },
  { hex: '#f59e0b', name: 'Amber' },
];

interface OnboardingModalProps {
  onComplete?: () => void;
  onSignInClick?: () => void;
  onPreviewAccentChange?: (accentHex: string) => void;
  onPreviewThemeChange?: (theme: 'dark' | 'oled' | 'light') => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  onComplete,
  onSignInClick,
  onPreviewAccentChange,
  onPreviewThemeChange,
}) => {
  const { completeOnboarding, currentUser, config } = useStudy();

  const [name, setName] = useState(
    currentUser?.displayName || config.userName || ''
  );
  const [selectedTheme, setSelectedTheme] = useState<'dark' | 'oled' | 'light'>('light');
  const [selectedAccent, setSelectedAccent] = useState('#ffffff');
  const [selectedAlgo, setSelectedAlgo] = useState<'smart' | 'fixed'>('smart');
  const [errorMsg, setErrorMsg] = useState('');

  const handleThemeChange = (t: 'dark' | 'oled' | 'light') => {
    setSelectedTheme(t);
    onPreviewThemeChange?.(t);
    // Immediately resolve the effective accent for the new theme so cursor/logo update at once
    const newIsDark = t !== 'light';
    const isWhite = selectedAccent === '#ffffff' || selectedAccent === '#000000';
    const resolvedAccent = isWhite ? (newIsDark ? '#ffffff' : '#0f172a') : selectedAccent;
    onPreviewAccentChange?.(resolvedAccent);
  };

  const handleAccentChange = (hex: string) => {
    setSelectedAccent(hex);
    const isWhite = hex === '#ffffff' || hex === '#000000';
    const resolvedAccent = isWhite ? (isDark ? '#ffffff' : '#0f172a') : hex;
    onPreviewAccentChange?.(resolvedAccent);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter your name to continue.');
      return;
    }
    completeOnboarding(name, selectedTheme, selectedAccent, selectedAlgo);
    onComplete?.();
  };

  const isDark = selectedTheme !== 'light';
  const isOled = selectedTheme === 'oled';
  const isWhiteAccent = selectedAccent === '#ffffff' || selectedAccent === '#000000';
  const activeAccent = isWhiteAccent
    ? (isDark ? '#ffffff' : '#0f172a')
    : selectedAccent;

  const cardBg = isOled
    ? 'bg-black border-zinc-800 text-zinc-100 shadow-[0_25px_60px_rgba(0,0,0,0.9)]'
    : isDark
    ? 'bg-[#18181b] border-zinc-700/60 text-zinc-100 shadow-[0_25px_60px_rgba(0,0,0,0.7)]'
    : 'bg-white border-slate-200 text-slate-900 shadow-2xl';

  const inputBg = isOled
    ? 'bg-zinc-900 border-zinc-800 text-zinc-100 placeholder-zinc-500'
    : isDark
    ? 'bg-[#242428] border-zinc-700/60 text-zinc-100 placeholder-zinc-500'
    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 font-bold';

  const optionBtnBg = isOled
    ? 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800'
    : isDark
    ? 'border-zinc-700/60 bg-[#242428] text-zinc-400 hover:bg-[#2c2c30]'
    : 'border-slate-200 bg-slate-100 text-slate-700 font-bold hover:bg-slate-200';

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[999] w-screen h-screen flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className={`w-full max-w-lg p-6 sm:p-7 rounded-3xl border shadow-2xl space-y-6 animate-pop-in max-h-[90vh] overflow-y-auto ${cardBg}`}>
        {/* Welcome Header */}
        <div className="text-center space-y-2">
          <div
            className="w-14 h-14 mx-auto rounded-2xl border flex items-center justify-center shadow-lg transition-transform hover:scale-110"
            style={{ backgroundColor: `${activeAccent}20`, borderColor: `${activeAccent}60`, color: activeAccent }}
          >
            <AppLogoIcon color={activeAccent} className="w-10 h-10 animate-pulse transition-transform hover:scale-105" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Welcome to Sessionist! 👋</h2>
          <p className={`text-xs font-semibold max-w-sm mx-auto ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
            Let's customize your study space and spaced repetition algorithm in a few seconds.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Step 1: User Name */}
          <div className="space-y-1.5">
            <label className={`block text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-700'}`}>
              1. What's your name?
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="Enter your name (e.g. Alex)..."
              className={`w-full px-6 py-3.5 rounded-full border text-xs font-bold focus:outline-none transition-all ${inputBg}`}
            />
            {errorMsg && <p className="text-xs font-bold text-rose-400 px-3">{errorMsg}</p>}
          </div>

          {/* Step 2: Theme Selector */}
          <div className="space-y-2">
            <label className={`block text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-700'}`}>
              2. Choose Display Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Dark */}
              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={`py-3 px-2 rounded-full border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  selectedTheme === 'dark' ? 'shadow-md ring-2' : optionBtnBg
                }`}
                style={
                  selectedTheme === 'dark'
                    ? { borderColor: activeAccent, backgroundColor: `${activeAccent}18`, color: activeAccent }
                    : {}
                }
              >
                <Moon className="w-4 h-4" />
                <span className="text-xs font-extrabold">Dark</span>
              </button>

              {/* Night OLED */}
              <button
                type="button"
                onClick={() => handleThemeChange('oled')}
                className={`py-3 px-2 rounded-full border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  selectedTheme === 'oled' ? 'shadow-md ring-2' : optionBtnBg
                }`}
                style={
                  selectedTheme === 'oled'
                    ? { borderColor: activeAccent, backgroundColor: `${activeAccent}18`, color: activeAccent }
                    : {}
                }
              >
                <MoonStar className="w-4 h-4" />
                <span className="text-xs font-extrabold">Night</span>
              </button>

              {/* Light */}
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={`py-3 px-2 rounded-full border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  selectedTheme === 'light' ? 'shadow-md ring-2' : optionBtnBg
                }`}
                style={
                  selectedTheme === 'light'
                    ? { borderColor: activeAccent, backgroundColor: `${activeAccent}18`, color: activeAccent }
                    : {}
                }
              >
                <Sun className="w-4 h-4" />
                <span className="text-xs font-extrabold">Light</span>
              </button>
            </div>
          </div>

          {/* Step 3: Accent Color */}
          <div className="space-y-2">
            <label className={`block text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-700'}`}>
              3. Choose Accent Color
            </label>
            <div className="grid grid-cols-4 justify-items-center sm:flex sm:items-center sm:justify-between gap-2.5 sm:gap-2">
              {ACCENT_COLORS.map((c) => {
                const isMonochrome = c.hex === '#ffffff' || c.hex === '#000000';
                const isSelected = selectedAccent === c.hex || (isMonochrome && (selectedAccent === '#ffffff' || selectedAccent === '#000000'));
                const displayColor = isMonochrome ? (isDark ? '#ffffff' : '#0f172a') : c.hex;
                const checkColor = isMonochrome ? (isDark ? '#0f172a' : '#ffffff') : '#ffffff';

                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => handleAccentChange(c.hex)}
                    title={c.name}
                    className={`aspect-square h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs transition-all cursor-pointer ${
                      isSelected ? 'scale-110 ring-2 ring-indigo-500 shadow-md' : 'hover:scale-105 opacity-80 hover:opacity-100'
                    } ${isMonochrome && isDark ? 'border border-zinc-700' : ''}`}
                    style={{ backgroundColor: displayColor }}
                  >
                    {isSelected && <Check className="w-4 h-4 stroke-[3]" style={{ color: checkColor }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 4: Algorithm */}
          <div className="space-y-2">
            <label className={`block text-xs font-extrabold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-700'}`}>
              4. Study Algorithm Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedAlgo('smart')}
                className={`p-4 rounded-3xl border text-left transition-all cursor-pointer ${
                  selectedAlgo === 'smart' ? 'shadow-md ring-2' : optionBtnBg
                }`}
                style={
                  selectedAlgo === 'smart'
                    ? { borderColor: activeAccent, backgroundColor: `${activeAccent}18` }
                    : {}
                }
              >
                <h4 className="font-extrabold text-xs" style={{ color: activeAccent }}>
                  Smart SM-2 (Recommended)
                </h4>
                <p className={`text-[10px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-600 font-semibold'}`}>Calculates adaptive memory intervals.</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedAlgo('fixed')}
                className={`p-4 rounded-3xl border text-left transition-all cursor-pointer ${
                  selectedAlgo === 'fixed' ? 'shadow-md ring-2' : optionBtnBg
                }`}
                style={
                  selectedAlgo === 'fixed'
                    ? { borderColor: activeAccent, backgroundColor: `${activeAccent}18` }
                    : {}
                }
              >
                <h4 className="font-extrabold text-xs" style={{ color: activeAccent }}>
                  Fixed Days Mode
                </h4>
                <p className={`text-[10px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-600 font-semibold'}`}>Uses fixed gap days (1d, 3d, 7d).</p>
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3.5 rounded-full font-black text-xs shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer border-0"
            style={{
              backgroundColor: activeAccent,
              color: activeAccent === '#ffffff' ? '#0f172a' : '#ffffff',
            }}
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </button>

          {onSignInClick && (
            <button
              type="button"
              onClick={onSignInClick}
              className={`w-full mt-2.5 py-3.5 rounded-full font-black text-xs border transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${optionBtnBg}`}
            >
              Back to Sign In / Sign Up
            </button>
          )}
        </form>
      </div>
    </div>,
    document.body
  );
};
