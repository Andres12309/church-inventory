import * as Device from 'expo-device';
import * as Network from 'expo-network';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/features/auth/presentation/store/authStore';
import { resolverOrgScopeSync } from '@/features/sync/application/OrgScopeResolver';
import { puedeConfigurarPaqueteSync } from '@/features/sync/application/SyncPackagePolicy';
import { getOrCreateDeviceId } from '@/shared/infrastructure/sync/SyncContext';
import { ModuloCodigo } from '@/shared/infrastructure/database/schema';
import { useTheme } from '@/hooks/use-theme';
import { AppCard } from '@/shared/presentation/ui/AppCard';
import { PrimaryButton } from '@/shared/presentation/ui/PrimaryButton';
import { SocialHeader } from '@/shared/presentation/ui/socialUi';

import type { DiscoveredPeer } from '../../domain/entities/DiscoveredPeer';
import { SYNC_PEER_SCAN_TIMEOUT_MS } from '../../domain/constants/SyncConstants';
import { SyncError } from '../../domain/errors/SyncError';
import { useSyncUseCases } from '../hooks/useSyncUseCases';
import { SyncPackageSelector } from '../components/SyncPackageSelector';
import { useSyncStore } from '../store/syncStore';
import type { Organizacion } from '@/features/organizaciones/domain/entities/Organizacion';
import type { UsuarioListadoItem } from '@/features/usuarios/domain/entities/UsuarioListadoItem';
import { SqliteUsuarioRepository } from '@/features/usuarios/infrastructure/repositories/SqliteUsuarioRepository';

function mapSyncErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Error de sincronización desconocido';
  }

  const message = error.message;

  if (message.includes('mDNS') || message.includes('web')) {
    return 'La sincronización solo funciona en la app nativa (Android/iOS), no en web.';
  }

  if (message.includes('PIN')) {
    return 'PIN incorrecto. Verifica que ambos dispositivos usen el mismo PIN de 4 dígitos.';
  }

  if (message.includes('organizaciones compartidas') || message.includes('Sin organizaciones')) {
    return 'No hay organizaciones en común. Ambos usuarios deben tener acceso al mismo ámbito.';
  }

  if (message.includes('esquema incompatible') || message.includes('schema')) {
    return 'Versiones de la app incompatibles. Actualiza ambos dispositivos a la misma versión.';
  }

  if (message.includes('Device ID') || message.includes('HANDSHAKE')) {
    return 'No se pudo validar el dispositivo remoto. Intenta buscar de nuevo e iniciar sync.';
  }

  if (message.includes('Timeout esperando mensaje') || message.includes('Timeout al conectar')) {
    return 'El otro dispositivo no respondió a tiempo. Activa "Visible en la red" en ambos equipos e intenta de nuevo.';
  }

  if (message.includes('ECONNREFUSED') || message.includes('timeout') || message.includes('Conectando')) {
    return 'No se pudo conectar al dispositivo. Confirma que esté visible y en la misma red Wi-Fi.';
  }

  if (error instanceof SyncError) {
    return message;
  }

  return message || 'Error de sincronización';
}

export function SyncScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const { orchestrator, organizacionRepository } = useSyncUseCases();

  const usuario = useAuthStore((s) => s.usuarioActual);
  const rol = useAuthStore((s) => s.rolActual);
  const tieneAcceso = useAuthStore((s) => s.tieneAcceso(ModuloCodigo.SYNC));

  const peers = useSyncStore((s) => s.peers);
  const isVisible = useSyncStore((s) => s.isVisible);
  const isScanning = useSyncStore((s) => s.isScanning);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const phase = useSyncStore((s) => s.phase);
  const statusMessage = useSyncStore((s) => s.statusMessage);
  const recordsProcessed = useSyncStore((s) => s.recordsProcessed);
  const sessionPin = useSyncStore((s) => s.sessionPin);
  const syncPlan = useSyncStore((s) => s.syncPlan);
  const pushOnly = useSyncStore((s) => s.pushOnly);
  const setSyncPlan = useSyncStore((s) => s.setSyncPlan);
  const setPushOnly = useSyncStore((s) => s.setPushOnly);
  const errorMessage = useSyncStore((s) => s.errorMessage);
  const wifiConnected = useSyncStore((s) => s.wifiConnected);
  const setVisible = useSyncStore((s) => s.setVisible);
  const setScanning = useSyncStore((s) => s.setScanning);
  const setSyncing = useSyncStore((s) => s.setSyncing);
  const setProgress = useSyncStore((s) => s.setProgress);
  const setSessionPin = useSyncStore((s) => s.setSessionPin);
  const setWifiConnected = useSyncStore((s) => s.setWifiConnected);
  const setError = useSyncStore((s) => s.setError);
  const addPeer = useSyncStore((s) => s.addPeer);
  const resetRuntime = useSyncStore((s) => s.resetRuntime);
  const [showTechnical, setShowTechnical] = useState(false);
  const [organizaciones, setOrganizaciones] = useState<Organizacion[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioListadoItem[]>([]);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const puedeConfigurarPaquete = rol ? puedeConfigurarPaqueteSync(rol) : false;

  const clearScanTimeout = useCallback(() => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  }, []);

  const finalizarBusqueda = useCallback(
    async (idleMessage?: string) => {
      clearScanTimeout();
      await orchestrator.detenerBusqueda();
      setScanning(false);
      if (idleMessage) {
        setProgress('idle', idleMessage);
      }
    },
    [clearScanTimeout, orchestrator, setProgress, setScanning],
  );

  const refreshNetwork = useCallback(async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      setWifiConnected(Boolean(state.isConnected && state.type === Network.NetworkStateType.WIFI));
    } catch {
      setWifiConnected(false);
    }
  }, [setWifiConnected]);

  useEffect(() => {
    void refreshNetwork();
    return () => {
      clearScanTimeout();
      void orchestrator.detenerVisibilidad().catch(() => undefined);
      void orchestrator.detenerBusqueda().catch(() => undefined);
      resetRuntime();
    };
  }, [clearScanTimeout, orchestrator, refreshNetwork, resetRuntime]);

  useEffect(() => {
    if (!usuario || !rol || !puedeConfigurarPaquete) {
      return;
    }

    let mounted = true;

    async function loadSelectorData() {
      const orgScopeIds = await resolverOrgScopeSync(usuario!, rol!, organizacionRepository);
      const enAlcance: Organizacion[] = [];
      for (const orgId of orgScopeIds) {
        const org = await organizacionRepository.obtenerPorId(orgId);
        if (org) {
          enAlcance.push(org);
        }
      }
      const usuarioRepository = new SqliteUsuarioRepository(db);
      const listado = await usuarioRepository.listarEnOrganizaciones(orgScopeIds);

      if (mounted) {
        setOrganizaciones(enAlcance);
        setUsuarios(listado);
      }
    }

    void loadSelectorData();

    return () => {
      mounted = false;
    };
  }, [db, organizacionRepository, puedeConfigurarPaquete, rol, usuario]);

  const buildContext = useCallback(async () => {
    if (!usuario || !rol) {
      throw new SyncError('Sesión no disponible');
    }

    const deviceId = await getOrCreateDeviceId(db);
    const orgScope = await resolverOrgScopeSync(usuario, rol, organizacionRepository);

    return {
      deviceId,
      deviceName: Device.deviceName ?? Device.modelName ?? 'Dispositivo Fieles Bienes',
      orgScope,
      sessionPin: sessionPin || undefined,
      syncPlan: puedeConfigurarPaquete ? syncPlan : undefined,
      direction: pushOnly ? 'push' as const : 'bidirectional' as const,
    };
  }, [db, organizacionRepository, puedeConfigurarPaquete, pushOnly, rol, sessionPin, syncPlan, usuario]);

  const handleToggleVisible = async (value: boolean) => {
    setError(null);

    try {
      if (value) {
        const context = await buildContext();
        orchestrator.setIncomingProgressCallback((update) => {
          setProgress(update.phase, update.message, update.recordsProcessed, update.recordsTotal);
        });
        await orchestrator.iniciarVisibilidad(context);
      } else {
        orchestrator.setIncomingProgressCallback(null);
        await orchestrator.detenerVisibilidad();
      }
      setVisible(value);
    } catch (error) {
      setVisible(false);
      orchestrator.setIncomingProgressCallback(null);
      setError(mapSyncErrorMessage(error));
    }
  };

  const handleBuscar = async () => {
    setError(null);
    setScanning(true);
    setProgress('idle', `Buscando dispositivos cercanos (máx. ${SYNC_PEER_SCAN_TIMEOUT_MS / 1000}s)...`);
    useSyncStore.getState().setPeers([]);
    clearScanTimeout();

    try {
      const deviceId = await getOrCreateDeviceId(db);
      await orchestrator.buscarPeers((peer) => addPeer(peer), deviceId);

      scanTimeoutRef.current = setTimeout(() => {
        const count = useSyncStore.getState().peers.length;
        void finalizarBusqueda(
          count > 0
            ? `Búsqueda finalizada: ${count} dispositivo(s) encontrado(s).`
            : 'Búsqueda finalizada sin resultados. Activa "Visible en la red" en el otro equipo e intenta de nuevo.',
        );
      }, SYNC_PEER_SCAN_TIMEOUT_MS);
    } catch (error) {
      clearScanTimeout();
      setError(mapSyncErrorMessage(error));
      setScanning(false);
    }
  };

  const handleDetenerBusqueda = async () => {
    const count = useSyncStore.getState().peers.length;
    await finalizarBusqueda(
      count > 0
        ? `Escaneo detenido: ${count} dispositivo(s) encontrado(s).`
        : 'Escaneo detenido.',
    );
  };

  const handleSincronizar = async (peer: DiscoveredPeer) => {
    if (isSyncing) {
      return;
    }

    if (isScanning) {
      clearScanTimeout();
      await orchestrator.detenerBusqueda();
      setScanning(false);
    }

    setError(null);
    setSyncing(true);

    try {
      const context = await buildContext();
      await orchestrator.sincronizarConPeer(peer, context, {
        onProgress: (update) => {
          setProgress(update.phase, update.message, update.recordsProcessed, update.recordsTotal);
        },
      });
      setProgress('success', 'Sincronización completada');
    } catch (error) {
      const mapped = mapSyncErrorMessage(error);
      setError(mapped);
      setProgress('failed', mapped);
    } finally {
      setSyncing(false);
    }
  };

  if (!tieneAcceso) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="subtitle">Sin acceso al módulo de sincronización</ThemedText>
      </ThemedView>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="subtitle">La sincronización requiere la app nativa (Android/iOS)</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <SocialHeader
            title="Sincronización P2P"
            subtitle="Intercambia datos con otro dispositivo en la misma red Wi-Fi"
          />

          <AppCard>
            <ThemedText type="smallBold">Estado de red</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Wi-Fi: {wifiConnected ? 'Conectado' : 'No disponible'}
            </ThemedText>
            <Pressable onPress={() => void refreshNetwork()}>
              <ThemedText type="linkPrimary">Actualizar</ThemedText>
            </Pressable>
          </AppCard>

          <AppCard>
            <View style={styles.rowBetween}>
              <ThemedText type="smallBold">Visible en la red</ThemedText>
              <Switch
                value={isVisible}
                onValueChange={(v) => void handleToggleVisible(v)}
                trackColor={{ false: theme.backgroundSelected, true: theme.primaryMuted }}
                thumbColor={isVisible ? theme.primary : theme.textSecondary}
              />
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              Permite que otros dispositivos autorizados encuentren este equipo
            </ThemedText>
          </AppCard>

          {puedeConfigurarPaquete ? (
            <SyncPackageSelector
              organizaciones={organizaciones}
              usuarios={usuarios}
              plan={syncPlan}
              pushOnly={pushOnly}
              onChange={setSyncPlan}
              onPushOnlyChange={setPushOnly}
            />
          ) : null}

          <AppCard>
            <ThemedText type="smallBold">PIN de emparejamiento (opcional)</ThemedText>
            <TextInput
              value={sessionPin}
              onChangeText={setSessionPin}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              placeholder="4 dígitos"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.pinInput,
                {
                  color: theme.text,
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            />
          </AppCard>

          <PrimaryButton
            label={isScanning ? 'Escaneando...' : 'Buscar dispositivos cercanos'}
            onPress={() => void handleBuscar()}
            disabled={isScanning || isSyncing}
            loading={isScanning && !isSyncing}
          />

          {isScanning ? (
            <PrimaryButton
              label="Detener escaneo"
              variant="secondary"
              onPress={() => void handleDetenerBusqueda()}
            />
          ) : null}

          <AppCard>
            <ThemedText type="smallBold">Progreso</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {statusMessage}
            </ThemedText>
            {recordsProcessed > 0 ? (
              <ThemedText type="small" style={{ color: theme.accent }}>
                {recordsProcessed} registros procesados
              </ThemedText>
            ) : null}
            {isSyncing ? <ActivityIndicator color={theme.primary} style={styles.loader} /> : null}
          </AppCard>

          {errorMessage ? (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {errorMessage}
            </ThemedText>
          ) : null}

          <ThemedText type="smallBold">
            Dispositivos encontrados ({peers.length})
          </ThemedText>
          {peers.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              {isScanning ? 'Buscando en la red local...' : 'Ningún dispositivo detectado aún'}
            </ThemedText>
          ) : (
            peers.map((peer) => (
              <Pressable
                key={peer.deviceId}
                onPress={() => void handleSincronizar(peer)}
                disabled={isSyncing}
                style={({ pressed }) => [
                  styles.peerCard,
                  { backgroundColor: theme.primaryMuted, borderColor: theme.border },
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold">{peer.deviceName}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {peer.host}
                </ThemedText>
                <ThemedText type="linkPrimary">Iniciar sincronización →</ThemedText>
              </Pressable>
            ))
          )}

          <Pressable onPress={() => setShowTechnical((v) => !v)}>
            <ThemedText type="link" themeColor="textSecondary">
              {showTechnical ? 'Ocultar detalles técnicos' : 'Ver detalles técnicos'}
            </ThemedText>
          </Pressable>
          {showTechnical ? (
            <ThemedText type="code" themeColor="textSecondary">
              Fase: {phase} · Servicio _fielesbienes._tcp · Puerto 49152
            </ThemedText>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%' },
  scrollContent: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pinInput: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 18,
    letterSpacing: 8,
    textAlign: 'center',
  },
  peerCard: {
    padding: Spacing.three,
    borderRadius: Radius.lg,
    gap: Spacing.one,
    borderWidth: StyleSheet.hairlineWidth,
  },
  loader: { marginTop: Spacing.two },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  pressed: { opacity: 0.85 },
});
