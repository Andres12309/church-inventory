import type { SyncSessionStatus } from '@/shared/infrastructure/database/schema';

export type SyncSessionStatusValue =
  | typeof SyncSessionStatus.PENDING
  | typeof SyncSessionStatus.COMPLETED
  | typeof SyncSessionStatus.FAILED
  | typeof SyncSessionStatus.PARTIAL;

export type SyncSession = {
  readonly id: string;
  readonly peerDeviceId: string;
  readonly peerDeviceName: string;
  readonly startedAt: string;
  readonly finishedAt: string | null;
  readonly status: SyncSessionStatusValue;
  readonly recordsSent: number;
  readonly recordsReceived: number;
  readonly conflictsResolved: number;
};
