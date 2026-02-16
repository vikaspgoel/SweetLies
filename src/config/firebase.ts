import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyB8z5vvBBxofIAvuBmpDBSiAzipBYkxXDA',
  authDomain: 'sweetlies.firebaseapp.com',
  // If your DB is in a different region, update from Firebase Console > Realtime Database
  databaseURL: 'https://sweetlies-default-rtdb.firebaseio.com',
  projectId: 'sweetlies',
  storageBucket: 'sweetlies.firebasestorage.app',
  messagingSenderId: '124681760579',
  appId: '1:124681760579:web:51191080e78fe8bf1289f6',
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
