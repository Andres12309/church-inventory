import type { SyncChange } from '../domain/entities/SyncChange';

import { sanitizePayloadForTransfer } from './PayloadSerializer';

export function prepareChangesForWire(changes: SyncChange[]): SyncChange[] {
  return changes.map((change) => ({
    ...change,
    payload: sanitizePayloadForTransfer(change.tabla, change.payload),
  }));
}
