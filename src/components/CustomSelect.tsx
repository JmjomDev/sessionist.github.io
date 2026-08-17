import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { useStudy } from '../context/StudyContext';

export interface CustomSelectOption {
  value: string;
  label: string;
  color?: string; // Optional hex color dot
  badgeClass?: string; // Optional status badge styling
}

interface CustomSelectProps {
  options: CustomSelectOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  className = '',
}) => {
  const { config } = useStudy();
  const isDark = config.themeMode !== 'light';
  let accentHex = config.accentColor || '#6366f1';
  if (accentHex === '#000000') {
    accentHex = config.themeMode === 'oled' || isDark ? '#ffffff' : '#0f172a';
  }
  const isWhiteAccent = accentHex.toLowerCase() === '#ffffff' || accentHex.toLowerCase() === '#fff';
  const isBlackAccent = accentHex === '#000000' || accentHex === '#0f172a';

  const activeOptionTextColor = isWhiteAccent
    ? (isDark ? '#ffffff' : '#0f172a')
    : (isBlackAccent ? (isDark ? '#ffffff' : '#0f172a') : accentHex);

  const activeOptionBgColor = isWhiteAccent
    ? (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.12)')
    : (isBlackAccent ? (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.12)') : `${accentHex}25`);

  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number; width: number }>({ left: 0, width: 160 });

  const selectedOption = options.find((o) => o.value === value);

  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        bottom: window.innerHeight - rect.top + 6,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 160) - 12)),
        width: Math.max(rect.width, 160),
      });
    }
  };

  const closeMenu = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 150);
  };

  const handleToggle = () => {
    if (isOpen) {
      closeMenu();
    } else {
      updatePosition();
      setIsOpen(true);
      setIsClosing(false);
    }
  };

  // Close on click outside or scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && containerRef.current.contains(e.target as Node)) return;
      const portalEl = document.getElementById('custom-select-portal-menu');
      if (portalEl && portalEl.contains(e.target as Node)) return;
      closeMenu();
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, isClosing]);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`w-full px-4 py-2.5 rounded-full border text-xs sm:text-sm font-extrabold flex items-center justify-between gap-2 transition-all duration-200 cursor-pointer select-none active:scale-[0.99] ${
          isOpen
            ? isDark
              ? 'bg-[#1a1a1e] border-zinc-600 text-zinc-100 ring-2 ring-indigo-500/50'
              : 'bg-white border-slate-400 text-slate-900 ring-2 ring-indigo-500/50'
            : config.themeMode === 'oled'
            ? 'bg-black border-slate-700 text-white hover:bg-zinc-900'
            : isDark
            ? 'bg-[#1a1a1e] border-zinc-700/60 text-zinc-100 hover:bg-[#242428]'
            : 'bg-white border-slate-300 hover:border-slate-400 text-slate-900 hover:bg-slate-50'
        }`}
        style={isOpen ? { borderColor: activeOptionTextColor } : {}}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption ? (
            <>
              {selectedOption.color && (
                <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: selectedOption.color }} />
              )}
              <span className={`truncate font-extrabold ${isDark ? 'text-white' : 'text-slate-900'} ${selectedOption.badgeClass || ''}`}>
                {selectedOption.label}
              </span>
            </>
          ) : (
            <span className={`font-bold truncate ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{placeholder}</span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : isDark ? 'text-slate-300' : 'text-slate-600'}`}
          style={isOpen ? { color: activeOptionTextColor } : {}}
        />
      </button>

      {/* Pop-over Options List via Body Portal */}
      {isOpen &&
        ReactDOM.createPortal(
          <div
            id="custom-select-portal-menu"
            style={{
              position: 'fixed',
              top: coords.top !== undefined ? `${coords.top}px` : 'auto',
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : 'auto',
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className={`p-1.5 rounded-3xl border shadow-2xl backdrop-blur-2xl ${isClosing ? 'animate-pop-out' : 'animate-pop-in'} max-h-56 overflow-y-auto no-scrollbar ${
              config.themeMode === 'oled'
                ? 'bg-black border-slate-700 text-white shadow-black'
                : isDark
                ? 'bg-[#202024] border-zinc-700/60 shadow-2xl text-zinc-100'
                : 'bg-white border-slate-300 shadow-slate-400/50 text-slate-900 ring-1 ring-slate-200'
            }`}
          >
            {options.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500 italic text-center">No options available</div>
            ) : (
              options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      closeMenu();
                    }}
                    className={`w-full px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-between gap-2 transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'font-black ring-1'
                        : isDark
                        ? 'hover:bg-[#2a2a2e] text-zinc-200 hover:text-white'
                        : 'hover:bg-slate-100 text-slate-800 hover:text-slate-950'
                    }`}
                    style={
                      isSelected
                        ? { backgroundColor: activeOptionBgColor, color: activeOptionTextColor, borderColor: activeOptionTextColor }
                        : {}
                    }
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {opt.color && (
                        <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: opt.color }} />
                      )}
                      <span className={`truncate ${opt.badgeClass || ''}`}>{opt.label}</span>
                    </div>

                    {isSelected && <Check className="w-4 h-4 shrink-0 stroke-[3]" style={{ color: activeOptionTextColor }} />}
                  </button>
                );
              })
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
