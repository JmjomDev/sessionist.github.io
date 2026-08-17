import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Key, ExternalLink, Check } from 'lucide-react';

interface GeminiApiKeyModalProps {
  initialKey?: string;
  accentHex: string;
  isDark: boolean;
  isOled: boolean;
  onSave: (key: string) => void;
  onClose: () => void;
}

export const GeminiApiKeyModal: React.FC<GeminiApiKeyModalProps> = ({
  initialKey = '',
  accentHex,
  isDark,
  isOled,
  onSave,
  onClose,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState<string>(initialKey);
  const [isClosing, setIsClosing] = useState<boolean>(false);

  const isWhiteOrBlack = !accentHex || accentHex === '#ffffff' || accentHex === '#000000' || accentHex === '#0f172a';
  const activeAccent = isWhiteOrBlack ? (isDark ? '#ffffff' : '#0f172a') : accentHex;
  const isWhiteAccent = activeAccent === '#ffffff' || activeAccent === '#f8fafc';

  const handleSmoothClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 180);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;
    onSave(apiKeyInput.trim());
  };

  return ReactDOM.createPortal(
    <div
      className={`fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none backdrop-blur-xl bg-black/75 transition-all ${
        isClosing ? 'animate-modal-backdrop-out' : 'animate-fade-in'
      }`}
    >
      <div
        className={`relative w-full max-w-md rounded-3xl border p-6 sm:p-8 space-y-5 shadow-2xl transition-all ${
          isClosing ? 'animate-pop-out' : 'animate-pop-in'
        } ${
          isOled
            ? 'bg-black border-slate-800 text-slate-100'
            : isDark
            ? 'bg-[#18181b]/95 border-zinc-700/60 text-zinc-100'
            : 'bg-white/95 border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-xs"
              style={{
                backgroundColor: `${accentHex}20`,
                borderColor: `${accentHex}40`,
                color: isWhiteAccent ? (isDark ? '#ffffff' : '#0f172a') : accentHex,
              }}
            >
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Gemini AI Key Setup</h3>
              <p className="text-[11px] font-semibold text-slate-400">Required for AI Flashcard Generation</p>
            </div>
          </div>

          <button
            onClick={handleSmoothClose}
            className="w-8 h-8 rounded-full border flex items-center justify-center text-slate-400 hover:text-slate-100 cursor-pointer active:scale-95 transition-transform"
            style={{ borderColor: `${accentHex}40` }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          className={`p-4 rounded-2xl border space-y-2.5 text-xs ${
            isOled
              ? 'bg-zinc-900 border-zinc-800 text-zinc-300'
              : isDark
              ? 'bg-[#242428]/80 border-zinc-700/60 text-zinc-300'
              : 'bg-slate-100 border-slate-200 text-slate-800'
          }`}
        >
          <p className={`font-semibold ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
            Google provides <span className={`font-extrabold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>100% Free API Keys</span> for Gemini 1.5 & 2.0 Flash (up to 15 requests/min).
          </p>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="w-full py-2.5 px-3 rounded-xl border border-dashed flex items-center justify-center gap-2 font-bold cursor-pointer transition-all hover:bg-white/5 active:scale-95 text-center no-underline"
            style={{
              borderColor: `${activeAccent}60`,
              color: isWhiteAccent ? (isDark ? '#ffffff' : '#0f172a') : activeAccent,
            }}
          >
            <span>Get your free API Key from Google AI Studio</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          </a>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider mb-1.5 text-slate-400">
              Your Gemini API Key
            </label>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Paste AIzaSy... API key here"
              required
              className={`w-full px-4 py-3 rounded-2xl border text-xs font-mono font-bold focus:outline-none transition-colors ${
                isOled
                  ? 'bg-black border-slate-700 text-slate-100 placeholder-slate-500'
                  : isDark
                  ? 'bg-[#242428] border-zinc-700/60 text-zinc-100 placeholder-zinc-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 font-medium'
              }`}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-full text-xs font-bold text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!apiKeyInput.trim()}
              className="px-6 py-2.5 rounded-full font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              style={{ backgroundColor: accentHex, color: isWhiteAccent ? '#0f172a' : '#ffffff' }}
            >
              <Check className="w-4 h-4" /> Save API Key
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
