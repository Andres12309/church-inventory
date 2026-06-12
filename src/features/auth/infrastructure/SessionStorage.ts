import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SESSION_USUARIO_ID_KEY = 'fieles_bienes_session_usuario_id';

export async function saveSessionUsuarioId(usuarioId: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(SESSION_USUARIO_ID_KEY, usuarioId);
    return;
  }

  await SecureStore.setItemAsync(SESSION_USUARIO_ID_KEY, usuarioId, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
}

export async function getSessionUsuarioId(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(SESSION_USUARIO_ID_KEY) ?? null;
  }

  return SecureStore.getItemAsync(SESSION_USUARIO_ID_KEY);
}

export async function clearSessionUsuarioId(): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(SESSION_USUARIO_ID_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(SESSION_USUARIO_ID_KEY);
}
