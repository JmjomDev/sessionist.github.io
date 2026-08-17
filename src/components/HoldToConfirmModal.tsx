import React, { useState } from 'react';
import { X, BookOpen } from 'lucide-react';
import { useStudy } from '../context/StudyContext';

interface HoldToConfirmModalProps {
  subjectName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const HoldToConfirmModal: React.FC<HoldToConfirmModalProps> = ({
  subjectName,
  onConfirm,
  onCancel,
}) => {
  const { config } = useStudy();
  const [isClosing, setIsClosing] = useState(false);

  const isDark = config.themeMode !== 'light';
  const isOled = config.themeMode === 'oled';
  let accentHex = config.accentColor || '#6366f1';
  if (accentHex === '#000000') {
    accentHex = config.themeMode === 'oled' || isDark ? '#ffffff' : '#0f172a';
  }
  const isWhiteAccent = accentHex.toLowerCase() === '#ffffff' || accentHex.toLowerCase() === '#fff';

  const handleDismiss = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onCancel();
    }, 180);
  };

  const handleAction = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onConfirm();
    }, 180);
  };

  return (
    <div
      onClick={handleDismiss}
      className={`fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none ${
        isClosing ? 'animate-modal-backdrop-out' : 'animate-fade-in'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-sm rounded-3xl p-6 border shadow-2xl space-y-5 overflow-hidden ${
          isClosing ? 'animate-pop-out' : 'animate-pop-in'
        } ${
          isOled
            ? 'bg-black border-slate-800 text-slate-100 shadow-black'
            : isDark
            ? 'bg-[#1c1c20] border-zinc-700/80 text-zinc-100'
            : 'bg-white border-slate-300 shadow-slate-400/50 text-slate-900'
        }`}
      >
        {/* Top Header Row with X Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-indigo-400">
              Start Session
            </span>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
              isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white' : 'bg-slate-100 border-slate-300 text-slate-600'
            }`}
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Info Content */}
        <div className="text-center py-1">
          <p className={`text-sm sm:text-base font-bold leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            Are you sure you want to start a full revision session for <span style={{ color: accentHex }}>{subjectName}</span>?
          </p>
        </div>

        {/* Extended Full-Width Start Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleAction}
            className="w-full py-3.5 rounded-2xl font-black text-sm shadow-md transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 border"
            style={{
              backgroundColor: accentHex,
              borderColor: accentHex,
              color: isWhiteAccent ? '#0f172a' : '#ffffff',
            }}
          >
            Start Revision
          </button>
        </div>
      </div>
    </div>
  );
};
