export type SyncMeta = {
  readonly deviceId: string;
  readonly deviceName: string;
  readonly lastSyncAt: string | null;
  readonly schemaVersion: number;
};
