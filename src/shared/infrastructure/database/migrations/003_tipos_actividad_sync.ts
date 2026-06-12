/**
 * Espejo empaquetable de `003_tipos_actividad_sync.sql` para Metro/Expo.
 */
export const MIGRATION_003_VERSION = 3 as const;

export const MIGRATION_003_SQL = `
ALTER TABLE tipos_actividad ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
ALTER TABLE tipos_actividad ADD COLUMN updated_by_device TEXT NOT NULL DEFAULT '';
ALTER TABLE tipos_actividad ADD COLUMN sync_vector TEXT NOT NULL DEFAULT '{}';

UPDATE tipos_actividad
SET updated_at = datetime('now')
WHERE updated_at = '';

INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (3, datetime('now'));
`;
