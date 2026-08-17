import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  Search,
  BookOpen,
  Sparkles,
  Layers,
  Trash2,
  Loader2,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { extractTextFromFile, generateFlashcardsWithGemini } from '../utils/geminiFlashcardGenerator';
import { FlashcardsPracticeModal } from './FlashcardsPracticeModal';
import { GeminiApiKeyModal } from './GeminiApiKeyModal';

export const NotesTab: React.FC = () => {
  const {
    studyData,
    subjectsData,
    updateLectureNotes,
    updateLectureFlashcards,
    deleteLectureFlashcards,
    updateGeminiApiKey,
    getSubjectColorHex,
    config,
  } = useStudy();

  const isDark = config.isDarkMode;
  const isOled = config.themeMode === 'oled';

  let accentHex = config.accentColor || '#6366f1';
  if (accentHex === '#ffffff' || accentHex === '#000000') {
    accentHex = isDark ? '#ffffff' : '#0f172a';
  }
  const isWhiteAccent = accentHex === '#ffffff';

  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedNoteId, setExpandedNoteId] = useState<number | null>(null);
  const [activeLectureForAI, setActiveLectureForAI] = useState<number | null>(null);
  const [activePracticeLectureId, setActivePracticeLectureId] = useState<number | null>(null);
  const [deckToDelete, setDeckToDelete] = useState<{ id: number; topic: string; count: number } | null>(null);
  const [isDeletingModalClosing, setIsDeletingModalClosing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleNotesChange = (id: number, text: string) => {
    updateLectureNotes(id, text);
  };

  const handleTriggerFlashcardGeneration = (lectureId: number) => {
    setActiveLectureForAI(lectureId);
    if (!config.geminiApiKey || !config.geminiApiKey.trim()) {
      setShowApiKeyModal(true);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileUploadAndGenerate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeLectureForAI) return;

    const targetLecture = studyData.find((l) => l.id === activeLectureForAI);
    if (!targetLecture) return;

    // Reset input value so same file can be picked again if needed
    e.target.value = '';

    setIsGeneratingFlashcards(true);

    try {
      let extractedText = '';
      const isPdf = file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
      if (!isPdf) {
        extractedText = await extractTextFromFile(file);
      }
      if (targetLecture.notes && targetLecture.notes.trim()) {
        extractedText += `\n\nSTUDENT NOTES:\n${targetLecture.notes.trim()}`;
      }

      const cards = await generateFlashcardsWithGemini(
        targetLecture.topic,
        extractedText,
        config.geminiApiKey!,
        file
      );

      updateLectureFlashcards(targetLecture.id, cards);
      showToast(`Generated ${cards.length} Flashcards for ${targetLecture.topic}!`);
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Failed to generate flashcards. Please try again.');
    } finally {
      setIsGeneratingFlashcards(false);
      setActiveLectureForAI(null);
    }
  };

  const handleCloseDeleteModal = () => {
    setIsDeletingModalClosing(true);
    setTimeout(() => {
      setDeckToDelete(null);
      setIsDeletingModalClosing(false);
    }, 180);
  };

  const confirmDeleteDeck = () => {
    if (!deckToDelete) return;
    deleteLectureFlashcards(deckToDelete.id);
    handleCloseDeleteModal();
    showToast('Flashcard deck deleted.');
  };

  const filteredLectures = studyData.filter((i) => {
    const matchesSubject = !selectedSubject || i.module.toLowerCase() === selectedSubject.toLowerCase();
    const matchesSearch =
      i.topic.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (i.notes || '').toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchesSubject && matchesSearch;
  });

  const activePracticeLecture = studyData.find((l) => l.id === activePracticeLectureId);

  // Group lectures count per subject for sidebar badges
  const subjectCounts: { [name: string]: number } = {};
  studyData.forEach((l) => {
    subjectCounts[l.module] = (subjectCounts[l.module] || 0) + 1;
  });

  return (
    <div className="space-y-6 pb-12 animate-fade-slide-up w-full max-w-full overflow-x-hidden">
      {/* Hidden File Input for PDF upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUploadAndGenerate}
        accept=".pdf,.txt,.md"
        className="hidden"
      />

      {/* Floating Toast */}
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

      {/* Delete Whole Deck Warning Modal */}
      {deckToDelete &&
        ReactDOM.createPortal(
          <div
            className={`fixed inset-0 z-[100000] flex items-center justify-center p-4 backdrop-blur-xl bg-black/75 select-none ${
              isDeletingModalClosing ? 'animate-modal-backdrop-out' : 'animate-fade-in'
            }`}
          >
            <div
              className={`w-full max-w-md rounded-3xl border p-6 space-y-4 shadow-2xl ${
                isDeletingModalClosing ? 'animate-pop-out' : 'animate-pop-in'
              } ${
                isOled
                  ? 'bg-black border-slate-800 text-slate-100'
                  : isDark
                  ? 'bg-[#18181b] border-zinc-700 text-zinc-100'
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-extrabold text-base">Delete Flashcard Deck?</h4>
                  <p className="text-sm font-medium text-slate-400 mt-1 break-words">
                    Are you sure you want to delete all {deckToDelete.count} flashcards for "{deckToDelete.topic}"?
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseDeleteModal}
                  className="px-4 py-2 rounded-full text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteDeck}
                  className="px-5 py-2 rounded-full font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Delete Deck
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      {/* AI Flashcard Generation Progress Overlay */}
      {isGeneratingFlashcards &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 backdrop-blur-xl bg-black/80 animate-fade-in select-none">
            <div
              className={`w-full max-w-xs sm:max-w-sm rounded-3xl border p-6 text-center space-y-4 shadow-2xl animate-pop-in ${
                isOled
                  ? 'bg-black border-slate-800 text-slate-100'
                  : isDark
                  ? 'bg-[#18181b] border-zinc-700 text-zinc-100'
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              {(() => {
                const isWhiteOrBlackAccent = !accentHex || accentHex === '#ffffff' || accentHex === '#000000' || accentHex === '#0f172a';
                const loaderAccent = isWhiteOrBlackAccent ? (isDark ? '#ffffff' : '#0f172a') : accentHex;
                return (
                  <div
                    className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center border shadow-sm"
                    style={{
                      backgroundColor: `${loaderAccent}20`,
                      borderColor: `${loaderAccent}40`,
                      color: loaderAccent,
                    }}
                  >
                    <Loader2 className="w-7 h-7 animate-spin" style={{ color: loaderAccent }} />
                  </div>
                );
              })()}
              <div>
                <h4 className="font-extrabold text-base">Generating Flashcards...</h4>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Gemini API Key Modal */}
      {showApiKeyModal && (
        <GeminiApiKeyModal
          initialKey={config.geminiApiKey || ''}
          accentHex={accentHex}
          isDark={isDark}
          isOled={isOled}
          onSave={(key) => {
            updateGeminiApiKey(key);
            setShowApiKeyModal(false);
            showToast('Gemini API Key saved!');
            if (activeLectureForAI) {
              fileInputRef.current?.click();
            }
          }}
          onClose={() => {
            setShowApiKeyModal(false);
            setActiveLectureForAI(null);
          }}
        />
      )}

      {/* 3D Flashcards Practice Modal */}
      {activePracticeLecture && activePracticeLecture.flashcards && (
        <FlashcardsPracticeModal
          topicTitle={activePracticeLecture.topic}
          moduleName={activePracticeLecture.module}
          flashcards={activePracticeLecture.flashcards}
          accentHex={accentHex}
          isDark={isDark}
          isOled={isOled}
          onUpdateFlashcards={(updated) => updateLectureFlashcards(activePracticeLecture.id, updated)}
          onClose={() => setActivePracticeLectureId(null)}
        />
      )}

      {/* Search Header Bar */}
      <div
        className={`p-3 sm:p-4 rounded-3xl border backdrop-blur-md flex flex-col sm:flex-row items-center gap-3 ${
          isOled
            ? 'bg-black border-zinc-800'
            : isDark
            ? 'bg-[#27272a]/70 border-zinc-700/60 text-zinc-100'
            : 'bg-white/90 border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex-1 relative w-full">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search notes, lecture titles, formulas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-11 pr-4 py-2.5 rounded-full border text-sm font-medium focus:outline-none transition-colors ${
              isOled
                ? 'bg-black border-zinc-800 text-slate-100 placeholder-slate-500'
                : isDark
                ? 'bg-[#202024] border-zinc-700/60 text-zinc-100 placeholder-zinc-500'
                : 'bg-slate-50 border-slate-300 text-slate-900 font-bold'
            }`}
          />
        </div>

        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="px-4 py-2 rounded-full text-xs font-bold text-slate-400 hover:text-slate-100 border border-slate-700/50 cursor-pointer whitespace-nowrap"
          >
            Clear Search
          </button>
        )}
      </div>

      {studyData.length === 0 ? (
        <div className="p-12 text-center border border-dashed rounded-3xl border-zinc-700/60 space-y-3">
          <BookOpen className="w-8 h-8 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-400">No lectures logged yet</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Log your lectures in the Library tab to view and organize all your study notes and flashcards here!
          </p>
        </div>
      ) : (
        /* 2-Column Responsive Layout: Subjects on Left, Notes Cards on Right */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 items-start">
          
          {/* Left Column: Subjects Filter Selector */}
          <div
            className={`p-3 sm:p-4 rounded-3xl border backdrop-blur-md md:sticky md:top-6 space-y-1.5 transition-colors ${
              isOled
                ? 'bg-black border-zinc-800 text-slate-100'
                : isDark
                ? 'bg-[#27272a]/70 border-zinc-700/60 text-zinc-100'
                : 'bg-white/90 border-slate-200 text-slate-900 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between pb-2 mb-1 border-b border-zinc-800/40 px-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" style={{ color: accentHex }} /> Subjects
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800/40 text-slate-300">
                {subjectsData.length}
              </span>
            </div>

            {/* Mobile Horizontal Scroll / Desktop Vertical List of Subjects */}
            <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0 no-scrollbar">
              {/* "All Subjects" Option */}
              <button
                type="button"
                onClick={() => setSelectedSubject('')}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-extrabold transition-all text-left flex items-center justify-between gap-2 shrink-0 cursor-pointer select-none border ${
                  selectedSubject === ''
                    ? isDark
                      ? 'bg-white/15 border-white/40 text-white shadow-xs'
                      : 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : isOled
                    ? 'border-zinc-800/80 text-slate-400 hover:text-slate-200 hover:bg-zinc-900/60'
                    : isDark
                    ? 'border-zinc-700/60 text-slate-400 hover:text-slate-200 hover:bg-[#202024]'
                    : 'border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                  <span className="truncate">All Subjects</span>
                </div>
                <span className="text-xs font-extrabold opacity-70 shrink-0">
                  {studyData.length}
                </span>
              </button>

              {/* Dynamic Subject Buttons */}
              {subjectsData.map((sub) => {
                const count = subjectCounts[sub.name] || 0;
                const isSelected = selectedSubject.toLowerCase() === sub.name.toLowerCase();

                return (
                  <button
                    key={sub.id || sub.name}
                    type="button"
                    onClick={() => setSelectedSubject(isSelected ? '' : sub.name)}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-extrabold transition-all text-left flex items-center justify-between gap-2 shrink-0 cursor-pointer select-none border ${
                      isSelected
                        ? isDark
                          ? 'bg-zinc-800 border-zinc-500 text-white shadow-xs'
                          : 'bg-slate-100 border-slate-400 text-slate-900 shadow-xs'
                        : isOled
                        ? 'border-zinc-800/80 text-slate-400 hover:text-slate-200 hover:bg-zinc-900/60'
                        : isDark
                        ? 'border-zinc-700/60 text-slate-400 hover:text-slate-200 hover:bg-[#202024]'
                        : 'border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    style={
                      isSelected
                        ? {
                            borderColor: `${sub.color}80`,
                            backgroundColor: `${sub.color}25`,
                            color: isDark ? '#ffffff' : '#0f172a',
                          }
                        : {}
                    }
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sub.color }} />
                      <span className="truncate">{sub.name}</span>
                    </div>
                    <span className="text-xs font-extrabold opacity-70 shrink-0">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Full List of Notes Cards */}
          <div className="md:col-span-3 space-y-4">
            {filteredLectures.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-3xl border-zinc-700/60 space-y-2">
                <FileText className="w-6 h-6 text-slate-500 mx-auto" />
                <p className="text-sm text-slate-400 font-semibold">No notes match the current filter or search.</p>
              </div>
            ) : (
              filteredLectures.map((item) => {
                const color = getSubjectColorHex(item.module);
                const hasCards = item.flashcards && item.flashcards.length > 0;
                const isGeneratingThis = isGeneratingFlashcards && activeLectureForAI === item.id;
                const isExpanded = expandedNoteId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`p-4 sm:p-5 rounded-3xl border backdrop-blur-md space-y-3 transition-all ${
                      isExpanded
                        ? isOled
                          ? 'bg-zinc-950 border-zinc-700 shadow-xl'
                          : isDark
                          ? 'bg-[#222226] border-zinc-600 shadow-xl'
                          : 'bg-white border-slate-400 shadow-md'
                        : isOled
                        ? 'bg-black border-zinc-800 text-slate-100 hover:border-zinc-700'
                        : isDark
                        ? 'bg-[#27272a]/70 border-zinc-700/60 text-zinc-100 hover:border-zinc-600'
                        : 'bg-white/90 border-slate-200 text-slate-900 shadow-xs hover:border-slate-300'
                    }`}
                  >
                    {/* Card Header: Subject, Topic Name in Main Color & Flashcard Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-zinc-800/40">
                      <div
                        onClick={() => setExpandedNoteId(isExpanded ? null : item.id)}
                        className="min-w-0 flex-1 cursor-pointer select-none"
                      >
                        <span className="text-xs font-black uppercase tracking-wider block" style={{ color }}>
                          {item.module}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <h3
                            className="text-base sm:text-lg font-black break-words whitespace-normal leading-snug"
                            style={{ color }}
                          >
                            {item.topic}
                          </h3>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-500 shrink-0 opacity-60" />
                          )}
                        </div>
                      </div>

                      {/* Right Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                        {hasCards ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setActivePracticeLectureId(item.id)}
                              className="px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold border shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                              style={{
                                borderColor: `${accentHex}60`,
                                backgroundColor: `${accentHex}20`,
                                color: isWhiteAccent ? (isDark ? '#ffffff' : '#0f172a') : accentHex,
                              }}
                            >
                              <Layers className="w-4 h-4" /> Practice Flashcards ({item.flashcards!.length})
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setDeckToDelete({
                                  id: item.id,
                                  topic: item.topic,
                                  count: item.flashcards!.length,
                                })
                              }
                              title="Delete Flashcard Deck"
                              className="p-2 rounded-full border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all active:scale-95 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleTriggerFlashcardGeneration(item.id)}
                            disabled={isGeneratingThis}
                            className="px-3.5 py-1.5 rounded-full text-xs font-bold border shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-60 flex items-center gap-1.5 max-w-full"
                            style={{
                              borderColor: `${accentHex}60`,
                              backgroundColor: `${accentHex}18`,
                              color: isWhiteAccent ? (isDark ? '#ffffff' : '#0f172a') : accentHex,
                            }}
                          >
                            {isGeneratingThis ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Sparkles className="w-4 h-4" />
                            )}
                            <span>{isGeneratingThis ? 'Generating...' : 'Generate Flashcards'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Note Content: Start Snippet Preview by default; Expands on Click */}
                    {isExpanded ? (
                      <div className="space-y-2 animate-fade-in">
                        <textarea
                          rows={6}
                          autoFocus
                          value={item.notes || ''}
                          onChange={(e) => handleNotesChange(item.id, e.target.value)}
                          placeholder="Type personal study notes, key formulas, questions, or lecture summaries..."
                          className={`w-full p-4 rounded-2xl border text-sm sm:text-base leading-relaxed focus:outline-none transition-colors resize-y min-h-[140px] font-normal ${
                            isOled
                              ? 'bg-black border-zinc-800 text-zinc-100 placeholder-zinc-600'
                              : isDark
                              ? 'bg-[#18181c] border-zinc-700 text-zinc-100 placeholder-zinc-500'
                              : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                          }`}
                        />
                      </div>
                    ) : (
                      <div
                        onClick={() => setExpandedNoteId(item.id)}
                        className="cursor-pointer group py-1 select-none transition-all"
                        title="Click to view and edit full notes"
                      >
                        <p
                          className={`text-sm sm:text-base leading-relaxed line-clamp-2 break-words transition-colors ${
                            item.notes && item.notes.trim()
                              ? isDark
                                ? 'text-zinc-300 group-hover:text-zinc-100'
                                : 'text-slate-700 group-hover:text-slate-900'
                              : 'text-zinc-500 italic'
                          }`}
                        >
                          {item.notes && item.notes.trim()
                            ? item.notes.trim()
                            : 'Click to write and view notes for this lecture...'}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
