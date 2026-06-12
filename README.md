<div align="center">

# ⛪ Fieles Bienes

**Inventario y finanzas eclesiásticas — offline-first**

![Expo SDK 56](https://img.shields.io/badge/Expo-SDK%2056-208AEF?style=for-the-badge&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-0.85-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![SQLite](https://img.shields.io/badge/SQLite-local-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![P2P Sync](https://img.shields.io/badge/Sync-P2P%20LAN-10B981?style=for-the-badge)

Aplicación móvil para gestionar **bienes patrimoniales**, **ofrendas**, **jerarquía parroquial** y **usuarios con roles** — sin depender de la nube. Datos en **SQLite**, sincronización entre dispositivos cercanos por **Wi‑Fi local**.

[Documentación técnica](./AGENTS.md) · [Expo SDK 56](https://docs.expo.dev/versions/v56.0.0/)

</div>

---

## ✨ Lo esencial

| | |
|---|---|
| 📴 **100 % offline** | Opera sin internet; la BD vive en el dispositivo |
| 🏛️ **Jerarquía real** | Catedral → Parroquia → Capilla (configurable vía OTA) |
| 🔐 **PIN local** | Usuario + PIN de 4 dígitos; sesión en SecureStore |
| 🤝 **Sync P2P** | mDNS + TCP en LAN; sin servidor central |
| 📊 **Excel** | Exportar e importar reportes `.xlsx` |
| 🤖 **Asistente** | Guía conversacional offline (texto + voz en dev build) |
| 🔄 **OTA** | Jerarquía (`hierarchy.ts`) y tipos de ofrenda (`tiposActividad.ts`) vía EAS Update |

---

## 🚀 Experiencia de usuario

### 🔑 Autenticación

- Teclado **PIN circular 3×4** (`C` · `0` · borrar)
- **Recordarme** + lista de usernames guardados (eliminar individual)
- Login **sin scroll** si cabe en pantalla (`scroll="auto"`)
- Icono oficial de la app en login y splash animado (`#208AEF`)

### 👋 Bienvenida (sesión restaurada)

Al reabrir la app con sesión activa:

1. Splash con icono animado  
2. Pantalla de bienvenida personalizada (nombre, rol, saludo según hora)  
3. **Una frase motivadora aleatoria** (57 frases: fe católica + motivación personal)  
4. Barra de carga **indeterminada** → dashboard  

> Tras login manual con PIN **no** se muestra la bienvenida extendida.

### 🧭 Navegación (tabs)

| Tab | Icono | Contenido |
|-----|-------|-----------|
| **Inicio** | 🏠 | Dashboard, métricas y acciones rápidas |
| **Inventario** | 📦 | CRUD de bienes por capilla |
| **Finanzas** | 💰 | Ofrendas por tipo de actividad |
| **Reportes** | 📈 | Export / import Excel |
| **Ajustes** | ⚙️ | Perfil, sync P2P, configuración, logout |

**FAB flotante:** 🤖 Asistente Fieles · ⚡ Acciones rápidas (desde Inicio)

---

## 🏗️ Jerarquía organizacional

```
🏰 Diócesis / Catedral (raíz)
   └── ⛪ Parroquia
         └── 🕯️ Capilla (nivel operativo)
```

| Nivel | Inventario & ofrendas | Consolidación |
|-------|:---------------------:|:-------------:|
| 🕯️ Capilla | ✅ CRUD directo | — |
| ⛪ Parroquia | ❌ No directo | ∑ capillas hijas |
| 🏰 Diócesis | ❌ No directo | ∑ subárbol completo |

- Varios usuarios pueden compartir la misma organización
- Totales consolidados en background (`inventario_aggregates`)

---

## 👥 Roles y permisos

Acceso por **módulo completo** — matriz en `src/shared/config/hierarchy.ts`:

| Módulo | Descripción |
|--------|-------------|
| ⚙️ `configuracion` | Ajustes de sistema |
| 👤 `usuarios` | Registro local username + PIN |
| 🏛️ `organizaciones` | Árbol eclesiástico |
| 📦 `inventario_bienes` | Bienes físicos |
| 💰 `ofrendas` | Recaudaciones |
| 🔄 `sync` | Sincronización P2P |
| 📊 `reportes` | Excel import/export |

Roles: `super_admin` · `obispo` · `parroco` · `encargado_capilla`  
Alcance: `hierarchyAccess.ts` (`full` · `subtree` · `single`)

---

## 📦 Inventario de bienes

- 🎨 Arte sacro · 🪑 Mobiliario · 🔌 Equipos
- Estado, cantidad, valor estimado, foto local, observaciones
- Solo en organizaciones **hoja** (capillas)
- Soft delete + tombstones para sync

---

## 💰 Finanzas (ofrendas)

Dashboard compacto pensado para pantallas pequeñas: la lista de movimientos ocupa el espacio principal; filtros y resumen van en modales.

| Función | Detalle |
|---------|---------|
| 📋 **Lista** | `FlashList` a pantalla completa con filtro por tipo (pills) |
| 🏷️ **Tipos de actividad** | Crear desde la app (modal **Tipos**) o en el formulario de ingreso |
| 📅 **Período** | Modal **Filtros y resumen** — fechas, org y desglose por tipo |
| 🔄 **Sync P2P** | Catálogo `tipos_actividad` sincronizable entre dispositivos |
| 📊 **Excel** | Hoja «Tipos actividad» en export/import; auto-crea tipos al importar |
| 🔄 **OTA** | Catálogo base en `src/shared/config/tiposActividad.ts` (ids `seed-tipo-*`) |

Tipos base incluidos: misas, matrimonios, eventos, colectas, bingos/kermeses (editables vía OTA). Monto, fecha y descripción por capilla; consolidación hacia parroquia y diócesis.

---

## 🔄 Sincronización P2P

> ⚠️ Requiere **development build** — no funciona en Expo Go ni web.

| Capa | Tecnología |
|------|------------|
| 🔍 Discovery | mDNS `_fielesbienes._tcp` |
| 📡 Transporte | TCP JSON puerto 49152 |
| ⚖️ Conflictos | Last-Write-Wins + Lamport |
| 📋 Tablas | `bienes`, `ofrendas`, `organizaciones`, `tipos_actividad` |

**Flujo:** handshake → checksums → delta bidireccional → merge → ACK

- PIN de sesión opcional · historial de sesiones · filtro del propio dispositivo
- Fotos: **metadatos sí**, binario **no** (v1)

---

## 📊 Reportes Excel

**Exportar:** consolidado · bienes · ofrendas · tipos de actividad · metadatos → `expo-sharing`  
**Importar:** vista previa · merge inteligente · validación de alcance · sincroniza catálogo de tipos

---

## 🤖 Asistente Fieles

Motor **rule-based** en español (sin LLM) en `src/features/asistente/`:

- 💬 Chat con chips navegables según rol
- 🎤 Dictado por voz (dev build + `expo-speech-recognition`)
- ⌨️ Teclado sticky con `react-native-keyboard-controller`

---

## 🎯 Primer acceso

1. `npm install` → `npx expo prebuild` → `npx expo run:android`
2. Abrir app → login
3. **Admin seed:** `AndDev` / PIN `1868` (`hierarchy.ts`)
4. Crear parroquias, capillas y usuarios desde la app

Config por defecto: **1 sede raíz** + **1 admin**. Usuarios demo comentados en seed.

**OTA (EAS Update):** editar `hierarchy.ts` y/o `tiposActividad.ts`, publicar update; al volver a entrar, `ensureAppSeeds` sincroniza orgs, usuarios demo y tipos base hacia SQLite.

---

## 🛠️ Puesta en marcha

### Solo JS (sin P2P)

```bash
npm install
npx expo start
```

Login, CRUD local y reportes ✅ · Sync P2P ❌

### Desarrollo completo

```bash
npx expo prebuild
npx expo run:android
# npx expo run:ios
```

### Polyfill obligatorio

Primera línea de `src/app/_layout.tsx`:

```typescript
import 'react-native-get-random-values';
```

---

## 🧱 Stack técnico

| Área | Tecnología |
|------|------------|
| 🚀 Framework | Expo SDK 56 · React Native 0.85 · Expo Router |
| 🗃️ Estado | Zustand |
| 💾 BD | expo-sqlite (WAL, migraciones) |
| 🔐 Auth | PIN SHA-256 · SecureStore |
| 📜 Listas | @shopify/flash-list |
| 📗 Excel | xlsx (SheetJS) |
| 📡 P2P | zeroconf + tcp-socket |
| 📅 Fechas | date-fns |
| 🆔 IDs | uuid v4 |
| ⌨️ Teclado | react-native-keyboard-controller |
| 🎬 UI | Reanimated · socialUi · premiumPalette |

---

## 📁 Arquitectura

```
src/
  app/                 # 🛣️ Expo Router
  features/
    auth/              # 🔐 Login, PIN, bienvenida
    asistente/         # 🤖 Guía conversacional
    organizaciones/    # 🏛️ Árbol eclesiástico
    bienes/            # 📦 Inventario
    ofrendas/          # 💰 Finanzas
    sync/              # 🔄 P2P
    reportes/          # 📊 Excel
    dashboard/         # 🏠 Inicio
    configuracion/     # ⚙️ Ajustes
    usuarios/          # 👤 Registro local
  shared/
    config/            # hierarchy.ts · hierarchyAccess.ts · tiposActividad.ts
    constants/         # appBranding.ts
    infrastructure/    # SQLite · background tasks
    presentation/ui/   # Design system
```

Detalle ER, protocolo sync, migraciones y tasks: **[AGENTS.md](./AGENTS.md)**

---

## ⏱️ Tareas en background

| Tarea | Función |
|-------|---------|
| 🧮 Consolidación | Recalcula totales tras sync / CRUD |
| 🗑️ Purga sync | `sync_changes` > 60 días |
| 📄 Limpieza reportes | `.xlsx` > 30 días |

---

## ⚠️ Limitaciones v1

| | |
|---|---|
| 📷 Fotos | Solo locales; no sync de binarios por P2P |
| 📡 P2P | App nativa · misma Wi‑Fi · alcance compartido |
| 🌐 Web | Sin mDNS/TCP |
| 📱 Expo Go | Sin módulos nativos de sync ni voz |

---

## 📜 Scripts

| Comando | Descripción |
|---------|-------------|
| `npm start` | Metro bundler |
| `npm run android` | Build + run Android |
| `npm run ios` | Build + run iOS |
| `npm run web` | Web (limitada) |
| `npm run lint` | ESLint |

---

<div align="center">

**Fieles Bienes** — custodiar el patrimonio con orden, fe y excelencia.

Made with 💙 for comunidades eclesiásticas

</div>
