import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDs6ZW4u6SevsizLuwyJh2_Lwd-fipCAM8",
  authDomain: "sessionist-tracker.firebaseapp.com",
  projectId: "sessionist-tracker",
  storageBucket: "sessionist-tracker.firebasestorage.app",
  messagingSenderId: "857208865753",
  appId: "1:857208865753:web:2f93e6253c26c607640fc8",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence (works even without internet)
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence unavailable (multiple tabs open)');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence not supported in this browser');
  }
});
