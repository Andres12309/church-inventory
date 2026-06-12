export const DATABASE_NAME = 'fieles_bienes.db' as const;

export const Tables = {
  SCHEMA_MIGRATIONS: 'schema_migrations',
  ORGANIZACION_NIVELES: 'organizacion_niveles',
  ORGANIZACIONES: 'organizaciones',
  UBICACIONES: 'ubicaciones',
  MODULOS: 'modulos',
  ROLES: 'roles',
  ROLE_MODULOS: 'role_modulos',
  USUARIOS: 'usuarios',
  CATEGORIAS_BIEN: 'categorias_bien',
  BIENES: 'bienes',
  TIPOS_ACTIVIDAD: 'tipos_actividad',
  OFRENDAS: 'ofrendas',
  INVENTARIO_AGGREGATES: 'inventario_aggregates',
  SYNC_META: 'sync_meta',
  SYNC_SESSIONS: 'sync_sessions',
  SYNC_CHANGES: 'sync_changes',
  REPORTES_GENERADOS: 'reportes_generados',
} as const;

export type TableName = (typeof Tables)[keyof typeof Tables];

export const SchemaMigrationsColumns = {
  VERSION: 'version',
  APPLIED_AT: 'applied_at',
} as const;

export const OrganizacionNivelesColumns = {
  ID: 'id',
  CODIGO: 'codigo',
  NOMBRE: 'nombre',
  NIVEL_ORDEN: 'nivel_orden',
  ES_HOJA: 'es_hoja',
  ACTIVO: 'activo',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
} as const;

export const OrganizacionesColumns = {
  ID: 'id',
  NIVEL_ID: 'nivel_id',
  PARENT_ID: 'parent_id',
  NOMBRE: 'nombre',
  CODIGO_INTERNO: 'codigo_interno',
  DESCRIPCION: 'descripcion',
  ACTIVO: 'activo',
  SYNC_VECTOR: 'sync_vector',
  UPDATED_AT: 'updated_at',
  UPDATED_BY_DEVICE: 'updated_by_device',
  DELETED_AT: 'deleted_at',
} as const;

export const UbicacionesColumns = {
  ID: 'id',
  ORGANIZACION_ID: 'organizacion_id',
  DIRECCION: 'direccion',
  CIUDAD: 'ciudad',
  PROVINCIA: 'provincia',
  PAIS: 'pais',
  LATITUD: 'latitud',
  LONGITUD: 'longitud',
  UPDATED_AT: 'updated_at',
} as const;

export const ModulosColumns = {
  ID: 'id',
  CODIGO: 'codigo',
  NOMBRE: 'nombre',
  RUTA: 'ruta',
  ORDEN: 'orden',
  ACTIVO: 'activo',
} as const;

export const RolesColumns = {
  ID: 'id',
  CODIGO: 'codigo',
  NOMBRE: 'nombre',
  NIVEL_MINIMO_ORDEN: 'nivel_minimo_orden',
  ACTIVO: 'activo',
} as const;

export const RoleModulosColumns = {
  ROLE_ID: 'role_id',
  MODULO_ID: 'modulo_id',
} as const;

export const UsuariosColumns = {
  ID: 'id',
  ORGANIZACION_ID: 'organizacion_id',
  ROLE_ID: 'role_id',
  USERNAME: 'username',
  NOMBRE: 'nombre',
  EMAIL: 'email',
  PIN_HASH: 'pin_hash',
  ACTIVO: 'activo',
  ULTIMO_ACCESO: 'ultimo_acceso',
  UPDATED_AT: 'updated_at',
} as const;

export const CategoriasBienColumns = {
  ID: 'id',
  CODIGO: 'codigo',
  NOMBRE: 'nombre',
  ACTIVO: 'activo',
} as const;

export const BienesColumns = {
  ID: 'id',
  ORGANIZACION_ID: 'organizacion_id',
  CATEGORIA_ID: 'categoria_id',
  NOMBRE: 'nombre',
  DESCRIPCION: 'descripcion',
  ESTADO: 'estado',
  CANTIDAD: 'cantidad',
  VALOR_ESTIMADO: 'valor_estimado',
  FOTO_URI: 'foto_uri',
  OBSERVACIONES: 'observaciones',
  SYNC_VECTOR: 'sync_vector',
  UPDATED_AT: 'updated_at',
  UPDATED_BY_DEVICE: 'updated_by_device',
  DELETED_AT: 'deleted_at',
} as const;

export const TiposActividadColumns = {
  ID: 'id',
  CODIGO: 'codigo',
  NOMBRE: 'nombre',
  ACTIVO: 'activo',
  SYNC_VECTOR: 'sync_vector',
  UPDATED_AT: 'updated_at',
  UPDATED_BY_DEVICE: 'updated_by_device',
} as const;

export const OfrendasColumns = {
  ID: 'id',
  ORGANIZACION_ID: 'organizacion_id',
  TIPO_ACTIVIDAD_ID: 'tipo_actividad_id',
  MONTO: 'monto',
  FECHA: 'fecha',
  DESCRIPCION: 'descripcion',
  SYNC_VECTOR: 'sync_vector',
  UPDATED_AT: 'updated_at',
  UPDATED_BY_DEVICE: 'updated_by_device',
  DELETED_AT: 'deleted_at',
} as const;

export const InventarioAggregatesColumns = {
  ORGANIZACION_ID: 'organizacion_id',
  TOTAL_BIENES: 'total_bienes',
  TOTAL_BIENES_POR_ESTADO: 'total_bienes_por_estado',
  TOTAL_OFRENDAS: 'total_ofrendas',
  TOTAL_OFRENDAS_POR_TIPO: 'total_ofrendas_por_tipo',
  CALCULADO_AT: 'calculado_at',
} as const;

export const SyncMetaColumns = {
  DEVICE_ID: 'device_id',
  DEVICE_NAME: 'device_name',
  LAST_SYNC_AT: 'last_sync_at',
  SCHEMA_VERSION: 'schema_version',
} as const;

export const SyncSessionsColumns = {
  ID: 'id',
  PEER_DEVICE_ID: 'peer_device_id',
  PEER_DEVICE_NAME: 'peer_device_name',
  STARTED_AT: 'started_at',
  FINISHED_AT: 'finished_at',
  STATUS: 'status',
  RECORDS_SENT: 'records_sent',
  RECORDS_RECEIVED: 'records_received',
  CONFLICTS_RESOLVED: 'conflicts_resolved',
} as const;

export const SyncChangesColumns = {
  ID: 'id',
  TABLA: 'tabla',
  REGISTRO_ID: 'registro_id',
  OPERACION: 'operacion',
  PAYLOAD: 'payload',
  LAMPORT_CLOCK: 'lamport_clock',
  DEVICE_ID: 'device_id',
  CREATED_AT: 'created_at',
} as const;

export const ReportesGeneradosColumns = {
  ID: 'id',
  ORGANIZACION_ID: 'organizacion_id',
  TIPO: 'tipo',
  FILE_URI: 'file_uri',
  GENERADO_AT: 'generado_at',
  GENERADO_POR_USUARIO_ID: 'generado_por_usuario_id',
} as const;

export const BienEstado = {
  EXCELENTE: 'excelente',
  BUENO: 'bueno',
  REGULAR: 'regular',
  MALO: 'malo',
} as const;

export type BienEstadoValue = (typeof BienEstado)[keyof typeof BienEstado];

export const SyncSessionStatus = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PARTIAL: 'partial',
} as const;

export const SyncOperacion = {
  INSERT: 'insert',
  UPDATE: 'update',
  DELETE: 'delete',
} as const;

export const UserRoleCodigo = {
  SUPER_ADMIN: 'super_admin',
  OBISPO: 'obispo',
  PARROCO: 'parroco',
  ENCARGADO_CAPILLA: 'encargado_capilla',
} as const;

export type UserRoleCodigoValue = (typeof UserRoleCodigo)[keyof typeof UserRoleCodigo];

export const ModuloCodigo = {
  CONFIGURACION: 'configuracion',
  USUARIOS: 'usuarios',
  ORGANIZACIONES: 'organizaciones',
  INVENTARIO_BIENES: 'inventario_bienes',
  OFRENDAS: 'ofrendas',
  SYNC: 'sync',
  REPORTES: 'reportes',
} as const;

export type ModuloCodigoValue = (typeof ModuloCodigo)[keyof typeof ModuloCodigo];

export const SeedIds = {
  ROLES: {
    SUPER_ADMIN: 'seed-role-super-admin',
    OBISPO: 'seed-role-obispo',
    PARROCO: 'seed-role-parroco',
    ENCARGADO: 'seed-role-encargado',
  },
  NIVELES: {
    CAPILLA: 'seed-nivel-capilla',
    PARROQUIA: 'seed-nivel-parroquia',
    DIOCESIS: 'seed-nivel-diocesis',
  },
} as const;

export const Indexes = {
  ORGANIZACIONES_PARENT_ID: 'idx_organizaciones_parent_id',
  ORGANIZACIONES_NIVEL_ID: 'idx_organizaciones_nivel_id',
  ORGANIZACIONES_PARENT_ACTIVO: 'idx_organizaciones_parent_activo',
  UBICACIONES_ORGANIZACION_ID: 'idx_ubicaciones_organizacion_id',
  USUARIOS_ORGANIZACION_ID: 'idx_usuarios_organizacion_id',
  USUARIOS_ROLE_ID: 'idx_usuarios_role_id',
  USUARIOS_USERNAME: 'idx_usuarios_username',
  BIENES_ORGANIZACION_ID: 'idx_bienes_organizacion_id',
  BIENES_ORGANIZACION_ESTADO: 'idx_bienes_organizacion_estado',
  BIENES_CATEGORIA_ID: 'idx_bienes_categoria_id',
  BIENES_UPDATED_AT: 'idx_bienes_updated_at',
  OFRENDAS_ORGANIZACION_FECHA: 'idx_ofrendas_organizacion_fecha',
  OFRENDAS_TIPO_ACTIVIDAD_ID: 'idx_ofrendas_tipo_actividad_id',
  OFRENDAS_FECHA: 'idx_ofrendas_fecha',
  SYNC_CHANGES_LAMPORT_CLOCK: 'idx_sync_changes_lamport_clock',
  SYNC_CHANGES_TABLA_REGISTRO: 'idx_sync_changes_tabla_registro',
  SYNC_CHANGES_CREATED_AT: 'idx_sync_changes_created_at',
  SYNC_SESSIONS_STARTED_AT: 'idx_sync_sessions_started_at',
  REPORTES_ORGANIZACION_ID: 'idx_reportes_organizacion_id',
  REPORTES_GENERADO_AT: 'idx_reportes_generado_at',
} as const;
