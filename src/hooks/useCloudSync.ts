import { useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

// Only study DATA + algoMode is synced — visual settings (theme, accent, nav, font, fixed days) are device-local
export interface CloudPayload {
  studyData: unknown[];
  examData: unknown[];
  subjectReviewsData: unknown[];
  subjectsData: unknown[];
  restDaysData: string[];
  totalReviewsCount: number;
  algoMode?: 'smart' | 'fixed';
  weeklyRestDay?: string;
  geminiApiKey?: string;
  displayName?: string;
}

// Smart Union Merger: combines local data and cloud data without duplicates
function mergePayloads(local: CloudPayload, cloud: CloudPayload): CloudPayload {
  // 1. Study Items: Map by ID
  const studyMap = new Map<number, Record<string, unknown>>();
  ((local.studyData || []) as Array<Record<string, unknown>>).forEach((item) => {
    if (item && typeof item.id === 'number') studyMap.set(item.id, item);
  });
  ((cloud.studyData || []) as Array<Record<string, unknown>>).forEach((item) => {
    if (item && typeof item.id === 'number') {
      const localItem = studyMap.get(item.id);
      studyMap.set(item.id, {
        ...localItem,
        ...item,
        notes: item.notes || localItem?.notes || '',
        flashcards: (item.flashcards as unknown[])?.length ? item.flashcards : (localItem?.flashcards || []),
      });
    }
  });

  // 2. Exams: Map by ID
  const examMap = new Map<number, Record<string, unknown>>();
  ((local.examData || []) as Array<Record<string, unknown>>).forEach((e) => {
    if (e && typeof e.id === 'number') examMap.set(e.id, e);
  });
  ((cloud.examData || []) as Array<Record<string, unknown>>).forEach((e) => {
    if (e && typeof e.id === 'number') examMap.set(e.id, { ...(examMap.get(e.id) || {}), ...e });
  });

  // 3. Subject Reviews: Map by ID
  const reviewMap = new Map<number, Record<string, unknown>>();
  ((local.subjectReviewsData || []) as Array<Record<string, unknown>>).forEach((r) => {
    if (r && typeof r.id === 'number') reviewMap.set(r.id, r);
  });
  ((cloud.subjectReviewsData || []) as Array<Record<string, unknown>>).forEach((r) => {
    if (r && typeof r.id === 'number') reviewMap.set(r.id, { ...(reviewMap.get(r.id) || {}), ...r });
  });

  // 4. Subjects: Map by normalized lowercase name
  const subjectsMap = new Map<string, Record<string, unknown>>();
  ((local.subjectsData || []) as Array<Record<string, unknown>>).forEach((s) => {
    if (s && typeof s.name === 'string') subjectsMap.set(s.name.toLowerCase(), s);
  });
  ((cloud.subjectsData || []) as Array<Record<string, unknown>>).forEach((s) => {
    if (s && typeof s.name === 'string') subjectsMap.set(s.name.toLowerCase(), s);
  });

  // 5. Rest Days: Set union
  const restSet = new Set<string>([
    ...((local.restDaysData || []) as string[]),
    ...((cloud.restDaysData || []) as string[]),
  ]);

  return {
    studyData: Array.from(studyMap.values()),
    examData: Array.from(examMap.values()),
    subjectReviewsData: Array.from(reviewMap.values()),
    subjectsData: Array.from(subjectsMap.values()),
    restDaysData: Array.from(restSet),
    totalReviewsCount: Math.max(local.totalReviewsCount || 0, cloud.totalReviewsCount || 0),
    algoMode: cloud.algoMode || local.algoMode || 'smart',
    weeklyRestDay: cloud.weeklyRestDay || local.weeklyRestDay || 'none',
    geminiApiKey: cloud.geminiApiKey || local.geminiApiKey,
    displayName: cloud.displayName || local.displayName,
  };
}

interface UseCloudSyncOptions {
  currentData: CloudPayload;
  onCloudData: (data: CloudPayload) => void;
  onUserChange: (user: User | null) => void;
  onSyncStatusChange: (status: SyncStatus) => void;
  onLastSyncedChange: (date: Date) => void;
}

export function useCloudSync({
  currentData,
  onCloudData,
  onUserChange,
  onSyncStatusChange,
  onLastSyncedChange,
}: UseCloudSyncOptions) {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const currentUserRef = useRef<User | null>(null);
  const unsubSnapshotRef = useRef<(() => void) | null>(null);
  const isFirstSnapshotRef = useRef(true);
  const writeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Echo suppression: after we push to cloud, ignore snapshots for 3 seconds
  // (they're just reflections of our own write, not changes from another device)
  const lastPushTimestampRef = useRef<number>(0);
  const ECHO_SUPPRESS_MS = 3000;

  // Snapshot-to-data converter that strips server-only fields
  const extractPayload = (data: Record<string, unknown>): CloudPayload => ({
    studyData: (data.studyData as unknown[]) || [],
    examData: (data.examData as unknown[]) || [],
    subjectReviewsData: (data.subjectReviewsData as unknown[]) || [],
    subjectsData: (data.subjectsData as unknown[]) || [],
    restDaysData: (data.restDaysData as string[]) || [],
    totalReviewsCount: (data.totalReviewsCount as number) || 0,
    algoMode: (data.algoMode as 'smart' | 'fixed') || 'smart',
    geminiApiKey: (data.geminiApiKey as string) || undefined,
    displayName: (data.displayName as string) || undefined,
  });

  // Push local DATA (no config) to Firestore, debounced
  const pushToCloud = useCallback(
    (uid: string, data: CloudPayload) => {
      if (writeDebounceRef.current) clearTimeout(writeDebounceRef.current);
      writeDebounceRef.current = setTimeout(async () => {
        try {
          onSyncStatusChange('syncing');
          lastPushTimestampRef.current = Date.now(); // mark push time for echo suppression
          await setDoc(
            doc(db, 'users', uid),
            {
              studyData: data.studyData,
              examData: data.examData,
              subjectReviewsData: data.subjectReviewsData,
              subjectsData: data.subjectsData,
              restDaysData: data.restDaysData,
              totalReviewsCount: data.totalReviewsCount,
              algoMode: data.algoMode ?? 'smart',
              ...(data.geminiApiKey ? { geminiApiKey: data.geminiApiKey } : {}),
              lastModified: serverTimestamp(),
              lastSeen: serverTimestamp(),
            },
            { merge: true }
          );
          onSyncStatusChange('synced');
          onLastSyncedChange(new Date());
        } catch {
          onSyncStatusChange('error');
        }
      }, 1500); // 1.5s debounce — prevents hammering on rapid clicks
    },
    [onSyncStatusChange, onLastSyncedChange]
  );

  // Attach a realtime Firestore listener for the signed-in user
  const attachListener = useCallback(
    (uid: string, initialLocalData: CloudPayload) => {
      if (unsubSnapshotRef.current) unsubSnapshotRef.current();
      isFirstSnapshotRef.current = true;

      const docRef = doc(db, 'users', uid);
      unsubSnapshotRef.current = onSnapshot(
        docRef,
        { includeMetadataChanges: false },
        (snap) => {
          // Echo suppression: ignore snapshots right after our own write
          const msSincePush = Date.now() - lastPushTimestampRef.current;
          const isEcho = msSincePush < ECHO_SUPPRESS_MS;

          if (!snap.exists()) {
            // Brand new user — push local data to cloud
            pushToCloud(uid, initialLocalData);
            isFirstSnapshotRef.current = false;
            return;
          }

          const cloudPayload = extractPayload(snap.data() as Record<string, unknown>);

          if (isFirstSnapshotRef.current) {
            isFirstSnapshotRef.current = false;

            const localIsEmpty = initialLocalData.studyData.length === 0;
            const cloudIsEmpty = cloudPayload.studyData.length === 0;

            if (localIsEmpty) {
              // No local data → silently import cloud
              onCloudData(cloudPayload);
              onLastSyncedChange(new Date());
              onSyncStatusChange('synced');
            } else if (cloudIsEmpty) {
              // No cloud data → upload local
              pushToCloud(uid, initialLocalData);
            } else {
              // Both have data → Smart Merge without any popups!
              const merged = mergePayloads(initialLocalData, cloudPayload);
              onCloudData(merged);
              pushToCloud(uid, merged);
              onLastSyncedChange(new Date());
              onSyncStatusChange('synced');
            }
            return;
          }

          // Subsequent snapshots from OTHER devices — skip if it's our own echo
          if (!isEcho) {
            onCloudData(cloudPayload);
            onLastSyncedChange(new Date());
            onSyncStatusChange('synced');
          }
        },
        () => {
          onSyncStatusChange('offline');
        }
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const detachListener = useCallback(() => {
    if (unsubSnapshotRef.current) {
      unsubSnapshotRef.current();
      unsubSnapshotRef.current = null;
    }
    if (writeDebounceRef.current) clearTimeout(writeDebounceRef.current);
    isFirstSnapshotRef.current = true;
    lastPushTimestampRef.current = 0;
  }, []);

  // Auth state listener — capture initial local data at sign-in time
  const currentDataRef = useRef<CloudPayload>(currentData);
  currentDataRef.current = currentData;

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      currentUserRef.current = user;
      onUserChange(user);
      setIsAuthReady(true);
      if (user) {
        onSyncStatusChange('syncing');
        // Capture current local data snapshot at the moment of sign-in
        attachListener(user.uid, currentDataRef.current);
      } else {
        detachListener();
        onSyncStatusChange('idle');
      }
    });

    return () => {
      unsubAuth();
      detachListener();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push to cloud when local DATA changes (while signed in, after initial setup)
  const prevDataRef = useRef<string>('');
  useEffect(() => {
    const uid = currentUserRef.current?.uid;
    if (!uid || isFirstSnapshotRef.current) return;

    // Only push if data actually changed (deep compare via JSON)
    const serialized = JSON.stringify({
      studyData: currentData.studyData,
      examData: currentData.examData,
      subjectReviewsData: currentData.subjectReviewsData,
      subjectsData: currentData.subjectsData,
      restDaysData: currentData.restDaysData,
      totalReviewsCount: currentData.totalReviewsCount,
      algoMode: currentData.algoMode,
      geminiApiKey: currentData.geminiApiKey,
    });

    if (serialized === prevDataRef.current) return; // no real change
    prevDataRef.current = serialized;

    pushToCloud(uid, currentData);
  }, [currentData, pushToCloud]);

  return { pushToCloud, isAuthReady };
}
