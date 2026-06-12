const LOCKED_PATTERN = /database is locked/i;

function isDatabaseLockedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return LOCKED_PATTERN.test(message);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Reintenta operaciones SQLite cuando la BD está bloqueada por otra transacción. */
export async function withSqliteLockRetry<T>(
  fn: () => Promise<T>,
  attempts = 5,
  baseDelayMs = 40,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isDatabaseLockedError(error) || attempt === attempts - 1) {
        throw error;
      }
      await delay(baseDelayMs * (attempt + 1));
    }
  }

  throw lastError;
}

let sqliteQueue: Promise<unknown> = Promise.resolve();
let insideSerializedSqlite = false;

/**
 * Encola operaciones SQLite para evitar transacciones concurrentes.
 * Reentrante: llamadas anidadas (p. ej. seeds dentro de hydrate) ejecutan inline.
 */
export function runSerializedSqlite<T>(fn: () => Promise<T>): Promise<T> {
  if (insideSerializedSqlite) {
    return withSqliteLockRetry(fn);
  }

  const run = sqliteQueue.then(async () => {
    insideSerializedSqlite = true;
    try {
      return await withSqliteLockRetry(fn);
    } finally {
      insideSerializedSqlite = false;
    }
  });

  sqliteQueue = run.then(
    () => undefined,
    () => undefined,
  );

  return run;
}
