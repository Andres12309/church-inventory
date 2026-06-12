import { v4 as uuidv4 } from 'uuid';

import type { IConsolidationService } from '@/features/configuracion/domain/services/IConsolidationService';
import { SyncSessionStatus } from '@/shared/infrastructure/database/schema';

import { SYNC_SCHEMA_VERSION, SYNC_TCP_PORT } from '../domain/constants/SyncConstants';
import type { DiscoveredPeer } from '../domain/entities/DiscoveredPeer';
import { SyncError } from '../domain/errors/SyncError';
import type { OrgChecksumEntry } from '../domain/protocol/SyncProtocolMessages';
import { fromWireChange, toWireChange } from '../domain/protocol/SyncProtocolMessages';
import type { ISyncRepository } from '../domain/repositories/ISyncRepository';
import type { ISyncDiscoveryService } from '../domain/services/ISyncDiscoveryService';
import type { ISyncSocketService, SyncSocketConnection } from '../domain/services/ISyncSocketService';
import { prepareChangesForWire } from '../infrastructure/SyncWireSerializer';

export type SyncPhase =
  | 'idle'
  | 'connecting'
  | 'handshake'
  | 'checksums'
  | 'transferring'
  | 'merging'
  | 'success'
  | 'failed';

export type SyncProgressUpdate = {
  phase: SyncPhase;
  message: string;
  recordsProcessed?: number;
  recordsTotal?: number;
};

export type SyncLocalContext = {
  deviceId: string;
  deviceName: string;
  orgScope: string[];
  sessionPin?: string;
};

export type SyncOrchestratorOptions = {
  onProgress?: (update: SyncProgressUpdate) => void;
};

type ResolvedPeer = {
  deviceId: string;
  deviceName: string;
  lastLamport: number;
  orgScope: string[];
};

type SessionStats = {
  recordsSent: number;
  recordsReceived: number;
  conflictsResolved: number;
};

function intersectScopes(a: string[], b: string[]): string[] {
  const setB = new Set(b);
  return a.filter((id) => setB.has(id));
}

function checksumsDiffer(
  local: OrgChecksumEntry[],
  remote: OrgChecksumEntry[],
): boolean {
  const remoteMap = Object.fromEntries(remote.map((e) => [e.organizacionId, e.checksum]));
  const localMap = Object.fromEntries(local.map((e) => [e.organizacionId, e.checksum]));
  const allOrgIds = new Set([...Object.keys(localMap), ...Object.keys(remoteMap)]);

  for (const orgId of allOrgIds) {
    if (localMap[orgId] !== remoteMap[orgId]) {
      return true;
    }
  }

  return false;
}

export class SyncOrchestrator {
  private incomingProgressCallback: SyncOrchestratorOptions['onProgress'] | null = null;

  constructor(
    private readonly discovery: ISyncDiscoveryService,
    private readonly socketService: ISyncSocketService,
    private readonly syncRepository: ISyncRepository,
    private readonly consolidationService: IConsolidationService,
  ) {}

  setIncomingProgressCallback(callback: SyncOrchestratorOptions['onProgress'] | null): void {
    this.incomingProgressCallback = callback;
  }

  async iniciarVisibilidad(context: SyncLocalContext): Promise<void> {
    await this.socketService.iniciarServidor((connection) => {
      void this.atenderConexionEntrante(connection, context).catch((error) => {
        console.warn('[SyncOrchestrator] Sesión entrante fallida:', error);
      });
    });
    await this.discovery.iniciarBroadcast(context.deviceId, context.deviceName, SYNC_TCP_PORT);
  }

  async detenerVisibilidad(): Promise<void> {
    this.incomingProgressCallback = null;
    await this.discovery.detenerBroadcast();
    await this.socketService.detenerServidor();
  }

  async buscarPeers(
    onPeerFound: (peer: DiscoveredPeer) => void,
    localDeviceId?: string,
  ): Promise<void> {
    await this.discovery.iniciarEscaneo((peer) => {
      if (localDeviceId && peer.deviceId === localDeviceId) {
        return;
      }
      onPeerFound(peer);
    }, localDeviceId);
  }

  async detenerBusqueda(): Promise<void> {
    await this.discovery.detenerEscaneo();
  }

  async sincronizarConPeer(
    peer: DiscoveredPeer,
    context: SyncLocalContext,
    options?: SyncOrchestratorOptions,
  ): Promise<void> {
    const sessionId = uuidv4();
    let connection: SyncSocketConnection | null = null;

    try {
      options?.onProgress?.({ phase: 'connecting', message: `Conectando con ${peer.deviceName}...` });
      connection = await this.socketService.conectar(peer.host, peer.port);

      await this.syncRepository.crearSesion({
        id: sessionId,
        peerDeviceId: peer.deviceId,
        peerDeviceName: peer.deviceName,
        startedAt: new Date().toISOString(),
        finishedAt: null,
        status: SyncSessionStatus.PENDING,
        recordsSent: 0,
        recordsReceived: 0,
        conflictsResolved: 0,
      });

      const stats = await this.ejecutarProtocolo(connection, context, peer.deviceId, options);

      await this.syncRepository.finalizarSesion(sessionId, SyncSessionStatus.COMPLETED, stats);
      await this.syncRepository.guardarMeta({
        deviceId: context.deviceId,
        deviceName: context.deviceName,
        lastSyncAt: new Date().toISOString(),
        schemaVersion: SYNC_SCHEMA_VERSION,
      });

      options?.onProgress?.({ phase: 'success', message: 'Sincronización completada' });
      void this.consolidationService.consolidarTodoElArbol().catch(() => undefined);
    } catch (error) {
      await this.syncRepository
        .finalizarSesion(sessionId, SyncSessionStatus.FAILED, {
          recordsSent: 0,
          recordsReceived: 0,
          conflictsResolved: 0,
        })
        .catch(() => undefined);

      const message = error instanceof Error ? error.message : 'Sincronización fallida';
      options?.onProgress?.({ phase: 'failed', message });
      throw error instanceof SyncError ? error : new SyncError(message);
    } finally {
      connection?.close();
    }
  }

  private async atenderConexionEntrante(
    connection: SyncSocketConnection,
    context: SyncLocalContext,
  ): Promise<void> {
    const sessionId = uuidv4();
    const startedAt = new Date().toISOString();
    const options: SyncOrchestratorOptions = {
      onProgress: this.incomingProgressCallback ?? undefined,
    };

    try {
      options.onProgress?.({ phase: 'handshake', message: 'Conexión entrante: validando peer...' });

      const stats = await this.ejecutarProtocolo(connection, context, undefined, options);

      await this.syncRepository.crearSesion({
        id: sessionId,
        peerDeviceId: stats.peerDeviceId ?? 'unknown',
        peerDeviceName: stats.peerDeviceName ?? 'Dispositivo remoto',
        startedAt,
        finishedAt: new Date().toISOString(),
        status: SyncSessionStatus.COMPLETED,
        recordsSent: stats.recordsSent,
        recordsReceived: stats.recordsReceived,
        conflictsResolved: stats.conflictsResolved,
      });

      await this.syncRepository.guardarMeta({
        deviceId: context.deviceId,
        deviceName: context.deviceName,
        lastSyncAt: new Date().toISOString(),
        schemaVersion: SYNC_SCHEMA_VERSION,
      });

      options.onProgress?.({ phase: 'success', message: 'Sincronización entrante completada' });
      void this.consolidationService.consolidarTodoElArbol().catch(() => undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sesión entrante fallida';
      await this.syncRepository
        .crearSesion({
          id: sessionId,
          peerDeviceId: 'unknown',
          peerDeviceName: 'Dispositivo remoto',
          startedAt,
          finishedAt: new Date().toISOString(),
          status: SyncSessionStatus.FAILED,
          recordsSent: 0,
          recordsReceived: 0,
          conflictsResolved: 0,
        })
        .catch(() => undefined);

      options.onProgress?.({ phase: 'failed', message });
      throw error instanceof SyncError ? error : new SyncError(message);
    } finally {
      connection.close();
    }
  }

  private async ejecutarProtocolo(
    connection: SyncSocketConnection,
    context: SyncLocalContext,
    expectedPeerId: string | undefined,
    options?: SyncOrchestratorOptions,
  ): Promise<SessionStats & { peerDeviceId?: string; peerDeviceName?: string }> {
    const isInitiator = expectedPeerId != null;
    const localLamport = await this.syncRepository.obtenerUltimoLamport();

    options?.onProgress?.({ phase: 'handshake', message: 'Validando compatibilidad...' });

    const { peer, sharedScope } = await this.realizarHandshake(
      connection,
      context,
      localLamport,
      expectedPeerId,
    );

    options?.onProgress?.({ phase: 'checksums', message: 'Comparando estado local...' });

    const { localChecksums, remoteChecksums } = await this.intercambiarChecksums(
      connection,
      sharedScope,
      isInitiator,
    );

    let stats: SessionStats = {
      recordsSent: 0,
      recordsReceived: 0,
      conflictsResolved: 0,
    };

    if (checksumsDiffer(localChecksums, remoteChecksums)) {
      stats = await this.intercambiarDeltas(
        connection,
        context,
        peer,
        sharedScope,
        isInitiator,
        options,
      );
    }

    await this.intercambiarAck(connection, stats, isInitiator);

    return {
      ...stats,
      peerDeviceId: peer.deviceId,
      peerDeviceName: peer.deviceName,
    };
  }

  private async realizarHandshake(
    connection: SyncSocketConnection,
    context: SyncLocalContext,
    localLamport: number,
    expectedPeerId: string | undefined,
  ): Promise<{ peer: ResolvedPeer; sharedScope: string[] }> {
    const isInitiator = expectedPeerId != null;

    if (isInitiator) {
      await connection.send({
        type: 'HANDSHAKE',
        deviceId: context.deviceId,
        deviceName: context.deviceName,
        schemaVersion: SYNC_SCHEMA_VERSION,
        orgScope: context.orgScope,
        lastLamport: localLamport,
        sessionPin: context.sessionPin,
      });

      const ack = await connection.receive();
      if (ack.type !== 'HANDSHAKE_ACK') {
        throw new SyncError('Se esperaba HANDSHAKE_ACK del peer');
      }
      if (!ack.accepted) {
        throw new SyncError(ack.reason ?? 'Handshake rechazado por el peer');
      }
      if (ack.deviceId !== expectedPeerId) {
        throw new SyncError('Device ID del peer no coincide');
      }
      if (ack.schemaVersion !== SYNC_SCHEMA_VERSION) {
        throw new SyncError('Versión de esquema incompatible');
      }

      const sharedScope = intersectScopes(context.orgScope, ack.orgScope);
      if (sharedScope.length === 0) {
        throw new SyncError('No hay organizaciones compartidas entre dispositivos');
      }

      return {
        peer: {
          deviceId: ack.deviceId,
          deviceName: ack.deviceName,
          lastLamport: ack.lastLamport,
          orgScope: ack.orgScope,
        },
        sharedScope,
      };
    }

    const handshake = await connection.receive();
    if (handshake.type !== 'HANDSHAKE') {
      throw new SyncError('Se esperaba HANDSHAKE del iniciador');
    }

    if (handshake.schemaVersion !== SYNC_SCHEMA_VERSION) {
      await connection.send({
        type: 'HANDSHAKE_ACK',
        accepted: false,
        reason: 'Versión de esquema incompatible',
        deviceId: context.deviceId,
        deviceName: context.deviceName,
        schemaVersion: SYNC_SCHEMA_VERSION,
        orgScope: context.orgScope,
        lastLamport: localLamport,
      });
      throw new SyncError('Versión de esquema incompatible');
    }

    if (context.sessionPin && handshake.sessionPin !== context.sessionPin) {
      await connection.send({
        type: 'HANDSHAKE_ACK',
        accepted: false,
        reason: 'PIN de sesión inválido',
        deviceId: context.deviceId,
        deviceName: context.deviceName,
        schemaVersion: SYNC_SCHEMA_VERSION,
        orgScope: context.orgScope,
        lastLamport: localLamport,
      });
      throw new SyncError('PIN de sesión inválido');
    }

    const sharedScope = intersectScopes(context.orgScope, handshake.orgScope);
    if (sharedScope.length === 0) {
      await connection.send({
        type: 'HANDSHAKE_ACK',
        accepted: false,
        reason: 'Sin organizaciones compartidas',
        deviceId: context.deviceId,
        deviceName: context.deviceName,
        schemaVersion: SYNC_SCHEMA_VERSION,
        orgScope: context.orgScope,
        lastLamport: localLamport,
      });
      throw new SyncError('No hay organizaciones compartidas entre dispositivos');
    }

    await connection.send({
      type: 'HANDSHAKE_ACK',
      accepted: true,
      deviceId: context.deviceId,
      deviceName: context.deviceName,
      schemaVersion: SYNC_SCHEMA_VERSION,
      orgScope: context.orgScope,
      lastLamport: localLamport,
    });

    return {
      peer: {
        deviceId: handshake.deviceId,
        deviceName: handshake.deviceName,
        lastLamport: handshake.lastLamport,
        orgScope: handshake.orgScope,
      },
      sharedScope,
    };
  }

  private async intercambiarChecksums(
    connection: SyncSocketConnection,
    sharedScope: string[],
    isInitiator: boolean,
  ): Promise<{ localChecksums: OrgChecksumEntry[]; remoteChecksums: OrgChecksumEntry[] }> {
    const localChecksums = await this.syncRepository.calcularChecksums(sharedScope);

    if (isInitiator) {
      await connection.send({ type: 'CHECKSUMS', checksums: localChecksums });
      const ack = await connection.receive();
      if (ack.type !== 'CHECKSUMS_ACK') {
        throw new SyncError('Se esperaba CHECKSUMS_ACK');
      }
      return { localChecksums, remoteChecksums: ack.checksums };
    }

    const checksumMsg = await connection.receive();
    if (checksumMsg.type !== 'CHECKSUMS') {
      throw new SyncError('Se esperaba CHECKSUMS del iniciador');
    }

    await connection.send({
      type: 'CHECKSUMS_ACK',
      checksums: localChecksums,
      needsDelta: checksumsDiffer(localChecksums, checksumMsg.checksums),
    });

    return { localChecksums, remoteChecksums: checksumMsg.checksums };
  }

  private async intercambiarDeltas(
    connection: SyncSocketConnection,
    context: SyncLocalContext,
    peer: ResolvedPeer,
    sharedScope: string[],
    isInitiator: boolean,
    options?: SyncOrchestratorOptions,
  ): Promise<SessionStats> {
    options?.onProgress?.({ phase: 'transferring', message: 'Transfiriendo cambios...' });

    let recordsSent = 0;
    let recordsReceived = 0;
    let conflictsResolved = 0;
    let rejected = 0;

    if (isInitiator) {
      await connection.send({ type: 'DELTA_REQUEST', sinceLamport: peer.lastLamport });

      const inbound = await connection.receive();
      if (inbound.type !== 'DELTA') {
        throw new SyncError('Se esperaba DELTA del peer');
      }

      options?.onProgress?.({ phase: 'merging', message: 'Aplicando cambios remotos...' });
      const mergeIn = await this.syncRepository.aplicarCambiosRemotos(
        inbound.changes.map(fromWireChange),
        sharedScope,
        context.deviceId,
      );
      recordsReceived = inbound.changes.length;
      conflictsResolved += mergeIn.conflicts;
      rejected += mergeIn.rejected;

      const outbound = prepareChangesForWire(
        await this.syncRepository.listarDeltasDesde(peer.lastLamport, sharedScope),
      );
      await connection.send({ type: 'DELTA', changes: outbound.map(toWireChange) });
      recordsSent = outbound.length;
    } else {
      const request = await connection.receive();
      if (request.type !== 'DELTA_REQUEST') {
        throw new SyncError('Se esperaba DELTA_REQUEST');
      }

      const outbound = prepareChangesForWire(
        await this.syncRepository.listarDeltasDesde(request.sinceLamport, sharedScope),
      );
      await connection.send({ type: 'DELTA', changes: outbound.map(toWireChange) });
      recordsSent = outbound.length;

      const inbound = await connection.receive();
      if (inbound.type !== 'DELTA') {
        throw new SyncError('Se esperaba DELTA del iniciador');
      }

      options?.onProgress?.({ phase: 'merging', message: 'Aplicando cambios remotos...' });
      const mergeIn = await this.syncRepository.aplicarCambiosRemotos(
        inbound.changes.map(fromWireChange),
        sharedScope,
        context.deviceId,
      );
      recordsReceived = inbound.changes.length;
      conflictsResolved += mergeIn.conflicts;
      rejected += mergeIn.rejected;
    }

    return {
      recordsSent,
      recordsReceived,
      conflictsResolved: conflictsResolved + rejected,
    };
  }

  private async intercambiarAck(
    connection: SyncSocketConnection,
    stats: SessionStats,
    isInitiator: boolean,
  ): Promise<void> {
    if (isInitiator) {
      await connection.send({
        type: 'ACK',
        applied: stats.recordsReceived,
        conflicts: stats.conflictsResolved,
        rejected: 0,
      });

      const remoteAck = await connection.receive();
      if (remoteAck.type !== 'ACK') {
        throw new SyncError('Se esperaba ACK final del peer');
      }
      return;
    }

    const remoteAck = await connection.receive();
    if (remoteAck.type !== 'ACK') {
      throw new SyncError('Se esperaba ACK del iniciador');
    }

    await connection.send({
      type: 'ACK',
      applied: stats.recordsReceived,
      conflicts: stats.conflictsResolved,
      rejected: 0,
    });
  }
}
