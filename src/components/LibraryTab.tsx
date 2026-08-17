import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { BookOpen, Plus, Trash2, Edit2, Play, Pause, Check, X, AlertTriangle, Search, GripVertical, Calendar, ArrowUp } from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import type { StudyItem, Subject } from '../types/study';
import { CustomSelect } from './CustomSelect';
import { ConfirmationModal } from './ConfirmationModal';
import { ColorPickerPopover } from './ColorPickerPopover';
import { getAccentStyle } from '../utils/themeUtils';

interface LibraryTabProps {
  onNavigateToReview?: () => void;
}

export const LibraryTab: React.FC<LibraryTabProps> = () => {
  const {
    studyData,
    subjectsData,
    addSubject,
    deleteSubject,
    addStudyItem,
    deleteStudyItem,
    updateLectureTopic,
    togglePauseItem,
    setSubjectFocus,
    reorderStudyItem,
    moveStudyItemToSubject,
    config,
  } = useStudy();

  const [dragOverSubjectName, setDragOverSubjectName] = useState<string | null>(null);

  const isDark = config.themeMode !== 'light';
  const isOled = config.themeMode === 'oled';

  let accentHex = config.accentColor || '#6366f1';
  if (accentHex === '#ffffff' || accentHex === '#000000') {
    accentHex = isDark ? '#ffffff' : '#0f172a';
  }
  const isWhiteAccent = accentHex === '#ffffff';

  // Create Subject Form
  const [newSubName, setNewSubName] = useState('');
  const [newSubColor, setNewSubColor] = useState(accentHex);
  const [showAddSubject, setShowAddSubject] = useState(false);

  // Add Lecture Form
  const [selectedSubForLec, setSelectedSubForLec] = useState('');
  const [newTopicName, setNewTopicName] = useState('');

  // Editing Lecture
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTopicName, setEditTopicName] = useState('');

  // Confirmation Modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'subject' | 'lecture';
    idOrName: number | string;
    title: string;
  } | null>(null);



  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Search & Status Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'overdue' | 'delayed' | 'paused'>('all');

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

  // Drag & Drop Insertion Line State
  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ id: number; position: 'above' | 'below' } | null>(null);

  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) return;
    addSubject(newSubName.trim(), newSubColor);
    showToast(`Subject '${newSubName.trim()}' created! 📚`);
    setNewSubName('');
    setShowAddSubject(false);
  };

  const handleAddLecture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubForLec || !newTopicName.trim()) return;
    addStudyItem(selectedSubForLec, newTopicName.trim());
    showToast(`Lecture '${newTopicName.trim()}' added! ✨`);
    setNewTopicName('');
  };

  const handleStartEdit = (item: StudyItem) => {
    setEditingId(item.id);
    setEditTopicName(item.topic);
  };

  const handleSaveEdit = (id: number) => {
    if (editTopicName.trim()) {
      updateLectureTopic(id, editTopicName.trim());
      showToast('Lecture updated!');
    }
    setEditingId(null);
  };

  const handleFocusSubjectClick = (subName: string) => {
    setSubjectFocus(subName);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('text/plain', id.toString());
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItemId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const position = offsetY < rect.height / 2 ? 'above' : 'below';

    if (!dragOverTarget || dragOverTarget.id !== targetId || dragOverTarget.position !== position) {
      setDragOverTarget({ id: targetId, position });
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedIdStr = e.dataTransfer.getData('text/plain');
    const draggedId = parseInt(draggedIdStr, 10);

    if (draggedId) {
      reorderStudyItem(draggedId, targetId, dragOverTarget?.position || 'above');
      showToast('Lecture reordered!');
    }
    setDraggedItemId(null);
    setDragOverTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverTarget(null);
    setDragOverSubjectName(null);
  };

  const handleDragOverSubject = (e: React.DragEvent, subjectName: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSubjectName !== subjectName) {
      setDragOverSubjectName(subjectName);
    }
  };

  const handleDragLeaveSubject = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSubjectName(null);
  };

  const handleDropOnSubject = (e: React.DragEvent, subjectName: string) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedIdStr = e.dataTransfer.getData('text/plain');
    const draggedId = parseInt(draggedIdStr, 10);

    if (draggedId) {
      moveStudyItemToSubject(draggedId, subjectName);
      showToast(`Moved lecture to ${subjectName}!`);
    }
    setDraggedItemId(null);
    setDragOverTarget(null);
    setDragOverSubjectName(null);
  };

  const [touchDraggingItemId, setTouchDraggingItemId] = useState<number | null>(null);
  const [movingLectureItem, setMovingLectureItem] = useState<StudyItem | null>(null);

  // Freeze native page scrolling when holding the 6-dots handle on mobile
  useEffect(() => {
    if (touchDraggingItemId !== null) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.touchAction = 'none';

      const preventScroll = (e: TouchEvent) => {
        if (e.cancelable) {
          e.preventDefault();
        }
      };

      window.addEventListener('touchmove', preventScroll, { passive: false });
      return () => {
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
        document.documentElement.style.overflow = '';
        document.documentElement.style.touchAction = '';
        window.removeEventListener('touchmove', preventScroll);
      };
    }
  }, [touchDraggingItemId]);

  const handleTouchStart = (e: React.TouchEvent, itemId: number) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    e.stopPropagation();
    setTouchDraggingItemId(itemId);
    setDraggedItemId(itemId);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchDraggingItemId) return;
    if (e.cancelable) {
      e.preventDefault();
    }
    e.stopPropagation();

    const touch = e.touches[0];
    if (!touch) return;

    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el) return;

    const subjectCard = el.closest('[data-subject-card]');
    if (subjectCard) {
      const subName = subjectCard.getAttribute('data-subject-card');
      if (subName && subName !== dragOverSubjectName) {
        setDragOverSubjectName(subName);
      }
    }

    const itemCard = el.closest('[data-lecture-id]');
    if (itemCard) {
      const targetIdStr = itemCard.getAttribute('data-lecture-id');
      if (targetIdStr) {
        const targetId = parseInt(targetIdStr, 10);
        if (targetId !== touchDraggingItemId) {
          const rect = itemCard.getBoundingClientRect();
          const offsetY = touch.clientY - rect.top;
          const position = offsetY < rect.height / 2 ? 'above' : 'below';
          setDragOverTarget({ id: targetId, position });
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (!touchDraggingItemId) return;

    if (dragOverTarget) {
      reorderStudyItem(touchDraggingItemId, dragOverTarget.id, dragOverTarget.position);
      showToast('Lecture reordered!');
    } else if (dragOverSubjectName) {
      moveStudyItemToSubject(touchDraggingItemId, dragOverSubjectName);
      showToast(`Moved lecture to ${dragOverSubjectName}!`);
    }

    setTouchDraggingItemId(null);
    setDraggedItemId(null);
    setDragOverTarget(null);
    setDragOverSubjectName(null);
  };

  const subjectOptions = subjectsData.map((s: Subject) => ({
    value: s.name,
    label: s.name,
    color: s.color,
  }));

  const formatNextReviewDate = (item: StudyItem): string => {
    if (item.isPaused) return 'Paused';

    const targetTs = item.status === 'delayed' ? item.delayDate : item.nextReviewDate;
    if (!targetTs || targetTs <= 0) return 'New';

    const d = new Date(targetTs);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dZero = new Date(d);
    dZero.setHours(0, 0, 0, 0);

    if (dZero.getTime() === today.getTime()) return 'Today';
    if (dZero.getTime() < today.getTime()) return 'Overdue';

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Weak Topics Filter: EF < 1.9 or overdue status
  const weakTopics = studyData.filter((i) => !i.isPaused && (i.efactor < 1.9 || i.status === 'overdue'));

  return (
    <div className="space-y-6 pb-8 animate-fade-slide-up">
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
      {/* Top Card: Add & Manage Subjects / Lectures */}
      <div
        className={`p-6 rounded-3xl border-[0.25px] backdrop-blur-md space-y-4 transition-colors relative z-50 ${
          isOled
            ? 'bg-black border-slate-700/80 text-slate-100 shadow-lg shadow-black'
            : isDark
            ? 'bg-[#27272a]/70 border-zinc-700/60 text-zinc-100'
            : 'bg-white border-slate-200 shadow-xs text-slate-900'
        }`}
      >
        <div className="space-y-3 min-w-0">
          <h2 className="text-xs xs:text-sm sm:text-xl font-extrabold flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis shrink-0">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" style={{ color: accentHex }} /> Add & Manage Subjects / Lectures
          </h2>

          <button
            type="button"
            onClick={() => setShowAddSubject(!showAddSubject)}
            className="w-full py-3 rounded-full font-bold text-xs shadow-md active:scale-98 transition-all duration-300 ease-out cursor-pointer flex items-center justify-center gap-2 border"
            style={getAccentStyle(accentHex, isDark)}
          >
            {showAddSubject ? (
              <>
                <X className="w-4 h-4" /> Cancel Subject Creation
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> Create Subject
              </>
            )}
          </button>
        </div>

        {/* Create Subject Modal Form with 60 FPS Accordion Animation */}
        <div
          className={`transition-all duration-300 ease-out ${
            showAddSubject ? 'max-h-96 opacity-100 mt-3 overflow-visible' : 'max-h-0 opacity-0 mt-0 overflow-hidden pointer-events-none'
          }`}
        >
          <form
            onSubmit={handleCreateSubject}
            className={`p-4 rounded-3xl border-[0.25px] space-y-3 shadow-md ${
              isOled
                ? 'bg-black border-slate-700 text-slate-100'
                : isDark
                ? 'bg-[#242428] border-zinc-700/60'
                : 'bg-slate-100 border-slate-200'
            }`}
          >
            <div className="flex flex-col gap-2.5 w-full relative">
              <div className="flex items-center gap-2 w-full min-w-0">
                <input
                  type="text"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  placeholder="Subject Name (e.g. Pathology)..."
                  className={`flex-1 min-w-0 px-4 py-2.5 rounded-full border-[0.25px] text-xs font-semibold focus:outline-none ${
                    isOled
                      ? 'bg-black border-slate-800 text-slate-100 placeholder-slate-500'
                      : isDark
                      ? 'bg-[#1a1a1e] border-zinc-700/60 text-zinc-100'
                      : 'bg-white border-slate-300 text-slate-900 font-bold'
                  }`}
                />
                <ColorPickerPopover color={newSubColor} onChange={setNewSubColor} />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-full font-bold text-xs shadow cursor-pointer active:scale-95 transition-all flex items-center justify-center border"
                style={getAccentStyle(accentHex, isDark)}
              >
                Save Subject
              </button>
            </div>
          </form>
        </div>

        {/* Sleek Horizontal Separating Line */}
        <div className={`w-full h-[1px] my-3.5 ${isDark ? 'bg-zinc-800/80' : 'bg-slate-200'}`} />

        {/* Add Lecture Form with CustomSelect Component */}
        <form onSubmit={handleAddLecture} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
          <div className="grid grid-cols-2 gap-2 flex-1 w-full">
            <CustomSelect
              options={subjectOptions}
              value={selectedSubForLec}
              onChange={setSelectedSubForLec}
              placeholder="Choose Subject..."
              className="w-full"
            />

            <input
              type="text"
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              placeholder="Lecture Name..."
              className={`w-full px-4 py-2.5 rounded-full border text-xs font-bold focus:outline-none transition-all ${
                isOled
                  ? 'bg-black border-slate-700 text-slate-100 placeholder:text-slate-400 font-extrabold'
                  : isDark
                  ? 'bg-[#1a1a1e] border-zinc-700/60 text-zinc-100 placeholder:text-zinc-500 font-extrabold'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-500 font-bold'
              }`}
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-full font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1 border"
            style={getAccentStyle(accentHex, isDark)}
          >
            <Plus className="w-4 h-4" /> Add Lecture
          </button>
        </form>
      </div>

      {/* Weak Topics / Needs Review High Priority Panel */}
      {weakTopics.length > 0 && (
        <div
          className={`p-6 rounded-3xl border-[0.25px] backdrop-blur-md space-y-3 ${
            isDark
              ? 'bg-rose-950/20 border-rose-500/30 text-slate-100'
              : 'bg-rose-50 border-rose-300 text-rose-950 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 animate-bounce" /> Harder Lectures Needs Attention ({weakTopics.length})
            </h3>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 uppercase">
              EF &lt; 1.9
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {weakTopics.map((item) => (
              <div
                key={item.id}
                onClick={() => handleFocusSubjectClick(item.module)}
                className={`p-3 rounded-2xl border-[0.25px] flex items-center justify-between transition-all cursor-pointer hover:scale-[1.01] ${
                  isDark
                    ? 'bg-[#242428] border-rose-500/30 text-slate-100 hover:border-rose-400'
                    : 'bg-white border-rose-200 text-slate-900 shadow-2xs hover:border-rose-300'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 block truncate">
                    {item.module}
                  </span>
                  <span className="text-xs font-bold truncate block">{item.topic}</span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-400 shrink-0">
                  EF {item.efactor.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Search Bar & Status Filters */}
      <div
        className={`p-4 rounded-3xl border-[0.25px] backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors ${
          isOled
            ? 'bg-black border-slate-700/80 shadow-md shadow-black'
            : isDark
            ? 'bg-[#27272a]/70 border-zinc-700/60 text-zinc-100'
            : 'bg-white border-slate-200 shadow-xs text-slate-900'
        }`}
      >
        {/* Search Field */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subject or lecture..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-full border-[0.25px] text-xs font-semibold focus:outline-none transition-colors ${
              isDark ? 'bg-[#202024] border-zinc-700/60 text-zinc-100' : 'bg-white border-slate-300 text-slate-900 shadow-xs'
            }`}
          />
        </div>

        {/* Status Filter Chips: All, Active, Overdue, Delayed, Paused */}
        <div className="grid grid-cols-5 sm:flex sm:flex-wrap items-center gap-1 sm:gap-1.5 w-full">
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'delayed', label: 'Delayed' },
            { id: 'paused', label: 'Paused' },
          ].map((f) => {
            const isSelected = statusFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-1 sm:px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-extrabold transition-all cursor-pointer select-none text-center truncate ${
                  isSelected
                    ? 'shadow-md scale-105'
                    : isDark
                    ? 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 border border-zinc-700/50'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
                style={isSelected ? { backgroundColor: accentHex, color: isWhiteAccent ? '#0f172a' : '#ffffff' } : {}}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

        {/* Subjects & Lectures List */}
        {subjectsData.map((sub: Subject) => {
          let subLectures = studyData.filter((i) => i.module.toLowerCase() === sub.name.toLowerCase());

          if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            subLectures = subLectures.filter(
              (i) => i.topic.toLowerCase().includes(query) || i.module.toLowerCase().includes(query)
            );
          }

          if (statusFilter === 'paused') {
            subLectures = subLectures.filter((i) => i.isPaused);
          } else if (statusFilter === 'overdue') {
            subLectures = subLectures.filter((i) => !i.isPaused && i.status === 'overdue');
          } else if (statusFilter === 'delayed') {
            subLectures = subLectures.filter((i) => !i.isPaused && i.status === 'delayed');
          } else if (statusFilter === 'active') {
            subLectures = subLectures.filter((i) => !i.isPaused && (i.status === 'sr' || i.status === 'new'));
          }

          if (searchQuery.trim() && subLectures.length === 0) return null;

          return (
            <div
              key={sub.name}
              data-subject-card={sub.name}
              onDragOver={(e) => handleDragOverSubject(e, sub.name)}
              onDragLeave={handleDragLeaveSubject}
              onDrop={(e) => handleDropOnSubject(e, sub.name)}
              className={`p-4 sm:p-6 rounded-3xl border-[0.25px] backdrop-blur-md space-y-4 transition-all touch-pan-y ${
                dragOverSubjectName === sub.name ? 'ring-2 ring-indigo-500 border-indigo-500 shadow-xl scale-[1.01]' : ''
              } ${
                isOled
                  ? 'bg-black border-slate-700/80 text-slate-100 shadow-lg shadow-black'
                  : isDark
                  ? 'bg-[#27272a]/70 border-zinc-700/60 text-zinc-100'
                  : 'bg-white border-slate-200 shadow-xs text-slate-900'
              }`}
            >
              {/* Subject Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/40">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: sub.color }} />
                  <h3 className="text-sm sm:text-base font-extrabold flex items-center gap-1.5 break-words">
                    <span>{sub.name}</span>
                    <span className={`text-xs font-black opacity-75 shrink-0 ${!isDark ? 'text-slate-600' : 'text-slate-400'}`}>({subLectures.length})</span>
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
                  <button
                    onClick={() => handleFocusSubjectClick(sub.name)}
                    className="px-3 py-1 sm:px-4 sm:py-1.5 rounded-full font-bold text-[11px] sm:text-xs shadow cursor-pointer active:scale-95 transition-all flex items-center gap-1 whitespace-nowrap"
                    style={{
                      backgroundColor: sub.color,
                      color: sub.color === '#ffffff' || sub.color === '#fff' ? '#0f172a' : '#ffffff',
                    }}
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Focus Subject
                  </button>

                  {/* Subject Delete Button with Confirmation Popup */}
                  <button
                    onClick={() =>
                      setDeleteConfirm({
                        type: 'subject',
                        idOrName: sub.name,
                        title: sub.name,
                      })
                    }
                    className="p-1.5 sm:p-2 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
                    title={`Delete ${sub.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>

              {/* Lecture Items List */}
              <div className="space-y-2">
                {subLectures.length === 0 ? (
                  <div
                    className={`p-4 rounded-2xl border-2 border-dashed text-center transition-all ${
                      dragOverSubjectName === sub.name
                        ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300 font-bold scale-[1.01]'
                        : isDark
                        ? 'border-zinc-700/60 bg-zinc-900/30 text-zinc-500'
                        : 'border-slate-300 bg-slate-50 text-slate-500'
                    }`}
                  >
                    <p className="text-xs font-bold">
                      {dragOverSubjectName === sub.name
                        ? `Drop lecture here to move to ${sub.name}!`
                        : 'No lectures in this subject. Drag a lecture here to move it.'}
                    </p>
                  </div>
                ) : (
                  subLectures.map((item) => {
                    const isDragging = draggedItemId === item.id;
                    const isTargetAbove = dragOverTarget?.id === item.id && dragOverTarget?.position === 'above';
                    const isTargetBelow = dragOverTarget?.id === item.id && dragOverTarget?.position === 'below';
                    const nextRevText = formatNextReviewDate(item);

                    return (
                      <div
                        key={item.id}
                        data-lecture-id={item.id}
                        onDragOver={(e) => handleDragOver(e, item.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, item.id)}
                        onDragEnd={handleDragEnd}
                        className={`p-3.5 sm:p-4 rounded-2xl border-[0.25px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all relative touch-pan-y ${
                          isDragging ? 'opacity-40 scale-95' : ''
                        } ${
                          isOled
                            ? 'bg-black border-slate-700/80 shadow-sm'
                            : isDark
                            ? 'bg-[#1f1f23] border-zinc-700/50 text-zinc-100'
                            : 'bg-slate-50 border-slate-200 shadow-xs'
                        }`}
                      >
                        {/* Straight Horizontal Line Indicator (No Curves) */}
                        {isTargetAbove && (
                          <div
                            className="absolute -top-[5px] left-0 right-0 h-[3px] z-30 pointer-events-none rounded-none shadow-md"
                            style={{ backgroundColor: accentHex }}
                          />
                        )}
                        {isTargetBelow && (
                          <div
                            className="absolute -bottom-[5px] left-0 right-0 h-[3px] z-30 pointer-events-none rounded-none shadow-md"
                            style={{ backgroundColor: accentHex }}
                          />
                        )}

                        {/* Top / Main Row: Drag Handle + Title */}
                        <div className="flex items-start gap-2.5 min-w-0 flex-1 w-full">
                          {/* Drag Handle: Borderless 6 Dots Icon */}
                          <div
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, item.id)}
                            onTouchStart={(e) => handleTouchStart(e, item.id)}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            onClick={() => setMovingLectureItem(item)}
                            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-200 p-1 shrink-0 hover:bg-slate-800/50 rounded-lg transition-colors mt-0.5 touch-none select-none"
                            title="Drag or tap to move lecture"
                          >
                            <GripVertical className="w-4.5 h-4.5 stroke-[2.5]" />
                          </div>

                          {/* Lecture Title / Edit Form */}
                          {editingId === item.id ? (
                            <div className="flex-1 flex items-center gap-2 min-w-0">
                              <input
                                type="text"
                                value={editTopicName}
                                onChange={(e) => setEditTopicName(e.target.value)}
                                className={`flex-1 min-w-0 px-3 py-1.5 rounded-xl border-[0.25px] text-xs font-bold focus:outline-none ${
                                  isDark ? 'bg-[#1a1a1e] border-zinc-700/60 text-zinc-100' : 'bg-white border-slate-300 text-slate-900'
                                }`}
                              />
                              <button
                                onClick={() => handleSaveEdit(item.id)}
                                className="p-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs shrink-0 cursor-pointer"
                                title="Save Title"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1.5 rounded-lg bg-slate-700 text-slate-300 font-bold text-xs shrink-0 cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-sm sm:text-base font-extrabold sm:font-black break-words leading-snug ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                                {item.topic}
                              </h4>
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5">
                                  {/* EF Badge */}
                                  <span className={`text-[11px] sm:text-xs font-black px-2.5 py-0.5 rounded-full border shrink-0 ${
                                    isDark
                                      ? 'bg-teal-500/20 border-teal-500/50 text-teal-300'
                                      : 'bg-teal-100 border-teal-300 text-teal-950 font-black'
                                  }`}>
                                    EF: {item.efactor.toFixed(2)}
                                  </span>

                                  {/* Rep Badge */}
                                  <span className={`text-xs sm:text-sm font-black px-2.5 py-0.5 rounded-full border shrink-0 ${
                                    isDark
                                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                                      : 'bg-purple-100 border-purple-300 text-purple-950 font-black'
                                  }`}>
                                    #{item.repetition + 1}
                                  </span>

                                  {/* Next Review Date */}
                                  <span className={`text-[11px] sm:text-xs font-black px-2.5 py-0.5 rounded-full border flex items-center gap-1 shrink-0 ${
                                    isDark
                                      ? 'bg-indigo-500/25 border-indigo-500/50 text-indigo-200'
                                      : 'bg-indigo-100 border-indigo-300 text-indigo-950 font-black'
                                  }`}>
                                    <Calendar className="w-3 h-3 stroke-[2.5]" /> Next: {nextRevText}
                                  </span>
                                </div>
                            </div>
                          )}
                        </div>

                        {/* Control Actions Row (Mobile: Bottom Row; Desktop: Right Side) */}
                        {editingId !== item.id && (
                          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/40 mt-1 sm:mt-0">
                            {/* Badges */}
                            <div>
                              {item.isPaused ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-slate-500/15 border border-slate-500/30 text-slate-400">
                                  Paused
                                </span>
                              ) : item.status === 'overdue' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-rose-500/15 border border-rose-500/30 text-rose-400">
                                  Overdue
                                </span>
                              ) : item.status === 'delayed' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-400">
                                  Delayed
                                </span>
                              ) : item.status === 'new' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-slate-500/15 border border-slate-500/30 text-slate-400">
                                  New
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                                  Active
                                </span>
                              )}
                            </div>

                            {/* Control Action Buttons */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => togglePauseItem(item.id)}
                                className={`p-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                                  item.isPaused
                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
                                    : 'bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25'
                                }`}
                                title={item.isPaused ? 'Resume SR' : 'Pause SR'}
                              >
                                {item.isPaused ? <Play className="w-3.5 h-3.5 stroke-[2.5]" /> : <Pause className="w-3.5 h-3.5 stroke-[2.5]" />}
                              </button>

                              <button
                                onClick={() => handleStartEdit(item)}
                                className="p-1.5 rounded-xl border border-zinc-700/60 bg-[#242428] text-slate-300 hover:bg-[#2c2c30] active:scale-95 transition-all cursor-pointer"
                                title="Edit Title"
                              >
                                <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>

                              <button
                                onClick={() =>
                                  setDeleteConfirm({
                                    type: 'lecture',
                                    idOrName: item.id,
                                    title: item.topic,
                                  })
                                }
                                className="p-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all cursor-pointer"
                                title="Delete Lecture"
                              >
                                <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}

      {/* Delete Confirmation Modal Popup */}
      {deleteConfirm && (
        <ConfirmationModal
          title={deleteConfirm.type === 'subject' ? 'Delete Subject?' : 'Delete Lecture?'}
          message={`Are you sure you want to delete '${deleteConfirm.title}'? ${
            deleteConfirm.type === 'subject' ? 'All associated lectures will also be deleted.' : ''
          }`}
          onConfirm={() => {
            if (deleteConfirm.type === 'subject') {
              deleteSubject(deleteConfirm.idOrName as string);
            } else {
              deleteStudyItem(deleteConfirm.idOrName as number);
            }
          }}
          onClose={() => setDeleteConfirm(null)}
        />
      )}

      {/* Mobile / Tap Move Lecture Modal */}
      {movingLectureItem &&
        ReactDOM.createPortal(
          <div
            onClick={() => setMovingLectureItem(null)}
            className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm p-6 rounded-3xl border shadow-2xl space-y-4 animate-pop-in ${
                isOled
                  ? 'bg-black border-slate-800 text-slate-100'
                  : isDark
                  ? 'bg-[#1c1c20] border-zinc-700/80 text-zinc-100'
                  : 'bg-white border-slate-300 text-slate-900 shadow-slate-400/50'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-zinc-700/40">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <GripVertical className="w-4 h-4 text-indigo-400 shrink-0" />
                  <h3 className="text-sm font-black truncate">
                    Move "{movingLectureItem.topic}"
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setMovingLectureItem(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-white shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pt-1">
                <p className="text-xs font-bold text-slate-400 mb-2">Select Target Subject:</p>
                {subjectsData.map((s: Subject) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => {
                      moveStudyItemToSubject(movingLectureItem.id, s.name);
                      showToast(`Moved to ${s.name}!`);
                      setMovingLectureItem(null);
                    }}
                    className={`w-full p-3 rounded-2xl border text-xs font-black flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      movingLectureItem.module === s.name
                        ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
                        : isDark
                        ? 'bg-zinc-800/60 border-zinc-700/50 hover:bg-zinc-700/80 text-zinc-100'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="truncate">{s.name}</span>
                    </div>
                    {movingLectureItem.module === s.name && (
                      <span className="text-[10px] uppercase font-black tracking-wider text-indigo-400">Current</span>
                    )}
                  </button>
                ))}
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
