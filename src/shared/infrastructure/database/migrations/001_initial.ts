/**
 * Espejo empaquetable de `001_initial.sql` para Metro/Expo.
 * Mantener ambos archivos sincronizados al editar la migración.
 */
export const MIGRATION_001_VERSION = 1 as const;

export const MIGRATION_001_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS organizacion_niveles (
  id TEXT PRIMARY KEY NOT NULL,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  nivel_orden INTEGER NOT NULL,
  es_hoja INTEGER NOT NULL DEFAULT 0,
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS organizaciones (
  id TEXT PRIMARY KEY NOT NULL,
  nivel_id TEXT NOT NULL,
  parent_id TEXT,
  nombre TEXT NOT NULL,
  codigo_interno TEXT NOT NULL,
  descripcion TEXT,
  activo INTEGER NOT NULL DEFAULT 1,
  sync_vector TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  updated_by_device TEXT NOT NULL DEFAULT '',
  deleted_at TEXT,
  FOREIGN KEY (nivel_id) REFERENCES organizacion_niveles(id),
  FOREIGN KEY (parent_id) REFERENCES organizaciones(id)
);

CREATE TABLE IF NOT EXISTS ubicaciones (
  id TEXT PRIMARY KEY NOT NULL,
  organizacion_id TEXT NOT NULL UNIQUE,
  direccion TEXT NOT NULL,
  ciudad TEXT,
  provincia TEXT,
  pais TEXT NOT NULL DEFAULT 'EC',
  latitud REAL,
  longitud REAL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id)
);

CREATE TABLE IF NOT EXISTS modulos (
  id TEXT PRIMARY KEY NOT NULL,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  ruta TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  activo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY NOT NULL,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  nivel_minimo_orden INTEGER,
  activo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS role_modulos (
  role_id TEXT NOT NULL,
  modulo_id TEXT NOT NULL,
  PRIMARY KEY (role_id, modulo_id),
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (modulo_id) REFERENCES modulos(id)
);

CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY NOT NULL,
  organizacion_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  nombre TEXT NOT NULL,
  email TEXT,
  pin_hash TEXT NOT NULL,
  activo INTEGER NOT NULL DEFAULT 1,
  ultimo_acceso TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS categorias_bien (
  id TEXT PRIMARY KEY NOT NULL,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  activo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS bienes (
  id TEXT PRIMARY KEY NOT NULL,
  organizacion_id TEXT NOT NULL,
  categoria_id TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  estado TEXT NOT NULL CHECK (estado IN ('excelente', 'bueno', 'regular', 'malo')),
  cantidad INTEGER NOT NULL DEFAULT 1,
  valor_estimado REAL,
  foto_uri TEXT,
  observaciones TEXT,
  sync_vector TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  updated_by_device TEXT NOT NULL DEFAULT '',
  deleted_at TEXT,
  FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id),
  FOREIGN KEY (categoria_id) REFERENCES categorias_bien(id)
);

CREATE TABLE IF NOT EXISTS tipos_actividad (
  id TEXT PRIMARY KEY NOT NULL,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  activo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS ofrendas (
  id TEXT PRIMARY KEY NOT NULL,
  organizacion_id TEXT NOT NULL,
  tipo_actividad_id TEXT NOT NULL,
  monto REAL NOT NULL,
  fecha TEXT NOT NULL,
  descripcion TEXT,
  sync_vector TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  updated_by_device TEXT NOT NULL DEFAULT '',
  deleted_at TEXT,
  FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id),
  FOREIGN KEY (tipo_actividad_id) REFERENCES tipos_actividad(id)
);

CREATE TABLE IF NOT EXISTS inventario_aggregates (
  organizacion_id TEXT PRIMARY KEY NOT NULL,
  total_bienes INTEGER NOT NULL DEFAULT 0,
  total_bienes_por_estado TEXT NOT NULL DEFAULT '{}',
  total_ofrendas REAL NOT NULL DEFAULT 0,
  total_ofrendas_por_tipo TEXT NOT NULL DEFAULT '{}',
  calculado_at TEXT NOT NULL,
  FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id)
);

CREATE TABLE IF NOT EXISTS sync_meta (
  device_id TEXT PRIMARY KEY NOT NULL,
  device_name TEXT NOT NULL,
  last_sync_at TEXT,
  schema_version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS sync_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  peer_device_id TEXT NOT NULL,
  peer_device_name TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'partial')),
  records_sent INTEGER NOT NULL DEFAULT 0,
  records_received INTEGER NOT NULL DEFAULT 0,
  conflicts_resolved INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sync_changes (
  id TEXT PRIMARY KEY NOT NULL,
  tabla TEXT NOT NULL,
  registro_id TEXT NOT NULL,
  operacion TEXT NOT NULL CHECK (operacion IN ('insert', 'update', 'delete')),
  payload TEXT NOT NULL,
  lamport_clock INTEGER NOT NULL,
  device_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reportes_generados (
  id TEXT PRIMARY KEY NOT NULL,
  organizacion_id TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('bienes', 'ofrendas', 'consolidado')),
  file_uri TEXT NOT NULL,
  generado_at TEXT NOT NULL,
  generado_por_usuario_id TEXT,
  FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id),
  FOREIGN KEY (generado_por_usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_organizaciones_parent_id ON organizaciones(parent_id);
CREATE INDEX IF NOT EXISTS idx_organizaciones_nivel_id ON organizaciones(nivel_id);
CREATE INDEX IF NOT EXISTS idx_organizaciones_parent_activo ON organizaciones(parent_id, activo);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_organizacion_id ON ubicaciones(organizacion_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_organizacion_id ON usuarios(organizacion_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_role_id ON usuarios(role_id);
CREATE INDEX IF NOT EXISTS idx_bienes_organizacion_id ON bienes(organizacion_id);
CREATE INDEX IF NOT EXISTS idx_bienes_organizacion_estado ON bienes(organizacion_id, estado);
CREATE INDEX IF NOT EXISTS idx_bienes_categoria_id ON bienes(categoria_id);
CREATE INDEX IF NOT EXISTS idx_bienes_updated_at ON bienes(updated_at);
CREATE INDEX IF NOT EXISTS idx_ofrendas_organizacion_fecha ON ofrendas(organizacion_id, fecha);
CREATE INDEX IF NOT EXISTS idx_ofrendas_tipo_actividad_id ON ofrendas(tipo_actividad_id);
CREATE INDEX IF NOT EXISTS idx_ofrendas_fecha ON ofrendas(fecha);
CREATE INDEX IF NOT EXISTS idx_sync_changes_lamport_clock ON sync_changes(lamport_clock);
CREATE INDEX IF NOT EXISTS idx_sync_changes_tabla_registro ON sync_changes(tabla, registro_id);
CREATE INDEX IF NOT EXISTS idx_sync_changes_created_at ON sync_changes(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_sessions_started_at ON sync_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_reportes_organizacion_id ON reportes_generados(organizacion_id);
CREATE INDEX IF NOT EXISTS idx_reportes_generado_at ON reportes_generados(generado_at);

INSERT OR IGNORE INTO organizacion_niveles (id, codigo, nombre, nivel_orden, es_hoja, activo, created_at, updated_at) VALUES
  ('seed-nivel-capilla', 'capilla', 'Capilla', 1, 1, 1, datetime('now'), datetime('now')),
  ('seed-nivel-parroquia', 'parroquia', 'Parroquia', 2, 0, 1, datetime('now'), datetime('now')),
  ('seed-nivel-diocesis', 'diocesis', 'Diócesis/Catedral', 3, 0, 1, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO modulos (id, codigo, nombre, ruta, orden, activo) VALUES
  ('seed-mod-configuracion', 'configuracion', 'Configuración', '/configuracion', 1, 1),
  ('seed-mod-usuarios', 'usuarios', 'Usuarios', '/usuarios', 2, 1),
  ('seed-mod-organizaciones', 'organizaciones', 'Organizaciones', '/organizaciones', 3, 1),
  ('seed-mod-inventario', 'inventario_bienes', 'Inventario de Bienes', '/inventario/bienes', 4, 1),
  ('seed-mod-ofrendas', 'ofrendas', 'Ofrendas', '/ofrendas', 5, 1),
  ('seed-mod-sync', 'sync', 'Sincronización', '/sync', 6, 1),
  ('seed-mod-reportes', 'reportes', 'Reportes', '/reportes', 7, 1);

INSERT OR IGNORE INTO roles (id, codigo, nombre, nivel_minimo_orden, activo) VALUES
  ('seed-role-super-admin', 'super_admin', 'Super Administrador', NULL, 1),
  ('seed-role-obispo', 'obispo', 'Obispo', 3, 1),
  ('seed-role-parroco', 'parroco', 'Párroco', 2, 1),
  ('seed-role-encargado', 'encargado_capilla', 'Encargado de Capilla', 1, 1);

INSERT OR IGNORE INTO role_modulos (role_id, modulo_id) VALUES
  ('seed-role-super-admin', 'seed-mod-configuracion'),
  ('seed-role-super-admin', 'seed-mod-usuarios'),
  ('seed-role-super-admin', 'seed-mod-organizaciones'),
  ('seed-role-super-admin', 'seed-mod-inventario'),
  ('seed-role-super-admin', 'seed-mod-ofrendas'),
  ('seed-role-super-admin', 'seed-mod-sync'),
  ('seed-role-super-admin', 'seed-mod-reportes'),
  ('seed-role-obispo', 'seed-mod-usuarios'),
  ('seed-role-obispo', 'seed-mod-organizaciones'),
  ('seed-role-obispo', 'seed-mod-inventario'),
  ('seed-role-obispo', 'seed-mod-ofrendas'),
  ('seed-role-obispo', 'seed-mod-sync'),
  ('seed-role-obispo', 'seed-mod-reportes'),
  ('seed-role-parroco', 'seed-mod-inventario'),
  ('seed-role-parroco', 'seed-mod-ofrendas'),
  ('seed-role-parroco', 'seed-mod-organizaciones'),
  ('seed-role-parroco', 'seed-mod-usuarios'),
  ('seed-role-parroco', 'seed-mod-sync'),
  ('seed-role-parroco', 'seed-mod-reportes'),
  ('seed-role-encargado', 'seed-mod-organizaciones'),
  ('seed-role-encargado', 'seed-mod-inventario'),
  ('seed-role-encargado', 'seed-mod-ofrendas'),
  ('seed-role-encargado', 'seed-mod-sync'),
  ('seed-role-encargado', 'seed-mod-reportes');

INSERT OR IGNORE INTO categorias_bien (id, codigo, nombre, activo) VALUES
  ('seed-cat-arte', 'arte_sacro', 'Arte Sacro', 1),
  ('seed-cat-mobiliario', 'mobiliario', 'Mobiliario', 1),
  ('seed-cat-equipos', 'equipos', 'Equipos', 1);

INSERT OR IGNORE INTO tipos_actividad (id, codigo, nombre, activo) VALUES
  ('seed-tipo-misas', 'misas_dominicales', 'Misas Dominicales', 1),
  ('seed-tipo-matrimonios', 'matrimonios', 'Matrimonios', 1),
  ('seed-tipo-eventos', 'eventos_especiales', 'Eventos Especiales', 1),
  ('seed-tipo-colectas', 'colectas_solidarias', 'Colectas Solidarias', 1),
  ('seed-tipo-bingos', 'bingos_kermeses', 'Bingos / Kermeses', 1);

INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (1, datetime('now'));
`.trim();
