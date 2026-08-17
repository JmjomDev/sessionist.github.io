import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Download, Sparkles, X } from 'lucide-react';
import { AppLogoIcon } from './AppLogoIcon';
import { CURRENT_VERSION, type UpdateInfo } from '../config/versionConfig';

interface UpdateModalProps {
  updateInfo: UpdateInfo;
  onDismiss: () => void;
  accentHex: string;
  isDark: boolean;
  isOled: boolean;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  updateInfo,
  onDismiss,
  accentHex,
  isDark,
  isOled,
}) => {
  const [isClosing, setIsClosing] = useState(false);

  let activeAccent = accentHex;
  if (!activeAccent || activeAccent === '#000000' || activeAccent === '#0f172a') {
    activeAccent = '#6366f1';
  }

  const handleDismiss = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onDismiss();
    }, 180);
  };

  const handleUpdateNow = () => {
    try {
      window.open(updateInfo.downloadUrl, '_system') || window.open(updateInfo.downloadUrl, '_blank');
    } catch {
      window.location.href = updateInfo.downloadUrl;
    }
  };

  const cardBg = isOled
    ? 'bg-black border-slate-800 text-white shadow-black'
    : isDark
    ? 'bg-[#18181c] border-zinc-700/60 text-zinc-100 shadow-2xl'
    : 'bg-white border-slate-300 text-slate-900 shadow-2xl';

  return ReactDOM.createPortal(
    <div
      onClick={handleDismiss}
      className={`fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl ${
        isClosing ? 'animate-modal-backdrop-out' : 'animate-fade-in'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm p-6 sm:p-7 rounded-3xl border shadow-2xl space-y-5 relative overflow-hidden ${
          isClosing ? 'animate-pop-out' : 'animate-pop-in'
        } ${cardBg}`}
      >
        {/* Close Icon */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-zinc-800/40 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon */}
        <div className="text-center space-y-3 pt-2">
          <div className="relative inline-block">
            <div
              className="w-16 h-16 mx-auto rounded-3xl border flex items-center justify-center shadow-lg"
              style={{
                backgroundColor: `${activeAccent}20`,
                borderColor: `${activeAccent}50`,
                color: activeAccent,
              }}
            >
              <AppLogoIcon color={activeAccent} className="w-10 h-10 animate-pulse" />
            </div>
            <span
              className="absolute -bottom-1 -right-1 p-1 rounded-full text-[10px] font-black text-white shadow-sm flex items-center justify-center"
              style={{ backgroundColor: activeAccent }}
            >
              <Sparkles className="w-3 h-3" />
            </span>
          </div>

          <div>
            <div className="flex items-center justify-center gap-2">
              <h3 className="text-lg font-black tracking-tight">New Update Available!</h3>
            </div>
            <p className="text-xs font-bold text-indigo-400 mt-0.5">
              v{updateInfo.version} is now ready
            </p>
          </div>
        </div>

        {/* Release Notes Card */}
        <div
          className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
            isOled
              ? 'bg-zinc-900/80 border-zinc-800 text-zinc-300'
              : isDark
              ? 'bg-zinc-900/50 border-zinc-700/50 text-zinc-300'
              : 'bg-slate-50 border-slate-200 text-slate-700 font-medium'
          }`}
        >
          <div className="font-extrabold uppercase tracking-wider text-[10px] text-zinc-400">
            What's New in v{updateInfo.version}:
          </div>
          <p className="whitespace-pre-line leading-relaxed text-[11px] font-semibold">
            {updateInfo.releaseNotes}
          </p>
        </div>

        {/* Version info footer */}
        <div className="text-[10px] text-center font-bold text-zinc-500">
          Current version: v{CURRENT_VERSION}
        </div>

        {/* Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={handleUpdateNow}
            className="w-full py-3.5 rounded-2xl font-black text-xs sm:text-sm tracking-wide shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer text-white border border-white/20"
            style={{ backgroundColor: activeAccent }}
          >
            <Download className="w-4 h-4 stroke-[2.5]" /> Download APK Update
          </button>

          <button
            onClick={handleDismiss}
            className={`w-full py-2.5 rounded-2xl font-extrabold text-xs transition-colors cursor-pointer text-center ${
              isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Remind Me Later
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
