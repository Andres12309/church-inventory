export type LwwComparable = {
  lamportClock: number;
  updatedAt: string;
  deviceId: string;
  deletedAt?: string | null;
};

export function buildLwwKey(entry: LwwComparable): string {
  const lamport = String(entry.lamportClock).padStart(12, '0');
  return `${lamport}|${entry.updatedAt}|${entry.deviceId}`;
}

export function shouldApplyRemote(local: LwwComparable | null, remote: LwwComparable): boolean {
  if (!local) {
    return true;
  }

  const localDeleted = local.deletedAt ?? null;
  const remoteDeleted = remote.deletedAt ?? null;

  if (remoteDeleted && !localDeleted) {
    return remoteDeleted > local.updatedAt;
  }

  if (localDeleted && !remoteDeleted) {
    return remote.updatedAt > localDeleted;
  }

  return buildLwwKey(remote) > buildLwwKey(local);
}
