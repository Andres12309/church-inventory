import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const REMEMBERED_USERNAMES_KEY = 'fieles_bienes_remembered_usernames';
const MAX_REMEMBERED = 8;

function readRaw(): string | null {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(REMEMBERED_USERNAMES_KEY) ?? null;
  }
  return null;
}

function writeRaw(value: string): void {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(REMEMBERED_USERNAMES_KEY, value);
  }
}

function parseList(raw: string | null): string[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  } catch {
    return [];
  }
}

async function persistUsernames(list: string[]): Promise<void> {
  const payload = JSON.stringify(list);

  if (Platform.OS === 'web') {
    writeRaw(payload);
    return;
  }

  await SecureStore.setItemAsync(REMEMBERED_USERNAMES_KEY, payload, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
}

export async function getRememberedUsernames(): Promise<string[]> {
  if (Platform.OS === 'web') {
    return parseList(readRaw());
  }

  const raw = await SecureStore.getItemAsync(REMEMBERED_USERNAMES_KEY);
  return parseList(raw);
}

export async function saveRememberedUsername(username: string): Promise<void> {
  const normalized = username.trim();
  if (!normalized) {
    return;
  }

  const current = await getRememberedUsernames();
  const next = [normalized, ...current.filter((entry) => entry.toLowerCase() !== normalized.toLowerCase())].slice(
    0,
    MAX_REMEMBERED,
  );

  await persistUsernames(next);
}

export async function removeRememberedUsername(username: string): Promise<string[]> {
  const normalized = username.trim().toLowerCase();
  if (!normalized) {
    return getRememberedUsernames();
  }

  const next = (await getRememberedUsernames()).filter(
    (entry) => entry.toLowerCase() !== normalized,
  );

  await persistUsernames(next);
  return next;
}
