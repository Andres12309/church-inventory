import type { SyncChange } from '../entities/SyncChange';

export type SyncMessageType =
  | 'HANDSHAKE'
  | 'HANDSHAKE_ACK'
  | 'CHECKSUMS'
  | 'CHECKSUMS_ACK'
  | 'DELTA_REQUEST'
  | 'DELTA'
  | 'ACK'
  | 'ERROR';

export type SyncHandshakePayload = {
  type: 'HANDSHAKE';
  deviceId: string;
  deviceName: string;
  schemaVersion: number;
  orgScope: string[];
  lastLamport: number;
  sessionPin?: string;
};

export type SyncHandshakeAckPayload = {
  type: 'HANDSHAKE_ACK';
  accepted: boolean;
  reason?: string;
  deviceId: string;
  deviceName: string;
  schemaVersion: number;
  orgScope: string[];
  lastLamport: number;
};

export type OrgChecksumEntry = {
  organizacionId: string;
  checksum: string;
};

export type SyncChecksumsPayload = {
  type: 'CHECKSUMS';
  checksums: OrgChecksumEntry[];
};

export type SyncChecksumsAckPayload = {
  type: 'CHECKSUMS_ACK';
  checksums: OrgChecksumEntry[];
  needsDelta: boolean;
};

export type SyncDeltaRequestPayload = {
  type: 'DELTA_REQUEST';
  sinceLamport: number;
};

export type SyncDeltaPayload = {
  type: 'DELTA';
  changes: SyncChangeWire[];
};

export type SyncAckPayload = {
  type: 'ACK';
  applied: number;
  conflicts: number;
  rejected: number;
};

export type SyncErrorPayload = {
  type: 'ERROR';
  message: string;
  code?: string;
};

export type SyncChangeWire = {
  id: string;
  tabla: string;
  registroId: string;
  operacion: string;
  payload: Record<string, unknown>;
  lamportClock: number;
  deviceId: string;
  createdAt: string;
};

export type SyncProtocolMessage =
  | SyncHandshakePayload
  | SyncHandshakeAckPayload
  | SyncChecksumsPayload
  | SyncChecksumsAckPayload
  | SyncDeltaRequestPayload
  | SyncDeltaPayload
  | SyncAckPayload
  | SyncErrorPayload;

export function toWireChange(change: SyncChange): SyncChangeWire {
  return {
    id: change.id,
    tabla: change.tabla,
    registroId: change.registroId,
    operacion: change.operacion,
    payload: change.payload,
    lamportClock: change.lamportClock,
    deviceId: change.deviceId,
    createdAt: change.createdAt,
  };
}

export function fromWireChange(wire: SyncChangeWire): SyncChange {
  return {
    id: wire.id,
    tabla: wire.tabla,
    registroId: wire.registroId,
    operacion: wire.operacion as SyncChange['operacion'],
    payload: wire.payload,
    lamportClock: wire.lamportClock,
    deviceId: wire.deviceId,
    createdAt: wire.createdAt,
  };
}
