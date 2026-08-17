import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import type { AuthError } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Mail, Lock, Eye, EyeOff, Loader2, X } from 'lucide-react';
import { AppLogoIcon } from './AppLogoIcon';

interface AuthModalProps {
  onDismiss?: () => void;
  accentHex: string;
  isDark: boolean;
  isOled: boolean;
  defaultName?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ accentHex, isDark, isOled, defaultName = '' }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(defaultName);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const isWhiteOrBlack = !accentHex || accentHex === '#ffffff' || accentHex === '#000000' || accentHex === '#0f172a';
  const activeAccent = isWhiteOrBlack ? (isDark ? '#ffffff' : '#0f172a') : accentHex;

  const cardBg = isOled
    ? 'bg-black border-slate-800'
    : isDark
    ? 'bg-[#18181c] border-zinc-700/60'
    : 'bg-white border-slate-300';

  const inputBg = isOled
    ? 'bg-black border-zinc-800 text-zinc-100 placeholder-zinc-500'
    : isDark
    ? 'bg-[#242428] border-zinc-700/60 text-zinc-100 placeholder-zinc-500'
    : 'bg-slate-50 border-slate-300 text-slate-900';

  const friendlyError = (error: AuthError): string => {
    switch (error.code) {
      case 'auth/email-already-in-use': return 'This email is already registered. Try signing in instead.';
      case 'auth/invalid-email': return 'Please enter a valid email address.';
      case 'auth/weak-password': return 'Password must be at least 6 characters.';
      case 'auth/user-not-found': return 'No account found with this email address.';
      case 'auth/wrong-password': return 'Incorrect password.';
      case 'auth/invalid-credential': return 'Email or password is incorrect.';
      case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
      default: return 'Something went wrong. Please try again.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    if (mode === 'forgot') {
      setIsLoading(true);
      try {
        await sendPasswordResetEmail(auth, email.trim());
        setSuccessMsg('Password reset link sent! Check your email inbox or spam folder.');
      } catch (err) {
        setErrorMsg(friendlyError(err as AuthError));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!password.trim()) {
      setErrorMsg('Please enter your password.');
      return;
    }
    if (mode === 'signup' && !displayName.trim()) {
      setErrorMsg('Please enter your name.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const nameVal = displayName.trim();
        try {
          await updateProfile(cred.user, { displayName: nameVal });
        } catch {}
        // Store user email + name in Firestore users collection
        await setDoc(doc(db, 'users', cred.user.uid), {
          email: email.trim().toLowerCase(),
          displayName: nameVal,
          createdAt: serverTimestamp(),
          lastSeen: serverTimestamp(),
        }, { merge: true });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      // Auth state change in App.tsx will handle the rest
    } catch (err) {
      setErrorMsg(friendlyError(err as AuthError));
      setIsLoading(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] w-screen h-screen flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className={`w-full max-w-sm p-7 rounded-3xl border shadow-2xl space-y-6 animate-pop-in ${cardBg} ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div
            className="w-14 h-14 mx-auto rounded-2xl border flex items-center justify-center shadow-lg"
            style={{ backgroundColor: `${activeAccent}22`, borderColor: `${activeAccent}55`, color: activeAccent }}
          >
            <AppLogoIcon color={activeAccent} className="w-9.5 h-9.5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">
              {mode === 'signup' ? 'Create Your Account' : mode === 'forgot' ? 'Reset Password' : 'Welcome Back'}
            </h2>
            <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              {mode === 'signup'
                ? 'Sync your data across all your devices'
                : mode === 'forgot'
                ? 'Enter your email to receive a password reset link'
                : 'Sign in to sync your study data'}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name — only on sign up */}
          {mode === 'signup' && (
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                Your Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="e.g. Alex"
                className={`w-full px-6 py-3.5 rounded-full border text-sm font-semibold focus:outline-none transition-colors ${inputBg}`}
                style={{ borderColor: displayName ? `${activeAccent}60` : undefined }}
              />
            </div>
          )}

          {/* Email */}
          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`w-full pl-11 pr-6 py-3.5 rounded-full border text-sm font-semibold focus:outline-none transition-colors ${inputBg}`}
                style={{ borderColor: email ? `${activeAccent}60` : undefined }}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password — not on forgot mode */}
          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setErrorMsg(''); setSuccessMsg(''); }}
                    className="text-[11px] font-bold underline cursor-pointer hover:opacity-75 transition-opacity"
                    style={{ color: activeAccent === '#ffffff' ? (isDark ? '#ffffff' : '#0f172a') : activeAccent }}
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                  className={`w-full pl-11 pr-12 py-3.5 rounded-full border text-sm font-semibold focus:outline-none transition-colors ${inputBg}`}
                  style={{ borderColor: password ? `${activeAccent}60` : undefined }}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="px-4 py-2.5 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs font-semibold flex items-center gap-2">
              <X className="w-3.5 h-3.5 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="px-4 py-2.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <span>✓</span>
              {successMsg}
            </div>
          )}

          {/* Spam folder helper note in forgot mode */}
          {mode === 'forgot' && (
            <p className={`text-[11px] leading-relaxed text-center px-1 ${isDark ? 'text-zinc-400' : 'text-slate-500 font-medium'}`}>
              💡 If you don't see the email in your inbox within a few moments, please check your <strong>Spam / Junk</strong> folder.
            </p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-full font-black text-sm shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            style={{
              backgroundColor: activeAccent,
              color: activeAccent === '#ffffff' || activeAccent === '#f8fafc' ? '#0f172a' : '#ffffff',
            }}
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {mode === 'signup' ? 'Creating...' : mode === 'forgot' ? 'Sending...' : 'Signing in...'}</>
            ) : (
              mode === 'signup' ? '🚀 Create Account' : mode === 'forgot' ? '📧 Send Reset Link' : '→ Sign In'
            )}
          </button>
        </form>

        {/* Mode Toggle */}
        <div className="text-center">
          <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-600 font-medium'}`}>
            {mode === 'forgot' ? 'Remembered password?' : mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setMode(mode === 'forgot' ? 'signin' : mode === 'signup' ? 'signin' : 'signup'); setErrorMsg(''); setSuccessMsg(''); }}
              className="font-black underline cursor-pointer hover:opacity-75 transition-opacity ml-1"
              style={{ color: activeAccent === '#ffffff' ? (isDark ? '#ffffff' : '#0f172a') : activeAccent }}
            >
              {mode === 'forgot' ? 'Back to Sign In' : mode === 'signup' ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>


      </div>
    </div>,
    document.body
  );
};
