/**
 * Ingresos y egresos en movimientos financieros + tipos por naturaleza.
 */
export const MIGRATION_004_VERSION = 4 as const;

export const MIGRATION_004_SQL = `
ALTER TABLE ofrendas ADD COLUMN naturaleza TEXT NOT NULL DEFAULT 'ingreso';
ALTER TABLE tipos_actividad ADD COLUMN naturaleza TEXT NOT NULL DEFAULT 'ingreso';

INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (4, datetime('now'));
`;
