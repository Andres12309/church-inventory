import type { SQLiteDatabase } from 'expo-sqlite';

import { OrganizacionesColumns, Tables } from '@/shared/infrastructure/database/schema';

import {
  ALL_SYNC_SEGMENTS,
  type SyncPlan,
  SYNC_SEGMENT_DEPENDENCIES,
  segmentToTables,
  type SyncSegmentIdValue,
} from '../domain/entities/SyncPlan';

export type ResolvedSyncPlan = {
  segments: SyncSegmentIdValue[];
  /** Organizaciones a incluir (selección + padres + subárbol). */
  orgScope: string[];
  /** Ámbito de datos operativos (ofrendas, bienes, usuarios). */
  dataOrgScope: string[];
  tables: Set<string>;
  userIds: string[] | null;
};

function expandSegmentDependencies(segments: SyncSegmentIdValue[]): SyncSegmentIdValue[] {
  const result = new Set<SyncSegmentIdValue>();
  const queue = [...segments];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || result.has(current)) {
      continue;
    }
    result.add(current);
    for (const dep of SYNC_SEGMENT_DEPENDENCIES[current]) {
      if (!result.has(dep)) {
        queue.push(dep);
      }
    }
  }

  return ALL_SYNC_SEGMENTS.filter((segment) => result.has(segment));
}

async function expandOrgSubtree(db: SQLiteDatabase, orgIds: string[]): Promise<string[]> {
  if (orgIds.length === 0) {
    return [];
  }

  const placeholders = orgIds.map(() => '?').join(', ');
  const rows = await db.getAllAsync<{ id: string }>(
    `WITH RECURSIVE org_tree(id) AS (
      SELECT ${OrganizacionesColumns.ID} FROM ${Tables.ORGANIZACIONES}
      WHERE ${OrganizacionesColumns.ID} IN (${placeholders})
      UNION ALL
      SELECT o.${OrganizacionesColumns.ID}
      FROM ${Tables.ORGANIZACIONES} o
      INNER JOIN org_tree ot ON o.${OrganizacionesColumns.PARENT_ID} = ot.id
    )
    SELECT DISTINCT id FROM org_tree`,
    orgIds,
  );

  return rows.map((row) => row.id);
}

async function expandOrgScopeWithParents(
  db: SQLiteDatabase,
  orgIds: string[],
): Promise<string[]> {
  if (orgIds.length === 0) {
    return [];
  }

  const placeholders = orgIds.map(() => '?').join(', ');
  const rows = await db.getAllAsync<{ id: string }>(
    `WITH RECURSIVE org_chain(id) AS (
      SELECT ${OrganizacionesColumns.ID} FROM ${Tables.ORGANIZACIONES}
      WHERE ${OrganizacionesColumns.ID} IN (${placeholders})
      UNION ALL
      SELECT o.${OrganizacionesColumns.PARENT_ID}
      FROM ${Tables.ORGANIZACIONES} o
      INNER JOIN org_chain oc ON o.${OrganizacionesColumns.ID} = oc.id
      WHERE o.${OrganizacionesColumns.PARENT_ID} IS NOT NULL
    )
    SELECT DISTINCT id FROM org_chain WHERE id IS NOT NULL`,
    orgIds,
  );

  return rows.map((row) => row.id);
}

export async function resolveSyncPlan(
  db: SQLiteDatabase,
  plan: SyncPlan,
  baseOrgScope: string[],
): Promise<ResolvedSyncPlan> {
  const segments =
    plan.mode === 'all'
      ? ALL_SYNC_SEGMENTS
      : expandSegmentDependencies(plan.segments ?? []);

  let orgScope = baseOrgScope;
  let dataOrgScope = baseOrgScope;

  if (plan.orgIds && plan.orgIds.length > 0) {
    const subtree = await expandOrgSubtree(db, plan.orgIds);
    const withParents = await expandOrgScopeWithParents(db, plan.orgIds);
    const allowed = new Set(baseOrgScope);

    if (baseOrgScope.length === 0) {
      orgScope = [...new Set([...withParents, ...subtree])];
      dataOrgScope = subtree;
    } else {
      orgScope = [...new Set([...withParents, ...subtree])].filter((id) => allowed.has(id));
      dataOrgScope = subtree.filter((id) => allowed.has(id));
      if (dataOrgScope.length === 0) {
        dataOrgScope = plan.orgIds.filter((id) => allowed.has(id));
      }
      if (orgScope.length === 0) {
        orgScope = dataOrgScope;
      }
    }
  }

  const tables = new Set<string>();
  for (const segment of segments) {
    for (const table of segmentToTables(segment)) {
      tables.add(table);
    }
  }

  return {
    segments,
    orgScope,
    dataOrgScope,
    tables,
    userIds: plan.userIds && plan.userIds.length > 0 ? plan.userIds : null,
  };
}

export function isTableInResolvedPlan(tabla: string, resolved: ResolvedSyncPlan): boolean {
  return resolved.tables.has(tabla);
}
