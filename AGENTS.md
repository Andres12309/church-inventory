# Fieles Bienes — Arquitectura y Base de Datos

> **Expo SDK 56** — Consultar docs versionadas antes de escribir código:  
> https://docs.expo.dev/versions/v56.0.0/

App offline-first para inventario eclesiástico jerárquico (Capilla → Parroquia → Diócesis/Catedral por defecto, niveles configurables). Almacenamiento 100% local en SQLite. Sincronización P2P entre dispositivos cercanos. Exportación de reportes Excel.

### Jerarquía v1 (fuente única de verdad — editable vía OTA)

Toda la parametrización de roles, permisos, niveles creables, organizaciones demo y usuarios de prueba vive en **`src/shared/config/hierarchy.ts`**. Cambios en ese archivo se despliegan con **EAS Update** sin recompilar nativo.

**Modelo jerárquico:**
```
Catedral (diocesis) ──► N parroquias ──► N capillas
```

| Nivel | Operativo (inventario/finanzas) | Consolida |
|-------|----------------------------------|-----------|
| Capilla | ✅ Sí — bienes y ofrendas directos | — |
| Parroquia | ❌ No directo | Suma de sus capillas |
| Catedral | ❌ No directo | Suma de parroquias + capillas |

**Usuarios y roles** (varios usuarios pueden compartir la misma organización; la validación es por `organizacion_id` + rol):

| Rol | Org asignada | Puede crear orgs | PIN demo |
|-----|--------------|------------------|----------|
| Admin Sistema | Catedral | Catedral, Parroquia, Capilla | `1868` (`AndDev`) |
| Obispo | Catedral | Parroquia, Capilla | `1111` (demo comentado) |
| Párroco | Parroquia | Capilla | `2222` (demo comentado) |
| Encargado | Capilla | — (solo opera inventario/finanzas) | `3333` (demo comentado) |

**Permisos:** acceso por **módulo completo** (`role_modulos`), no por acciones CRUD. Matriz en `hierarchy.ts` → `permisos[]`.

**Políticas de alcance:** `src/shared/config/hierarchyAccess.ts` (`creaOrganizacionNiveles`, `resolverAlcanceJerarquico`, etc.).

**Seed idempotente:** `src/features/auth/infrastructure/ensureHierarchySeed.ts`.

**Sincronización OTA (`hierarchy.ts` → SQLite):**

| Acción en `hierarchy.ts` | Efecto tras OTA + login |
|--------------------------|-------------------------|
| Agregar entrada con id `seed-user-*` / `seed-org-*` | INSERT |
| Cambiar nombre, PIN, rol, org | UPSERT (actualiza) |
| Quitar entrada del array | Desactiva (`activo = 0`) |
| `activo: false` en la entrada | Desactiva sin quitar del array |

Solo afecta IDs con prefijo `seed-org-` y `seed-user-`. Usuarios creados en la app (UUID) no se modifican.

### Módulo Organizaciones — CRUD por nivel

| Ruta | Pantalla | Quién |
|------|----------|-------|
| `/organizaciones/catedral/nuevo` | `FormularioOrganizacionScreen` nivel=diocesis | Admin Sistema |
| `/organizaciones/parroquia/nuevo?parentId=` | idem parroquia | Admin, Obispo |
| `/organizaciones/capilla/nuevo?parentId=` | idem capilla | Admin, Obispo, Párroco |
| `/organizaciones/catedral/[id]` etc. | Edición | Según alcance en subárbol |

Casos de uso: `CrearCatedral`, `CrearParroquia`, `CrearCapilla` → `AdministrarOrganizacion.guardar`.

**Layouts Expo Router:** stacks de `organizaciones`, `bienes`, `ofrendas`, `usuarios` usan `headerShown: false`. Un solo header por pantalla: `SocialHeader` (no duplicar con Stack nativo).

### UI tipo red social

Kit centralizado en **`src/shared/presentation/ui/socialUi.tsx`** + **`premiumPalette.ts`**. Formularios CRUD: `SocialFormScreen`, `SocialFormField`, `SocialInput`, `SocialOptionPicker`, `SocialPrimaryButton`.

**Voz (dictado):** `SocialVoiceInput` + hook `useSpeechToText` (`src/shared/presentation/hooks/`). Usa `expo-speech-recognition` solo si el módulo nativo está enlazado (`requireOptionalNativeModule`); en **Expo Go** degrada sin crash (sin micrófono). Requiere **dev build** (`expo prebuild`) para dictado real.

### Autenticación, branding y bienvenida

| Pieza | Ubicación | Notas |
|-------|-----------|-------|
| Login PIN | `PinPad.tsx` | Teclado **3×4** (1–9, fila `C` · `0` · `⌫`), botones circulares centrados |
| Usernames recordados | `RememberedUsernamesStorage.ts` + `LoginUsernameField.tsx` | Hasta 8 usernames en SecureStore; modal con eliminar individual |
| Scroll login | `SocialScreen scroll="auto"` | Sin scroll si cabe en pantalla; scroll solo si el contenido excede altura |
| Icono / splash | `appBranding.ts` + `AppLogo.tsx` | Misma imagen `assets/images/icon.png`; splash nativo `#208AEF` |
| Splash animado | `animated-icon.tsx` → `AnimatedSplashOverlay` | Overlay en `app/_layout.tsx` al arrancar (~600 ms) |
| Bienvenida sesión | `WelcomeBackScreen.tsx` | Solo al **restaurar sesión** (`welcomePending` en `authStore`); no tras login manual |
| Frases motivadoras | `welcomeContent.ts` | Pool de **57** frases (fe católica + motivación personal); **una aleatoria fija** por visita |
| Duración bienvenida | `WELCOME_MIN_DURATION_MS` | Constante en `welcomeContent.ts` (ajustable) |

**Flujo de arranque con sesión guardada:** splash animado → `AuthHydrator` (hidratación) → `WelcomeBackScreen` (saludo + frase + barra indeterminada) → tabs protegidos.

**Flujo login manual:** splash → login (usuario + PIN) → tabs **sin** pantalla de bienvenida (`welcomePending: false`).

**Admin seed actual:** `AndDev` / PIN `1868` en `hierarchy.ts` (no hardcodear en UI).

### Asistente Fieles (guía conversacional offline)

Feature **`src/features/asistente/`** — motor rule-based en español (`AgentIntentEngine.ts`), sin LLM. Responde según rol/permisos con chips navegables.

| Ruta | Pantalla |
|------|----------|
| `/(protected)/asistente` | Chat texto + voz (si nativo disponible) |

**Acceso:** FAB 🤖 en tabs distintos de Inicio; en **Inicio** el FAB ⚡ se despliega hacia arriba (Asistente + Acciones rápidas, auto-colapsa ~5 s o tap fuera). Modal de acciones rápidas con `ScrollView`. Overlay global: `TabFabOverlay` en `(tabs)/_layout.tsx`.

**Teclado (chat):** `react-native-keyboard-controller` con `KeyboardProvider` en `app/_layout.tsx`. Pantalla asistente: `KeyboardChatScrollView` (mensajes) + `KeyboardStickyView` (composer). Ver [Expo keyboard handling](https://docs.expo.dev/guides/keyboard-handling/).

---

## 1. Estructura del proyecto (Screaming Architecture + Clean Architecture)

La estructura **grita el negocio** organizándose por **features** (dominios de negocio). Dentro de cada feature se aplica Clean Architecture con capas internas.

```
src/
  app/                                    # Solo Expo Router (layouts, providers, rutas)
  features/
    organizaciones/                       # Jerarquía Capilla → Parroquia → Diócesis
      domain/          # Organizacion, Ubicacion, IOrganizacionRepository
      application/     # CrearOrganizacion, ObtenerSubarbol, ConsolidarTotales
      infrastructure/  # SqliteOrganizacionRepository
      presentation/    # screens/, hooks/, store/
    bienes/                               # Inventario físico (arte sacro, mobiliario...)
      domain/ application/ infrastructure/ presentation/
    ofrendas/                             # Recaudaciones por tipo de actividad
      domain/ application/ infrastructure/ presentation/
    auth/                                 # Usuarios, roles, PIN, bienvenida
      domain/ application/ infrastructure/
      presentation/
        screens/       # LoginScreen, WelcomeBackScreen
        components/    # PinPad, LoginUsernameField, AuthHydrator
        utils/         # welcomeContent.ts (frases motivadoras)
    sync/                                 # P2P: discovery, handshake, merge
      domain/ application/ infrastructure/ presentation/
    reportes/                             # Exportación XLSX
      domain/ application/ infrastructure/ presentation/
    configuracion/                        # Niveles, módulos, roles (SuperAdmin)
      domain/ application/ infrastructure/ presentation/
    asistente/                            # Guía conversacional offline (texto + voz)
      domain/ application/ infrastructure/ presentation/
  shared/
    infrastructure/
      database/        # SQLiteProvider, migraciones, schema.ts (único punto BD)
      di/              # Contenedor de dependencias
    presentation/
      ui/              # Design system: socialUi, premiumPalette, AppLogo, DraggableFab
    constants/
      appBranding.ts   # icon.png, splash background, tamaños splash
```

**Reglas de dependencia:**

| Regla | Descripción |
|-------|-------------|
| Intra-feature | `presentation → application → domain ← infrastructure` |
| Inter-feature | Solo importar `domain` o barrels de `application` exportados; nunca infrastructure/presentation ajena |
| Prohibido | Carpetas genéricas `src/components`, `src/models`, `src/views` con lógica de negocio |
| `src/app/` | Solo composición de rutas; delegar a `features/*/presentation` |

**Ejemplo de ruta Expo Router → feature:**

```
src/app/(auth)/login.tsx          → re-exporta features/auth/presentation/screens/LoginScreen
src/app/(bienes)/index.tsx        → features/bienes/presentation/screens/BienesListScreen
```

---

## 2. Modelo Entidad-Relación (SQL conceptual)

### 2.1 Diagrama lógico

```
organizacion_niveles (configurable: Capilla, Parroquia, Diócesis...)
        │
        ▼
organizaciones (árbol jerárquico, self-FK parent_id)
        │
        ├── ubicaciones (1:1 o 1:N por organización)
        ├── usuarios (N:1 organización asignada)
        ├── bienes (inventario físico)
        └── ofrendas (recaudaciones)
                │
                └── actividades (catálogo: Misas, Matrimonios, Eventos...)

roles ←→ modulos (N:M via role_modulos, acceso por módulo completo)
usuarios → roles

sync_meta, sync_sessions, sync_changes (P2P)
reportes_generados (historial exportaciones)
```

### 2.2 Tablas

#### `organizacion_niveles` — Niveles jerárquicos parametrizables

| Columna | Tipo | Notas |
|---------|------|-------|
| id | TEXT PK | UUID v4 |
| codigo | TEXT UNIQUE | `capilla`, `parroquia`, `diocesis` |
| nombre | TEXT | Etiqueta UI: "Capilla" |
| nivel_orden | INTEGER | 1 = más bajo (hoja), mayor = superior |
| es_hoja | INTEGER | 1 si puede tener bienes/ofrendas directamente |
| activo | INTEGER | Soft delete |
| created_at | TEXT ISO8601 | |
| updated_at | TEXT ISO8601 | |

**Seed v1:** `(capilla,1)`, `(parroquia,2)`, `(diocesis,3)`.

#### `organizaciones` — Nodos del árbol

| Columna | Tipo | Notas |
|---------|------|-------|
| id | TEXT PK | UUID |
| nivel_id | TEXT FK → organizacion_niveles | |
| parent_id | TEXT FK → organizaciones NULL | NULL = raíz (Diócesis) |
| nombre | TEXT | |
| codigo_interno | TEXT | Código parroquial/diocesano |
| descripcion | TEXT NULL | |
| activo | INTEGER | |
| sync_vector | TEXT | JSON: `{ "device_id": lamport_counter }` |
| updated_at | TEXT | |
| updated_by_device | TEXT | |
| deleted_at | TEXT NULL | Tombstone para sync |

Índices: `(parent_id)`, `(nivel_id)`, `(parent_id, activo)`.

#### `ubicaciones` — Dirección y geolocalización

| Columna | Tipo | Notas |
|---------|------|-------|
| id | TEXT PK | |
| organizacion_id | TEXT FK UNIQUE | Una ubicación principal por org en v1 |
| direccion | TEXT | |
| ciudad | TEXT NULL | |
| provincia | TEXT NULL | |
| pais | TEXT DEFAULT 'EC' | |
| latitud | REAL NULL | |
| longitud | REAL NULL | |
| updated_at | TEXT | |

Índice: `(organizacion_id)`.

#### `modulos` — Pantallas/módulos de la app (parametrizable OTA)

| Columna | Tipo | Notas |
|---------|------|-------|
| id | TEXT PK | |
| codigo | TEXT UNIQUE | `inventario_bienes`, `ofrendas`, `organizaciones`, `usuarios`, `sync`, `reportes`, `configuracion` |
| nombre | TEXT | |
| ruta | TEXT | Ruta Expo Router: `/inventario/bienes` |
| orden | INTEGER | Orden en menú |
| activo | INTEGER | |

#### `roles`

| Columna | Tipo | Notas |
|---------|------|-------|
| id | TEXT PK | |
| codigo | TEXT UNIQUE | `super_admin`, `obispo`, `parroco`, `encargado_capilla` |
| nombre | TEXT | |
| nivel_minimo_orden | INTEGER NULL | Restricción: Parroco ≥ parroquia, Encargado = capilla |
| activo | INTEGER | |

#### `role_modulos` — Acceso por módulo completo (sin CRUD granular)

| Columna | Tipo | Notas |
|---------|------|-------|
| role_id | TEXT FK | |
| modulo_id | TEXT FK | |
| PRIMARY KEY (role_id, modulo_id) | | |

**Seed v1:**

| Rol | Módulos |
|-----|---------|
| SuperAdmin | Todos |
| Parroco | inventario_bienes, ofrendas, organizaciones (solo descendientes), sync, reportes |
| EncargadoCapilla | inventario_bienes, ofrendas, sync (solo su capilla) |

#### `usuarios`

| Columna | Tipo | Notas |
|---------|------|-------|
| id | TEXT PK | |
| organizacion_id | TEXT FK | Alcance del usuario |
| role_id | TEXT FK | |
| nombre | TEXT | |
| email | TEXT NULL | |
| pin_hash | TEXT | SHA-256 + salt (expo-crypto); auth local v1 |
| activo | INTEGER | |
| ultimo_acceso | TEXT NULL | |
| updated_at | TEXT | |

Índices: `(organizacion_id)`, `(role_id)`.

#### `categorias_bien` — Catálogo parametrizable

| Columna | Tipo | Notas |
|---------|------|-------|
| id | TEXT PK | |
| codigo | TEXT | `arte_sacro`, `mobiliario`, `equipos` |
| nombre | TEXT | |
| activo | INTEGER | |

#### `bienes`

| Columna | Tipo | Notas |
|---------|------|-------|
| id | TEXT PK | |
| organizacion_id | TEXT FK | Siempre nodo hoja (capilla) |
| categoria_id | TEXT FK | |
| nombre | TEXT | |
| descripcion | TEXT NULL | |
| estado | TEXT | `excelente`, `bueno`, `regular`, `malo` |
| cantidad | INTEGER DEFAULT 1 | |
| valor_estimado | REAL NULL | Opcional |
| foto_uri | TEXT NULL | Ruta local `expo-file-system`; **no se sincroniza el binario en v1** (ver §4.6) |
| observaciones | TEXT NULL | |
| sync_vector | TEXT | JSON |
| updated_at | TEXT | |
| updated_by_device | TEXT | |
| deleted_at | TEXT NULL | |

Índices: `(organizacion_id)`, `(organizacion_id, estado)`, `(categoria_id)`, `(updated_at)`.

#### `tipos_actividad` — Catálogo de ofrendas

| Columna | Tipo | Notas |
|---------|------|-------|
| id | TEXT PK | |
| codigo | TEXT | `misas_dominicales`, `matrimonios`, `eventos_especiales`, `colectas_solidarias`, `bingos_kermeses` |
| nombre | TEXT | |
| activo | INTEGER | |

#### `ofrendas`

| Columna | Tipo | Notas |
|---------|------|-------|
| id | TEXT PK | |
| organizacion_id | TEXT FK | Nodo hoja |
| tipo_actividad_id | TEXT FK | |
| monto | REAL | Moneda local |
| fecha | TEXT | DATE ISO |
| descripcion | TEXT NULL | |
| sync_vector | TEXT | |
| updated_at | TEXT | |
| updated_by_device | TEXT | |
| deleted_at | TEXT NULL | |

Índices: `(organizacion_id, fecha)`, `(tipo_actividad_id)`, `(fecha)`.

#### `inventario_aggregates` — Cache materializada (opcional, aceleración)

| Columna | Tipo | Notas |
|---------|------|-------|
| organizacion_id | TEXT PK FK | |
| total_bienes | INTEGER | Suma cantidad bienes subárbol |
| total_bienes_por_estado | TEXT | JSON `{ "excelente": N, ... }` |
| total_ofrendas | REAL | Suma montos subárbol |
| total_ofrendas_por_tipo | TEXT | JSON |
| calculado_at | TEXT | |

Se recalcula en background task o post-sync.

#### `sync_meta` — Estado global del dispositivo

| Columna | Tipo | Notas |
|---------|------|-------|
| device_id | TEXT PK | UUID persistido en SecureStore |
| device_name | TEXT | |
| last_sync_at | TEXT NULL | |
| schema_version | INTEGER | Versión migración BD |

#### `sync_sessions`

| Columna | Tipo | Notas |
|---------|------|-------|
| id | TEXT PK | |
| peer_device_id | TEXT | |
| peer_device_name | TEXT | |
| started_at | TEXT | |
| finished_at | TEXT NULL | |
| status | TEXT | `pending`, `completed`, `failed`, `partial` |
| records_sent | INTEGER | |
| records_received | INTEGER | |
| conflicts_resolved | INTEGER | |

#### `sync_changes` — Log de cambios para delta sync

| Columna | Tipo | Notas |
|---------|------|-------|
| id | TEXT PK | |
| tabla | TEXT | |
| registro_id | TEXT | |
| operacion | TEXT | `insert`, `update`, `delete` |
| payload | TEXT | JSON snapshot del registro |
| lamport_clock | INTEGER | Reloj lógico del dispositivo |
| device_id | TEXT | |
| created_at | TEXT | |

Índice: `(lamport_clock)`, `(tabla, registro_id)`.

#### `reportes_generados`

| Columna | Tipo | Notas |
|---------|------|-------|
| id | TEXT PK | |
| organizacion_id | TEXT FK | Alcance del reporte |
| tipo | TEXT | `bienes`, `ofrendas`, `consolidado` |
| file_uri | TEXT | |
| generado_at | TEXT | |
| generado_por_usuario_id | TEXT FK | |

---

## 3. Estrategia de centralización (consolidación jerárquica)

### 3.1 Modelo matemático

Sea \( T = (V, E) \) el árbol de organizaciones donde \( V \) = nodos y \( E \) = relaciones padre-hijo.

Para cada nodo \( o \in V \):

\[
\text{Descendants}(o) = \{ o \} \cup \bigcup_{c \in \text{children}(o)} \text{Descendants}(c)
\]

**Totales de bienes** (por estado \( e \)):

\[
\text{CountBienes}(o, e) = \sum_{d \in \text{Descendants}(o)} \sum_{b \in \text{Bienes}(d), b.estado = e} b.cantidad
\]

**Totales de ofrendas** (por tipo \( t \), rango fechas \( [f_1, f_2] \)):

\[
\text{SumOfrendas}(o, t, f_1, f_2) = \sum_{d \in \text{Descendants}(o)} \sum_{r \in \text{Ofrendas}(d), r.tipo = t, r.fecha \in [f_1,f_2]} r.monto
\]

### 3.2 Implementación en SQLite (tiempo de ejecución)

Consulta recursiva CTE para bienes:

```sql
WITH RECURSIVE subtree AS (
  SELECT id FROM organizaciones WHERE id = ?
  UNION ALL
  SELECT o.id FROM organizaciones o
  INNER JOIN subtree s ON o.parent_id = s.id
  WHERE o.deleted_at IS NULL
)
SELECT b.estado, SUM(b.cantidad) AS total
FROM bienes b
INNER JOIN subtree s ON b.organizacion_id = s.id
WHERE b.deleted_at IS NULL
GROUP BY b.estado;
```

Análogo para ofrendas con filtro de fechas.

### 3.3 Materialización (background)

`ConsolidationService` ejecutado via `expo-task-manager`:

1. Recorrer nodos en post-order (hijos antes que padres).
2. Para cada nodo, calcular agregados desde hijos directos + datos propios (si `es_hoja`).
3. UPSERT en `inventario_aggregates`.
4. Disparar tras: sync completado, CRUD masivo, o cada 6h (`expo-background-fetch`).

**Cuándo usar cada modo:**
- UI detalle / reporte puntual → CTE en vivo (siempre consistente).
- Dashboard / listado de parroquias → leer `inventario_aggregates` (rápido).

---

## 4. Estrategia de sincronización P2P offline

### 4.1 Transporte (v1)

Requiere **development build** (`expo-dev-client`), no Expo Go.

| Capa | Librería | Función |
|------|----------|---------|
| Discovery | `react-native-zeroconf` | mDNS: servicio `_fielesbienes._tcp` |
| Transporte | `react-native-tcp-socket` | JSON sobre TCP en LAN |
| Estado red | `expo-network` | Verificar Wi-Fi activo |
| Identidad | `expo-secure-store` + `expo-crypto` | `device_id` persistente |

Flujo alternativo Android: `react-native-wifi-p2p-sync` (Wi-Fi Direct, solo Android).

### 4.2 Identificación de discrepancias

Cada registro mutable lleva:
- `updated_at` (ISO8601 UTC)
- `updated_by_device` (UUID)
- `sync_vector` (JSON: reloj Lamport por dispositivo conocido)
- `deleted_at` (tombstone)

**Vector clock simplificado (Lamport):**
- Cada dispositivo mantiene contador local `L`.
- En escritura local: `L = L + 1`, guardar en `sync_changes`.
- Al recibir evento remoto con `L_remote`: `L = max(L, L_remote) + 1`.

**Hash de estado por organización** (optimización):
```
org_checksum = SHA256(concat(record_id + updated_at + operacion) ORDER BY record_id)
```
Intercambiar checksums antes de transferir deltas completos.

### 4.3 Protocolo de sesión sync

```
┌──────────┐                              ┌──────────┐
│ Device A │                              │ Device B │
└────┬─────┘                              └────┬─────┘
     │  1. mDNS broadcast (_fielesbienes._tcp)   │
     │◄─────────────────────────────────────────►│
     │  2. HANDSHAKE { device_id, schema_version,│
     │              org_scope, last_lamport }      │
     │◄─────────────────────────────────────────►│
     │  3. CHECKSUMS { org_id: hash }            │
     │◄─────────────────────────────────────────►│
     │  4. DELTA { sync_changes[] since lamport }  │
     │◄─────────────────────────────────────────►│
     │  5. MERGE + ACK { applied, conflicts }      │
     │◄─────────────────────────────────────────►│
     │  6. RECALCULATE aggregates (background)     │
```

### 4.4 Reglas de merge

| Escenario | Resolución |
|-----------|------------|
| Insert vs Insert (mismo PK) | Imposible (UUID); si ocurre → renombrar perdedor, log conflicto |
| Update vs Update | **LWW** por `(lamport_clock, updated_at, device_id)` lexicográfico |
| Update vs Delete | Delete gana si `deleted_at` > `updated_at` del update |
| Delete vs Delete | Idempotente, OK |
| Cambio en org fuera de scope del rol | Rechazar en validación post-merge |

Todo merge dentro de `db.withTransactionAsync()`. Registrar en `sync_sessions`.

### 4.5 Seguridad local v1

- Solo peers con mismo `schema_version` y `org_scope` compatible (subárbol compartido).
- PIN de sesión opcional (4 dígitos) intercambiado en HANDSHAKE para entornos parroquiales.
- No hay servidor; confianza = proximidad física + PIN.

### 4.6 Multimedia V1 — Fotos locales (sin sync de binarios)

En v1 las fotografías de bienes **permanecen en el dispositivo que las capturó**:

1. Al guardar un bien, `foto_uri` apunta a un archivo en el directorio de documentos del dispositivo (`expo-file-system`).
2. El serializador P2P (`features/sync/infrastructure/PayloadSerializer.ts`) **excluye** el contenido binario y puede enviar solo metadatos opcionales: `{ "foto_disponible_local": true, "foto_uri": null }`.
3. El registro del bien (nombre, estado, cantidad, etc.) sí se sincroniza con LWW.
4. En dispositivos receptores, la UI muestra placeholder si `foto_uri` es null o el archivo no existe localmente.
5. Futuro (v2+): sync de fotos vía chunking o servidor; requerirá dependencia nativa nueva y nueva migración.

**Rationale:** optimizar ancho de banda del socket TCP en LAN y evitar recompilaciones nativas en v1.

---

## 5. Roles y permisos (matriz v1)

Acceso por **módulo completo**. Validación en capa `application` (`PermissionService`).

| Módulo | SuperAdmin | Obispo | Parroco | EncargadoCapilla |
|--------|:----------:|:------:|:-------:|:----------------:|
| configuracion | ✅ | ❌ | ❌ | ❌ |
| usuarios | ✅ | ✅ (subárbol catedral) | ✅ (parroquia + capillas) | ❌ |
| organizaciones | ✅ | ✅ (parroquias y capillas) | ✅ (capillas hijas) | 👁️ (su capilla) |
| inventario_bienes | ✅ | ✅ (subárbol) | ✅ (subárbol) | ✅ (su capilla) |
| ofrendas | ✅ | ✅ (subárbol) | ✅ (subárbol) | ✅ (su capilla) |
| sync | ✅ | ✅ | ✅ | ✅ |
| reportes | ✅ | ✅ | ✅ | ✅ |

**Alcance de datos (`organizacion_id`):** ver `hierarchyAccess.ts` — `full` (sistema), `subtree` (obispo/párroco), `single` (encargado).

**Parametrización OTA:** modificar filas en `roles`, `modulos`, `role_modulos` vía migración seed o payload de configuración remota futura. En v1, cambios via migraciones SQLite incluidas en update OTA.

---

## 6. Background tasks

| Task | Trigger | Acción |
|------|---------|--------|
| `CONSOLIDATION_TASK` | post-sync, CRUD masivo, background-fetch 6h | Recalcular `inventario_aggregates` |
| `SYNC_DISCOVERY_TASK` | pantalla sync abierta (foreground v1) | Mantener discovery mDNS activo |
| `PURGE_SYNC_CHANGES_TASK` | background-fetch diario | Eliminar `sync_changes` con `created_at` > **60 días** |
| `EXPORT_CLEANUP_TASK` | background-fetch semanal | Eliminar `.xlsx` temporales > **30 días** y filas huérfanas en `reportes_generados` |

Registrar con `expo-task-manager.defineTask` en `shared/infrastructure/background/`.

### 6.1 Estrategia de purga (`PURGE_SYNC_CHANGES_TASK`)

```sql
-- sync_changes: retener 60 días para delta sync y auditoría reciente
DELETE FROM sync_changes
WHERE created_at < datetime('now', '-60 days');

-- sync_sessions: retener 90 días (historial más largo, menos filas)
DELETE FROM sync_sessions
WHERE started_at < datetime('now', '-90 days');
```

### 6.2 Estrategia de purga (`EXPORT_CLEANUP_TASK`)

1. Consultar `reportes_generados` con `generado_at` > 30 días.
2. Eliminar archivo físico vía `expo-file-system` si existe.
3. DELETE fila en `reportes_generados`.
4. Limpiar directorio `FileSystem.documentDirectory + 'reportes/'` de archivos huérfanos.

---

## 7. Exportación Excel

- Librería: `xlsx` (SheetJS, pure JS, sin nativo extra).
- Flujo: Query consolidado → workbook en memoria → escribir con `expo-file-system` → compartir con `expo-sharing`.
- Hojas: `Resumen`, `Bienes`, `Ofrendas`, `Metadatos` (fecha, org, usuario).

---

## 8. Comando de instalación definitivo (SDK 56)

Ejecutar **una sola vez** para blindar el binario nativo antes de OTA:

```bash
# Expo — versiones alineadas automáticamente a SDK 56
npx expo install expo-sqlite expo-task-manager expo-background-fetch expo-network expo-sharing expo-file-system expo-crypto expo-secure-store expo-dev-client expo-location expo-device expo-speech-recognition expo-build-properties react-native-keyboard-controller

# npm — JS puro + módulos nativos (requieren prebuild)
npm install zustand date-fns xlsx @shopify/flash-list react-native-tcp-socket react-native-zeroconf uuid react-native-get-random-values

# Tipos
npm install -D @types/uuid

# Compilar binario nativo (obligatorio; Expo Go NO soporta P2P)
npx expo prebuild
npx expo run:android
# npx expo run:ios
```

> **OTA:** Tras este prebuild, las actualizaciones JS vía EAS Update no requieren recompilar salvo que se agreguen dependencias nativas nuevas.

---

## 9. Bootstrapping nativo (día uno)

### 9.1 Polyfill UUID (obligatorio)

Primera línea de `src/app/_layout.tsx`:

```typescript
import 'react-native-get-random-values';
```

Sin esto, `uuid` crashea en React Native por ausencia de `crypto.getRandomValues`.

### 9.2 `app.json` — permisos mDNS/P2P

Ya configurado en el proyecto. Referencia:

**Android** — permisos explícitos:

```json
"android": {
  "permissions": [
    "INTERNET",
    "ACCESS_NETWORK_STATE",
    "ACCESS_WIFI_STATE",
    "CHANGE_WIFI_MULTICAST_STATE"
  ]
}
```

**iOS** — red local y Bonjour:

```json
"ios": {
  "infoPlist": {
    "NSLocalNetworkUsageDescription": "Necesario para sincronizar inventario con dispositivos cercanos en la red local.",
    "NSBonjourServices": ["_fielesbienes._tcp"]
  }
}
```

**Plugins Expo** (incluye voz y cleartext Android para sync):

```json
"plugins": [
  "expo-router",
  "expo-sqlite",
  "expo-secure-store",
  "expo-dev-client",
  "expo-speech-recognition",
  ["expo-build-properties", { "android": { "usesCleartextTraffic": true } }],
  ["expo-location", { "locationWhenInUsePermission": "Permite registrar la ubicación de capillas y parroquias." }]
]
```

**Reconocimiento de voz:** iOS `deploymentTarget` ≥ 16.4. Permiso `RECORD_AUDIO` en Android. Código: cargar `useSpeechToTextNative` solo si `requireOptionalNativeModule('ExpoSpeechRecognition')` no es null.

---

## 10. Convenciones de migración

- Archivo: `shared/infrastructure/database/migrations/NNN_descripcion.sql`
- Tabla control: `schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT)`
- Nunca DROP columnas en v1; usar columnas nuevas + deprecación.
- Seeds idempotentes: `INSERT OR IGNORE`.

---

## 11. Checklist para implementación autónoma

1. [ ] Polyfill `react-native-get-random-values` en `src/app/_layout.tsx`
2. [ ] `app.json` con permisos mDNS Android/iOS y plugins nativos
3. [ ] Estructura `src/features/*` + `src/shared/` según §1
4. [ ] `SQLiteProvider` en `shared/infrastructure/database/` + migración `001_initial.sql`
5. [ ] Seeds: niveles, roles, módulos, role_modulos, tipos_actividad, categorias_bien
6. [ ] Repositorios SQLite por feature en `features/*/infrastructure/`
7. [ ] `PermissionService` en `features/auth/application/`
8. [ ] `ConsolidationService` con CTE recursivo + `inventario_aggregates`
9. [ ] UI auth: PinPad, login scroll auto, usernames recordados, WelcomeBackScreen
10. [ ] FlashList en listados de bienes/ofrendas
11. [ ] Sync P2P: discovery → handshake → checksums → deltas → merge LWW
12. [ ] PayloadSerializer excluye binarios de fotos (§4.6)
13. [ ] Export XLSX + sharing
14. [ ] Background tasks: consolidación, purga 60d, cleanup reportes 30d
15. [ ] Asistente Fieles + keyboard-controller en chat
