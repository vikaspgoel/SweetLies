import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LIKED_KEY = '@sweetlies_has_liked';
const FEEDBACK_COOLDOWN_KEY = '@sweetlies_feedback_last';

const getDbUrl = () => {
  const url =
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_FIREBASE_DATABASE_URL) ||
    'https://sweetlies-default-rtdb.firebaseio.com';
  return url.replace(/\/$/, '');
};

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

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms)),
  ]);
};

export async function getLikeCount(): Promise<number> {
  if (Platform.OS !== 'web') return 0;
  try {
    const res = await withTimeout(
      fetch(`${getDbUrl()}/likes/count.json`),
      8000
    );
    if (!res.ok) return 0;
    const val = await res.json();
    return typeof val === 'number' ? val : 0;
  } catch (e) {
    console.error('Firebase getLikeCount error:', e);
    return 0;
  }
}

export async function incrementLike(): Promise<{ ok: boolean; error?: string }> {
  if (Platform.OS !== 'web') return { ok: false };
  try {
    const hasLiked = await storage.getItem(LIKED_KEY);
    if (hasLiked === 'true') return { ok: false };

    const currentRes = await withTimeout(
      fetch(`${getDbUrl()}/likes/count.json`),
      8000
    );
    const current = currentRes.ok ? await currentRes.json() : null;
    const nextVal = (typeof current === 'number' ? current : 0) + 1;

    const putRes = await withTimeout(
      fetch(`${getDbUrl()}/likes/count.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextVal),
      }),
      8000
    );

    if (!putRes.ok) {
      const errText = await putRes.text();
      return { ok: false, error: `HTTP ${putRes.status}: ${errText}` };
    }

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

const FEEDBACK_COOLDOWN_MS = 24 * 60 * 60 * 1000;

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
  if (Platform.OS !== 'web') return { ok: false };

  try {
    const res = await withTimeout(
      fetch(`${getDbUrl()}/feedback.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, timestamp: Date.now() }),
      }),
      8000
    );

    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${errText}` };
    }

    await storage.setItem(FEEDBACK_COOLDOWN_KEY, String(Date.now()));
    return { ok: true };
  } catch (e) {
    console.error('Firebase submitFeedback error:', e);
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
