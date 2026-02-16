import { ref, get, set, push, runTransaction } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/src/config/firebase';

const LIKED_KEY = '@sweetlies_has_liked';
const FEEDBACK_COOLDOWN_KEY = '@sweetlies_feedback_last';

export async function getLikeCount(): Promise<number> {
  try {
    const snapshot = await get(ref(db, 'likes/count'));
    const val = snapshot.val();
    return typeof val === 'number' ? val : 0;
  } catch {
    return 0;
  }
}

export async function incrementLike(): Promise<boolean> {
  try {
    const hasLiked = await AsyncStorage.getItem(LIKED_KEY);
    if (hasLiked === 'true') return false;

    await runTransaction(ref(db, 'likes/count'), (current) => {
      return (current ?? 0) + 1;
    });
    await AsyncStorage.setItem(LIKED_KEY, 'true');
    return true;
  } catch {
    return false;
  }
}

export async function hasUserLiked(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(LIKED_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

const FEEDBACK_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function canSubmitFeedback(): Promise<boolean> {
  try {
    const last = await AsyncStorage.getItem(FEEDBACK_COOLDOWN_KEY);
    if (!last) return true;
    const ts = parseInt(last, 10);
    return Date.now() - ts > FEEDBACK_COOLDOWN_MS;
  } catch {
    return true;
  }
}

export async function submitFeedback(text: string): Promise<boolean> {
  const trimmed = text.trim().slice(0, 500);
  if (!trimmed) return false;

  try {
    await push(ref(db, 'feedback'), {
      text: trimmed,
      timestamp: Date.now(),
    });
    await AsyncStorage.setItem(FEEDBACK_COOLDOWN_KEY, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}
