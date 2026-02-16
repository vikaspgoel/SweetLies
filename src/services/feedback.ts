import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LIKED_KEY = '@sweetlies_has_liked';
const FEEDBACK_COOLDOWN_KEY = '@sweetlies_feedback_last';

const getApiBase = () => {
  if (Platform.OS !== 'web') return '';
  if (typeof window === 'undefined') return '';
  return window.location.origin;
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
  const base = getApiBase();
  if (!base) return 0;
  try {
    const res = await withTimeout(fetch(`${base}/api/likes`), 8000);
    if (!res.ok) return 0;
    const data = await res.json();
    return typeof data.count === 'number' ? data.count : 0;
  } catch (e) {
    console.error('getLikeCount error:', e);
    return 0;
  }
}

export async function incrementLike(): Promise<{ ok: boolean; error?: string }> {
  if (Platform.OS !== 'web') return { ok: false };
  try {
    const hasLiked = await storage.getItem(LIKED_KEY);
    if (hasLiked === 'true') return { ok: false, error: 'Already liked' };

    const base = getApiBase();
    if (!base) return { ok: false, error: 'No API base' };

    const res = await withTimeout(
      fetch(`${base}/api/likes`, { method: 'POST' }),
      8000
    );
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, error: data.error || `HTTP ${res.status}` };
    }

    await storage.setItem(LIKED_KEY, 'true');
    return { ok: true };
  } catch (e) {
    console.error('incrementLike error:', e);
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

export async function clearLikedState(): Promise<void> {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.removeItem(LIKED_KEY);
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
    const base = getApiBase();
    if (!base) return { ok: false, error: 'No API base' };

    const res = await withTimeout(
      fetch(`${base}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      }),
      8000
    );
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, error: data.error || `HTTP ${res.status}` };
    }

    await storage.setItem(FEEDBACK_COOLDOWN_KEY, String(Date.now()));
    return { ok: true };
  } catch (e) {
    console.error('submitFeedback error:', e);
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
