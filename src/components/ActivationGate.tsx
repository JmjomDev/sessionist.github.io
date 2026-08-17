import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { KeyRound, Loader2, X, LogOut, CheckCircle2, ShieldCheck } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import type { User } from 'firebase/auth';
import { AppLogoIcon } from './AppLogoIcon';

interface ActivationGateProps {
  currentUser: User;
  accentHex: string;
  isDark: boolean;
  isOled: boolean;
  onActivate: (code: string) => Promise<{ success: boolean; error?: string }>;
  onSuccessDismiss?: () => void;
}

export const ActivationGate: React.FC<ActivationGateProps> = ({
  currentUser,
  accentHex,
  isDark,
  isOled,
  onActivate,
  onSuccessDismiss,
}) => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const isWhiteOrBlack = !accentHex || accentHex === '#ffffff' || accentHex === '#000000' || accentHex === '#0f172a';
  const activeAccent = isWhiteOrBlack ? (isDark ? '#ffffff' : '#0f172a') : accentHex;

  const cardBg = isOled
    ? 'bg-black border-zinc-800 text-zinc-100'
    : isDark
    ? 'bg-[#18181b] border-zinc-700/60 text-zinc-100'
    : 'bg-white border-slate-200 text-slate-900';

  const inputBg = isOled
    ? 'bg-zinc-900 border-zinc-800 text-zinc-100 placeholder-zinc-500'
    : isDark
    ? 'bg-[#242428] border-zinc-700/60 text-zinc-100 placeholder-zinc-500'
    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400';

  const handleProceed = () => {
    onSuccessDismiss?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setErrorMsg('Please enter your activation code.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    const result = await onActivate(code);
    if (result.success) {
      setSuccess(true);
      // Auto-dismiss smoothly after 1.2s
      setTimeout(() => {
        onSuccessDismiss?.();
      }, 1200);
    } else {
      setErrorMsg(result.error ?? 'Something went wrong.');
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9998] w-screen h-screen flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className={`w-full max-w-sm p-7 rounded-3xl border shadow-2xl space-y-6 animate-pop-in ${cardBg}`}>

        {/* Header */}
        <div className="text-center space-y-3">
          <div
            className="w-14 h-14 mx-auto rounded-2xl border flex items-center justify-center shadow-lg"
            style={{ backgroundColor: `${activeAccent}20`, borderColor: `${activeAccent}50`, color: activeAccent }}
          >
            {success
              ? <CheckCircle2 className="w-8 h-8 animate-bounce text-emerald-400" />
              : <ShieldCheck className="w-8 h-8" />
            }
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">
              {success ? 'Access Granted! 🎉' : 'Activation Required'}
            </h2>
            <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              {success
                ? 'Your account is now activated. Loading your workspace...'
                : `Hi ${currentUser.email?.split('@')[0] ?? 'there'}! This app requires an activation code. Contact the developer to get yours.`
              }
            </p>
          </div>
        </div>

        {success ? (
          <div className="space-y-3 pt-2 animate-fade-in">
            <button
              type="button"
              onClick={handleProceed}
              className="w-full py-3.5 rounded-full font-black text-sm shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              style={{
                backgroundColor: activeAccent,
                color: activeAccent === '#ffffff' || activeAccent === '#f8fafc' ? '#0f172a' : '#ffffff',
              }}
            >
              Enter Sessionist →
            </button>
          </div>
        ) : (
          <>
            {/* Logo icon used as branding */}
            <div className={`flex items-center justify-center gap-2 py-2 px-4 rounded-2xl border ${isDark ? 'border-zinc-800 bg-zinc-900/40' : 'border-slate-200 bg-slate-50'}`}>
              <AppLogoIcon color={activeAccent} className="w-5 h-5 shrink-0" />
              <span className={`text-xs font-black tracking-tight ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                Sessionist — Early Access
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className={`block text-[11px] font-extrabold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                  Activation Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="SESS-XXXX-YYYY"
                    spellCheck={false}
                    autoComplete="off"
                    autoCapitalize="characters"
                    className={`w-full pl-11 pr-5 py-3.5 rounded-full border text-sm font-black tracking-wider focus:outline-none transition-colors ${inputBg}`}
                    style={{ borderColor: code ? `${activeAccent}60` : undefined }}
                  />
                </div>
              </div>

              {/* Error */}
              {errorMsg && (
                <div className="px-4 py-2.5 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <X className="w-3.5 h-3.5 shrink-0" />
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-full font-black text-sm shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: activeAccent,
                  color: activeAccent === '#ffffff' || activeAccent === '#f8fafc' ? '#0f172a' : '#ffffff',
                }}
              >
                {isLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                  : <><KeyRound className="w-4 h-4" /> Activate My Account</>
                }
              </button>
            </form>

            {/* Sign out */}
            <div className={`border-t pt-4 ${isDark ? 'border-zinc-800/60' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={handleSignOut}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-full border text-xs font-extrabold transition-all active:scale-95 cursor-pointer ${
                  isDark
                    ? 'border-zinc-700/60 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    : 'border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
