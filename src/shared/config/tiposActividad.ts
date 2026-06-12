/**
 * Catálogo base de tipos de actividad (finanzas / ofrendas).
 *
 * **OTA (EAS Update):** editar este archivo y publicar. `ensureTiposActividadSeed` sincroniza:
 * - INSERT/UPDATE tipos con id `seed-tipo-*`
 * - Desactiva (`activo = 0`) los que quites del array
 * - `activo: false` en la entrada desactiva sin quitar del array
 *
 * Tipos creados en la app (UUID) o recibidos por P2P/Excel no se modifican aquí.
 */

export const TIPOS_ACTIVIDAD_SEED_PREFIX = 'seed-tipo-' as const;

export type TipoActividadSeed = {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  /** Por defecto true. Pon `false` para desactivar vía OTA sin quitar del array. */
  readonly activo?: boolean;
};

export const TIPOS_ACTIVIDAD_V1: TipoActividadSeed[] = [
  {
    id: 'seed-tipo-misas',
    codigo: 'misas_dominicales',
    nombre: 'Misas Dominicales',
  },
  {
    id: 'seed-tipo-matrimonios',
    codigo: 'matrimonios',
    nombre: 'Matrimonios',
  },
  {
    id: 'seed-tipo-eventos',
    codigo: 'eventos_especiales',
    nombre: 'Eventos Especiales',
  },
  {
    id: 'seed-tipo-colectas',
    codigo: 'colectas_solidarias',
    nombre: 'Colectas Solidarias',
  },
  {
    id: 'seed-tipo-bingos',
    codigo: 'bingos_kermeses',
    nombre: 'Bingos / Kermeses',
  },
];
