export interface Flashcard {
  id: string;
  front: string;
  back: string;
  isPastMistake?: boolean;
}

export interface StudyItem {
  id: number;
  module: string;
  topic: string;
  addedDate: string; // YYYY-MM-DD
  nextReviewDate: number; // TS
  interval: number;
  repetition: number;
  efactor: number;
  history: number[];
  notes?: string;
  flashcards?: Flashcard[];
  status: 'new' | 'sr' | 'overdue' | 'delayed';
  delayDate: number;
  originalDueDate?: number;
  isPaused?: boolean;
}

export interface Exam {
  id: number;
  module: string;
  date: string;
  linkedLectures: number[];
  reminderDays?: number;
  isCompleted?: boolean;
}

export interface SubjectReview {
  id: number;
  module: string;
  rating?: number;
  comment?: string;
  date: string;
}

export interface Subject {
  id: number;
  name: string;
  color: string;
}

export type StudyStatus = 'all' | 'new' | 'sr' | 'overdue' | 'delayed' | 'paused';

export interface RestDay {
  date: string; // YYYY-MM-DD
}

export type WeeklyRestDay = 'none' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface AppConfig {
  algoMode: 'smart' | 'fixed';
  fixedHard: number;
  fixedGood: number;
  fixedEasy: number;
  isDarkMode: boolean;
  themeMode: 'dark' | 'oled' | 'light';
  accentColor: string; // Hex e.g. '#6366f1' or '#000000'
  userName: string;
  hasCompletedOnboarding: boolean;
  fontSize: 'small' | 'default' | 'normal' | 'medium' | 'large' | number;
  navPosition: 'bottom' | 'side';
  disableNeonGlow?: boolean;
  weeklyRestDay?: WeeklyRestDay;
  restDayOverrides?: string[]; // Array of YYYY-MM-DD strings where weekly rest day was overridden for emergency
  geminiApiKey?: string;
}
