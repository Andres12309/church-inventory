import type { SQLiteDatabase } from 'expo-sqlite';

import { DispararConsolidacionAsincrona } from '@/features/configuracion/application/use-cases/DispararConsolidacionAsincrona';
import type { IConsolidationTrigger } from '@/features/configuracion/application/services/IConsolidationTrigger';

import { ConsolidationService } from './ConsolidationService';

export function createConsolidationTrigger(db: SQLiteDatabase): IConsolidationTrigger {
  const consolidationService = new ConsolidationService(db);
  return new DispararConsolidacionAsincrona(consolidationService);
}

export function createConsolidationService(db: SQLiteDatabase): ConsolidationService {
  return new ConsolidationService(db);
}
