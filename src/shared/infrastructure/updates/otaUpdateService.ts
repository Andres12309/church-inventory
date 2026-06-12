import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Updates from 'expo-updates';

export type OtaRuntimeInfo = {
  isEnabled: boolean;
  isOtaApiAvailable: boolean;
  appVersion: string;
  runtimeVersion: string | null;
  updateId: string | null;
  channel: string | null;
  isEmbeddedLaunch: boolean;
  createdAt: Date | null;
  entorno: 'development' | 'expo-go' | 'release';
};

export type OtaCheckResult =
  | { status: 'unavailable'; reason: string; runtime: OtaRuntimeInfo }
  | { status: 'upToDate'; runtime: OtaRuntimeInfo }
  | { status: 'available'; runtime: OtaRuntimeInfo }
  | { status: 'error'; message: string; runtime: OtaRuntimeInfo };

function resolverEntorno(): OtaRuntimeInfo['entorno'] {
  if (__DEV__) {
    return 'development';
  }
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return 'expo-go';
  }
  return 'release';
}

export function obtenerInfoOtaRuntime(): OtaRuntimeInfo {
  const entorno = resolverEntorno();
  const isOtaApiAvailable = entorno === 'release' && Updates.isEnabled;

  return {
    isEnabled: Updates.isEnabled,
    isOtaApiAvailable,
    appVersion: Constants.expoConfig?.version ?? '1.0.0',
    runtimeVersion: Updates.runtimeVersion,
    updateId: Updates.updateId,
    channel: Updates.channel,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    createdAt: Updates.createdAt,
    entorno,
  };
}

export function formatearEtiquetaOta(runtime: OtaRuntimeInfo): string {
  const partes = [`App v${runtime.appVersion}`];

  if (runtime.runtimeVersion) {
    partes.push(`runtime ${runtime.runtimeVersion}`);
  }
  if (runtime.channel) {
    partes.push(`canal ${runtime.channel}`);
  }
  if (runtime.updateId) {
    partes.push(`OTA ${runtime.updateId.slice(0, 8)}…`);
  } else if (runtime.isEmbeddedLaunch) {
    partes.push('bundle embebido');
  }

  return partes.join(' · ');
}

function razonOtaNoDisponible(runtime: OtaRuntimeInfo): string {
  if (runtime.entorno === 'development') {
    return (
      'En modo desarrollo la app carga el bundle desde Metro. ' +
      'Para probar EAS Update usa un build release (npx expo run:android --variant release) ' +
      'o publica con eas update y abre la build instalada desde la tienda interna.'
    );
  }

  if (runtime.entorno === 'expo-go') {
    return 'Expo Go no soporta la API de actualizaciones OTA de esta app. Instala el build nativo de Fieles Bienes.';
  }

  if (!runtime.isEnabled) {
    return (
      'Las actualizaciones OTA no están habilitadas en este build. ' +
      'Verifica updates.url y runtimeVersion en app.json y vuelve a compilar con EAS Build.'
    );
  }

  return 'Las actualizaciones OTA no están disponibles en este entorno.';
}

export async function buscarActualizacionOta(): Promise<OtaCheckResult> {
  const runtime = obtenerInfoOtaRuntime();

  if (!runtime.isOtaApiAvailable) {
    return { status: 'unavailable', reason: razonOtaNoDisponible(runtime), runtime };
  }

  try {
    const result = await Updates.checkForUpdateAsync();

    if (result.isAvailable) {
      return { status: 'available', runtime };
    }

    return { status: 'upToDate', runtime };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'No se pudo consultar el servidor de actualizaciones';

    return { status: 'error', message, runtime };
  }
}

export async function descargarYRecargarOta(): Promise<void> {
  if (!obtenerInfoOtaRuntime().isOtaApiAvailable) {
    throw new Error(razonOtaNoDisponible(obtenerInfoOtaRuntime()));
  }

  const fetchResult = await Updates.fetchUpdateAsync();

  if (!fetchResult.isNew && !fetchResult.isRollBackToEmbedded) {
    await Updates.reloadAsync();
    return;
  }

  await Updates.reloadAsync();
}
