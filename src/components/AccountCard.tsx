import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { Cloud, CloudOff, LogOut, Loader2, User } from 'lucide-react';

interface AccountCardProps {
  user: { email: string; displayName: string; uid: string } | null;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'offline' | 'error';
  lastSyncedAt: Date | null;
  accentHex: string;
  isDark: boolean;
  isOled: boolean;
  onSignInClick: () => void;
  onSignOut: () => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  user,
  syncStatus,
  lastSyncedAt,
  accentHex,
  isDark,
  isOled,
  onSignInClick,
  onSignOut,
}) => {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const handleConfirmSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut(auth);
      onSignOut();
    } catch {
      // ignore
    } finally {
      setIsSigningOut(false);
      setShowSignOutConfirm(false);
    }
  };

  const cardBg = isOled
    ? 'bg-black border-zinc-800/60'
    : isDark
    ? 'bg-[#242428] border-zinc-700/60'
    : 'bg-white border-slate-200 shadow-xs';

  return (
    <div className={`p-5 rounded-3xl border-[0.25px] backdrop-blur-md space-y-3 transition-colors ${cardBg} ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
      <h3 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5" style={{ color: accentHex }}>
        <Cloud className="w-4 h-4" /> Account & Cloud Sync
      </h3>

      {user ? (
        /* ── Signed In State ── */
        <div className="space-y-3">
          {/* User Info Row */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-base shrink-0"
              style={{
                backgroundColor: accentHex,
                color: accentHex === '#ffffff' ? '#0f172a' : '#ffffff',
              }}
            >
              {(user.displayName?.[0] || user.email[0]).toUpperCase()}
            </div>
            <div className="min-w-0">
              {user.displayName && (
                <p className="font-extrabold text-sm truncate">{user.displayName}</p>
              )}
              <p className={`text-xs truncate ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                {user.email}
              </p>
            </div>
          </div>

          {/* Sync Status Row + Sign Out inline on the right */}
          <div className={`flex items-center justify-between px-4 py-2.5 rounded-full ${isDark ? 'bg-[#1a1a1e] border border-zinc-700/60' : 'bg-slate-50 border border-slate-200'}`}>
            {/* Left: status icon + label + last sync */}
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  syncStatus === 'syncing'
                    ? 'bg-amber-400 animate-ping'
                    : syncStatus === 'error'
                    ? 'bg-rose-500'
                    : 'bg-emerald-400'
                }`}
              />
              <div>
                <p className="text-xs font-bold leading-none">
                  {syncStatus === 'syncing'
                    ? 'Syncing to Cloud...'
                    : syncStatus === 'error'
                    ? 'Sync Error'
                    : 'Cloud Sync Active'}
                </p>
                {lastSyncedAt && (
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    Synced {lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Sign Out Button */}
            <button
              onClick={() => setShowSignOutConfirm(true)}
              disabled={isSigningOut}
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                isDark
                  ? 'border-rose-500/40 text-rose-400 bg-rose-500/10 hover:bg-rose-500/25 hover:border-rose-500/60'
                  : 'border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 hover:border-rose-400'
              }`}
            >
              {isSigningOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              {isSigningOut ? 'Leaving...' : 'Sign Out'}
            </button>
          </div>
        </div>
      ) : (
        /* ── Signed Out State ── */
        <div className="space-y-3">
          <div className={`flex items-center gap-3 p-3.5 rounded-full px-5 ${isDark ? 'bg-[#1a1a1e] border border-zinc-700/60' : 'bg-slate-50 border border-slate-200'}`}>
            <CloudOff className="w-5 h-5 text-zinc-400 shrink-0" />
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              Offline mode — your data is stored locally only. Sign in to sync across devices.
            </p>
          </div>
          <button
            onClick={onSignInClick}
            className="w-full py-3 rounded-full font-black text-sm shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            style={{
              backgroundColor: accentHex,
              color: accentHex === '#ffffff' ? '#0f172a' : '#ffffff',
            }}
          >
            <User className="w-4 h-4" />
            Sign In / Create Account
          </button>
        </div>
      )}

      {/* Sign Out Confirmation Modal */}
      {showSignOutConfirm &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 z-[9999] w-screen h-screen flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div
              className={`w-full max-w-sm p-6 rounded-3xl border-2 border-rose-500/80 shadow-2xl space-y-4 animate-pop-in ${
                isOled
                  ? 'bg-black text-slate-100'
                  : isDark
                  ? 'bg-[#242428] text-slate-100'
                  : 'bg-white text-slate-900 shadow-2xl'
              }`}
            >
              <div className="flex items-center gap-2.5 text-rose-500">
                <LogOut className="w-6 h-6" />
                <h3 className="text-base font-black">Sign Out of Sessionist?</h3>
              </div>

              <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700 font-bold'}`}>
                Are you sure you want to sign out of <strong className="text-rose-400 underline">{user?.email}</strong>? Your local data will remain safe on this device.
              </p>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800/40">
                <button
                  type="button"
                  onClick={() => setShowSignOutConfirm(false)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSignOut}
                  disabled={isSigningOut}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-rose-600/30"
                >
                  {isSigningOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                  {isSigningOut ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
