import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  X,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Shuffle,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Trophy,
  RefreshCw,
  Trash2,
  Plus,
  Check,
} from 'lucide-react';
import type { Flashcard } from '../types/study';
import { getAccentStyle } from '../utils/themeUtils';

interface FlashcardsPracticeModalProps {
  topicTitle: string;
  moduleName: string;
  flashcards: Flashcard[];
  accentHex: string;
  isDark: boolean;
  isOled: boolean;
  onUpdateFlashcards?: (cards: Flashcard[]) => void;
  onClose: () => void;
}

export const FlashcardsPracticeModal: React.FC<FlashcardsPracticeModalProps> = ({
  topicTitle,
  moduleName,
  flashcards,
  accentHex,
  isDark,
  isOled,
  onUpdateFlashcards,
  onClose,
}) => {
  // Sort initial cards so past mistakes appear first
  const [cards, setCards] = useState<Flashcard[]>(() => {
    const initial = [...flashcards];
    return initial.sort((a, b) => (b.isPastMistake ? 1 : 0) - (a.isPastMistake ? 1 : 0));
  });

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [knownCount, setKnownCount] = useState<number>(0);
  const [againCount, setAgainCount] = useState<number>(0);
  const [skippedCount, setSkippedCount] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [missedCardIds, setMissedCardIds] = useState<Set<string>>(new Set());

  // State for Add Card Modal
  const [showAddCardModal, setShowAddCardModal] = useState<boolean>(false);
  const [newFront, setNewFront] = useState<string>('');
  const [newBack, setNewBack] = useState<string>('');

  const currentCard = cards[currentIndex] || cards[0];
  const progressPercent = cards.length > 0 ? Math.round(((currentIndex + 1) / cards.length) * 100) : 0;

  const isWhiteAccent = accentHex.toLowerCase() === '#ffffff' || accentHex.toLowerCase() === '#fff';
  const [isClosing, setIsClosing] = useState<boolean>(false);

  const handleSmoothClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 180);
  };

  // Lock background page scroll to eliminate touch wiggling
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

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showAddCardModal) return;
      if (e.key === 'Escape') {
        handleSmoothClose();
      } else if (!isCompleted && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (!isCompleted && (e.key === 'ArrowRight' || e.key === 'n')) {
        handleNext(true);
      } else if (!isCompleted && (e.key === 'ArrowLeft' || e.key === 'p')) {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, cards.length, isCompleted, showAddCardModal]);

  const handleNext = (wasSkipped: boolean = false) => {
    setIsFlipped(false);
    if (wasSkipped) {
      setSkippedCount((prev) => prev + 1);
    }
    if (currentIndex >= cards.length - 1) {
      finishPracticeSession(missedCardIds);
      return;
    }
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
    }, 150);
  };

  const handlePrev = () => {
    if (currentIndex <= 0) return;
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => prev - 1);
    }, 150);
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    setTimeout(() => {
      const shuffled = [...cards].sort(() => Math.random() - 0.5);
      setCards(shuffled);
      setCurrentIndex(0);
    }, 150);
  };

  const handleMarkKnown = () => {
    setKnownCount((prev) => prev + 1);
    handleNext(false);
  };

  const handleMarkAgain = () => {
    setAgainCount((prev) => prev + 1);
    const newMissed = new Set(missedCardIds);
    if (currentCard) {
      newMissed.add(currentCard.id);
    }
    setMissedCardIds(newMissed);
    handleNext(false);
  };

  const [isDeletingCard, setIsDeletingCard] = useState<boolean>(false);

  const handleDeleteCurrentCard = () => {
    if (cards.length === 0 || isDeletingCard) return;
    setIsDeletingCard(true);

    setTimeout(() => {
      const updatedCards = cards.filter((_, idx) => idx !== currentIndex);
      if (updatedCards.length === 0) {
        if (onUpdateFlashcards) onUpdateFlashcards([]);
        onClose();
        return;
      }
      setCards(updatedCards);
      if (currentIndex >= updatedCards.length) {
        setCurrentIndex(updatedCards.length - 1);
      }
      setIsFlipped(false);
      setIsDeletingCard(false);
      if (onUpdateFlashcards) {
        onUpdateFlashcards(updatedCards);
      }
    }, 250);
  };

  const handleAddCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;

    const createdCard: Flashcard = {
      id: `custom_${Date.now()}`,
      front: newFront.trim(),
      back: newBack.trim(),
    };

    const updatedCards = [...cards, createdCard];
    setCards(updatedCards);
    setCurrentIndex(updatedCards.length - 1);
    setIsFlipped(false);
    setShowAddCardModal(false);
    setNewFront('');
    setNewBack('');

    if (onUpdateFlashcards) {
      onUpdateFlashcards(updatedCards);
    }
  };

  const finishPracticeSession = (finalMissedSet: Set<string>) => {
    setIsCompleted(true);
    setShowAddCardModal(false);
    setCurrentIndex(0);
    setIsFlipped(false);
    if (onUpdateFlashcards && finalMissedSet.size > 0) {
      const updated = flashcards.map((c) => ({
        ...c,
        isPastMistake: finalMissedSet.has(c.id) || c.isPastMistake,
      }));
      onUpdateFlashcards(updated);
    }
  };

  const handlePracticeMistakesOnly = () => {
    const mistakesOnly = cards.filter((c) => missedCardIds.has(c.id) || c.isPastMistake);
    if (mistakesOnly.length > 0) {
      setCards(mistakesOnly);
    }
    setCurrentIndex(0);
    setKnownCount(0);
    setAgainCount(0);
    setSkippedCount(0);
    setIsCompleted(false);
    setIsFlipped(false);
  };

  const handleRestartFull = () => {
    setCards([...flashcards]);
    setCurrentIndex(0);
    setKnownCount(0);
    setAgainCount(0);
    setSkippedCount(0);
    setIsCompleted(false);
    setIsFlipped(false);
  };

  if (!flashcards) return null;

  return ReactDOM.createPortal(
    <div
      className={`fixed inset-0 z-[100000] flex items-center justify-center p-2 sm:p-4 overflow-hidden touch-none select-none backdrop-blur-xl bg-black/80 transition-all ${
        isClosing ? 'animate-modal-backdrop-out' : 'animate-fade-in'
      }`}
    >
      {showAddCardModal && (
        <div className="fixed inset-0 z-[100002] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-2xl animate-pop-in overflow-hidden touch-none">
          <div
            className={`w-full max-w-md rounded-3xl border p-3.5 sm:p-6 space-y-2.5 shadow-2xl max-h-[94dvh] overflow-hidden ${
              isOled
                ? 'bg-black border-slate-800 text-slate-100'
                : isDark
                ? 'bg-[#18181b] border-zinc-700 text-zinc-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/40">
              <h4 className="font-extrabold text-sm sm:text-base flex items-center gap-1.5" style={{ color: accentHex }}>
                <Plus className="w-4 h-4" /> Add Custom Flashcard
              </h4>
              <button
                type="button"
                onClick={() => setShowAddCardModal(false)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-slate-700/60 flex items-center justify-center text-slate-400 hover:text-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCardSubmit} className="space-y-2.5">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider mb-1 text-slate-400">
                  Question (Front)
                </label>
                <textarea
                  rows={2}
                  required
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  placeholder="e.g. What is the mechanism of Action of Digoxin?"
                  className={`w-full p-2.5 rounded-2xl border text-xs leading-relaxed focus:outline-none resize-none ${
                    isOled
                      ? 'bg-black border-zinc-800 text-slate-100'
                      : isDark
                      ? 'bg-[#202024] border-zinc-700 text-zinc-100'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider mb-1 text-slate-400">
                  Answer (Back)
                </label>
                <textarea
                  rows={2}
                  required
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  placeholder="e.g. Inhibits Na+/K+ ATPase pump, increasing intracellular Ca2+."
                  className={`w-full p-2.5 rounded-2xl border text-xs leading-relaxed focus:outline-none resize-none ${
                    isOled
                      ? 'bg-black border-zinc-800 text-slate-100'
                      : isDark
                      ? 'bg-[#202024] border-zinc-700 text-zinc-100'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddCardModal(false)}
                  className="px-4 py-1.5 rounded-full text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newFront.trim() || !newBack.trim()}
                  className="px-5 py-1.5 rounded-full font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 border"
                  style={getAccentStyle(accentHex, isDark)}
                >
                  <Check className="w-3.5 h-3.5" /> Save Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div
        className={`relative w-full max-w-2xl rounded-3xl border p-3 sm:p-5 flex flex-col justify-between shadow-2xl transition-all duration-300 max-h-[96dvh] overflow-hidden ${
          isClosing ? 'animate-pop-out' : 'animate-pop-in'
        } ${
          isOled
            ? 'bg-black border-slate-800 text-slate-100'
            : isDark
            ? 'bg-[#18181b]/95 border-zinc-700/60 text-zinc-100'
            : 'bg-white/95 border-slate-200 text-slate-900 shadow-2xl'
        }`}
      >
        <div className="flex items-center justify-between gap-3 pb-2 sm:pb-3 border-b border-slate-800/40">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border truncate"
                style={{
                  backgroundColor: `${accentHex}20`,
                  borderColor: `${accentHex}40`,
                  color: isWhiteAccent ? (isDark ? '#ffffff' : '#0f172a') : accentHex,
                }}
              >
                {moduleName}
              </span>
              {!isCompleted && (
                <span className="text-xs font-bold text-slate-400 shrink-0">
                  Card {currentIndex + 1} of {cards.length}
                </span>
              )}
            </div>
            <h3 className="text-sm sm:text-lg font-extrabold break-words whitespace-normal leading-snug mt-1">{topicTitle}</h3>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!isCompleted && (
              <button
                onClick={() => setShowAddCardModal(true)}
                title="Add Custom Flashcard"
                className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border text-xs font-bold transition-transform active:scale-95 cursor-pointer flex items-center gap-1"
                style={{
                  borderColor: `${accentHex}40`,
                  backgroundColor: `${accentHex}15`,
                  color: isWhiteAccent ? (isDark ? '#ffffff' : '#0f172a') : accentHex,
                }}
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            )}

            {!isCompleted && (
              <button
                onClick={handleDeleteCurrentCard}
                title="Delete Current Flashcard"
                className="p-1.5 sm:p-2 rounded-full border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-transform active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={handleSmoothClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center transition-transform active:scale-95 hover:scale-105 cursor-pointer shrink-0"
              style={{
                borderColor: `${accentHex}40`,
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              }}
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 hover:text-slate-100" />
            </button>
          </div>
        </div>

        {!isCompleted && (
          <div className="w-full h-1.5 rounded-full my-2 sm:my-3 overflow-hidden bg-slate-800/40 shrink-0">
            <div
              className="h-full transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%`, backgroundColor: accentHex }}
            />
          </div>
        )}

        {isCompleted ? (
          <div className="py-2 my-auto flex-1 min-h-0 flex flex-col sm:flex-row items-center justify-around gap-3 sm:gap-6 animate-pop-in text-center sm:text-left w-full overflow-hidden">
            {/* Left Column: Trophy & Header */}
            <div className="flex flex-col items-center sm:items-start shrink-0 space-y-1 sm:space-y-2 max-w-xs">
              <div
                className="w-9 h-9 sm:w-14 sm:h-14 rounded-full border flex items-center justify-center shadow-lg shrink-0"
                style={{
                  backgroundColor: `${accentHex}25`,
                  borderColor: `${accentHex}60`,
                  color: isWhiteAccent ? (isDark ? '#ffffff' : '#0f172a') : accentHex,
                }}
              >
                <Trophy className="w-4.5 h-4.5 sm:w-7 sm:h-7 animate-bounce" />
              </div>

              <div>
                <h3 className="text-base sm:text-2xl font-black tracking-tight">Deck Complete!</h3>
                <p className="text-[11px] sm:text-xs font-semibold text-slate-400 mt-0.5">
                  Great job reviewing <span className="font-bold text-slate-200 dark:text-zinc-200">{topicTitle}</span>.
                </p>
              </div>
            </div>

            {/* Right Column: Stats & Action Buttons */}
            <div className="flex flex-col items-center sm:items-stretch gap-2 shrink-0 w-full sm:w-auto min-w-[220px] max-w-sm">
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full">
                <div className="p-1.5 sm:p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-center space-y-0.5">
                  <span className="text-sm sm:text-xl font-black text-emerald-400">{knownCount}</span>
                  <p className="text-[8px] sm:text-[9px] font-extrabold uppercase text-emerald-400/90 tracking-wider">Got It</p>
                </div>

                <div className="p-1.5 sm:p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-center space-y-0.5">
                  <span className="text-sm sm:text-xl font-black text-rose-400">{againCount}</span>
                  <p className="text-[8px] sm:text-[9px] font-extrabold uppercase text-rose-400/90 tracking-wider">Review</p>
                </div>

                <div className="p-1.5 sm:p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-center space-y-0.5">
                  <span className="text-sm sm:text-xl font-black text-amber-400">{skippedCount}</span>
                  <p className="text-[8px] sm:text-[9px] font-extrabold uppercase text-amber-400/90 tracking-wider">Skipped</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-1.5 w-full pt-1">
                {againCount > 0 && (
                  <button
                    onClick={handlePracticeMistakesOnly}
                    className="w-full sm:flex-1 py-1.5 sm:py-2.5 rounded-full font-extrabold text-[11px] sm:text-xs bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> Practice Mistakes ({againCount})
                  </button>
                )}

                <button
                  onClick={handleRestartFull}
                  className="w-full sm:flex-1 py-1.5 sm:py-2.5 rounded-full font-bold text-[11px] sm:text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 border whitespace-nowrap"
                  style={getAccentStyle(accentHex, isDark)}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Restart Full Deck
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-1 sm:py-3 my-auto flex-1 min-h-0 flex flex-col items-center justify-center w-full">
            <div
              onClick={() => !isDeletingCard && setIsFlipped(!isFlipped)}
              className={`w-full h-64 sm:h-72 md:h-80 max-h-[55vh] cursor-pointer relative transition-all duration-300 ease-out group shrink-0 ${
                isDeletingCard ? 'scale-75 opacity-0 pointer-events-none' : ''
              }`}
              style={{ perspective: '1200px' }}
            >
              <div
                className={`w-full h-full rounded-3xl border-[0.25px] p-3 sm:p-6 flex flex-col items-center justify-between text-center shadow-xl transition-all duration-500 ease-out transform ${
                  isFlipped ? 'rotate-y-180' : ''
                } ${
                  isOled
                    ? 'bg-zinc-950 border-slate-800'
                    : isDark
                    ? 'bg-[#202024] border-zinc-700/60'
                    : 'bg-slate-50 border-slate-200'
                }`}
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  boxShadow: isFlipped ? `0 10px 40px ${accentHex}25` : undefined,
                }}
              >
                {/* Front Side */}
                <div
                  className={`absolute inset-0 p-3 sm:p-6 flex flex-col justify-between items-center transition-opacity duration-300 ${
                    isFlipped ? 'opacity-0 pointer-events-none' : 'opacity-100'
                  }`}
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div className="shrink-0">
                    {currentCard.isPastMistake ? (
                      <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-400 animate-pulse">
                        <AlertTriangle className="w-3 h-3" /> Past Mistake
                      </div>
                    ) : (
                      <div className="h-1.5" />
                    )}
                  </div>

                  <div className="w-full flex-1 min-h-0 overflow-y-auto my-auto flex items-center justify-center py-1 px-2 no-scrollbar">
                    <p
                      className={`leading-snug sm:leading-relaxed text-center break-words whitespace-normal ${
                        currentCard.front.length < 50
                          ? 'text-base sm:text-lg md:text-xl font-black'
                          : currentCard.front.length < 120
                          ? 'text-sm sm:text-base md:text-lg font-extrabold'
                          : currentCard.front.length < 240
                          ? 'text-xs sm:text-sm md:text-base font-bold'
                          : 'text-[11px] sm:text-xs md:text-sm font-medium'
                      } ${isDark ? 'text-slate-100' : 'text-slate-900'}`}
                    >
                      {currentCard.front}
                    </p>
                  </div>

                  <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 flex items-center gap-1 shrink-0 mt-0.5">
                    <RotateCw className="w-3 h-3 animate-spin-slow" /> Tap to flip
                  </p>
                </div>

                {/* Back Side */}
                <div
                  className={`absolute inset-0 p-3 sm:p-6 flex flex-col justify-between items-center transition-opacity duration-300 ${
                    isFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <div className="shrink-0">
                    {currentCard.isPastMistake ? (
                      <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-400">
                        <AlertTriangle className="w-3 h-3" /> Past Mistake
                      </div>
                    ) : (
                      <div className="h-1.5" />
                    )}
                  </div>

                  <div className="w-full flex-1 min-h-0 overflow-y-auto my-auto flex items-center justify-center py-1 px-2 no-scrollbar">
                    <p
                      className={`leading-snug sm:leading-relaxed text-center break-words whitespace-normal ${
                        currentCard.back.length < 60
                          ? 'text-sm sm:text-base md:text-lg font-extrabold'
                          : currentCard.back.length < 160
                          ? 'text-xs sm:text-sm md:text-base font-bold'
                          : 'text-[11px] sm:text-xs md:text-sm font-medium'
                      } ${isDark ? 'text-slate-100' : 'text-slate-900'}`}
                    >
                      {currentCard.back}
                    </p>
                  </div>

                  <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 shrink-0 mt-0.5">
                    Tap to flip back
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isCompleted && (
          <div className="pt-2 sm:pt-3 border-t border-slate-800/40 shrink-0 mt-auto">
            {isFlipped ? (
              <div className="flex items-center gap-2 sm:gap-3 animate-pop-in">
                <button
                  onClick={handleMarkAgain}
                  className="flex-1 py-2 sm:py-3 rounded-full font-extrabold text-xs bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <HelpCircle className="w-4 h-4" /> Need Review
                </button>
                <button
                  onClick={handleMarkKnown}
                  className="flex-1 py-2 sm:py-3 rounded-full font-extrabold text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> Got It Right
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-full border text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
                  style={{
                    borderColor: `${accentHex}40`,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  }}
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>

                <button
                  onClick={handleShuffle}
                  title="Shuffle Deck"
                  className="px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-full border text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 text-slate-400 hover:text-slate-100"
                  style={{
                    borderColor: `${accentHex}40`,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  }}
                >
                  <Shuffle className="w-3.5 h-3.5" /> Shuffle
                </button>

                <button
                  onClick={() => handleNext(true)}
                  className="px-4 py-1.5 sm:px-5 sm:py-2.5 rounded-full font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 border"
                  style={getAccentStyle(accentHex, isDark)}
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
