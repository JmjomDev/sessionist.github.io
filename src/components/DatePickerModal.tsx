import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from 'lucide-react';
import { useStudy } from '../context/StudyContext';

interface DatePickerModalProps {
  initialDate?: string;
  onSelectDate: (dateStr: string) => void;
  onClose: () => void;
  title?: string;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  initialDate,
  onSelectDate,
  onClose,
  title = 'Select Date',
}) => {
  const { config } = useStudy();
  const isDark = config.themeMode !== 'light';
  const isOled = config.themeMode === 'oled';

  const [isClosing, setIsClosing] = useState(false);



  let accentHex = config.accentColor || '#6366f1';
  if (accentHex === '#000000') {
    accentHex = isOled ? '#ffffff' : isDark ? '#ffffff' : '#0f172a';
  }

  const isWhiteAccent = accentHex.toLowerCase() === '#ffffff' || accentHex.toLowerCase() === '#fff';
  const selBg = isWhiteAccent ? '#6366f1' : accentHex;
  const selText = '#ffffff';

  const [currentCalDate, setCurrentCalDate] = useState<Date>(() => {
    if (initialDate) {
      const parsed = new Date(initialDate);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });

  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [animKey, setAnimKey] = useState<number>(Date.now());

  const year = currentCalDate.getFullYear();
  const month = currentCalDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = new Date(year, month, 1).getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const changeMonth = (delta: number) => {
    setSlideDirection(delta > 0 ? 'left' : 'right');
    setCurrentCalDate(new Date(year, month + delta, 1));
    setAnimKey(Date.now());
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleSelectDay = (dayNum: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    setIsClosing(true);
    setTimeout(() => {
      onSelectDate(dateStr);
      onClose();
    }, 200);
  };

  const handleQuickAddDays = (days: number) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    const dateStr = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
    setIsClosing(true);
    setTimeout(() => {
      onSelectDate(dateStr);
      onClose();
    }, 200);
  };

  return ReactDOM.createPortal(
    <div className={`fixed inset-0 z-[100000] w-screen h-screen flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-opacity duration-200 ${isClosing ? 'opacity-0 pointer-events-none' : 'animate-fade-in'}`}>
      <div
        className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 transition-all duration-200 ${
          isClosing ? 'animate-fade-out opacity-0 scale-95' : 'animate-pop-in'
        } ${
          isOled
            ? 'bg-black border-slate-800 text-slate-100'
            : isDark
            ? 'bg-[#202024] border-zinc-700/60 text-zinc-100'
            : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-700/40">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" style={{ color: accentHex }} />
            <h3 className="text-base font-bold">{title}</h3>
          </div>
          <button
            onClick={handleClose}
            className={`p-1.5 rounded-full border transition-colors cursor-pointer active:scale-95 ${
              isDark ? 'border-zinc-700 bg-[#27272a] hover:bg-[#323236] text-zinc-300' : 'border-slate-300 bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Selection Shortcuts (e.g. +1d, +3d, +7d, +14d, +30d) */}
        <div className="space-y-1.5">
          <p className={`text-[10px] font-extrabold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            Quick Selection Shortcuts
          </p>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {[
              { label: '+1d', days: 1, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
              { label: '+3d', days: 3, color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
              { label: '+7d', days: 7, color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
              { label: '+14d', days: 14, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
              { label: '+30d', days: 30, color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
            ].map((sc) => (
              <button
                key={sc.label}
                type="button"
                onClick={() => handleQuickAddDays(sc.days)}
                className={`px-3 py-1 rounded-full text-xs font-black border transition-all active:scale-95 cursor-pointer shrink-0 ${sc.color}`}
              >
                {sc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between py-1">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className={`p-2 rounded-full border transition-all cursor-pointer active:scale-95 ${
              isDark ? 'border-zinc-700 bg-[#27272a] hover:bg-[#323236] text-zinc-200' : 'border-slate-300 bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <h4 className="font-extrabold text-sm sm:text-base">
            {monthNames[month]} {year}
          </h4>

          <button
            type="button"
            onClick={() => changeMonth(1)}
            className={`p-2 rounded-full border transition-all cursor-pointer active:scale-95 ${
              isDark ? 'border-zinc-700 bg-[#27272a] hover:bg-[#323236] text-zinc-200' : 'border-slate-300 bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Days Grid Header */}
        <div className="grid grid-cols-7 gap-1 text-center font-extrabold text-[11px] text-zinc-400">
          <div>Su</div>
          <div>Mo</div>
          <div>Tu</div>
          <div>We</div>
          <div>Th</div>
          <div>Fr</div>
          <div>Sa</div>
        </div>

        {/* Days Grid with Animation */}
        <div
          key={animKey}
          className={`grid grid-cols-7 gap-1 transition-all duration-200 ${
            slideDirection === 'left' ? 'animate-slide-left' : 'animate-slide-right'
          }`}
        >
          {/* Empty slots for start weekday offset */}
          {Array.from({ length: startWeekday }).map((_, i) => (
            <div key={`empty-${i}`} className="h-9 sm:h-10" />
          ))}

          {/* Days of current month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const isToday = cellDateStr === todayStr;
            const isSelected = initialDate === cellDateStr;

            return (
              <button
                key={dayNum}
                type="button"
                onClick={() => handleSelectDay(dayNum)}
                style={{
                  backgroundColor: isSelected ? selBg : undefined,
                  color: isSelected ? selText : undefined,
                  borderColor: isToday && !isSelected ? selBg : undefined,
                }}
                className={`h-9 sm:h-10 rounded-full font-extrabold text-xs sm:text-sm flex items-center justify-center transition-all cursor-pointer active:scale-95 border ${
                  isSelected
                    ? 'shadow-md scale-105 border-transparent font-black'
                    : isToday
                    ? 'border-2 font-black shadow-xs'
                    : isDark
                    ? 'border-transparent bg-zinc-800/30 hover:bg-zinc-700/60 text-zinc-200'
                    : 'border-transparent bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
              >
                {dayNum}
              </button>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="pt-2 border-t border-zinc-700/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2 rounded-full text-xs font-extrabold cursor-pointer transition-colors ${
              isDark ? 'bg-[#27272a] hover:bg-[#323236] text-zinc-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
