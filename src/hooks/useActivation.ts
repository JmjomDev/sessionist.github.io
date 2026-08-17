import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import {
  doc,
  onSnapshot,
  getDoc,
  updateDoc,
  serverTimestamp,
  query,
  collection,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';

export type ActivationStatus = 'checking' | 'activated' | 'pending' | 'banned';

interface UseActivationResult {
  status: ActivationStatus;
  activateWithCode: (code: string) => Promise<{ success: boolean; error?: string }>;
}

const KEY_ACTIVATION_CACHE = 'sessionist_is_activated';

export function useActivation(currentUser: User | null): UseActivationResult {
  const [status, setStatus] = useState<ActivationStatus>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(KEY_ACTIVATION_CACHE) === 'true') {
      return 'activated';
    }
    return 'checking';
  });

  useEffect(() => {
    if (!currentUser) {
      setStatus('checking');
      return;
    }

    // Real-time listener on the user's own document
    const userRef = doc(db, 'users', currentUser.uid);
    const unsub = onSnapshot(
      userRef,
      (snap) => {
        if (!snap.exists()) {
          // Document doesn't exist yet — newly registered, definitely not activated
          localStorage.removeItem(KEY_ACTIVATION_CACHE);
          setStatus('pending');
          return;
        }
        const data = snap.data();
        if (data?.isBanned === true) {
          localStorage.removeItem(KEY_ACTIVATION_CACHE);
          setStatus('banned');
        } else if (data?.isActivated === true) {
          localStorage.setItem(KEY_ACTIVATION_CACHE, 'true');
          setStatus('activated');
        } else {
          localStorage.removeItem(KEY_ACTIVATION_CACHE);
          setStatus('pending');
        }
      },
      () => {
        // Firestore error (e.g. offline) -> fallback to cache if available
        if (localStorage.getItem(KEY_ACTIVATION_CACHE) === 'true') {
          setStatus('activated');
        } else {
          setStatus('pending');
        }
      }
    );

    return () => unsub();
  }, [currentUser]);

  const activateWithCode = useCallback(
    async (rawCode: string): Promise<{ success: boolean; error?: string }> => {
      if (!currentUser) return { success: false, error: 'Not signed in.' };

      const code = rawCode.trim().toUpperCase();
      if (!code) return { success: false, error: 'Please enter your activation code.' };

      try {
        // 1. Find the code document in Firestore
        const codesRef = collection(db, 'activation_codes');
        const q = query(codesRef, where('code', '==', code), where('isUsed', '==', false));
        const snap = await getDocs(q);

        if (snap.empty) {
          // Check if the code exists at all (to give a better error)
          const allQ = query(codesRef, where('code', '==', code));
          const allSnap = await getDocs(allQ);
          if (!allSnap.empty) {
            return { success: false, error: 'This code has already been used.' };
          }
          return { success: false, error: 'Invalid activation code. Please double-check and try again.' };
        }

        const codeDoc = snap.docs[0];

        // 2. Claim the code atomically
        await updateDoc(codeDoc.ref, {
          isUsed: true,
          usedBy: currentUser.uid,
          usedAt: serverTimestamp(),
        });

        // 3. Mark user as activated
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          await updateDoc(userRef, {
            isActivated: true,
            activatedAt: serverTimestamp(),
            activationCode: code,
          });
        } else {
          // Edge case: user doc doesn't exist yet — create it
          const { setDoc } = await import('firebase/firestore');
          await setDoc(userRef, {
            email: currentUser.email ?? '',
            displayName: currentUser.displayName ?? '',
            isActivated: true,
            activatedAt: serverTimestamp(),
            activationCode: code,
            createdAt: serverTimestamp(),
            lastSeen: serverTimestamp(),
          });
        }

        // Cache and immediately update local state
        localStorage.setItem(KEY_ACTIVATION_CACHE, 'true');
        setStatus('activated');

        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('permission') || msg.includes('Permission')) {
          return { success: false, error: 'Permission error. Please sign out and try again.' };
        }
        return { success: false, error: 'Something went wrong. Please try again.' };
      }
    },
    [currentUser]
  );

  return { status, activateWithCode };
}
