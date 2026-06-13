export const SYNC_TCP_PORT = 49152;
export const SYNC_SCHEMA_VERSION = 1 as const;
export const SYNC_SERVICE_TYPE = "fielesbienes" as const;
export const SYNC_SERVICE_PROTOCOL = "tcp" as const;
export const SYNC_SERVICE_DOMAIN = "local." as const;
export const SYNC_MESSAGE_TIMEOUT_MS = 30_000 as const;
export const SYNC_SOCKET_CONNECT_TIMEOUT_MS = 10_000 as const;
export const SYNC_PEER_SCAN_TIMEOUT_MS = 15_000 as const;

export const SYNCABLE_TABLES = [
  "bienes",
  "ofrendas",
  "organizaciones",
  "tipos_actividad",
  "usuarios",
] as const;
export type SyncableTable = (typeof SYNCABLE_TABLES)[number];
