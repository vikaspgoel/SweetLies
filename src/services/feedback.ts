import { Platform } from 'react-native';
import { ref, get, push, runTransaction } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/src/config/firebase';

const LIKED_KEY = '@sweetlies_has_liked';
const FEEDBACK_COOLDOWN_KEY = '@sweetlies_feedback_last';

function getStorage(): { getItem: (k: string) => Promise<string | null>; setItem: (k: string, v: string) => Promise<void> } {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    return {
      getItem: (k) => Promise.resolve(localStorage.getItem(k)),
      setItem: (k, v) => {
        localStorage.setItem(k, v);
        return Promise.resolve();
      },
    };
  }
  return AsyncStorage;
}

const storage = getStorage();

export async function getLikeCount(): Promise<number> {
  try {
    const snapshot = await get(ref(db, 'likes/count'));
    const val = snapshot.val();
    return typeof val === 'number' ? val : 0;
  } catch (e) {
    console.error('Firebase getLikeCount error:', e);
    return 0;
  }
}

export async function incrementLike(): Promise<{ ok: boolean; error?: string }> {
  try {
    const hasLiked = await storage.getItem(LIKED_KEY);
    if (hasLiked === 'true') return { ok: false };

    await runTransaction(ref(db, 'likes/count'), (current) => {
      return (current ?? 0) + 1;
    });
    await storage.setItem(LIKED_KEY, 'true');
    return { ok: true };
  } catch (e) {
    console.error('Firebase incrementLike error:', e);
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

export async function hasUserLiked(): Promise<boolean> {
  try {
    const val = await storage.getItem(LIKED_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

const FEEDBACK_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function canSubmitFeedback(): Promise<boolean> {
  try {
    const last = await storage.getItem(FEEDBACK_COOLDOWN_KEY);
    if (!last) return true;
    const ts = parseInt(last, 10);
    return Date.now() - ts > FEEDBACK_COOLDOWN_MS;
  } catch {
    return true;
  }
}

export async function submitFeedback(text: string): Promise<{ ok: boolean; error?: string }> {
  const trimmed = text.trim().slice(0, 500);
  if (!trimmed) return { ok: false };

  try {
    await push(ref(db, 'feedback'), {
      text: trimmed,
      timestamp: Date.now(),
    });
    await storage.setItem(FEEDBACK_COOLDOWN_KEY, String(Date.now()));
    return { ok: true };
  } catch (e) {
    console.error('Firebase submitFeedback error:', e);
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
