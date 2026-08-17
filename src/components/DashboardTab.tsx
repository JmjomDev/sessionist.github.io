import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { CheckCircle, AlertTriangle, Clock, RefreshCw, Zap, Lightbulb, ArrowUp, Target, X, BookOpen, Pause, SkipForward, Sun } from 'lucide-react';
import { useStudy } from '../context/StudyContext';

const QUICK_TIPS = [
  "Spaced repetition works because of the 'spacing effect' discovered by Hermann Ebbinghaus.",
  "Reviewing a topic right before you forget it strengthens memory retrieval pathways.",
  "The brain consolidates short-term memories into long-term storage primarily during sleep.",
  "Short 25-minute study blocks with 5-minute breaks prevent mental fatigue.",
  "Teaching a concept out loud to someone else is the fastest way to find knowledge gaps.",
  "Drinking water during study sessions improves cognitive processing speed and memory.",
  "Active recall (testing yourself) is 50% more effective for retention than re-reading notes.",
];

const getLocalDateStr = (ts: number): string => {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const DashboardTab: React.FC = () => {
  const {
    studyData,
    examData,
    processReview,
    updateLectureState,
    getSubjectColorHex,
    totalReviewsCount,
    selectedExamFocusId,
    selectedSubjectFocusName,
    setExamFocus,
    setSubjectFocus,
    restDaysData,
    toggleRestDay,
    config,
  } = useStudy();

  const isDark = config.themeMode !== 'light';
  const isOled = config.themeMode === 'oled';

  let accentHex = config.accentColor || '#6366f1';
  if (accentHex === '#000000') {
    accentHex = isOled ? '#ffffff' : isDark ? '#ffffff' : '#0f172a';
  }
  const isWhiteAccent = accentHex === '#ffffff' || accentHex === '#fff';

  const userName = config.userName || 'Learner';
  const todayDateStr = getLocalDateStr(Date.now());
  const isTodayRestDay = restDaysData.includes(todayDateStr);

  // Back to Top Scroll Detection
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Skipped lectures session tracking for Focus Subject review session
  const [skippedIds, setSkippedIds] = useState<number[]>([]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      setShowScrollTop(scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    if (document.documentElement) {
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
    if (document.body) {
      document.body.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  };

  // Random tip selection on load
  const [currentTip, setCurrentTip] = useState(QUICK_TIPS[0]);
  useEffect(() => {
    const idx = Math.floor(Math.random() * QUICK_TIPS.length);
    setCurrentTip(QUICK_TIPS[idx]);
  }, []);

  // Determine Active Focus Target
  const activeFocusedExam = examData.find((e) => e.id === selectedExamFocusId);
  const activeFocusSubjectName = selectedSubjectFocusName || (activeFocusedExam ? activeFocusedExam.module : null);

  // Filter tasks:
  // If in Focus Subject Mode -> Show ALL lectures for that subject including PAUSED ones (excluding skipped ones)!
  // If today is a Rest Day and not in Focus Mode -> 0 tasks due!
  const endOfToday = new Date().setHours(23, 59, 59, 999);

  const displayedTasks = (isTodayRestDay && !activeFocusSubjectName)
    ? []
    : studyData.filter((item) => {
        if (skippedIds.includes(item.id)) return false;

        // Focus Subject Active -> Display ALL topics under this subject (including Paused)!
        if (activeFocusSubjectName) {
          return item.module.toLowerCase() === activeFocusSubjectName.toLowerCase();
        }

        // Default Review Queue -> Hide paused lectures, show due today / overdue / new / delayed
        if (item.isPaused) return false;
        if (item.status === 'new') return true;
        if (item.status === 'delayed') return item.delayDate <= endOfToday;
        if (item.status === 'overdue') return true;
        return item.nextReviewDate <= endOfToday;
      });

  const overdueCount = studyData.filter((i) => !i.isPaused && i.status === 'overdue').length;
  const activeSRCount = studyData.filter((i) => !i.isPaused && (i.status === 'sr' || i.status === 'new')).length;

  const [animatingId, setAnimatingId] = useState<number | null>(null);

  const animateAction = (id: number, actionFn: () => void) => {
    setAnimatingId(id);
    setTimeout(() => {
      actionFn();
      setAnimatingId(null);
    }, 320);
  };

  const handleReviewGrade = (id: number, grade: 'hard' | 'good' | 'easy') => {
    animateAction(id, () => processReview(id, grade));
  };

  const handleDelayTask = (id: number) => {
    animateAction(id, () => updateLectureState(id, 'delayed'));
  };

  const handleSkipTask = (id: number) => {
    animateAction(id, () => setSkippedIds((prev) => [...prev, id]));
  };

  return (
    <div className="space-y-6 pb-8 animate-fade-slide-up relative">
      {/* Today is Rest Day Banner */}
      {isTodayRestDay && !activeFocusSubjectName && (
        <div
          className={`p-5 rounded-3xl border-[0.25px] backdrop-blur-md flex items-center justify-between animate-pop-in shadow-lg ${
            isDark
              ? 'border-amber-500/50 bg-amber-950/40 text-amber-200'
              : 'border-amber-400 bg-amber-50 text-amber-950 shadow-xs font-bold'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400">
              <Sun className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                Rest Day Active 🏖️
              </span>
              <h3 className="text-base font-black">Enjoy your break today, {userName}!</h3>
              <p className="text-xs font-medium opacity-80 mt-0.5">
                All scheduled reviews have been shifted forward without impacting your memory retention intervals.
              </p>
            </div>
          </div>

          <button
            onClick={() => toggleRestDay(todayDateStr)}
            className="px-3.5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-white shadow-md cursor-pointer active:scale-95 transition-all shrink-0"
          >
            End Rest Day
          </button>
        </div>
      )}

      {/* High-Contrast Focus Mode Banner */}
      {activeFocusSubjectName && (
        <div
          className={`p-4.5 sm:p-5 rounded-3xl border-[0.25px] backdrop-blur-md space-y-3 animate-pop-in shadow-lg transition-colors ${
            activeFocusedExam
              ? isDark
                ? 'border-rose-500/50 bg-rose-950/40 text-slate-100'
                : 'border-rose-400 bg-rose-50 text-rose-950 shadow-xs'
              : isDark
              ? 'border-emerald-500/50 bg-emerald-950/40 text-slate-100'
              : 'border-emerald-500/60 bg-emerald-50 text-emerald-950 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`p-2.5 rounded-2xl shrink-0 ${
                  activeFocusedExam
                    ? isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-200 text-rose-800'
                    : isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-200 text-emerald-800'
                }`}
              >
                {activeFocusedExam ? <Target className="w-5 h-5 animate-pulse" /> : <BookOpen className="w-5 h-5 animate-pulse" />}
              </div>
              <div className="min-w-0">
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-wider block truncate ${
                    activeFocusedExam
                      ? isDark ? 'text-rose-400' : 'text-rose-700'
                      : isDark ? 'text-emerald-400' : 'text-emerald-700'
                  }`}
                >
                  {activeFocusedExam ? `Active Exam Focus Mode` : `Active Subject Focus Mode`}
                </span>
                <h3 className={`text-base font-black break-words whitespace-normal leading-snug ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  {activeFocusSubjectName}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setExamFocus(null);
                  setSubjectFocus(null);
                  setSkippedIds([]);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border active:scale-95 ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700/60'
                    : 'bg-white hover:bg-slate-100 text-slate-900 border-slate-300 shadow-xs'
                }`}
              >
                <X className="w-4 h-4" /> Exit Focus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          className={`p-4 rounded-[28px] border-[0.25px] backdrop-blur-md flex flex-col justify-between transition-all ${
            isOled
              ? 'bg-black border-slate-700/80 text-slate-100 shadow-md shadow-black'
              : isDark
              ? 'bg-[#27272a]/70 border-zinc-700/60 text-zinc-100'
              : 'bg-white border-slate-200 shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Due Today</span>
            <CheckCircle className="w-4 h-4" style={{ color: accentHex.toLowerCase() === '#ffffff' ? (isDark ? '#ffffff' : '#0f172a') : accentHex }} />
          </div>
          <div className="mt-2 text-3xl font-black" style={{ color: accentHex.toLowerCase() === '#ffffff' ? (isDark ? '#ffffff' : '#0f172a') : accentHex }}>
            {displayedTasks.length}
          </div>
        </div>

        <div
          className={`p-4 rounded-[28px] border-[0.25px] backdrop-blur-md flex flex-col justify-between transition-all ${
            isOled
              ? 'bg-black border-slate-700/80 text-slate-100 shadow-md shadow-black'
              : isDark
              ? 'bg-[#27272a]/70 border-zinc-700/60 text-zinc-100'
              : 'bg-white border-slate-200 shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-rose-400">
            <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>Overdue</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="mt-2 text-3xl font-black text-rose-400">
            {overdueCount}
          </div>
        </div>

        <div
          className={`p-4 rounded-[28px] border-[0.25px] backdrop-blur-md flex flex-col justify-between transition-all ${
            isOled
              ? 'bg-black border-slate-700/80 text-slate-100 shadow-md shadow-black'
              : isDark
              ? 'bg-[#27272a]/70 border-zinc-700/60 text-zinc-100'
              : 'bg-white border-slate-200 shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-400">
            <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Active</span>
            <RefreshCw className="w-4 h-4" />
          </div>
          <div className="mt-2 text-3xl font-black text-emerald-400">
            {activeSRCount}
          </div>
        </div>

        <div
          className={`p-4 rounded-[28px] border-[0.25px] backdrop-blur-md flex flex-col justify-between transition-all ${
            isOled
              ? 'bg-black border-slate-700/80 text-slate-100 shadow-md shadow-black'
              : isDark
              ? 'bg-[#27272a]/70 border-zinc-700/60 text-zinc-100'
              : 'bg-white border-slate-200 shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-amber-400">
            <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>Completed</span>
            <Zap className="w-4 h-4" />
          </div>
          <div className="mt-2 text-3xl font-black text-amber-400">
            {totalReviewsCount}
          </div>
        </div>
      </div>

      {/* Main Review Tasks List */}
      <div
        className={`p-6 rounded-3xl border-[0.25px] backdrop-blur-md space-y-4 transition-colors ${
          isOled
            ? 'bg-black border-slate-700/80 text-slate-100 shadow-lg shadow-black'
            : isDark
            ? 'bg-[#27272a]/70 border-zinc-700/60 text-zinc-100'
            : 'bg-white/90 border-slate-200 shadow-xs text-slate-900'
        }`}
      >
        <div className={`pb-3 ${displayedTasks.length > 0 ? 'border-b border-slate-800/40' : ''}`}>
          <h2 className="text-base font-bold flex items-center gap-2">
            <CheckCircle className="w-5 h-5" style={{ color: accentHex }} />
            {activeFocusSubjectName ? `${activeFocusSubjectName} Lectures` : "Today's Review Queue"} ({displayedTasks.length})
          </h2>
        </div>

        {displayedTasks.length === 0 ? (
          <div className="pt-8 pb-2 text-center space-y-4 animate-fade-in flex flex-col min-h-[340px] justify-between">
            <div className="space-y-4 pt-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  {isTodayRestDay ? 'Rest Day in progress 🏖️' : 'All caught up for today! 🎉'}
                </h3>
                <p className={`text-xs mt-1 max-w-sm mx-auto font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {isTodayRestDay
                    ? 'Take it easy today! Your memory intervals have been preserved.'
                    : 'Great job completing your spaced repetition reviews. Check back tomorrow for optimal memory retention.'}
                </p>
              </div>
            </div>

            {/* Did You Know? Pro Tip Callout Section (Positioned at bottom) */}
            <div className="pt-6 pb-1 max-w-xl mx-auto text-center space-y-1.5 w-full mt-auto">
              <div className="flex items-center justify-center gap-2 text-amber-400">
                <Lightbulb className="w-4 h-4 animate-pulse" />
                <span className="text-xs font-bold tracking-tight">
                  {userName}, Did you know? 💡
                </span>
              </div>
              <p
                className={`text-xs italic leading-relaxed px-4 break-words max-w-xl mx-auto ${
                  isDark ? 'text-slate-300' : 'text-slate-700 font-medium'
                }`}
              >
                "{currentTip}"
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedTasks.map((item) => {
              const color = getSubjectColorHex(item.module);

              // Calculate Next Review Gap Days Preview
              let hardDays = 1;
              let goodDays = item.repetition === 0 ? 1 : item.repetition === 1 ? 4 : Math.min(15, Math.round(item.interval * item.efactor * 0.9));
              let easyDays = item.repetition === 0 ? 3 : Math.min(15, Math.round(item.interval * item.efactor * 1.1));

              if (config.algoMode === 'fixed') {
                hardDays = config.fixedHard;
                goodDays = config.fixedGood;
                easyDays = config.fixedEasy;
              }

              const isAnimatingOut = animatingId === item.id;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border-[0.25px] space-y-3 backdrop-blur-md transition-all duration-300 ease-in-out flex items-stretch gap-3 ${
                    isAnimatingOut
                      ? 'translate-x-[120%] opacity-0 max-h-0 py-0 my-0 border-transparent overflow-hidden'
                      : 'translate-x-0 opacity-100 max-h-[500px]'
                  } ${
                    isOled
                      ? 'bg-black border-slate-700/80'
                      : isDark
                      ? 'bg-[#27272a]/50 border-zinc-700/60'
                      : 'bg-slate-50 border-slate-200 shadow-xs'
                  }`}
                >
                  {/* Straight Inner Accent Color Line Bar with NO Top/Bottom Curve */}
                  <div
                    className="w-1.5 self-stretch rounded-full shrink-0 my-0.5"
                    style={{ backgroundColor: color }}
                  />

                  <div className="flex-1 space-y-3">
                    {/* Card Header: Subject & Topic + Status */}
                    <div className="flex flex-col gap-1.5 w-full min-w-0">
                      {/* Top Row: Module Name (left) & REP Badge / Statuses (right) */}
                      <div className="flex items-center justify-between gap-2 w-full min-w-0">
                        <span className="text-xs sm:text-sm font-black uppercase tracking-widest truncate min-w-0" style={{ color }}>
                          {item.module}
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-black tracking-wider border shadow-xs ${
                            isDark
                              ? 'bg-purple-500/30 text-purple-200 border-purple-400/50'
                              : 'bg-purple-600 text-white border-purple-700 font-black shadow-sm'
                          }`}>
                            #{item.repetition + 1}
                          </span>

                          {item.isPaused && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase bg-slate-500/15 border border-slate-500/30 text-slate-400 flex items-center gap-1">
                              <Pause className="w-3 h-3" /> Paused
                            </span>
                          )}
                          {!item.isPaused && item.status === 'overdue' && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Overdue
                            </span>
                          )}
                          {!item.isPaused && item.status === 'delayed' && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Delayed
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Topic Title: Full Width */}
                      <h3 className={`text-base sm:text-xl font-black break-words whitespace-normal leading-snug w-full ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                        {item.topic}
                      </h3>
                    </div>

                    {/* Card Actions: Spaced Repetition Grading */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 w-full min-w-0">
                      <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center sm:gap-2 w-full sm:w-auto">
                        {/* Hard Button */}
                        <button
                          onClick={() => handleReviewGrade(item.id, 'hard')}
                          className="py-2.5 px-1 sm:px-4 rounded-xl sm:rounded-full text-center bg-rose-600 hover:bg-rose-500 text-white border border-rose-400/50 shadow-md active:scale-95 transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1"
                        >
                          <span className="text-xs sm:text-sm font-black">Hard</span>
                          <span className="text-xs sm:text-sm font-black text-rose-100">({hardDays}d)</span>
                        </button>

                        {/* Good/Medium Button — ORANGE COLOR */}
                        <button
                          onClick={() => handleReviewGrade(item.id, 'good')}
                          className="py-2.5 px-1 sm:px-4 rounded-xl sm:rounded-full text-center bg-orange-500 hover:bg-orange-400 text-white border border-orange-400/50 shadow-md active:scale-95 transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1"
                        >
                          <span className="text-xs sm:text-sm font-black">Medium</span>
                          <span className="text-xs sm:text-sm font-black text-orange-100">({goodDays}d)</span>
                        </button>

                        {/* Easy Button */}
                        <button
                          onClick={() => handleReviewGrade(item.id, 'easy')}
                          className="py-2.5 px-1 sm:px-4 rounded-xl sm:rounded-full text-center bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 shadow-md active:scale-95 transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1"
                        >
                          <span className="text-xs sm:text-sm font-black">Easy</span>
                          <span className="text-xs sm:text-sm font-black text-emerald-100">({easyDays}d+)</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-start sm:justify-end gap-2 w-full sm:w-auto mt-0.5 sm:mt-0">
                        {/* Skip Button: ONLY SHOWN IN SUBJECT FOCUS REVIEW MODE */}
                        {activeFocusSubjectName && (
                          <button
                            onClick={() => handleSkipTask(item.id)}
                            className={`w-full sm:w-auto px-4 py-2 rounded-xl sm:rounded-full text-xs sm:text-sm font-extrabold border transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
                              isDark
                                ? 'border-slate-700/60 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white'
                                : 'border-slate-300 bg-slate-200 text-slate-800 hover:bg-slate-300 shadow-xs'
                            }`}
                            title="Skip lecture for now"
                          >
                            <SkipForward className="w-3.5 h-3.5" /> Skip
                          </button>
                        )}

                        {/* Postpone Button: ONLY SHOWN IN NORMAL DAILY REVIEW MODE */}
                        {!activeFocusSubjectName && (
                          <button
                            onClick={() => handleDelayTask(item.id)}
                            className="w-full sm:w-auto px-4 py-2 rounded-xl sm:rounded-full text-xs sm:text-sm font-extrabold border border-amber-500/60 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            <Clock className="w-3.5 h-3.5" /> Postpone
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Viewport-Anchored Back to Top Button */}
      {ReactDOM.createPortal(
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            scrollToTop();
          }}
          className={`fixed bottom-28 right-4 sm:bottom-6 sm:right-6 z-[100000] p-3 rounded-full shadow-2xl border backdrop-blur-2xl transition-all duration-300 transform cursor-pointer active:scale-95 ${
            showScrollTop
              ? 'opacity-100 scale-100 pointer-events-auto'
              : 'opacity-0 scale-90 pointer-events-none'
          }`}
          style={{
            backgroundColor: isOled ? '#121215' : isDark ? '#27272a' : '#ffffff',
            borderColor: accentHex === '#ffffff' ? (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.3)') : `${accentHex}60`,
            color: isWhiteAccent ? (isDark ? '#ffffff' : '#0f172a') : accentHex,
          }}
          title="Back to Top"
        >
          <ArrowUp className="w-5 h-5 stroke-[2.5]" />
        </button>,
        document.body
      )}
    </div>
  );
};
