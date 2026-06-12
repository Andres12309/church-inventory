import type { SyncOperacion } from '@/shared/infrastructure/database/schema';

export type SyncOperacionValue = (typeof SyncOperacion)[keyof typeof SyncOperacion];

export type SyncChange = {
  readonly id: string;
  readonly tabla: string;
  readonly registroId: string;
  readonly operacion: SyncOperacionValue;
  readonly payload: Record<string, unknown>;
  readonly lamportClock: number;
  readonly deviceId: string;
  readonly createdAt: string;
};
