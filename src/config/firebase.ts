import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Database URL: Set EXPO_PUBLIC_FIREBASE_DATABASE_URL in Vercel to override.
// Get from Firebase Console > Realtime Database. Common: firebaseio.com (US), asia-southeast1.firebasedatabase.app (Asia)
const databaseURL =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_FIREBASE_DATABASE_URL) ||
  'https://sweetlies-default-rtdb.firebaseio.com';

const firebaseConfig = {
  apiKey: 'AIzaSyB8z5vvBBxofIAvuBmpDBSiAzipBYkxXDA',
  authDomain: 'sweetlies.firebaseapp.com',
  databaseURL,
  projectId: 'sweetlies',
  storageBucket: 'sweetlies.firebasestorage.app',
  messagingSenderId: '124681760579',
  appId: '1:124681760579:web:51191080e78fe8bf1289f6',
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
