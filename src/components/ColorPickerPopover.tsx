import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, Sliders } from 'lucide-react';
import { useStudy } from '../context/StudyContext';

interface ColorPickerPopoverProps {
  color: string;
  onChange: (color: string) => void;
}

// 10 Distinct, Non-similar Vibrant Colors
const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f43f5e', // Rose
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#8b5cf6', // Purple
  '#3b82f6', // Blue
  '#dc2626', // Crimson
  '#84cc16', // Lime
  '#d946ef', // Fuchsia
];

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  if (c.length !== 6) return { h: 240, s: 80, v: 90 };
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : Math.round((d / max) * 100);
  const v = Math.round(max * 100);
  return { h, s, v };
}

function hsvToHex(h: number, s: number, v: number): string {
  const sN = s / 100;
  const vN = v / 100;
  const c = vN * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vN - c;
  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({ color, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [customHexInput, setCustomHexInput] = useState(color);
  const [hsv, setHsv] = useState(() => hexToHsv(color));
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { config } = useStudy();

  const isDark = config.themeMode !== 'light';
  const isOled = config.themeMode === 'oled';
  const isWhite = color === '#ffffff' || color?.toLowerCase() === '#ffffff';

  const closePopover = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 150);
  };

  useEffect(() => {
    setCustomHexInput(color);
    setHsv(hexToHsv(color));
  }, [color]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        closePopover();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isClosing]);

  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHue = parseInt(e.target.value, 10);
    const newHsv = { ...hsv, h: newHue, s: Math.max(60, hsv.s), v: Math.max(60, hsv.v) };
    setHsv(newHsv);
    const newHex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
    setCustomHexInput(newHex);
    onChange(newHex);
  };

  const handleSaturationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newS = parseInt(e.target.value, 10);
    const newHsv = { ...hsv, s: newS, v: 95 };
    setHsv(newHsv);
    const newHex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
    setCustomHexInput(newHex);
    onChange(newHex);
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomHexInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      onChange(val);
      setHsv(hexToHsv(val));
    }
  };

  return (
    <div className="shrink-0" ref={containerRef}>
      {/* Small Circular Color Swatch Trigger Button */}
      <button
        type="button"
        onClick={() => (isOpen ? closePopover() : setIsOpen(true))}
        className="w-10 h-10 rounded-full border-2 flex items-center justify-center shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer relative shrink-0"
        style={{
          backgroundColor: color,
          borderColor: isWhite ? '#cbd5e1' : `${color}90`,
          color: isWhite ? '#0f172a' : '#ffffff',
        }}
        title="Choose Subject Theme Color"
      >
        <Palette className="w-4.5 h-4.5 drop-shadow-xs" style={{ color: isWhite ? '#0f172a' : '#ffffff' }} />
      </button>

      {/* Card-Bounded Expandable Panel (Mobile: Full Width edge-to-edge; PC: Compact 288px right-aligned) */}
      {isOpen && (
        <div
          ref={popoverRef}
          className={`absolute left-0 right-0 sm:left-auto sm:right-0 top-full mt-2.5 z-[100000] p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border shadow-2xl space-y-3 sm:space-y-3.5 ${isClosing ? 'animate-pop-out' : 'animate-pop-in'} w-full sm:w-72 select-none ${
            isOled
              ? 'bg-black border-slate-800 text-slate-100 shadow-black'
              : isDark
              ? 'bg-[#202024] border-zinc-700/80 text-zinc-100'
              : 'bg-white border-slate-300 shadow-slate-400/50 text-slate-900 ring-1 ring-slate-200'
          }`}
        >
          <div className="flex items-center justify-center gap-2 pb-1 border-b border-zinc-700/40">
            <div className="w-3.5 h-3.5 rounded-full border border-slate-400/40 shadow-xs" style={{ backgroundColor: color }} />
            <span className="text-xs font-mono font-black uppercase tracking-wider" style={{ color }}>{color}</span>
          </div>

          {/* 10 Distinct Preset Swatches Grid (2 Rows of 5) */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 justify-items-center">
            {PRESET_COLORS.map((hex) => {
              const isSelected = color.toLowerCase() === hex.toLowerCase();
              const isWhiteSwatch = hex.toLowerCase() === '#ffffff';
              return (
                <button
                  key={hex}
                  type="button"
                  onClick={() => {
                    onChange(hex);
                    setHsv(hexToHsv(hex));
                  }}
                  className={`w-7.5 h-7.5 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
                    isWhiteSwatch ? 'border-slate-400' : 'border-white/20'
                  } ${
                    isSelected ? 'scale-110 ring-2 ring-indigo-500 shadow-md z-10' : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: hex }}
                >
                  {isSelected && (
                    <Check
                      className="w-3.5 h-3.5 stroke-[3] drop-shadow-sm"
                      style={{ color: isWhiteSwatch ? '#0f172a' : '#ffffff' }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom Theme Spectrum Slider Section */}
          <div className="pt-2.5 border-t border-zinc-700/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                <Sliders className="w-3.5 h-3.5 text-zinc-300" /> Custom Color
              </span>
            </div>

            {/* Hue Rainbow Spectrum Slider */}
            <div className="space-y-1">
              <div className={`flex justify-between text-xs font-black uppercase tracking-wider ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                <span>Hue Spectrum</span>
                <span className="font-mono">{hsv.h}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={hsv.h}
                onChange={handleHueChange}
                className="w-full h-3 rounded-full appearance-none cursor-pointer border border-zinc-700/50 slider-thumb-line"
                style={{
                  background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
                }}
              />
            </div>

            {/* Saturation Slider */}
            <div className="space-y-1">
              <div className={`flex justify-between text-xs font-black uppercase tracking-wider ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                <span>Saturation</span>
                <span className="font-mono">{hsv.s}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={hsv.s}
                onChange={handleSaturationChange}
                className="w-full h-3 rounded-full appearance-none cursor-pointer border border-zinc-700/50 slider-thumb-line"
                style={{
                  background: `linear-gradient(to right, #94a3b8, ${hsvToHex(hsv.h, 100, 100)})`,
                }}
              />
            </div>

            {/* Hex Direct Input */}
            <div className="flex items-center justify-between pt-0.5">
              <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>Hex Code:</span>
              <input
                type="text"
                maxLength={7}
                value={customHexInput}
                onChange={handleHexInputChange}
                placeholder="#6366F1"
                className={`w-24 sm:w-28 px-2 py-1 rounded-xl border text-xs font-mono font-black uppercase focus:outline-none tracking-wider text-center ${
                  isDark ? 'bg-[#1a1a1e] border-zinc-700 text-zinc-100' : 'bg-slate-100 border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
