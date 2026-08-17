import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  ShieldCheck,
  UserX,
  Plus,
  Copy,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Clock,
  Key,
  Users,
  X,
  Zap,
  Ban,
  ShieldAlert,
} from 'lucide-react';

export const ADMIN_UID = '0UGzXJMH13VIkwJEvdkouVh0neB2';

interface ActivationCode {
  id: string;
  code: string;
  isUsed: boolean;
  usedBy?: string;
  usedAt?: { seconds: number };
  createdAt?: { seconds: number };
  note?: string;
}

interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  isActivated: boolean;
  isBanned?: boolean;
  activatedAt?: { seconds: number };
  activationCode?: string;
  createdAt?: { seconds: number };
  lastSeen?: { seconds: number };
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segment = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `SESS-${segment(4)}-${segment(4)}`;
}

function fmtDate(ts?: { seconds: number }): string {
  if (!ts) return '—';
  return new Date(ts.seconds * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface AdminPageProps {
  currentUid: string;
  accentHex: string;
  isDark: boolean;
  isOled: boolean;
  onClose: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  currentUid,
  accentHex,
  isDark,
  isOled,
  onClose,
}) => {
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [tab, setTabState] = useState<'codes' | 'users'>('codes');
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left');
  const [isGenerating, setIsGenerating] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeOnly, setActiveOnly] = useState(false);

  const handleTabChange = (newTab: 'codes' | 'users') => {
    if (newTab !== tab) {
      setSlideDir(newTab === 'users' ? 'left' : 'right');
      setTabState(newTab);
    }
  };

  const tabNavRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pillLeft, setPillLeft] = useState<number>(0);
  const [pillWidth, setPillWidth] = useState<number>(0);

  useEffect(() => {
    const updatePill = () => {
      const idx = tab === 'codes' ? 0 : 1;
      const activeBtn = buttonRefs.current[idx];
      const track = tabNavRef.current;
      if (activeBtn && track) {
        const btnRect = activeBtn.getBoundingClientRect();
        const trackRect = track.getBoundingClientRect();
        setPillLeft(btnRect.left - trackRect.left);
        setPillWidth(btnRect.width);
      }
    };
    updatePill();
    const timer = setTimeout(updatePill, 50);
    window.addEventListener('resize', updatePill);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePill);
    };
  }, [tab]);

  const isAdmin = currentUid === ADMIN_UID;

  const isWhiteOrBlack = !accentHex || accentHex === '#ffffff' || accentHex === '#000000' || accentHex === '#0f172a';
  const activeAccent = isWhiteOrBlack ? (isDark ? '#ffffff' : '#0f172a') : accentHex;

  const cardBg = isOled
    ? 'bg-black border-zinc-800 text-zinc-100'
    : isDark
    ? 'bg-[#18181b] border-zinc-700/60 text-zinc-100'
    : 'bg-white border-slate-200 text-slate-900';

  // Lock body scroll while Admin Panel is open
  useEffect(() => {
    const origBody = document.body.style.overflow;
    const origHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = origBody;
      document.documentElement.style.overflow = origHtml;
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    const codesQ = query(collection(db, 'activation_codes'), orderBy('createdAt', 'desc'));
    const unsubCodes = onSnapshot(codesQ, (snap) => {
      setCodes(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ActivationCode, 'id'>) }))
      );
    });

    const usersQ = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubUsers = onSnapshot(usersQ, (snap) => {
      setUsers(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UserRecord, 'id'>) }))
      );
    });

    return () => {
      unsubCodes();
      unsubUsers();
    };
  }, [isAdmin]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const code = generateCode();
      await addDoc(collection(db, 'activation_codes'), {
        code,
        isUsed: false,
        usedBy: null,
        usedAt: null,
        note: noteInput.trim() || null,
        createdAt: serverTimestamp(),
      });
      setNoteInput('');
    } catch (err) {
      console.error('Failed to generate code:', err);
      alert(`Failed to generate code: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGenerating(false);
    }
  }, [noteInput]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this code? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'activation_codes', id));
    } catch (err) {
      console.error('Failed to delete code:', err);
      alert(`Failed to delete code: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleActivation = useCallback(async (targetUser: UserRecord) => {
    const newStatus = !targetUser.isActivated;
    try {
      const userRef = doc(db, 'users', targetUser.id);
      await updateDoc(userRef, {
        isActivated: newStatus,
        activatedAt: newStatus ? serverTimestamp() : null,
        activationCode: newStatus ? (targetUser.activationCode || 'MANUAL_ADMIN') : null,
      });
    } catch (err) {
      console.error('Failed to update activation status:', err);
      alert(`Error updating status: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  const handleToggleBan = useCallback(async (targetUser: UserRecord) => {
    const isBanning = !targetUser.isBanned;
    const confirmMsg = isBanning
      ? `Ban ${targetUser.email}? They will immediately lose all access to Sessionist.`
      : `Unban ${targetUser.email}?`;
    if (!confirm(confirmMsg)) return;

    try {
      const userRef = doc(db, 'users', targetUser.id);
      await updateDoc(userRef, {
        isBanned: isBanning,
        bannedAt: isBanning ? serverTimestamp() : null,
      });
    } catch (err) {
      console.error('Failed to update ban status:', err);
      alert(`Error updating ban status: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  const [isClosing, setIsClosing] = useState<boolean>(false);

  const handleSmoothClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 180);
  };

  if (!isAdmin) {
    return ReactDOM.createPortal(
      <div
        className={`fixed inset-0 z-[10000] w-screen h-screen flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl transition-all ${
          isClosing ? 'animate-modal-backdrop-out' : 'animate-fade-in'
        }`}
      >
        <div
          className={`w-full max-w-sm p-6 sm:p-8 rounded-3xl border text-center space-y-4 shadow-2xl transition-all ${
            isClosing ? 'animate-pop-out' : 'animate-pop-in'
          } ${cardBg}`}
        >
          <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-lg">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">Access Denied</h2>
            <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              This admin panel is restricted to the developer account only.
            </p>
          </div>
          <button
            onClick={handleSmoothClose}
            className="w-full py-3 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-black text-xs shadow-lg transition-all cursor-pointer active:scale-95"
          >
            Go Back
          </button>
        </div>
      </div>,
      document.body
    );
  }

  const filteredUsers = activeOnly ? users.filter((u) => u.isActivated) : users;
  const activatedCount = users.filter((u) => u.isActivated).length;
  const unusedCodes = codes.filter((c) => !c.isUsed).length;

  return ReactDOM.createPortal(
    <div
      className={`fixed inset-0 z-[10000] w-screen h-screen flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xl transition-all overflow-hidden touch-none ${
        isClosing ? 'animate-modal-backdrop-out' : 'animate-fade-in'
      }`}
    >
      <div
        className={`w-full max-w-2xl max-h-[94vh] sm:max-h-[88vh] p-4 sm:p-7 rounded-3xl border shadow-2xl flex flex-col space-y-4 sm:space-y-5 overflow-hidden transition-all ${
          isClosing ? 'animate-pop-out' : 'animate-pop-in'
        } ${cardBg}`}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 pb-3 sm:pb-4 border-b border-zinc-800/40">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl border flex items-center justify-center shadow-md shrink-0"
              style={{ backgroundColor: `${activeAccent}20`, borderColor: `${activeAccent}50`, color: activeAccent }}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-base sm:text-lg tracking-tight flex items-center gap-2 flex-wrap">
                <span>Sessionist Admin</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  Admin Panel
                </span>
              </h2>
              <p className={`text-[11px] sm:text-xs truncate ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Manage activation codes & user permissions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSmoothClose}
              className={`p-2.5 rounded-full border transition-all cursor-pointer active:scale-95 ${
                isDark ? 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200' : 'border-slate-200 bg-slate-100 text-slate-500 hover:text-slate-900'
              }`}
              title="Close Admin Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          {[
            { icon: Users, label: 'Total Users', value: users.length, color: activeAccent },
            { icon: CheckCircle2, label: 'Activated', value: activatedCount, color: '#10b981' },
            { icon: UserX, label: 'Pending', value: users.length - activatedCount, color: '#f59e0b' },
            { icon: Key, label: 'Unused Codes', value: unusedCodes, color: activeAccent },
          ].map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className={`p-3 rounded-2xl border flex items-center justify-between transition-colors ${
                isOled ? 'bg-zinc-900/50 border-zinc-800' : isDark ? 'bg-[#242428]/50 border-zinc-700/40' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div>
                <p className={`text-[10px] font-extrabold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                  {label}
                </p>
                <p className="text-lg font-black mt-0.5">{value}</p>
              </div>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
                style={{ backgroundColor: `${color}18`, borderColor: `${color}40`, color }}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>

        {/* Tab Switcher & Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 shrink-0 pt-1">
          <div
            ref={tabNavRef}
            className={`relative p-1 flex gap-1 rounded-full border shrink-0 ${
              isOled ? 'bg-zinc-900 border-zinc-800' : isDark ? 'bg-[#242428] border-zinc-700/60' : 'bg-slate-100 border-slate-200'
            }`}
          >
            {/* 60FPS Fluid Sliding Background Pill */}
            <div
              className="absolute top-1 bottom-1 rounded-full transition-all duration-300 ease-out pointer-events-none z-0 shadow-md backdrop-blur-xl"
              style={{
                left: `${pillLeft}px`,
                width: `${pillWidth}px`,
                backgroundColor: activeAccent,
                boxShadow: `0 4px 16px ${activeAccent}40`,
              }}
            />

            {(['codes', 'users'] as const).map((t, idx) => (
              <button
                key={t}
                ref={(el) => { buttonRefs.current[idx] = el; }}
                onClick={() => handleTabChange(t)}
                className={`relative z-10 px-3.5 py-1.5 sm:px-4 rounded-full text-xs font-black transition-colors duration-200 cursor-pointer whitespace-nowrap ${
                  tab === t
                    ? (activeAccent === '#ffffff' || activeAccent === '#f8fafc' ? 'text-slate-900' : 'text-white')
                    : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t === 'codes' ? '🔑 Activation Codes' : '👥 Users List'}
              </button>
            ))}
          </div>

          {tab === 'users' && (
            <button
              onClick={() => setActiveOnly(!activeOnly)}
              className={`px-3 py-1.5 rounded-full text-xs font-extrabold cursor-pointer transition-all border whitespace-nowrap shrink-0 ml-auto sm:ml-0 ${
                activeOnly
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  : isDark ? 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200' : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}
            >
              {activeOnly ? '✓ Activated Only' : 'Show All Users'}
            </button>
          )}
        </div>

        {/* Scrollable Content Area with Fluid Slide Animation */}
        <div
          key={tab}
          className={`flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 custom-scrollbar transition-all duration-300 ${
            slideDir === 'left' ? 'animate-slide-left' : 'animate-slide-right'
          }`}
        >

          {/* ── CODES TAB ── */}
          {tab === 'codes' && (
            <>
              {/* Generate Bar */}
              <div className={`flex flex-col gap-2.5 p-3 sm:p-4 rounded-2xl border ${
                isOled ? 'bg-zinc-900/80 border-zinc-800' : isDark ? 'bg-[#242428] border-zinc-700/60' : 'bg-slate-50 border-slate-200'
              }`}>
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Code Note (e.g. For Alex)"
                  className={`w-full px-4 py-2.5 rounded-full text-xs font-semibold focus:outline-none transition-colors border ${
                    isOled ? 'bg-black border-zinc-800 text-zinc-100 placeholder-zinc-500' : isDark ? 'bg-[#18181b] border-zinc-700/60 text-zinc-100 placeholder-zinc-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full font-black text-xs shadow-md cursor-pointer disabled:opacity-60 transition-all active:scale-95"
                  style={{
                    backgroundColor: activeAccent,
                    color: activeAccent === '#ffffff' || activeAccent === '#f8fafc' ? '#0f172a' : '#ffffff',
                  }}
                >
                  {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Generate Code</span>
                </button>
              </div>

              {/* Codes List */}
              {codes.map((c) => (
                <div
                  key={c.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                    isOled ? 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700' : isDark ? 'bg-[#242428]/40 border-zinc-700/40 hover:border-zinc-600' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.isUsed ? 'bg-zinc-500' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-black text-sm tracking-wider font-mono ${c.isUsed ? 'line-through opacity-50' : ''}`}>
                          {c.code}
                        </p>
                        {c.isUsed ? (
                          <span className="px-2 py-0.5 rounded-full bg-zinc-500/15 text-zinc-400 text-[10px] font-black">Used</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-black">Active</span>
                        )}
                      </div>
                      <p className={`text-[11px] mt-0.5 font-medium truncate ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                        {c.note ? `Note: ${c.note} · ` : ''}
                        {c.isUsed ? `Used by ${c.usedBy?.slice(0, 8)}... (${fmtDate(c.usedAt)})` : `Created ${fmtDate(c.createdAt)}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!c.isUsed && (
                      <button
                        onClick={() => handleCopy(c.code, c.id)}
                        className={`p-2 rounded-full cursor-pointer transition-all ${
                          copiedId === c.id ? 'bg-emerald-500/20 text-emerald-400' : isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
                        }`}
                        title="Copy code"
                      >
                        {copiedId === c.id ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(c.id)}
                      className={`p-2 rounded-full cursor-pointer transition-all ${
                        isDark ? 'hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400' : 'hover:bg-rose-100 text-slate-400 hover:text-rose-600'
                      }`}
                      title="Delete code"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {codes.length === 0 && (
                <div className="text-center py-10 space-y-2">
                  <Key className={`w-8 h-8 mx-auto opacity-30 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`} />
                  <p className={`text-xs font-semibold ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                    No activation codes generated yet. Use the bar above to create your first code.
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── USERS TAB ── */}
          {tab === 'users' && (
            <>
              {filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                    u.isBanned
                      ? isOled ? 'bg-rose-950/20 border-rose-900/50' : isDark ? 'bg-rose-950/20 border-rose-900/40' : 'bg-rose-50 border-rose-200'
                      : isOled ? 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700' : isDark ? 'bg-[#242428]/40 border-zinc-700/40 hover:border-zinc-600' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      u.isBanned
                        ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                        : u.isActivated
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                        : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                    }`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-extrabold text-xs truncate ${u.isBanned ? 'line-through opacity-70' : ''}`}>
                          {u.email}
                        </p>
                        {u.isBanned ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-black border border-rose-500/30">
                            <ShieldAlert className="w-3 h-3" /> Banned
                          </span>
                        ) : u.isActivated ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-black">
                            <CheckCircle2 className="w-3 h-3" /> Activated
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-black">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                        {u.displayName ? `${u.displayName} · ` : ''}
                        {u.isBanned
                          ? 'Access blocked'
                          : u.isActivated ? `Activated (${u.activationCode ?? 'MANUAL'})` : 'Pending code activation'} · Joined {fmtDate(u.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Activate / Deactivate Toggle */}
                    <button
                      onClick={() => handleToggleActivation(u)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-black transition-all cursor-pointer flex items-center gap-1 border ${
                        u.isActivated
                          ? isDark ? 'border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:text-zinc-200' : 'border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200'
                          : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                      }`}
                      title={u.isActivated ? 'Deactivate account' : 'Activate account manually'}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{u.isActivated ? 'Deactivate' : 'Activate'}</span>
                    </button>

                    {/* Ban / Unban Toggle */}
                    <button
                      onClick={() => handleToggleBan(u)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-black transition-all cursor-pointer flex items-center gap-1 border ${
                        u.isBanned
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                          : 'border-rose-500/40 bg-rose-500/15 text-rose-400 hover:bg-rose-500/25'
                      }`}
                      title={u.isBanned ? 'Unban user' : 'Ban user'}
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>{u.isBanned ? 'Unban' : 'Ban'}</span>
                    </button>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="text-center py-10 space-y-2">
                  <Users className={`w-8 h-8 mx-auto opacity-30 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`} />
                  <p className={`text-xs font-semibold ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                    No registered users found.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
