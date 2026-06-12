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

import type { FinanzaNaturalezaValue } from '@/features/ofrendas/domain/entities/FinanzaNaturaleza';
import { FinanzaNaturaleza } from '@/features/ofrendas/domain/entities/FinanzaNaturaleza';

export const TIPOS_ACTIVIDAD_SEED_PREFIX = 'seed-tipo-' as const;

export type TipoActividadSeed = {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly naturaleza: FinanzaNaturalezaValue;
  /** Por defecto true. Pon `false` para desactivar vía OTA sin quitar del array. */
  readonly activo?: boolean;
};

export const TIPOS_ACTIVIDAD_V1: TipoActividadSeed[] = [
  {
    id: 'seed-tipo-misas',
    codigo: 'misas_dominicales',
    nombre: 'Misas Dominicales',
    naturaleza: FinanzaNaturaleza.INGRESO,
  },
  {
    id: 'seed-tipo-matrimonios',
    codigo: 'matrimonios',
    nombre: 'Matrimonios',
    naturaleza: FinanzaNaturaleza.INGRESO,
  },
  {
    id: 'seed-tipo-eventos',
    codigo: 'eventos_especiales',
    nombre: 'Eventos Especiales',
    naturaleza: FinanzaNaturaleza.INGRESO,
  },
  {
    id: 'seed-tipo-colectas',
    codigo: 'colectas_solidarias',
    nombre: 'Colectas Solidarias',
    naturaleza: FinanzaNaturaleza.INGRESO,
  },
  {
    id: 'seed-tipo-bingos',
    codigo: 'bingos_kermeses',
    nombre: 'Bingos / Kermeses',
    naturaleza: FinanzaNaturaleza.INGRESO,
  },
  {
    id: 'seed-tipo-mantenimiento',
    codigo: 'mantenimiento_templo',
    nombre: 'Mantenimiento del templo',
    naturaleza: FinanzaNaturaleza.EGRESO,
  },
  {
    id: 'seed-tipo-servicios',
    codigo: 'servicios_basicos',
    nombre: 'Servicios básicos (luz, agua)',
    naturaleza: FinanzaNaturaleza.EGRESO,
  },
  {
    id: 'seed-tipo-liturgico',
    codigo: 'material_liturgico',
    nombre: 'Material litúrgico',
    naturaleza: FinanzaNaturaleza.EGRESO,
  },
  {
    id: 'seed-tipo-limpieza',
    codigo: 'limpieza_higiene',
    nombre: 'Limpieza e higiene',
    naturaleza: FinanzaNaturaleza.EGRESO,
  },
  {
    id: 'seed-tipo-caridad',
    codigo: 'caridad_ayuda',
    nombre: 'Caridad y ayuda social',
    naturaleza: FinanzaNaturaleza.EGRESO,
  },
  {
    id: 'seed-tipo-reparaciones',
    codigo: 'reparaciones',
    nombre: 'Reparaciones',
    naturaleza: FinanzaNaturaleza.EGRESO,
  },
];
