import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { StudyItem, Exam, SubjectReview, Subject, AppConfig, Flashcard } from '../types/study';
import type { User } from 'firebase/auth';
import type { SyncStatus, CloudPayload } from '../hooks/useCloudSync';

import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { scheduleExamNotification, scheduleSubjectReviewNotification } from '../utils/notificationService';

const KEY_STUDY_DATA = 'studyTrackerData';
const KEY_EXAMS_DATA = 'studyTrackerExams';
const KEY_SUBJECT_REVIEWS_DATA = 'studyTrackerSubjectReviews';
const KEY_SUBJECTS_DATA = 'studyTrackerSubjects';
const KEY_REVIEWS_COUNT = 'studyTrackerReviewsCount';
const KEY_CONFIG = 'studyTrackerConfig';
const KEY_REST_DAYS = 'studyTrackerRestDays';

// Local timezone date string helper
const getLocalDateStr = (ts: number): string => {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

interface StudyContextType {
  studyData: StudyItem[];
  examData: Exam[];
  subjectReviewsData: SubjectReview[];
  subjectsData: Subject[];
  restDaysData: string[]; // YYYY-MM-DD strings
  totalReviewsCount: number;
  config: AppConfig;
  isLoading: boolean;
  selectedExamFocusId: number | null;
  selectedSubjectFocusName: string | null;
  pendingSubjectFocusName: string | null;
  confirmSubjectFocus: () => void;
  cancelSubjectFocus: () => void;

  // Cloud sync
  currentUser: User | null;
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  setCurrentUser: (user: User | null) => void;
  setSyncStatus: (s: SyncStatus) => void;
  setLastSyncedAt: (d: Date) => void;
  getCloudPayload: () => CloudPayload;
  restoreFromCloudPayload: (payload: CloudPayload) => void;

  // Actions
  setExamFocus: (id: number | null) => void;
  setSubjectFocus: (name: string | null) => void;
  toggleDarkMode: (val: boolean) => void;
  updateThemeMode: (mode: 'dark' | 'oled' | 'light') => void;
  updateAccentColor: (color: string) => void;
  updateUserName: (name: string) => void;
  completeOnboarding: (name: string, theme: 'dark' | 'oled' | 'light', accent: string, algo: 'smart' | 'fixed') => void;
  updateFontSize: (size: AppConfig['fontSize']) => void;
  updateNavPosition: (pos: 'bottom' | 'side') => void;
  toggleNeonGlow: () => void;
  updateAlgoMode: (mode: 'smart' | 'fixed') => void;
  updateFixedDays: (days: { hard?: number; good?: number; easy?: number }) => void;
  updateGeminiApiKey: (key: string) => void;
  getSubjectColorHex: (moduleName: string) => string;
  addSubject: (name: string, color: string) => boolean;
  deleteSubject: (name: string) => void;
  addStudyItem: (module: string, topic: string) => boolean;
  updateLectureState: (id: number, newState: 'new' | 'sr' | 'overdue' | 'delayed') => void;
  processReview: (id: number, grade: 'hard' | 'good' | 'easy') => void;
  processFirstReview: (id: number, grade: 'hard' | 'good' | 'easy') => void;
  processSubjectReviewSession: (moduleName: string, grade: 'hard' | 'good' | 'easy') => void;
  togglePauseItem: (id: number) => void;
  updateLectureTopic: (id: number, newTopic: string) => void;
  updateLectureNotes: (id: number, notes: string) => void;
  updateLectureFlashcards: (id: number, flashcards: Flashcard[]) => void;
  deleteLectureFlashcards: (id: number) => void;
  deleteStudyItem: (id: number) => void;
  moveStudyItem: (id: number, direction: number) => void;
  reorderStudyItem: (draggedId: number, targetId: number, position?: 'above' | 'below') => void;
  moveStudyItemToSubject: (draggedId: number, targetSubjectName: string) => void;
  addExam: (module: string, date: string, linkedLectures: number[], reminderDays?: number) => boolean;
  deleteExam: (id: number) => void;
  updateExam: (id: number, details: { module?: string; date?: string; linkedLectures?: number[]; reminderDays?: number }) => void;
  toggleExamCompleted: (id: number) => void;
  addSubjectReview: (module: string, date: string) => boolean;
  deleteSubjectReview: (id: number) => void;
  toggleRestDay: (dateStr: string) => void;
  updateWeeklyRestDay: (day: AppConfig['weeklyRestDay']) => void;
  toggleRestDayOverride: (dateStr: string) => void;
  isRestDay: (dateStr: string) => boolean;
  exportJson: () => string;
  restoreFromJson: (jsonStr: string) => boolean;
  resetLocalDataOnly: () => void;
  getTopSubject: () => string;
}

const StudyContext = createContext<StudyContextType | undefined>(undefined);

export const StudyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [studyData, setStudyData] = useState<StudyItem[]>([]);
  const [examData, setExamData] = useState<Exam[]>([]);
  const [subjectReviewsData, setSubjectReviewsData] = useState<SubjectReview[]>([]);
  const [subjectsData, setSubjectsData] = useState<Subject[]>([]);
  const [restDaysData, setRestDaysData] = useState<string[]>([]);
  const [totalReviewsCount, setTotalReviewsCount] = useState<number>(0);
  const [selectedExamFocusId, setSelectedExamFocusId] = useState<number | null>(null);
  const [selectedSubjectFocusName, setSelectedSubjectFocusName] = useState<string | null>(null);
  const [pendingSubjectFocusName, setPendingSubjectFocusName] = useState<string | null>(null);
  const [config, setConfig] = useState<AppConfig>({
    algoMode: 'smart',
    fixedHard: 1,
    fixedGood: 3,
    fixedEasy: 7,
    isDarkMode: false,
    themeMode: 'light',
    accentColor: '#ffffff',
    userName: '',
    hasCompletedOnboarding: false,
    fontSize: 'default',
    navPosition: 'bottom',
    disableNeonGlow: false,
    weeklyRestDay: 'none',
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Cloud sync state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Initial Load from localStorage
  useEffect(() => {
    try {
      const savedStudy = localStorage.getItem(KEY_STUDY_DATA);
      const savedExams = localStorage.getItem(KEY_EXAMS_DATA);
      const savedSubjectReviews = localStorage.getItem(KEY_SUBJECT_REVIEWS_DATA);
      const savedSubs = localStorage.getItem(KEY_SUBJECTS_DATA);
      const savedRest = localStorage.getItem(KEY_REST_DAYS);
      const savedReviews = localStorage.getItem(KEY_REVIEWS_COUNT);
      const savedConfig = localStorage.getItem(KEY_CONFIG);

      let loadedStudy: StudyItem[] = savedStudy ? JSON.parse(savedStudy) : [];
      const loadedExams: Exam[] = savedExams ? JSON.parse(savedExams) : [];
      const loadedSubjectReviews: SubjectReview[] = savedSubjectReviews ? JSON.parse(savedSubjectReviews) : [];
      const loadedSubs: Subject[] = savedSubs ? JSON.parse(savedSubs) : [];
      const loadedRest: string[] = savedRest ? JSON.parse(savedRest) : [];
      const loadedReviews: number = savedReviews ? parseInt(savedReviews, 10) : 0;
      let loadedConfig: AppConfig = savedConfig ? JSON.parse(savedConfig) : {
        algoMode: 'smart',
        fixedHard: 1,
        fixedGood: 3,
        fixedEasy: 7,
        isDarkMode: false,
        themeMode: 'light',
        accentColor: '#ffffff',
        userName: '',
        hasCompletedOnboarding: false,
        fontSize: 'default',
        navPosition: 'bottom',
        disableNeonGlow: false,
      };

      if (!loadedConfig.themeMode || (loadedConfig.themeMode as string) === 'gray') {
        loadedConfig.themeMode = loadedConfig.isDarkMode ? 'dark' : 'light';
      }
      if (!loadedConfig.accentColor || loadedConfig.accentColor === '#06b6d4' || loadedConfig.accentColor === '#64B0D8' || loadedConfig.accentColor === '#75B3C7') {
        loadedConfig.accentColor = '#ffffff';
      }

      setStudyData(loadedStudy);
      setExamData(loadedExams);
      setSubjectReviewsData(loadedSubjectReviews);
      setSubjectsData(loadedSubs);
      setRestDaysData(loadedRest);
      setTotalReviewsCount(loadedReviews);
      setConfig(loadedConfig);
    } catch (e) {
      console.error('Error loading local storage data', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync hasCompletedOnboarding from Firestore for existing accounts so OnboardingModal NEVER appears on re-login
  useEffect(() => {
    if (!currentUser) return;
    const userRef = doc(db, 'users', currentUser.uid);
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        // If the user completed onboarding in cloud or is an activated user, mark onboarding as completed locally
        if (data?.hasCompletedOnboarding === true || data?.isActivated === true) {
          setConfig((prev) => {
            if (!prev.hasCompletedOnboarding) {
              const updated = { ...prev, hasCompletedOnboarding: true };
              localStorage.setItem(KEY_CONFIG, JSON.stringify(updated));
              return updated;
            }
            return prev;
          });
        }
      }
    });
    return () => unsub();
  }, [currentUser]);

  const setExamFocus = (id: number | null) => {
    setSelectedExamFocusId(id);
    if (id !== null) {
      setSelectedSubjectFocusName(null);
    }
  };

  const setSubjectFocus = (name: string | null) => {
    if (name === null) {
      setSelectedSubjectFocusName(null);
      setPendingSubjectFocusName(null);
    } else {
      setPendingSubjectFocusName(name);
    }
  };

  const confirmSubjectFocus = () => {
    if (pendingSubjectFocusName) {
      setSelectedSubjectFocusName(pendingSubjectFocusName);
      setSelectedExamFocusId(null);
      setPendingSubjectFocusName(null);
    }
  };

  const cancelSubjectFocus = () => {
    setPendingSubjectFocusName(null);
  };

  const persist = (
    newStudyData = studyData,
    newExamData = examData,
    newSubjectReviews = subjectReviewsData,
    newSubjectsData = subjectsData,
    newReviewsCount = totalReviewsCount,
    newConfig = config,
    newRestDays = restDaysData
  ) => {
    localStorage.setItem(KEY_STUDY_DATA, JSON.stringify(newStudyData));
    localStorage.setItem(KEY_EXAMS_DATA, JSON.stringify(newExamData));
    localStorage.setItem(KEY_SUBJECT_REVIEWS_DATA, JSON.stringify(newSubjectReviews));
    localStorage.setItem(KEY_SUBJECTS_DATA, JSON.stringify(newSubjectsData));
    localStorage.setItem(KEY_REST_DAYS, JSON.stringify(newRestDays));
    localStorage.setItem(KEY_REVIEWS_COUNT, newReviewsCount.toString());
    localStorage.setItem(KEY_CONFIG, JSON.stringify(newConfig));
  };

  // Build the current data snapshot for cloud sync — config excluded (device-local only, with shared geminiApiKey)
  const getCloudPayload = useCallback((): CloudPayload => ({
    studyData,
    examData,
    subjectReviewsData,
    subjectsData,
    restDaysData,
    totalReviewsCount,
    algoMode: config.algoMode,
    weeklyRestDay: config.weeklyRestDay,
    geminiApiKey: config.geminiApiKey,
  }), [studyData, examData, subjectReviewsData, subjectsData, restDaysData, totalReviewsCount, config.algoMode, config.weeklyRestDay, config.geminiApiKey]);

  // Restore DATA from a cloud snapshot — never touches visual config/settings
  const restoreFromCloudPayload = useCallback((payload: CloudPayload) => {
    const sd = (payload.studyData || []) as StudyItem[];
    const ed = (payload.examData || []) as Exam[];
    const sr = (payload.subjectReviewsData || []) as SubjectReview[];
    const subs = (payload.subjectsData || []) as Subject[];
    const rd = payload.restDaysData || [];
    const rc = payload.totalReviewsCount || 0;

    setStudyData(sd);
    setExamData(ed);
    setSubjectReviewsData(sr);
    setSubjectsData(subs);
    setRestDaysData(rd);
    setTotalReviewsCount(rc);
    // Sync algoMode, weeklyRestDay, geminiApiKey & displayName if provided
    if (payload.algoMode || payload.weeklyRestDay || payload.geminiApiKey !== undefined || payload.displayName) {
      setConfig((prev) => {
        const updated = {
          ...prev,
          ...(payload.algoMode ? { algoMode: payload.algoMode } : {}),
          ...(payload.weeklyRestDay ? { weeklyRestDay: payload.weeklyRestDay as AppConfig['weeklyRestDay'] } : {}),
          ...(payload.geminiApiKey ? { geminiApiKey: payload.geminiApiKey } : {}),
          ...(payload.displayName && !prev.userName ? { userName: payload.displayName } : {}),
        };
        localStorage.setItem(KEY_CONFIG, JSON.stringify(updated));
        return updated;
      });
    }
    // Persist data-only — visual config stays untouched
    localStorage.setItem(KEY_STUDY_DATA, JSON.stringify(sd));
    localStorage.setItem(KEY_EXAMS_DATA, JSON.stringify(ed));
    localStorage.setItem(KEY_SUBJECT_REVIEWS_DATA, JSON.stringify(sr));
    localStorage.setItem(KEY_SUBJECTS_DATA, JSON.stringify(subs));
    localStorage.setItem(KEY_REST_DAYS, JSON.stringify(rd));
    localStorage.setItem(KEY_REVIEWS_COUNT, rc.toString());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme & Settings
  const toggleDarkMode = (val: boolean) => {
    const newTheme: 'dark' | 'light' = val ? 'dark' : 'light';
    const updated = { ...config, isDarkMode: val, themeMode: newTheme };
    setConfig(updated);
    persist(studyData, examData, subjectReviewsData, subjectsData, totalReviewsCount, updated, restDaysData);
  };

  const updateThemeMode = (mode: 'dark' | 'oled' | 'light') => {
    const updated = { ...config, themeMode: mode, isDarkMode: mode !== 'light' };
    setConfig(updated);
    persist(studyData, examData, subjectReviewsData, subjectsData, totalReviewsCount, updated, restDaysData);
  };

  const updateAccentColor = (color: string) => {
    const updated = { ...config, accentColor: color };
    setConfig(updated);
    persist(studyData, examData, subjectReviewsData, subjectsData, totalReviewsCount, updated, restDaysData);
  };

  const updateUserName = (name: string) => {
    const updated = { ...config, userName: name.trim() };
    setConfig(updated);
    persist(studyData, examData, subjectReviewsData, subjectsData, totalReviewsCount, updated, restDaysData);
  };

  const updateFontSize = (size: AppConfig['fontSize']) => {
    const updated = { ...config, fontSize: size };
    setConfig(updated);
    persist(studyData, examData, subjectReviewsData, subjectsData, totalReviewsCount, updated, restDaysData);
  };

  const updateNavPosition = (pos: 'bottom' | 'side') => {
    const updated = { ...config, navPosition: pos };
    setConfig(updated);
    persist(studyData, examData, subjectReviewsData, subjectsData, totalReviewsCount, updated, restDaysData);
  };

  const toggleNeonGlow = () => {
    const updated = { ...config, disableNeonGlow: !config.disableNeonGlow };
    setConfig(updated);
    persist(studyData, examData, subjectReviewsData, subjectsData, totalReviewsCount, updated, restDaysData);
  };

  const completeOnboarding = (
    name: string,
    theme: 'dark' | 'oled' | 'light',
    accent: string,
    algo: 'smart' | 'fixed'
  ) => {
    const updated = {
      ...config,
      userName: name.trim(),
      themeMode: theme,
      accentColor: accent,
      algoMode: algo,
      isDarkMode: theme !== 'light',
      hasCompletedOnboarding: true,
    };
    setConfig(updated);
    persist(studyData, examData, subjectReviewsData, subjectsData, totalReviewsCount, updated, restDaysData);

    if (currentUser) {
      updateDoc(doc(db, 'users', currentUser.uid), {
        hasCompletedOnboarding: true,
        displayName: name.trim(),
      }).catch((e) => console.error('Failed to sync onboarding completion to cloud:', e));
    }
  };

  const updateAlgoMode = (mode: 'smart' | 'fixed') => {
    const updated = { ...config, algoMode: mode };
    setConfig(updated);
    persist(studyData, examData, subjectReviewsData, subjectsData, totalReviewsCount, updated, restDaysData);
  };

  const updateFixedDays = (days: { hard?: number; good?: number; easy?: number }) => {
    const updated = {
      ...config,
      fixedHard: days.hard ?? config.fixedHard,
      fixedGood: days.good ?? config.fixedGood,
      fixedEasy: days.easy ?? config.fixedEasy,
    };
    setConfig(updated);
    persist(studyData, examData, subjectReviewsData, subjectsData, totalReviewsCount, updated, restDaysData);
  };

  const getSubjectColorHex = (moduleName: string) => {
    const sub = subjectsData.find((s) => s.name.toLowerCase() === moduleName.toLowerCase());
    return sub ? sub.color : '#3b82f6';
  };

  // Subjects
  const addSubject = (name: string, color: string) => {
    if (!name.trim()) return false;
    if (subjectsData.some((s) => s.name.toLowerCase() === name.trim().toLowerCase())) {
      return false;
    }
    const updated: Subject[] = [...subjectsData, { id: Date.now(), name: name.trim(), color }];
    setSubjectsData(updated);
    persist(studyData, examData, subjectReviewsData, updated, totalReviewsCount, config, restDaysData);
    return true;
  };

  const deleteSubject = (name: string) => {
    if (selectedSubjectFocusName === name) {
      setSelectedSubjectFocusName(null);
    }
    const updatedSubs = subjectsData.filter((s) => s.name !== name);
    const updatedStudy = studyData.filter((i) => i.module !== name);
    const updatedExams = examData.filter((e) => e.module !== name);
    const updatedSubReviews = subjectReviewsData.filter((r) => r.module !== name);

    setSubjectsData(updatedSubs);
    setStudyData(updatedStudy);
    setExamData(updatedExams);
    setSubjectReviewsData(updatedSubReviews);
    persist(updatedStudy, updatedExams, updatedSubReviews, updatedSubs, totalReviewsCount, config, restDaysData);
  };

  // Study Items
  const addStudyItem = (moduleName: string, topic: string) => {
    if (!moduleName.trim() || !topic.trim()) return false;
    const now = Date.now();
    const newItem: StudyItem = {
      id: now,
      module: moduleName.trim(),
      topic: topic.trim(),
      addedDate: getLocalDateStr(now),
      repetition: 0,
      interval: 1,
      efactor: 2.5,
      nextReviewDate: now,
      originalDueDate: now,
      history: [],
      isPaused: false,
      status: 'new',
      delayDate: 0,
      notes: '',
    };
    const updated = [...studyData, newItem];
    setStudyData(updated);
    persist(updated, examData, subjectReviewsData, subjectsData, totalReviewsCount, config, restDaysData);
    return true;
  };

  const updateLectureState = (id: number, newState: 'new' | 'sr' | 'overdue' | 'delayed') => {
    const updated: StudyItem[] = studyData.map((item) => {
      if (item.id !== id) return item;
      if (newState === 'delayed') {
        const origDate = item.originalDueDate && item.originalDueDate > 0
          ? item.originalDueDate
          : item.nextReviewDate && item.nextReviewDate > 0
          ? item.nextReviewDate
          : Date.now();

        const now = Date.now();
        const delayTarget = Math.max(now, origDate) + 86400000;

        return {
          ...item,
          status: 'delayed' as const,
          originalDueDate: origDate,
          delayDate: delayTarget,
        };
      }

      return {
        ...item,
        status: newState,
      };
    });
    setStudyData(updated);
    persist(updated, examData, subjectReviewsData, subjectsData, totalReviewsCount, config, restDaysData);
  };

  const processReview = (id: number, grade: 'hard' | 'good' | 'easy') => {
    const updated: StudyItem[] = studyData.map((item) => {
      if (item.id !== id) return item;

      let rep = item.repetition;
      let interval = item.interval;
      let efactor = item.efactor;
      let nextInterval = 1;

      if (config.algoMode === 'fixed') {
        if (grade === 'hard') nextInterval = config.fixedHard;
        if (grade === 'good') nextInterval = config.fixedGood;
        if (grade === 'easy') nextInterval = config.fixedEasy;
      } else {
        if (grade === 'hard') {
          rep = 0;
          interval = 1;
          efactor = Math.max(1.3, efactor - 0.15);
          nextInterval = 1;
        } else if (grade === 'good') {
          rep += 1;
          interval = rep === 1 ? 1 : rep === 2 ? 4 : Math.min(15, Math.round(interval * efactor * 0.9));
          nextInterval = interval;
        } else if (grade === 'easy') {
          rep += 1;
          interval = rep === 1 ? 3 : Math.min(15, Math.round(interval * efactor * 1.1));
          efactor = Math.min(3.0, efactor + 0.1);
          nextInterval = interval;
        }
      }

      // Calculate next review target date, skipping over any rest days seamlessly!
      let nextDate = Date.now() + nextInterval * 86400000;
      let dateStr = getLocalDateStr(nextDate);
      while (restDaysData.includes(dateStr)) {
        nextDate += 86400000;
        dateStr = getLocalDateStr(nextDate);
      }

      return {
        ...item,
        status: 'sr' as const,
        repetition: rep,
        interval: interval,
        efactor: efactor,
        nextReviewDate: nextDate,
        originalDueDate: nextDate,
        delayDate: 0,
      };
    });

    const newReviewsCount = totalReviewsCount + 1;
    setStudyData(updated);
    setTotalReviewsCount(newReviewsCount);
    persist(updated, examData, subjectReviewsData, subjectsData, newReviewsCount, config, restDaysData);
  };

  const processFirstReview = (id: number, grade: 'hard' | 'good' | 'easy') => {
    processReview(id, grade);
  };

  const processSubjectReviewSession = (moduleName: string, grade: 'hard' | 'good' | 'easy') => {
    let affectedCount = 0;
    const updated: StudyItem[] = studyData.map((item) => {
      if (item.module.toLowerCase() !== moduleName.toLowerCase() || item.isPaused) {
        return item;
      }
      affectedCount++;

      let rep = item.repetition;
      let interval = item.interval;
      let efactor = item.efactor;
      let nextInterval = 1;

      if (config.algoMode === 'fixed') {
        if (grade === 'hard') nextInterval = config.fixedHard;
        if (grade === 'good') nextInterval = config.fixedGood;
        if (grade === 'easy') nextInterval = config.fixedEasy;
      } else {
        if (grade === 'hard') {
          rep = Math.max(0, rep - 1);
          efactor = Math.max(1.3, efactor - 0.15);
          nextInterval = 1;
        } else if (grade === 'good') {
          rep += 1;
          interval = rep === 1 ? 1 : rep === 2 ? 4 : Math.min(15, Math.round(interval * efactor * 0.9));
          nextInterval = interval;
        } else if (grade === 'easy') {
          rep += 1;
          interval = rep === 1 ? 3 : Math.min(15, Math.round(interval * efactor * 1.1));
          efactor = Math.min(3.0, efactor + 0.1);
          nextInterval = interval;
        }
      }

      let nextDate = Date.now() + nextInterval * 86400000;
      let dateStr = getLocalDateStr(nextDate);
      while (restDaysData.includes(dateStr)) {
        nextDate += 86400000;
        dateStr = getLocalDateStr(nextDate);
      }

      return {
        ...item,
        status: 'sr' as const,
        repetition: rep,
        interval: interval,
        efactor: efactor,
        nextReviewDate: nextDate,
        originalDueDate: nextDate,
        delayDate: 0,
      };
    });

    const newReviewsCount = totalReviewsCount + affectedCount;
    setStudyData(updated);
    setTotalReviewsCount(newReviewsCount);
    persist(updated, examData, subjectReviewsData, subjectsData, newReviewsCount, config, restDaysData);
  };

  const togglePauseItem = (id: number) => {
    const updated = studyData.map((item) => {
      if (item.id === id) {
        return { ...item, isPaused: !item.isPaused };
      }
      return item;
    });
    setStudyData(updated);
    persist(updated, examData, subjectReviewsData, subjectsData, totalReviewsCount, config, restDaysData);
  };

  const updateLectureTopic = (id: number, newTopic: string) => {
    const updated = studyData.map((item) => {
      if (item.id === id) {
        return { ...item, topic: newTopic.trim() };
      }
      return item;
    });
    setStudyData(updated);
    persist(updated, examData, subjectReviewsData, subjectsData, totalReviewsCount, config, restDaysData);
  };

  const updateLectureNotes = (id: number, notes: string) => {
    const updated = studyData.map((item) => {
      if (item.id === id) {
        return { ...item, notes };
      }
      return item;
    });
    setStudyData(updated);
    persist(updated, examData, subjectReviewsData, subjectsData, totalReviewsCount, config, restDaysData);
  };

  const updateLectureFlashcards = (id: number, flashcards: Flashcard[]) => {
    const updated = studyData.map((item) => {
      if (item.id === id) {
        return { ...item, flashcards };
      }
      return item;
    });
    setStudyData(updated);
    persist(updated, examData, subjectReviewsData, subjectsData, totalReviewsCount, config, restDaysData);
  };

  const deleteLectureFlashcards = (id: number) => {
    const updated = studyData.map((item) => {
      if (item.id === id) {
        const newItem = { ...item };
        delete newItem.flashcards;
        return newItem;
      }
      return item;
    });
    setStudyData(updated);
    persist(updated, examData, subjectReviewsData, subjectsData, totalReviewsCount, config, restDaysData);
  };

  const updateGeminiApiKey = (key: string) => {
    const trimmed = key.trim();
    const updatedConfig = { ...config, geminiApiKey: trimmed };
    setConfig(updatedConfig);
    persist(studyData, examData, subjectReviewsData, subjectsData, totalReviewsCount, updatedConfig, restDaysData);

    if (currentUser) {
      updateDoc(doc(db, 'users', currentUser.uid), {
        geminiApiKey: trimmed,
        lastModified: serverTimestamp(),
      }).catch((e) => console.error('Failed to sync Gemini API key to cloud:', e));
    }
  };

  const deleteStudyItem = (id: number) => {
    const updated = studyData.filter((i) => i.id !== id);
    setStudyData(updated);
    persist(updated, examData, subjectReviewsData, subjectsData, totalReviewsCount, config, restDaysData);
  };

  const moveStudyItem = (id: number, direction: number) => {
    const idx = studyData.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const item = studyData[idx];
    const modItems = studyData.filter((i) => i.module === item.module);
    if (modItems.length <= 1) return;

    const modIdx = modItems.findIndex((i) => i.id === id);
    const targetModIdx = modIdx + direction;
    if (targetModIdx < 0 || targetModIdx >= modItems.length) return;

    const targetItem = modItems[targetModIdx];
    const targetGlobalIdx = studyData.findIndex((i) => i.id === targetItem.id);

    const newArr = [...studyData];
    newArr[idx] = targetItem;
    newArr[targetGlobalIdx] = item;

    setStudyData(newArr);
    persist(newArr, examData, subjectReviewsData, subjectsData, totalReviewsCount, config, restDaysData);
  };

  const reorderStudyItem = (draggedId: number, targetId: number, position: 'above' | 'below' = 'above') => {
    const draggedIdx = studyData.findIndex((i) => i.id === draggedId);
    if (draggedIdx === -1) return;

    const draggedItem = studyData[draggedIdx];
    const targetItem = studyData.find((i) => i.id === targetId);
    if (!targetItem) return;

    const updatedItem = { ...draggedItem, module: targetItem.module };

    const newArr = [...studyData];
    newArr.splice(draggedIdx, 1);

    let insertIdx = newArr.findIndex((i) => i.id === targetId);
    if (insertIdx !== -1) {
      if (position === 'below') {
        insertIdx += 1;
      }
      newArr.splice(insertIdx, 0, updatedItem);
    } else {
      newArr.push(updatedItem);
    }

    setStudyData(newArr);
    persist(newArr, examData, subjectReviewsData, subjectsData, totalReviewsCount, config, restDaysData);
  };

  const moveStudyItemToSubject = (draggedId: number, targetSubjectName: string) => {
    const draggedIdx = studyData.findIndex((i) => i.id === draggedId);
    if (draggedIdx === -1) return;

    const draggedItem = studyData[draggedIdx];
    const updatedItem = { ...draggedItem, module: targetSubjectName };

    const newArr = [...studyData];
    newArr.splice(draggedIdx, 1);
    newArr.push(updatedItem);

    setStudyData(newArr);
    persist(newArr, examData, subjectReviewsData, subjectsData, totalReviewsCount, config, restDaysData);
  };

  // Exams
  const addExam = (moduleName: string, date: string, linkedLectures: number[], reminderDays?: number) => {
    if (!moduleName.trim() || !date) return false;
    const newExam: Exam = {
      id: Date.now(),
      module: moduleName.trim(),
      date,
      linkedLectures,
      reminderDays,
    };
    const updated = [...examData, newExam];
    setExamData(updated);
    persist(studyData, updated, subjectReviewsData, subjectsData, totalReviewsCount, config, restDaysData);
    scheduleExamNotification(newExam.id, newExam.module, newExam.date, newExam.reminderDays || 1);
    return true;
  };

  const deleteExam = (id: number) => {
    const updated = examData.filter((e) => e.id !== id);
    setExamData(updated);
    if (selectedExamFocusId === id) {
      setSelectedExamFocusId(null);
    }
    persist(studyData, updated, subjectReviewsData, subjectsData, totalReviewsCount, config, restDaysData);
  };

  const updateExam = (
    id: number,
    details: { module?: string; date?: string; linkedLectures?: number[]; reminderDays?: number }
  ) => {
    const updated = examData.map((e) => {
      if (e.id === id) {
        return {
          ...e,
          module: details.module !== undefined ? details.module : e.module,
          date: details.date !== undefined ? details.date : e.date,
          linkedLectures: details.linkedLectures !== undefined ? details.linkedLectures : e.linkedLectures,
          reminderDays: details.reminderDays !== undefined ? details.reminderDays : e.reminderDays,
        };
      }
      return e;
    });
    setExamData(updated);
    persist(studyData, updated, subjectReviewsData, subjectsData, totalReviewsCount, config, restDaysData);
  };

  const toggleExamCompleted = (id: number) => {
    const updated = examData.map((e) => (e.id === id ? { ...e, isCompleted: !e.isCompleted } : e));
    setExamData(updated);
    persist(studyData, updated, subjectReviewsData, subjectsData, totalReviewsCount, config, restDaysData);
  };

  // Subject Reviews
  const addSubjectReview = (moduleName: string, date: string) => {
    if (!moduleName.trim() || !date) return false;
    const newReview: SubjectReview = {
      id: Date.now(),
      module: moduleName.trim(),
      date,
    };
    const updated = [...subjectReviewsData, newReview];
    setSubjectReviewsData(updated);
    persist(studyData, examData, updated, subjectsData, totalReviewsCount, config, restDaysData);
    scheduleSubjectReviewNotification(newReview.id, newReview.module, newReview.date);
    return true;
  };

  const deleteSubjectReview = (id: number) => {
    const updated = subjectReviewsData.filter((r) => r.id !== id);
    setSubjectReviewsData(updated);
    persist(studyData, examData, updated, subjectsData, totalReviewsCount, config, restDaysData);
  };

  // Toggle Rest Day Feature (Shifts reviews forward on Rest Days and restores them back when Rest Day is removed!)
  const toggleRestDay = (dateStr: string) => {
    let updatedRestDays: string[];
    if (restDaysData.includes(dateStr)) {
      updatedRestDays = restDaysData.filter((d) => d !== dateStr);
    } else {
      updatedRestDays = [...restDaysData, dateStr];
    }
    setRestDaysData(updatedRestDays);

    const updatedStudy = studyData.map((item) => {
      if (item.isPaused) return item;

      // Unshifted original due date (or current date if not set yet)
      const baseTs = item.originalDueDate || (item.status === 'delayed' ? item.delayDate : item.nextReviewDate);
      if (!baseTs || baseTs <= 0) return item;

      let currentTs = baseTs;
      let itemDateStr = getLocalDateStr(currentTs);

      // Fast forward from baseTs to the first non-rest day in updatedRestDays
      while (updatedRestDays.includes(itemDateStr)) {
        currentTs += 86400000;
        itemDateStr = getLocalDateStr(currentTs);
      }

      if (item.status === 'delayed') {
        return {
          ...item,
          delayDate: currentTs,
          originalDueDate: item.originalDueDate || baseTs,
        };
      } else {
        return {
          ...item,
          nextReviewDate: currentTs,
          originalDueDate: item.originalDueDate || baseTs,
        };
      }
    });

    setStudyData(updatedStudy);
    persist(updatedStudy, examData, subjectReviewsData, subjectsData, totalReviewsCount, config, updatedRestDays);
  };

  const updateWeeklyRestDay = (day: AppConfig['weeklyRestDay']) => {
    const updated = { ...config, weeklyRestDay: day };
    setConfig(updated);
    persist(studyData, examData, subjectReviewsData, subjectsData, totalReviewsCount, updated, restDaysData);
  };

  const toggleRestDayOverride = (dateStr: string) => {
    const currentOverrides = config.restDayOverrides || [];
    let updatedOverrides: string[];
    if (currentOverrides.includes(dateStr)) {
      updatedOverrides = currentOverrides.filter((d) => d !== dateStr);
    } else {
      updatedOverrides = [...currentOverrides, dateStr];
    }
    const updated = { ...config, restDayOverrides: updatedOverrides };
    setConfig(updated);
    persist(studyData, examData, subjectReviewsData, subjectsData, totalReviewsCount, updated, restDaysData);
  };

  const isRestDay = (dateStr: string): boolean => {
    if (restDaysData.includes(dateStr)) return true;

    if (config.weeklyRestDay && config.weeklyRestDay !== 'none') {
      const overrides = config.restDayOverrides || [];
      if (overrides.includes(dateStr)) return false;

      const [y, m, d] = dateStr.split('-').map(Number);
      if (y && m && d) {
        const dateObj = new Date(y, m - 1, d);
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[dateObj.getDay()];
        if (dayName === config.weeklyRestDay.toLowerCase()) {
          return true;
        }
      }
    }
    return false;
  };

  const exportJson = () => {
    const exportObj = {
      studyData,
      examData,
      subjectReviewsData,
      subjectsData,
      restDaysData,
      totalReviewsCount,
      config,
    };
    return JSON.stringify(exportObj, null, 2);
  };

  const restoreFromJson = (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && Array.isArray(parsed.studyData)) {
        setStudyData(parsed.studyData);
        setExamData(parsed.examData || []);
        setSubjectReviewsData(parsed.subjectReviewsData || []);
        setSubjectsData(parsed.subjectsData || []);
        setRestDaysData(parsed.restDaysData || []);
        setTotalReviewsCount(parsed.totalReviewsCount || 0);
        if (parsed.config) setConfig(parsed.config);
        persist(
          parsed.studyData,
          parsed.examData || [],
          parsed.subjectReviewsData || [],
          parsed.subjectsData || [],
          parsed.totalReviewsCount || 0,
          parsed.config || config,
          parsed.restDaysData || []
        );
        return true;
      }
    } catch (e) {
      console.error('Invalid backup JSON format', e);
    }
    return false;
  };

  const getTopSubject = () => {
    if (subjectsData.length === 0) return 'General';
    return subjectsData[0].name;
  };

  const resetLocalDataOnly = () => {
    setStudyData([]);
    setExamData([]);
    setSubjectReviewsData([]);
    setSubjectsData([]);
    setRestDaysData([]);
    setTotalReviewsCount(0);
    const updatedConfig = { ...config, hasCompletedOnboarding: true };
    setConfig(updatedConfig);

    localStorage.setItem(KEY_STUDY_DATA, JSON.stringify([]));
    localStorage.setItem(KEY_EXAMS_DATA, JSON.stringify([]));
    localStorage.setItem(KEY_SUBJECT_REVIEWS_DATA, JSON.stringify([]));
    localStorage.setItem(KEY_SUBJECTS_DATA, JSON.stringify([]));
    localStorage.setItem(KEY_REST_DAYS, JSON.stringify([]));
    localStorage.setItem(KEY_REVIEWS_COUNT, '0');
    localStorage.setItem(KEY_CONFIG, JSON.stringify(updatedConfig));
  };

  return (
    <StudyContext.Provider
      value={{
        studyData,
        examData,
        subjectReviewsData,
        subjectsData,
        restDaysData,
        totalReviewsCount,
        selectedExamFocusId,
        selectedSubjectFocusName,
        pendingSubjectFocusName,
        confirmSubjectFocus,
        cancelSubjectFocus,
        config,
        isLoading,
        currentUser,
        syncStatus,
        lastSyncedAt,
        setCurrentUser,
        setSyncStatus,
        setLastSyncedAt,
        getCloudPayload,
        restoreFromCloudPayload,
        setExamFocus,
        setSubjectFocus,
        toggleDarkMode,
        updateThemeMode,
        updateAccentColor,
        updateUserName,
        completeOnboarding,
        updateFontSize,
        updateNavPosition,
        toggleNeonGlow,
        updateAlgoMode,
        updateFixedDays,
        updateGeminiApiKey,
        getSubjectColorHex,
        addSubject,
        deleteSubject,
        addStudyItem,
        updateLectureState,
        processReview,
        processFirstReview,
        processSubjectReviewSession,
        togglePauseItem,
        updateLectureTopic,
        updateLectureNotes,
        updateLectureFlashcards,
        deleteLectureFlashcards,
        deleteStudyItem,
        moveStudyItem,
        reorderStudyItem,
        moveStudyItemToSubject,
        addExam,
        deleteExam,
        updateExam,
        toggleExamCompleted,
        addSubjectReview,
        deleteSubjectReview,
        toggleRestDay,
        updateWeeklyRestDay,
        toggleRestDayOverride,
        isRestDay,
        exportJson,
        restoreFromJson,
        resetLocalDataOnly,
        getTopSubject,
      }}
    >
      {children}
    </StudyContext.Provider>
  );
};

export const useStudy = () => {
  const context = useContext(StudyContext);
  if (!context) {
    throw new Error('useStudy must be used within a StudyProvider');
  }
  return context;
};
