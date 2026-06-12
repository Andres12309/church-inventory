/**
 * Espejo empaquetable de `002_usuario_username.sql` para Metro/Expo.
 */
export const MIGRATION_002_VERSION = 2 as const;

export const MIGRATION_002_SQL = `
ALTER TABLE usuarios ADD COLUMN username TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_username
  ON usuarios(username)
  WHERE username IS NOT NULL;

UPDATE usuarios SET username = 'admin' WHERE id = 'seed-user-sistema';
UPDATE usuarios SET username = 'obispo' WHERE id = 'seed-user-obispo';
UPDATE usuarios SET username = 'parroco' WHERE id = 'seed-user-parroco';
UPDATE usuarios SET username = 'encargado' WHERE id = 'seed-user-encargado';

INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (2, datetime('now'));
`;
