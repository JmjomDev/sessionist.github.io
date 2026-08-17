import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Trash2, RefreshCw, Layers, Target, X, BookOpen, Check, Bell, ArrowUp, Edit2, Plus } from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import type { Exam, SubjectReview, StudyItem } from '../types/study';
import { DatePickerModal } from './DatePickerModal';
import { CustomSelect } from './CustomSelect';
import { ConfirmationModal } from './ConfirmationModal';
import { LiquidGlass } from './LiquidGlass';
import { getAccentStyle } from '../utils/themeUtils';

interface ScheduleTabProps {
  onNavigateToReview?: () => void;
}

// Local timezone date string helper (returns YYYY-MM-DD in local time)
const getLocalDateStr = (ts: number): string => {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Calculate Days Until Target Date
const getDaysUntil = (targetDateStr: string): number => {
  if (!targetDateStr) return 0;
  const target = new Date(targetDateStr).getTime();
  const today = new Date().setHours(0, 0, 0, 0);
  const diff = target - today;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const ScheduleTab: React.FC<ScheduleTabProps> = ({ onNavigateToReview }) => {
  const {
    subjectsData,
    studyData,
    examData,
    subjectReviewsData,
    addExam,
    deleteExam,
    updateExam,
    toggleExamCompleted,
    addSubjectReview,
    deleteSubjectReview,
    getSubjectColorHex,
    setExamFocus,
    setSubjectFocus,
    restDaysData,
    toggleRestDay,
    toggleRestDayOverride,
    isRestDay,
    config,
  } = useStudy();

  const isDark = config.themeMode !== 'light';
  const isOled = config.themeMode === 'oled';

  let accentHex = config.accentColor || '#6366f1';
  if (accentHex === '#ffffff' || accentHex === '#000000') {
    accentHex = isDark ? '#ffffff' : '#0f172a';
  }
  const isWhiteAccent = accentHex === '#ffffff';

  const [currentCalDate, setCurrentCalDate] = useState<Date>(new Date());
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [animKey, setAnimKey] = useState<number>(Date.now());

  // Back to Top Scroll Detection
  const [showScrollTop, setShowScrollTop] = useState(false);
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

  // Exam scheduling states
  const [selectedExamSubject, setSelectedExamSubject] = useState('');
  const [selectedExamDate, setSelectedExamDate] = useState('');
  const [selectedLinkedLectures, setSelectedLinkedLectures] = useState<number[]>([]);
  const [selectedReminderDays, setSelectedReminderDays] = useState<number>(3); // Default 3 days before

  // Subject review scheduling states
  const [selectedReviewSubject, setSelectedReviewSubject] = useState('');
  const [selectedReviewDate, setSelectedReviewDate] = useState('');

  const [activeForm, setActiveForm] = useState<'exam' | 'subjectReview'>('exam');
  const [toastMessage, setToastMessage] = useState('');

  // DatePicker Modal state
  const [datePickerTarget, setDatePickerTarget] = useState<'exam' | 'editModalExam' | 'review' | null>(null);

  // In-Modal Exam Edit States (Isolated from main schedule form)
  const [editModalSubject, setEditModalSubject] = useState('');
  const [editModalDate, setEditModalDate] = useState('');
  const [editModalLinkedLectures, setEditModalLinkedLectures] = useState<number[]>([]);
  const [editModalReminderDays, setEditModalReminderDays] = useState<number>(3);

  const toggleEditModalLinkedLecture = (id: number) => {
    setEditModalLinkedLectures((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Confirmation Modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'exam' | 'subjectReview';
    id: number;
    title: string;
  } | null>(null);

  // Exam Details Modal State
  const [viewingExamDetails, setViewingExamDetails] = useState<Exam | null>(null);
  const [isEditingModalExam, setIsEditingModalExam] = useState<boolean>(false);
  const [editingExamId, setEditingExamId] = useState<number | null>(null);

  // Calendar Day Detail Modal state
  const [selectedDayDetail, setSelectedDayDetail] = useState<{
    dateStr: string;
    dayNum: number;
    exams: Exam[];
    subjectReviews: SubjectReview[];
    lectures: StudyItem[];
    loggedLectures: StudyItem[];
  } | null>(null);

  // Lock background page scroll while any schedule modal/popup is open
  useEffect(() => {
    if (selectedDayDetail || viewingExamDetails || datePickerTarget || deleteConfirm) {
      const origBody = document.body.style.overflow;
      const origHtml = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = origBody;
        document.documentElement.style.overflow = origHtml;
      };
    }
  }, [selectedDayDetail, viewingExamDetails, datePickerTarget, deleteConfirm]);





  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const changeMonth = (delta: number) => {
    setSlideDirection(delta > 0 ? 'left' : 'right');
    const next = new Date(currentCalDate.getFullYear(), currentCalDate.getMonth() + delta, 1);
    setCurrentCalDate(next);
    setAnimKey(Date.now());
  };

  const handleScheduleExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamSubject || !selectedExamDate) {
      showToast('Please select a subject and exam date.');
      return;
    }

    if (editingExamId !== null) {
      updateExam(editingExamId, {
        module: selectedExamSubject,
        date: selectedExamDate,
        linkedLectures: selectedLinkedLectures,
        reminderDays: selectedReminderDays,
      });
      setEditingExamId(null);
      setSelectedExamDate('');
      setSelectedLinkedLectures([]);
      showToast('Exam details updated successfully!');
    } else {
      const success = addExam(selectedExamSubject, selectedExamDate, selectedLinkedLectures, selectedReminderDays);
      if (success) {
        setSelectedExamDate('');
        setSelectedLinkedLectures([]);
        showToast('Exam scheduled successfully with reminder!');
      }
    }
  };

  const handleScheduleSubjectReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReviewSubject || !selectedReviewDate) {
      showToast('Please select a subject and review date.');
      return;
    }

    const success = addSubjectReview(selectedReviewSubject, selectedReviewDate);
    if (success) {
      setSelectedReviewDate('');
      showToast(`Subject review for ${selectedReviewSubject} scheduled!`);
    }
  };

  const handleEnterExamFocus = (examId: number) => {
    setExamFocus(examId);
    if (selectedDayDetail) setSelectedDayDetail(null);
    if (viewingExamDetails) setViewingExamDetails(null);
    showToast('Redirecting to Review Tab in Exam Focus Mode...');
    if (onNavigateToReview) {
      onNavigateToReview();
    }
  };

  const handleEnterSubjectFocus = (moduleName: string) => {
    setSubjectFocus(moduleName);
    if (selectedDayDetail) setSelectedDayDetail(null);
  };

  const toggleLinkedLecture = (id: number) => {
    if (selectedLinkedLectures.includes(id)) {
      setSelectedLinkedLectures(selectedLinkedLectures.filter((i) => i !== id));
    } else {
      setSelectedLinkedLectures([...selectedLinkedLectures, id]);
    }
  };

  const subjectOptions = subjectsData.map((s) => ({
    value: s.name,
    label: s.name,
    color: s.color,
  }));

  const reminderOptions = [
    { value: '0', label: 'No Reminder' },
    { value: '1', label: '1 Day Before' },
    { value: '3', label: '3 Days Before' },
    { value: '7', label: '7 Days Before' },
    { value: '14', label: '14 Days Before' },
  ];

  const year = currentCalDate.getFullYear();
  const month = currentCalDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();

  // Grid padding to ensure EXACT 42 slots (6 rows of 7 days) for a constant calendar height
  const totalSlotsUsed = startWeekday + daysInMonth;
  const trailingEmptySlots = Math.max(0, 42 - totalSlotsUsed);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const today = new Date();

  return (
    <div className="space-y-6 pb-4 relative animate-fade-slide-up">
      {toastMessage &&
        ReactDOM.createPortal(
          <div
            className="fixed bottom-28 sm:bottom-24 left-1/2 -translate-x-1/2 z-[100001] px-5 py-3 max-w-[90vw] w-max rounded-[28px] text-xs font-black shadow-2xl border border-white/25 backdrop-blur-2xl animate-pop-in select-none pointer-events-none flex items-center justify-center gap-2 text-center break-words leading-relaxed"
            style={{ backgroundColor: accentHex, color: isWhiteAccent ? '#0f172a' : '#ffffff' }}
          >
            <span>{toastMessage}</span>
          </div>,
          document.body
        )}

      {/* Calendar Card with Diagonal Stripes for Rest Days */}
      <LiquidGlass
        refraction={0.07}
        aberration={0.08}
        bevelWidth={0.22}
        bevelDepth={0.16}
        frost={0}
        tilt={true}
      >
        <div
          className={`p-3.5 sm:p-6 rounded-3xl border backdrop-blur-2xl transition-colors max-w-full overflow-x-hidden ${
            isOled
              ? 'bg-black/35 border-white/20 text-slate-100 shadow-[0_25px_60px_rgba(0,0,0,0.9),inset_0_1.5px_1px_rgba(255,255,255,0.35)]'
              : isDark
              ? 'bg-[#18181b]/40 border-white/20 text-zinc-100 shadow-[0_25px_60px_rgba(0,0,0,0.7),inset_0_1.5px_1px_rgba(255,255,255,0.35)]'
              : 'bg-white/40 border-white/60 text-slate-900 shadow-[0_20px_40px_rgba(0,0,0,0.12),inset_0_1.5px_1px_rgba(255,255,255,0.8)]'
          }`}
        >
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => changeMonth(-1)}
            className={`w-9 h-9 rounded-full border-[0.25px] transition-all cursor-pointer active:scale-90 hover:scale-105 flex items-center justify-center ${
              isDark ? 'border-zinc-700/60 bg-[#242428] hover:bg-[#2c2c30] text-zinc-200' : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
            title="Previous Month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold">
            {monthNames[month]} {year}
          </h2>
          <button
            onClick={() => changeMonth(1)}
            className={`w-9 h-9 rounded-full border-[0.25px] transition-all cursor-pointer active:scale-90 hover:scale-105 flex items-center justify-center ${
              isDark ? 'border-zinc-700/60 bg-[#242428] hover:bg-[#2c2c30] text-zinc-200' : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
            title="Next Month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Days Header */}
        <div className={`grid grid-cols-7 text-center text-xs font-bold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div
          key={animKey}
          className={`grid grid-cols-7 gap-1 ${
            slideDirection === 'left' ? 'animate-slide-left' : 'animate-slide-right'
          }`}
        >
          {/* Previous Month Day Cells */}
          {Array.from({ length: startWeekday }).map((_, i) => {
            const prevMonthLastDay = new Date(year, month, 0).getDate();
            const prevDayNum = prevMonthLastDay - startWeekday + 1 + i;

            const prevDateObj = new Date(year, month - 1, prevDayNum);
            const prevDateStr = getLocalDateStr(prevDateObj.getTime());
            const isPrevRest = restDaysData.includes(prevDateStr);

            const prevLogged = studyData.filter((item) => getLocalDateStr(item.id) === prevDateStr);
            const prevLectures = studyData.filter((item) => {
              if (item.status === 'delayed') return getLocalDateStr(item.delayDate) === prevDateStr;
              return getLocalDateStr(item.nextReviewDate) === prevDateStr;
            });
            const prevExams = examData.filter((e) => e.date === prevDateStr);
            const prevReviews = subjectReviewsData.filter((r) => r.date === prevDateStr);

            return (
              <div
                key={`empty-prev-${i}`}
                className={`h-20 p-1.5 rounded-2xl border flex flex-col justify-between select-none cursor-default ${
                  isPrevRest
                    ? isDark
                      ? 'bg-rest-stripes-dark animate-stripes border-amber-500/40 text-amber-300 opacity-60'
                      : 'bg-rest-stripes-light animate-stripes border-amber-300 text-amber-900 opacity-70 font-semibold'
                    : isDark
                    ? 'border-dashed border-zinc-800/80 bg-[#17171a]/50 text-zinc-600'
                    : 'border-dashed border-slate-300/80 bg-slate-100/70 text-slate-400 font-semibold'
                }`}
              >
                <span className="text-[11px] text-right font-semibold opacity-60">{prevDayNum}</span>

                {isPrevRest ? (
                  <div className="flex-1 flex items-center justify-center -mt-2">
                    <span className="text-xs font-black tracking-widest text-amber-500/80 uppercase">
                      REST
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1 overflow-y-auto max-h-12 no-scrollbar pointer-events-none opacity-55">
                  {prevExams.map((e) => (
                    <div key={`p-exam-${e.id}`} className="px-1 py-0.5 rounded text-[8px] font-bold text-white bg-slate-500 truncate">
                      🎓 {e.module}
                    </div>
                  ))}
                  {prevReviews.map((r) => (
                    <div key={`p-rev-${r.id}`} className="px-1 py-0.5 rounded text-[8px] font-bold border border-slate-400 text-slate-500 truncate">
                      🔄 {r.module}
                    </div>
                  ))}
                  {prevLogged.map((l) => (
                    <div key={`p-log-${l.id}`} className="px-1 py-0.5 rounded text-[8px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 truncate">
                      ✨ {l.topic}
                    </div>
                  ))}
                  {prevLectures.map((l) => (
                    <div key={`p-lec-${l.id}`} className="px-1 py-0.5 rounded text-[8px] font-semibold bg-slate-200/50 text-slate-600 truncate">
                      📖 {l.topic}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
          })}

          {/* Current Month Day Cells (Rest Days render with Diagonal Stripes Background) */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === dayNum;
            const isDayRest = isRestDay(dateStr);

            const dayExams = examData.filter((e) => e.date === dateStr);
            const dayReviews = subjectReviewsData.filter((r) => r.date === dateStr);

            // Logged lectures (added/created on this day)
            const dayLoggedLectures = studyData.filter((item) => getLocalDateStr(item.id) === dateStr);

            // Active or Delayed Target Lectures scheduled for this day
            const dayLectures = studyData.filter((item) => {
              if (item.status === 'delayed') {
                return getLocalDateStr(item.delayDate) === dateStr;
              }
              return getLocalDateStr(item.nextReviewDate) === dateStr;
            });

            // Delayed FROM this day (Original due date cell -> renders with STRIKETHROUGH)
            const delayedFromHereLectures = studyData.filter((item) => {
              if (item.status !== 'delayed') return false;
              const origStr = getLocalDateStr(item.originalDueDate || item.nextReviewDate);
              const targetStr = getLocalDateStr(item.delayDate);
              return origStr === dateStr && origStr !== targetStr;
            });

            const hasEvents =
              dayExams.length > 0 ||
              dayReviews.length > 0 ||
              dayLoggedLectures.length > 0 ||
              dayLectures.length > 0 ||
              delayedFromHereLectures.length > 0;

            return (
              <div
                key={dayNum}
                onClick={() =>
                  setSelectedDayDetail({
                    dateStr,
                    dayNum,
                    exams: dayExams,
                    subjectReviews: dayReviews,
                    lectures: [...dayLectures, ...delayedFromHereLectures],
                    loggedLectures: dayLoggedLectures,
                  })
                }
                className={`h-20 p-1.5 rounded-2xl border-[0.25px] flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.03] active:scale-95 overflow-hidden ${
                  isDayRest
                    ? isDark
                      ? 'bg-rest-stripes-dark animate-stripes border-amber-500/60 text-amber-200'
                      : 'bg-rest-stripes-light animate-stripes border-amber-400 text-amber-950 font-bold shadow-xs'
                    : isToday
                    ? 'border-indigo-500 bg-indigo-500/10 font-bold shadow-xs'
                    : hasEvents
                    ? isDark
                      ? 'border-zinc-700/60 bg-[#27272a]/60 hover:border-zinc-500'
                      : 'border-slate-300 bg-slate-100 hover:border-slate-400 text-slate-900'
                    : isDark
                    ? 'border-zinc-800/60 bg-[#27272a]/30'
                    : 'border-slate-200 bg-white text-slate-900 shadow-2xs'
                }`}
                style={isToday && !isDayRest ? { borderColor: accentHex, backgroundColor: `${accentHex}15` } : {}}
              >
                <span
                  className={`text-[11px] text-right ${
                    isDayRest
                      ? 'font-black text-amber-500'
                      : isToday
                      ? 'font-black'
                      : isDark
                      ? 'text-slate-200 font-extrabold'
                      : 'text-slate-900 font-black'
                  }`}
                  style={isToday && !isDayRest ? { color: accentHex } : {}}
                >
                  {dayNum}
                </span>

                {isDayRest ? (
                  <div className="flex-1 flex items-center justify-center -mt-2">
                    <span className="text-xs font-black tracking-widest text-amber-500 uppercase drop-shadow-xs">
                      REST
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1 overflow-y-auto max-h-12 no-scrollbar">

                  {/* Exams */}
                  {dayExams.map((e) => {
                    const color = getSubjectColorHex(e.module);
                    return (
                      <div
                        key={`exam-${e.id}`}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setViewingExamDetails(e);
                        }}
                        className="px-1 py-0.5 rounded-lg text-[8px] font-extrabold text-white truncate shadow-xs cursor-pointer hover:opacity-90 active:scale-95 transition-all"
                        style={{ backgroundColor: color }}
                        title={`${e.module} Exam (Click for Details)`}
                      >
                        🎓 {e.module}
                      </div>
                    );
                  })}

                  {/* Subject Reviews */}
                  {dayReviews.map((r) => {
                    const color = getSubjectColorHex(r.module);
                    return (
                      <div
                        key={`review-${r.id}`}
                        className="px-1 py-0.5 rounded-lg text-[8px] font-extrabold border-[0.25px] truncate"
                        style={{ borderColor: color, color }}
                        title={`Review Subject: ${r.module}`}
                      >
                        🔄 {r.module}
                      </div>
                    );
                  })}

                  {/* Logged / Created Lectures */}
                  {dayLoggedLectures.map((l) => (
                    <div
                      key={`logged-${l.id}`}
                      className={`px-1.5 py-0.5 rounded-lg text-[9px] truncate font-black flex items-center justify-between gap-1 ${
                        isDark
                          ? 'bg-indigo-950/90 text-indigo-100 border border-indigo-500/60 shadow-xs'
                          : 'bg-indigo-100 text-indigo-950 border border-indigo-300 font-black'
                      }`}
                      title={`Logged: ${l.topic} (Scheduled for Rep #${l.repetition + 1})`}
                    >
                      <span className="truncate">✨ {l.topic}</span>
                      <span className="shrink-0 font-mono text-[8px] opacity-80">(#{l.repetition + 1})</span>
                    </div>
                  ))}

                  {/* Active / Delayed Target Lectures */}
                  {dayLectures.map((l) => (
                    <div
                      key={`lec-${l.id}`}
                      className={`px-1 py-0.5 rounded-lg text-[8px] truncate ${
                        l.status === 'delayed'
                          ? isDark
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold'
                            : 'bg-amber-100 text-amber-900 border border-amber-300 font-black'
                          : isDark
                          ? 'bg-slate-700/60 text-slate-200 font-semibold'
                          : 'bg-slate-200 text-slate-900 font-bold border border-slate-300'
                      }`}
                      title={l.status === 'delayed' ? `Delayed Revision: ${l.topic} (Rep #${l.repetition + 1})` : `Revision: ${l.topic} (Rep #${l.repetition + 1})`}
                    >
                      {l.status === 'delayed' ? '🕒 ' : '📖 '}{l.topic} (#{l.repetition + 1})
                    </div>
                  ))}

                  {/* Strikethrough Delayed Lectures on Original Due Date */}
                  {delayedFromHereLectures.map((l) => (
                    <div
                      key={`strikethrough-${l.id}`}
                      className={`px-1 py-0.5 rounded-lg text-[8px] truncate line-through opacity-70 ${
                        isDark
                          ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20 font-semibold'
                          : 'bg-rose-100 text-rose-900 border border-rose-300 font-bold'
                      }`}
                      title={`Postponed from today: ${l.topic}`}
                    >
                      <s>📖 {l.topic} (#{l.repetition + 1})</s>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
          })}

          {/* Next Month Day Cells */}
          {Array.from({ length: trailingEmptySlots }).map((_, i) => {
            const nextDayNum = i + 1;
            const nextDateObj = new Date(year, month + 1, nextDayNum);
            const nextDateStr = getLocalDateStr(nextDateObj.getTime());
            const isNextRest = restDaysData.includes(nextDateStr);

            const nextLogged = studyData.filter((item) => getLocalDateStr(item.id) === nextDateStr);
            const nextLectures = studyData.filter((item) => {
              if (item.status === 'delayed') return getLocalDateStr(item.delayDate) === nextDateStr;
              return getLocalDateStr(item.nextReviewDate) === nextDateStr;
            });
            const nextExams = examData.filter((e) => e.date === nextDateStr);
            const nextReviews = subjectReviewsData.filter((r) => r.date === nextDateStr);

            return (
              <div
                key={`empty-next-${i}`}
                className={`h-20 p-1.5 rounded-2xl border flex flex-col justify-between select-none cursor-default ${
                  isNextRest
                    ? isDark
                      ? 'bg-rest-stripes-dark border-amber-500/40 text-amber-300 opacity-60'
                      : 'bg-rest-stripes-light border-amber-300 text-amber-900 opacity-70 font-semibold'
                    : isDark
                    ? 'border-dashed border-zinc-800/80 bg-[#17171a]/50 text-zinc-600'
                    : 'border-dashed border-slate-300/80 bg-slate-100/70 text-slate-400 font-semibold'
                }`}
              >
                <span className="text-[11px] text-right font-semibold opacity-60">{nextDayNum}</span>

                {isNextRest ? (
                  <div className="flex-1 flex items-center justify-center -mt-2">
                    <span className="text-xs font-black tracking-widest text-amber-500/80 uppercase">
                      REST
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1 overflow-y-auto max-h-12 no-scrollbar pointer-events-none opacity-55">
                    {nextExams.map((e) => (
                      <div key={`n-exam-${e.id}`} className="px-1 py-0.5 rounded text-[8px] font-bold text-white bg-slate-500 truncate">
                        🎓 {e.module}
                      </div>
                    ))}
                    {nextReviews.map((r) => (
                      <div key={`n-rev-${r.id}`} className="px-1 py-0.5 rounded text-[8px] font-bold border border-slate-400 text-slate-500 truncate">
                        🔄 {r.module}
                      </div>
                    ))}
                    {nextLogged.map((l) => (
                      <div key={`n-log-${l.id}`} className="px-1 py-0.5 rounded text-[8px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 truncate">
                        ✨ {l.topic}
                      </div>
                    ))}
                    {nextLectures.map((l) => (
                      <div key={`n-lec-${l.id}`} className="px-1 py-0.5 rounded text-[8px] font-semibold bg-slate-200/50 text-slate-600 truncate">
                        📖 {l.topic}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </LiquidGlass>

      {/* Scheduler Form Selector */}
      <div
        className={`p-6 rounded-3xl border-[0.25px] backdrop-blur-md transition-colors ${
          isOled
            ? 'bg-black border-slate-800/40 text-slate-100'
            : isDark
            ? 'bg-[#27272a]/70 border-zinc-700/60 text-zinc-100'
            : 'bg-white border-slate-200 shadow-xs text-slate-900'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-3 border-b border-zinc-800/40">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 shrink-0" style={{ color: accentHex }} />
            <h2 className="text-base sm:text-lg font-bold">Schedule Activity</h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={() => setActiveForm('exam')}
              className={`w-full sm:w-auto py-2.5 px-4 rounded-full text-xs font-extrabold transition-all duration-300 ease-out cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeForm === 'exam'
                  ? 'text-white shadow-md scale-102'
                  : isDark
                  ? 'bg-[#1c1c20] border border-zinc-700/60 text-zinc-400 hover:bg-[#27272a]'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
              style={activeForm === 'exam' ? getAccentStyle(accentHex, isDark) : {}}
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Schedule Exam</span>
            </button>
            <button
              onClick={() => setActiveForm('subjectReview')}
              className={`w-full sm:w-auto py-2.5 px-4 rounded-full text-xs font-extrabold transition-all duration-300 ease-out cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeForm === 'subjectReview'
                  ? 'bg-emerald-600 text-white shadow-md scale-102'
                  : isDark
                  ? 'bg-[#1c1c20] border border-zinc-700/60 text-zinc-400 hover:bg-[#27272a]'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Subject Revision</span>
            </button>
          </div>
        </div>

        {/* Schedule Exam Form vs Subject Review Form */}
        {activeForm === 'exam' ? (
          <form key="exam-form" onSubmit={handleScheduleExam} className="space-y-4 animate-fade-slide-up">
            {editingExamId !== null && (
              <div className="flex items-center justify-between pb-2 border-b border-zinc-700/40">
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: accentHex }}>
                  ✏️ Edit Exam Details
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditingExamId(null);
                    setSelectedExamDate('');
                    setSelectedLinkedLectures([]);
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Cancel Editing
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-zinc-400' : 'text-slate-700'}`}>Select Subject</label>
                <CustomSelect
                  options={subjectOptions}
                  value={selectedExamSubject}
                  onChange={(val) => {
                    setSelectedExamSubject(val);
                    setSelectedLinkedLectures([]);
                  }}
                  placeholder="-- Select Subject --"
                  className="w-full"
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-zinc-400' : 'text-slate-700'}`}>Exam Date</label>
                <button
                  type="button"
                  onClick={() => setDatePickerTarget('exam')}
                  className={`w-full px-4 py-2.5 rounded-full border text-xs text-left flex items-center justify-between transition-all duration-300 cursor-pointer ${
                    selectedExamDate ? 'ring-2 scale-[1.01] animate-pop-in' : ''
                  } ${
                    isDark ? 'bg-[#1a1a1e] border-zinc-700/60 text-zinc-100 hover:bg-[#242428]' : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100 font-bold'
                  }`}
                  style={selectedExamDate ? { color: accentHex, borderColor: `${accentHex}80` } : {}}
                >
                  <span className={selectedExamDate ? 'font-bold' : isDark ? 'text-zinc-400' : 'text-slate-600'} style={selectedExamDate ? { color: accentHex } : {}}>
                    {selectedExamDate ? `Date: ${selectedExamDate}` : '📅 Choose Exam Date...'}
                  </span>
                  <CalendarIcon className={`w-4 h-4 ${!selectedExamDate ? 'text-slate-400' : ''}`} style={selectedExamDate ? { color: accentHex } : {}} />
                </button>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-zinc-400' : 'text-slate-700'}`}>Reminder Notification</label>
                <CustomSelect
                  options={reminderOptions}
                  value={selectedReminderDays.toString()}
                  onChange={(val) => setSelectedReminderDays(parseInt(val, 10))}
                  placeholder="Select Reminder..."
                  className="w-full"
                />
              </div>
            </div>

            {/* Dynamic Link Lectures Checklist */}
            <div>
              <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-zinc-400' : 'text-slate-700'}`}>Link Lectures (Optional)</label>
              <div
                className={`max-h-48 overflow-y-auto p-2.5 rounded-2xl border-[0.25px] space-y-1.5 ${
                  isDark ? 'bg-[#1a1a1e] border-zinc-700/60' : 'bg-slate-50 border-slate-200'
                }`}
              >
                {!selectedExamSubject ? (
                  <p className="text-xs text-slate-500 p-2 italic">Select a subject first to see its lectures.</p>
                ) : studyData.filter((i) => i.module === selectedExamSubject).length === 0 ? (
                  <p className="text-xs text-slate-500 p-2 italic">No lectures found for {selectedExamSubject}.</p>
                ) : (
                  studyData
                    .filter((item) => item.module === selectedExamSubject)
                    .map((item) => {
                      const isChecked = selectedLinkedLectures.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleLinkedLecture(item.id)}
                          className={`p-2.5 rounded-xl border-[0.25px] cursor-pointer select-none transition-all flex items-center justify-between ${
                            isChecked
                              ? isDark
                                ? 'bg-[#242428] border-zinc-700 text-zinc-100'
                                : 'bg-slate-100 border-slate-300 text-slate-900'
                              : isDark
                              ? 'bg-[#1c1c20] border-zinc-700/50 hover:bg-[#242428] text-zinc-300'
                              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                          }`}
                          style={
                            isChecked
                              ? {
                                  backgroundColor: `${accentHex}15`,
                                  borderColor: `${accentHex}60`,
                                }
                              : {}
                          }
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                isChecked ? 'shadow-xs scale-105' : isDark ? 'border-zinc-700 bg-[#1a1a1e]' : 'border-slate-300 bg-slate-100'
                              }`}
                              style={isChecked ? { backgroundColor: accentHex, borderColor: accentHex } : {}}
                            >
                              {isChecked && (
                                <Check
                                  className="w-3.5 h-3.5 stroke-[3]"
                                  style={{ color: isWhiteAccent ? '#0f172a' : '#ffffff' }}
                                />
                              )}
                            </div>

                            <span className={`font-bold truncate text-xs ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                              {item.topic}
                            </span>
                          </div>

                          <span className={`text-[10px] font-extrabold whitespace-nowrap shrink-0 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                            {isChecked ? 'Linked ✓' : '+ Link'}
                          </span>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-full font-bold text-sm shadow-lg active:scale-95 transition-all cursor-pointer"
              style={{ backgroundColor: accentHex, color: isWhiteAccent ? '#0f172a' : '#ffffff' }}
            >
              {editingExamId !== null ? 'Save Exam Changes' : 'Schedule Exam'}
            </button>
          </form>
        ) : (
          <form key="subject-review-form" onSubmit={handleScheduleSubjectReview} className="space-y-4 animate-fade-slide-up">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Select Subject</label>
                <CustomSelect
                  options={subjectOptions}
                  value={selectedReviewSubject}
                  onChange={setSelectedReviewSubject}
                  placeholder="-- Select Subject --"
                  className="w-full"
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Revision Date</label>
                <button
                  type="button"
                  onClick={() => setDatePickerTarget('review')}
                  className={`w-full px-4 py-2.5 rounded-full border text-xs text-left flex items-center justify-between transition-all duration-300 cursor-pointer ${
                    selectedReviewDate ? 'ring-2 scale-[1.01] animate-pop-in' : ''
                  } ${
                    isDark ? 'bg-[#1a1a1e] border-zinc-700/60 text-zinc-100 hover:bg-[#242428]' : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100 font-bold'
                  }`}
                  style={selectedReviewDate ? { color: accentHex, borderColor: `${accentHex}80` } : {}}
                >
                  <span className={selectedReviewDate ? 'font-bold' : isDark ? 'text-slate-400' : 'text-slate-600'} style={selectedReviewDate ? { color: accentHex } : {}}>
                    {selectedReviewDate ? `Date: ${selectedReviewDate}` : '📅 Choose Revision Date...'}
                  </span>
                  <CalendarIcon className={`w-4 h-4 ${!selectedReviewDate ? 'text-slate-400' : ''}`} style={selectedReviewDate ? { color: accentHex } : {}} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
            >
              Schedule Subject Revision
            </button>
          </form>
        )}
      </div>

      {/* Side-by-Side 2-Column Split Layout for Scheduled Lists (Half Left Exams / Half Right Reviews) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Scheduled Exams */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: accentHex }}>
            <Layers className="w-3.5 h-3.5" /> Scheduled Exams ({examData.length})
          </h3>
          {examData.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-4 rounded-2xl border border-dashed border-slate-800/40">No upcoming exams scheduled.</p>
          ) : (
            examData.map((exam) => {
              const color = getSubjectColorHex(exam.module);
              const daysLeft = getDaysUntil(exam.date);
              return (
                <div
                  key={exam.id}
                  onClick={() => setViewingExamDetails(exam)}
                  className={`p-4 rounded-3xl border-[0.25px] flex items-center justify-between backdrop-blur-md transition-all hover:scale-[1.01] cursor-pointer gap-3 ${
                    isOled
                      ? 'bg-black border-slate-800/40'
                      : isDark
                      ? 'bg-[#27272a]/70 border-zinc-700/60 text-zinc-100'
                      : 'bg-white border-slate-200 shadow-xs text-slate-900'
                  }`}
                >
                  <div
                    className="w-1.5 self-stretch rounded-full shrink-0 my-0.5"
                    style={{ backgroundColor: color }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-sm truncate" style={{ color }}>
                        🎓 {exam.module} Exam
                      </h4>
                      {exam.reminderDays && exam.reminderDays > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center gap-1">
                          <Bell className="w-3 h-3" /> {exam.reminderDays}d
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                      Date: {exam.date} • {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? 'Today!' : 'Passed'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEnterExamFocus(exam.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      <Target className="w-3.5 h-3.5" /> Focus
                    </button>
                    <button
                      onClick={() =>
                        setDeleteConfirm({
                          type: 'exam',
                          id: exam.id,
                          title: `${exam.module} Exam`,
                        })
                      }
                      className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Scheduled Subject Review Days */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Scheduled Subject Revisions ({subjectReviewsData.length})
          </h3>
          {subjectReviewsData.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-4 rounded-2xl border border-dashed border-slate-800/40">No review days scheduled.</p>
          ) : (
            subjectReviewsData.map((rev) => {
              const color = getSubjectColorHex(rev.module);
              return (
                <div
                  key={rev.id}
                  className={`p-4 rounded-3xl border-[0.25px] flex items-center justify-between backdrop-blur-md transition-all hover:scale-[1.01] gap-3 ${
                    isOled
                      ? 'bg-black border-slate-800/40'
                      : isDark
                      ? 'bg-[#27272a]/70 border-zinc-700/60 text-zinc-100'
                      : 'bg-white border-slate-200 shadow-xs text-slate-900'
                  }`}
                >
                  <div
                    className="w-1.5 self-stretch rounded-full shrink-0 my-0.5"
                    style={{ backgroundColor: color }}
                  />

                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm truncate" style={{ color }}>
                      🔄 {rev.module} Review Day
                    </h4>
                    <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>Date: {rev.date}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleEnterSubjectFocus(rev.module)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" /> Focus
                    </button>
                    <button
                      onClick={() =>
                        setDeleteConfirm({
                          type: 'subjectReview',
                          id: rev.id,
                          title: `${rev.module} Review Day`,
                        })
                      }
                      className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {datePickerTarget && (
        <DatePickerModal
          initialDate={datePickerTarget === 'exam' ? selectedExamDate : selectedReviewDate}
          onSelectDate={(dateStr) => {
            if (datePickerTarget === 'exam') setSelectedExamDate(dateStr);
            if (datePickerTarget === 'review') setSelectedReviewDate(dateStr);
          }}
          onClose={() => setDatePickerTarget(null)}
          title={datePickerTarget === 'exam' ? 'Select Exam Date' : 'Select Subject Review Date'}
        />
      )}

      {/* Delete Confirmation Modal Popup */}
      {deleteConfirm && (
        <ConfirmationModal
          title={deleteConfirm.type === 'exam' ? 'Delete Exam?' : 'Delete Review Day?'}
          message={`Are you sure you want to remove '${deleteConfirm.title}' from the schedule?`}
          onConfirm={() => {
            if (deleteConfirm.type === 'exam') {
              deleteExam(deleteConfirm.id);
              showToast('Exam deleted.');
            } else {
              deleteSubjectReview(deleteConfirm.id);
              showToast('Subject review day deleted.');
            }
          }}
          onClose={() => setDeleteConfirm(null)}
        />
      )}

      {/* Viewing Exam Details & In-Modal Editing Modal Popup */}
      {viewingExamDetails &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 z-[9999] w-screen h-screen flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in overflow-hidden touch-none">
            <div
              className={`w-full max-w-lg p-6 rounded-3xl border-[0.25px] shadow-2xl space-y-4 animate-pop-in ${
                isOled
                  ? 'bg-black border-slate-800/60 text-slate-100'
                  : isDark
                  ? 'bg-[#242428] border-zinc-700/80 text-zinc-100'
                  : 'bg-white border-slate-300 text-slate-900 shadow-2xl'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: getSubjectColorHex(viewingExamDetails.module) }}
                  />
                  <h3 className="text-base font-black truncate">
                    {isEditingModalExam ? `✏️ Edit ${viewingExamDetails.module} Exam` : `🎓 ${viewingExamDetails.module} Exam Details`}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setViewingExamDetails(null);
                    setIsEditingModalExam(false);
                  }}
                  className="p-1.5 rounded-xl hover:bg-[#242428] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!isEditingModalExam ? (
                /* View Mode */
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`p-3.5 rounded-2xl border-[0.25px] ${isDark ? 'bg-[#242428] border-zinc-700/50' : 'bg-zinc-100 border-zinc-200'}`}>
                      <span className="text-[10px] font-extrabold uppercase text-zinc-400 block">Exam Date</span>
                      <span className="text-sm font-black mt-0.5 block">{viewingExamDetails.date}</span>
                    </div>

                    <div className={`p-3.5 rounded-2xl border-[0.25px] ${isDark ? 'bg-[#242428] border-zinc-700/50' : 'bg-zinc-100 border-zinc-200'}`}>
                      <span className="text-[10px] font-extrabold uppercase text-zinc-400 block">Status / Countdown</span>
                      <span className={`text-sm font-black mt-0.5 block ${viewingExamDetails.isCompleted ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {viewingExamDetails.isCompleted
                          ? '✓ Completed'
                          : getDaysUntil(viewingExamDetails.date) > 0
                          ? `${getDaysUntil(viewingExamDetails.date)} days left`
                          : 'Today!'}
                      </span>
                    </div>
                  </div>

                  {/* Reminder Status Badge */}
                  <div className={`p-3 rounded-2xl border-[0.25px] flex items-center justify-between ${isDark ? 'bg-zinc-800/60 border-zinc-700/60' : 'bg-slate-100 border-slate-200'}`}>
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-500" />
                      <span className="font-bold">Exam Reminder Status</span>
                    </div>
                    <span className="font-extrabold text-amber-500">
                      {viewingExamDetails.reminderDays && viewingExamDetails.reminderDays > 0
                        ? `${viewingExamDetails.reminderDays} Days Before`
                        : 'No Reminder Set'}
                    </span>
                  </div>

                  {/* Linked Lectures Section */}
                  <div className="space-y-2 pt-1">
                    <h4 className="font-bold text-zinc-400 uppercase text-[10px]">
                      Linked Lectures ({viewingExamDetails.linkedLectures.length})
                    </h4>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {viewingExamDetails.linkedLectures.length === 0 ? (
                        <p className="text-zinc-500 italic">No specific lectures linked to this exam.</p>
                      ) : (
                        studyData
                          .filter((i) => viewingExamDetails.linkedLectures.includes(i.id))
                          .map((item) => (
                            <div
                              key={item.id}
                              className={`p-2.5 rounded-xl border-[0.25px] flex items-center justify-between ${
                                isDark ? 'bg-zinc-800/70 border-zinc-700/60' : 'bg-slate-100 border-slate-200'
                              }`}
                            >
                              <span className="font-semibold truncate">{item.topic}</span>
                              <span className="text-[10px] font-bold text-zinc-400">Rep: #{item.repetition + 1}</span>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  {/* In-Modal Action Toolbar */}
                  <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60 gap-2">
                    <div className="flex items-center gap-2">
                      {/* Mark Done Icon Button */}
                      <button
                        type="button"
                        onClick={() => {
                          toggleExamCompleted(viewingExamDetails.id);
                          setViewingExamDetails({ ...viewingExamDetails, isCompleted: !viewingExamDetails.isCompleted });
                          showToast(viewingExamDetails.isCompleted ? 'Exam marked incomplete' : '🎓 Exam marked completed!');
                        }}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                          viewingExamDetails.isCompleted
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-extrabold'
                            : isDark
                            ? 'bg-zinc-800 border-zinc-700/60 text-zinc-200 hover:text-white'
                            : 'bg-slate-100 border-slate-300 text-slate-800'
                        }`}
                        title={viewingExamDetails.isCompleted ? 'Mark Incomplete' : 'Mark Completed'}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </button>

                      {/* In-Modal Edit Icon Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditModalSubject(viewingExamDetails.module);
                          setEditModalDate(viewingExamDetails.date);
                          setEditModalReminderDays(viewingExamDetails.reminderDays || 3);
                          setEditModalLinkedLectures([...viewingExamDetails.linkedLectures]);
                          setIsEditingModalExam(true);
                        }}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                          isDark ? 'bg-zinc-800 border-zinc-700/60 text-zinc-200 hover:text-white' : 'bg-slate-100 border-slate-300 text-slate-800'
                        }`}
                        title="Edit Exam Details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Focus Exam (Positioned at Bottom Right where Close was) */}
                    <button
                      type="button"
                      onClick={() => {
                        handleEnterExamFocus(viewingExamDetails.id);
                        setViewingExamDetails(null);
                      }}
                      className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
                    >
                      <Target className="w-4 h-4" /> Focus
                    </button>
                  </div>
                </div>
              ) : (
                /* In-Modal Edit Form Mode */
                <div className="space-y-4 text-xs animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Select Subject</label>
                      <CustomSelect
                        options={subjectOptions}
                        value={editModalSubject}
                        onChange={setEditModalSubject}
                        placeholder="-- Select Subject --"
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Exam Date</label>
                      <button
                        type="button"
                        onClick={() => setDatePickerTarget('editModalExam')}
                        className={`w-full px-3 py-2 rounded-xl border text-xs text-left flex items-center justify-between transition-all cursor-pointer ${
                          isDark ? 'bg-slate-800/80 border-slate-700/60 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900 font-bold'
                        }`}
                      >
                        <span className={editModalDate ? 'font-bold' : 'text-slate-400'} style={editModalDate ? { color: accentHex } : {}}>
                          {editModalDate ? editModalDate : '📅 Choose Date...'}
                        </span>
                      </button>
                    </div>

                    <div>
                      <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Reminder</label>
                      <CustomSelect
                        options={reminderOptions}
                        value={editModalReminderDays.toString()}
                        onChange={(val) => setEditModalReminderDays(parseInt(val, 10))}
                        placeholder="Reminder..."
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Linked Lectures Checklist — filtered to selected subject only */}
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Linked Lectures</label>
                    <div className={`max-h-40 overflow-y-auto p-2 rounded-2xl border space-y-1.5 ${isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                      {!editModalSubject ? (
                        <p className="text-xs text-slate-500 p-2 italic">Select a subject first.</p>
                      ) : studyData.filter((i) => i.module === editModalSubject).length === 0 ? (
                        <p className="text-xs text-slate-500 p-2 italic">No lectures for {editModalSubject}.</p>
                      ) : (
                        studyData
                          .filter((item) => item.module === editModalSubject)
                          .map((item) => {
                            const isChecked = editModalLinkedLectures.includes(item.id);
                            return (
                              <div
                                key={item.id}
                                onClick={() => toggleEditModalLinkedLecture(item.id)}
                                className={`p-2.5 rounded-xl border cursor-pointer select-none transition-all flex items-center justify-between ${
                                  isChecked
                                    ? isDark
                                      ? 'bg-slate-800/90 border-slate-700'
                                      : 'bg-slate-100 border-slate-300'
                                    : isDark
                                    ? 'bg-slate-800/60 border-slate-700/50 hover:bg-slate-800 text-slate-300'
                                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                                }`}
                                style={isChecked ? { backgroundColor: `${accentHex}18`, borderColor: `${accentHex}60` } : {}}
                              >
                                <div className="flex items-center gap-2.5 truncate">
                                  <div
                                    className="w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all"
                                    style={
                                      isChecked
                                        ? { backgroundColor: accentHex, borderColor: accentHex }
                                        : { borderColor: isDark ? '#475569' : '#cbd5e1', backgroundColor: isDark ? 'rgba(30,41,59,0.8)' : '#f8fafc' }
                                    }
                                  >
                                    {isChecked && (
                                      <Check
                                        className="w-3.5 h-3.5 stroke-[3]"
                                        style={{ color: isWhiteAccent ? '#0f172a' : '#ffffff' }}
                                      />
                                    )}
                                  </div>
                                  <span className={`font-bold truncate text-xs ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                                    {item.topic}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-800/40">
                    <button
                      type="button"
                      onClick={() => setIsEditingModalExam(false)}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition-colors ${
                        isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!editModalSubject || !editModalDate) return;
                        updateExam(viewingExamDetails.id, {
                          module: editModalSubject,
                          date: editModalDate,
                          linkedLectures: editModalLinkedLectures,
                          reminderDays: editModalReminderDays,
                        });
                        setIsEditingModalExam(false);
                        setViewingExamDetails(null);
                        showToast('Exam updated successfully! 🎓');
                      }}
                      className="px-4 py-2 rounded-xl font-extrabold text-xs shadow-md cursor-pointer active:scale-95"
                      style={{ backgroundColor: accentHex, color: isWhiteAccent ? '#0f172a' : '#ffffff' }}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Calendar Day Breakdown Modal */}
      {selectedDayDetail &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 z-[9999] w-screen h-screen flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in overflow-hidden touch-none">
            <div
              className={`w-full max-w-lg p-6 rounded-3xl border flex flex-col max-h-[85vh] animate-pop-in relative shadow-2xl ${
                isOled
                  ? 'bg-black border-slate-800 text-slate-100'
                  : isDark
                  ? 'bg-[#202024] border-zinc-700/60 text-zinc-100'
                  : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
              }`}
            >
                  {/* Modal Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-800/40 shrink-0">
                    <div className="flex items-center justify-between gap-2 w-full sm:w-auto">
                      <div className="flex items-center gap-2 min-w-0">
                        <CalendarIcon className="w-4.5 h-4.5 shrink-0" style={{ color: accentHex }} />
                        <h3 className="text-xs sm:text-sm font-black truncate">
                          Schedule ({selectedDayDetail.dateStr})
                        </h3>
                      </div>

                      <button
                        onClick={() => setSelectedDayDetail(null)}
                        className="p-1 rounded-xl hover:bg-[#242428] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer shrink-0 sm:hidden"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => {
                          const dateStr = selectedDayDetail.dateStr;
                          if (config.weeklyRestDay && config.weeklyRestDay !== 'none') {
                            const [y, m, d] = dateStr.split('-').map(Number);
                            const dateObj = new Date(y, m - 1, d);
                            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                            const dayName = dayNames[dateObj.getDay()];
                            if (dayName === config.weeklyRestDay.toLowerCase()) {
                              toggleRestDayOverride(dateStr);
                              showToast(isRestDay(dateStr) ? 'Weekly Rest Day restored.' : '⚡ Rest Day overridden for emergency study!');
                              return;
                            }
                          }
                          const isRest = isRestDay(dateStr);
                          toggleRestDay(dateStr);
                          showToast(isRest ? 'Rest day removed. Revisions restored!' : '🏖️ Date marked as Rest Day! Scheduled revisions shifted forward.');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center gap-1 w-full sm:w-auto whitespace-nowrap ${
                          isRestDay(selectedDayDetail.dateStr)
                            ? 'bg-amber-500 text-white hover:bg-amber-400'
                            : isDark
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25'
                            : 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                        }`}
                      >
                        {isRestDay(selectedDayDetail.dateStr) ? '🏖️ Rest Day Active' : '🏖️ Set Rest Day'}
                      </button>

                      <button
                        onClick={() => setSelectedDayDetail(null)}
                        className="p-1.5 rounded-xl hover:bg-[#242428] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer shrink-0 hidden sm:flex"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Modal Body */}
                  <div className="mt-3 space-y-4 overflow-y-auto flex-1 pr-1">
                    {selectedDayDetail.exams.length === 0 &&
                      selectedDayDetail.subjectReviews.length === 0 &&
                      selectedDayDetail.lectures.length === 0 &&
                      selectedDayDetail.loggedLectures.length === 0 && (
                        <div className="py-2 text-center">
                          <p className="text-xs font-bold text-slate-400">No scheduled activities for this date.</p>
                        </div>
                      )}
                    {selectedDayDetail.exams.length > 0 && (
                      <div>
                        <h4 className={`text-xs font-black uppercase tracking-wider mb-2 ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                          🎓 Exams ({selectedDayDetail.exams.length})
                        </h4>
                        <div className="space-y-2">
                          {selectedDayDetail.exams.map((e) => (
                            <div
                              key={e.id}
                              className={`px-5 py-3.5 rounded-2xl sm:rounded-3xl border border-transparent flex items-center justify-between gap-4 ${
                                isDark
                                  ? 'bg-rose-500/10 text-slate-100'
                                  : 'bg-rose-50 text-rose-950 shadow-xs'
                              }`}
                            >
                              <div>
                                <div className={`font-black text-base ${isDark ? 'text-rose-300' : 'text-rose-900'}`}>{e.module} Exam</div>
                                <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600 font-semibold'}`}>{e.linkedLectures.length} linked lectures</div>
                              </div>
                              <button
                                onClick={() => handleEnterExamFocus(e.id)}
                                className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 shadow active:scale-95 transition-all cursor-pointer"
                              >
                                <Target className="w-3.5 h-3.5" /> Focus Exam
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedDayDetail.subjectReviews.length > 0 && (
                      <div>
                        <h4 className={`text-xs font-black uppercase tracking-wider mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                          🔄 Subject Revisions ({selectedDayDetail.subjectReviews.length})
                        </h4>
                        <div className="space-y-2">
                          {selectedDayDetail.subjectReviews.map((r) => (
                            <div
                              key={r.id}
                              className={`px-5 py-3.5 rounded-2xl sm:rounded-3xl border-[0.25px] flex items-center justify-between gap-4 ${
                                isDark
                                  ? 'border-emerald-500/40 bg-emerald-500/10 text-slate-100'
                                  : 'border-emerald-300 bg-emerald-50 text-emerald-950 shadow-xs'
                              }`}
                            >
                              <div className={`font-black text-base ${isDark ? 'text-emerald-300' : 'text-emerald-900'}`}>{r.module} Full Review Session</div>
                              <button
                                onClick={() => handleEnterSubjectFocus(r.module)}
                                className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow active:scale-95 transition-all cursor-pointer"
                              >
                                <BookOpen className="w-3.5 h-3.5" /> Focus Subject
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedDayDetail.loggedLectures.length > 0 && (
                      <div>
                        <h4 className={`text-xs font-black uppercase tracking-wider mb-2 ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>
                          ✨ Logged / Added Lectures ({selectedDayDetail.loggedLectures.length})
                        </h4>
                        <div className="space-y-2">
                          {selectedDayDetail.loggedLectures.map((l) => (
                            <div
                              key={l.id}
                              className={`px-5 py-3.5 rounded-2xl sm:rounded-3xl border border-transparent flex items-center justify-between gap-4 ${
                                isDark
                                  ? 'bg-indigo-500/10 text-slate-100'
                                  : 'bg-indigo-50 text-slate-900 shadow-xs'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>{l.module}</div>
                                <div className={`font-black text-base sm:text-lg mt-0.5 break-words whitespace-normal leading-snug ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{l.topic}</div>
                              </div>
                              <span
                                className={`text-sm sm:text-base font-black px-4 py-1.5 rounded-full shrink-0 shadow-xs ml-auto border-0 ${
                                  isDark
                                    ? 'bg-indigo-500/20 text-indigo-300'
                                    : 'bg-indigo-200 text-indigo-950'
                                }`}
                              >
                                #{l.repetition + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedDayDetail.lectures.length > 0 && (
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: accentHex }}>
                          📖 Lectures ({selectedDayDetail.lectures.length})
                        </h4>
                        <div className="space-y-2">
                          {selectedDayDetail.lectures.map((l) => {
                            const origStr = getLocalDateStr(l.originalDueDate || l.nextReviewDate);
                            const targetStr = getLocalDateStr(l.delayDate);
                            const isPostponedStrikethrough =
                              l.status === 'delayed' &&
                              origStr === selectedDayDetail.dateStr &&
                              origStr !== targetStr;

                            return (
                              <div
                                key={l.id}
                                className={`px-5 py-3.5 rounded-2xl sm:rounded-3xl border border-transparent flex items-center justify-between gap-4 ${
                                  isPostponedStrikethrough
                                    ? isDark
                                      ? 'line-through opacity-60 bg-rose-500/10 text-rose-300'
                                      : 'line-through bg-rose-50 text-rose-950 shadow-xs font-bold'
                                    : isDark
                                    ? 'bg-zinc-800/60 text-zinc-100'
                                    : 'bg-slate-50 text-slate-900 shadow-xs font-bold'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-black uppercase tracking-wider" style={{ color: accentHex }}>{l.module}</div>
                                  <div className={`font-black text-base sm:text-lg mt-0.5 break-words whitespace-normal leading-snug ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                                    {isPostponedStrikethrough ? <s>{l.topic}</s> : l.topic}
                                  </div>
                                </div>
                                <span
                                  className={`text-sm sm:text-base font-black px-4 py-1.5 rounded-full shrink-0 shadow-xs ml-auto border-0 ${
                                    isPostponedStrikethrough
                                      ? isDark
                                        ? 'bg-rose-500/20 text-rose-300'
                                        : 'bg-rose-200 text-rose-950'
                                      : isDark
                                      ? 'bg-zinc-700/60 text-zinc-200'
                                      : 'bg-slate-200 text-slate-800'
                                  }`}
                                >
                                  #{l.repetition + 1}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
          </div>,
          document.body
        )}

      {/* Floating Viewport-Anchored Back to Top Button */}
      {ReactDOM.createPortal(
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            scrollToTop();
          }}
          className={`fixed bottom-28 right-4 sm:bottom-6 sm:right-6 z-[100000] p-3 rounded-full shadow-2xl border backdrop-blur-2xl transition-all duration-300 transform cursor-pointer active:scale-95 ${
            showScrollTop && !selectedDayDetail && !datePickerTarget && !deleteConfirm && !viewingExamDetails
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
