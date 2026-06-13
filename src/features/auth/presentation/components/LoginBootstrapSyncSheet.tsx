import * as Device from 'expo-device';
import * as Network from 'expo-network';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';
import { PrimaryButton } from '@/shared/presentation/ui/PrimaryButton';
import { getOrCreateDeviceId } from '@/shared/infrastructure/sync/SyncContext';

import { useSyncUseCases } from '@/features/sync/presentation/hooks/useSyncUseCases';
import type { SyncPhase } from '@/features/sync/application/SyncOrchestrator';

type LoginBootstrapSyncSheetProps = {
  visible: boolean;
  onClose: () => void;
  onConfigured?: () => void;
};

export function LoginBootstrapSyncSheet({
  visible,
  onClose,
  onConfigured,
}: LoginBootstrapSyncSheetProps) {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { orchestrator } = useSyncUseCases();

  const [isVisible, setIsVisible] = useState(false);
  const [sessionPin, setSessionPin] = useState('');
  const [statusMessage, setStatusMessage] = useState('Esperando conexión del administrador...');
  const [phase, setPhase] = useState<SyncPhase>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [wifiConnected, setWifiConnected] = useState(false);

  const refreshNetwork = useCallback(async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      setWifiConnected(Boolean(state.isConnected && state.type === Network.NetworkStateType.WIFI));
    } catch {
      setWifiConnected(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      void refreshNetwork();
    }
  }, [refreshNetwork, visible]);

  useEffect(() => {
    if (!visible) {
      void orchestrator.detenerVisibilidad().catch(() => undefined);
      setIsVisible(false);
      setPhase('idle');
      setErrorMessage(null);
      setStatusMessage('Esperando conexión del administrador...');
    }
  }, [orchestrator, visible]);

  const buildBootstrapContext = useCallback(async () => {
    const deviceId = await getOrCreateDeviceId(db);
    return {
      deviceId,
      deviceName: `${Device.deviceName ?? 'Dispositivo'} (configuración)`,
      orgScope: [] as string[],
      sessionPin: sessionPin || undefined,
      bootstrap: true,
      direction: 'receive' as const,
    };
  }, [db, sessionPin]);

  const handleToggleVisible = async (value: boolean) => {
    setErrorMessage(null);

    if (Platform.OS === 'web') {
      setErrorMessage('La configuración remota requiere la app nativa (Android/iOS).');
      return;
    }

    try {
      if (value) {
        const context = await buildBootstrapContext();
        orchestrator.setIncomingProgressCallback((update) => {
          setPhase(update.phase);
          setStatusMessage(update.message);
          if (update.phase === 'failed') {
            setErrorMessage(update.message);
          }
        });
        await orchestrator.iniciarVisibilidad(context);
        setStatusMessage('Visible en la red. Pide al administrador que envíe los datos desde su dispositivo.');
      } else {
        orchestrator.setIncomingProgressCallback(null);
        await orchestrator.detenerVisibilidad();
        setStatusMessage('Esperando conexión del administrador...');
      }
      setIsVisible(value);
    } catch (error) {
      setIsVisible(false);
      orchestrator.setIncomingProgressCallback(null);
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo activar la visibilidad');
    }
  };

  useEffect(() => {
    if (phase === 'success') {
      onConfigured?.();
    }
  }, [onConfigured, phase]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + Spacing.three, backgroundColor: PremiumPalette.surface },
          ]}
          onPress={(event) => event.stopPropagation()}
        >
          <ThemedText type="subtitle">Configurar dispositivo nuevo</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Activa la visibilidad en este equipo. Un administrador con sesión iniciada debe buscar este
            dispositivo en Sincronización y enviar el paquete (usuarios, organizaciones, etc.).
          </ThemedText>

          <ThemedText type="small" themeColor="textSecondary">
            Wi-Fi: {wifiConnected ? 'Conectado' : 'No disponible'}
          </ThemedText>

          <View style={styles.rowBetween}>
            <ThemedText type="smallBold">Visible para recibir datos</ThemedText>
            <Switch
              value={isVisible}
              onValueChange={(value) => void handleToggleVisible(value)}
              trackColor={{ false: PremiumPalette.surfaceMuted, true: 'rgba(79, 70, 229, 0.35)' }}
              thumbColor={isVisible ? PremiumPalette.primary : PremiumPalette.textMutedOnDark}
            />
          </View>

          <ThemedText type="smallBold">PIN de emparejamiento (opcional)</ThemedText>
          <TextInput
            value={sessionPin}
            onChangeText={(value) => setSessionPin(value.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            placeholder="4 dígitos"
            placeholderTextColor={PremiumPalette.textMutedOnDark}
            style={styles.pinInput}
          />

          <View style={styles.statusBox}>
            <ThemedText type="small">{statusMessage}</ThemedText>
            {phase === 'handshake' || phase === 'transferring' || phase === 'merging' || phase === 'connecting' || phase === 'checksums' ? (
              <ActivityIndicator color={PremiumPalette.primary} />
            ) : null}
            {phase === 'success' ? (
              <ThemedText type="smallBold" style={{ color: PremiumPalette.accent }}>
                Datos recibidos. Ya puedes iniciar sesión con tu usuario y PIN.
              </ThemedText>
            ) : null}
          </View>

          {errorMessage ? (
            <ThemedText type="small" style={{ color: PremiumPalette.danger }}>
              {errorMessage}
            </ThemedText>
          ) : null}

          <PrimaryButton label="Cerrar" variant="secondary" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
    maxHeight: '88%',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pinInput: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PremiumPalette.surfaceMuted,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 18,
    letterSpacing: 8,
    textAlign: 'center',
    color: PremiumPalette.textOnLight,
    backgroundColor: PremiumPalette.canvas,
  },
  statusBox: { gap: Spacing.two },
});
