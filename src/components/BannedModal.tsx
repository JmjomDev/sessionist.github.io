import React from 'react';
import ReactDOM from 'react-dom';
import { ShieldAlert, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import type { User } from 'firebase/auth';
import { AppLogoIcon } from './AppLogoIcon';

interface BannedModalProps {
  currentUser: User;
  isDark: boolean;
  isOled: boolean;
}

export const BannedModal: React.FC<BannedModalProps> = ({
  currentUser,
  isDark,
  isOled,
}) => {
  const cardBg = isOled
    ? 'bg-black border-rose-900/60 text-zinc-100'
    : isDark
    ? 'bg-[#18181b] border-rose-900/40 text-zinc-100'
    : 'bg-white border-rose-200 text-slate-900';

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] w-screen h-screen flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-fade-in">
      <div className={`w-full max-w-sm p-7 rounded-3xl border shadow-2xl space-y-6 animate-pop-in text-center ${cardBg}`}>
        
        {/* Banned Header Icon */}
        <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/20 border border-rose-500/50 text-rose-500 flex items-center justify-center shadow-lg animate-pulse">
          <ShieldAlert className="w-9 h-9" />
        </div>

        {/* Title & Message */}
        <div className="space-y-2">
          <h2 className="text-xl font-black tracking-tight text-rose-500">
            Account Suspended
          </h2>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
            The account <span className="font-bold text-rose-400">{currentUser.email}</span> has been banned from accessing Sessionist.
          </p>
        </div>

        {/* Branding Subtitle */}
        <div className={`flex items-center justify-center gap-1 py-2 px-4 rounded-2xl border ${isDark ? 'border-zinc-800 bg-zinc-900/40' : 'border-slate-200 bg-slate-50'}`}>
          <span className={`text-xs font-black tracking-tight flex items-center ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
            <AppLogoIcon color="#f43f5e" className="w-4 h-4 inline-block shrink-0 mr-0.5 -mt-0.5" />
            <span>Sessionist Security</span>
          </span>
        </div>

        {/* Sign Out Action */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-black text-xs bg-rose-500 hover:bg-rose-600 text-white shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out Account
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
