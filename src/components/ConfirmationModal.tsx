import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import { useStudy } from '../context/StudyContext';

interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmText?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  message,
  confirmText = 'Delete',
  onConfirm,
  onClose,
}) => {
  const { config } = useStudy();
  const [isClosing, setIsClosing] = useState(false);
  const isDark = config.themeMode !== 'light';
  const isOled = config.themeMode === 'oled';

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  return ReactDOM.createPortal(
    <div className={`fixed inset-0 z-[999] w-screen h-screen flex items-center justify-center p-4 bg-black/75 backdrop-blur-md ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
      <div
        className={`w-full max-w-sm p-6 rounded-3xl border-[0.25px] shadow-2xl space-y-4 ${isClosing ? 'animate-fade-out' : 'animate-pop-in'} ${
          isOled
            ? 'bg-black border-slate-800/60 text-slate-100'
            : isDark
            ? 'bg-slate-900 border-slate-700/80 text-slate-100'
            : 'bg-white border-slate-300 text-slate-900 shadow-2xl'
        }`}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/40">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
            <h3 className="text-base font-bold">{title}</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {message}
        </p>

        <div className="pt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              handleClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md active:scale-95 transition-all cursor-pointer"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
