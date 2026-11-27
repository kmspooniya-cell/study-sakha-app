import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PIN_KEY_PREFIX = 'study_sakha_focus_lock_pin_v1';

export function isValidExitPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export function getFocusLockPinKey(userId?: string | null): string {
  const safeUser = (userId || 'local').replace(/[^A-Za-z0-9._-]/g, '_');
  return `${PIN_KEY_PREFIX}_${safeUser}`;
}

export async function loadExitPin(userId?: string | null): Promise<string | null> {
  const key = getFocusLockPinKey(userId);
  try {
    const raw = Platform.OS === 'web'
      ? await AsyncStorage.getItem(key)
      : await SecureStore.getItemAsync(key);
    return raw && isValidExitPin(raw) ? raw : null;
  } catch {
    return null;
  }
}

export async function saveExitPin(pin: string, userId?: string | null): Promise<boolean> {
  if (!isValidExitPin(pin)) return false;
  const key = getFocusLockPinKey(userId);
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, pin);
    } else {
      await SecureStore.setItemAsync(key, pin, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    }
    return true;
  } catch {
    return false;
  }
}

export async function clearExitPin(userId?: string | null): Promise<void> {
  const key = getFocusLockPinKey(userId);
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  } catch {
    // Ignore secure store deletion errors on recovery/cleanup.
  }
}

export async function verifyExitPin(candidate: string, userId?: string | null): Promise<boolean> {
  if (!isValidExitPin(candidate)) return false;
  const stored = await loadExitPin(userId);
  return stored !== null && stored === candidate;
}
