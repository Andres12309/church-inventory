import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { InventarioAggregate } from '@/features/configuracion/domain/entities/InventarioAggregate';
import { formatearTotalesAggregate } from '@/features/configuracion/presentation/utils/formatAggregateTotals';
import type { NivelOrganizacionCodigo } from '@/shared/config/hierarchy';
import {
  etiquetaNivelOrganizacion,
  nivelesCreablesPorRol,
  puedeCrearNivelOrganizacion,
} from '@/shared/config/hierarchyAccess';
import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';
import type { UserRoleCodigoValue } from '@/shared/infrastructure/database/schema';

import type { OrganizacionNodo } from '../../application/dto/EstructuraEclesial';

type OrganizacionTreeNodeProps = {
  nodo: OrganizacionNodo;
  depth?: number;
  expandedIds: Record<string, boolean>;
  onToggle: (id: string) => void;
  onEditar: (nodo: OrganizacionNodo) => void;
  onAgregarHijo?: (nodo: OrganizacionNodo, nivelHijo: NivelOrganizacionCodigo) => void;
  aggregatesByOrgId?: Record<string, InventarioAggregate>;
  rolCodigo?: UserRoleCodigoValue;
};

const NIVEL_ICON: Record<string, string> = {
  diocesis: '⛪',
  parroquia: '🏛️',
  capilla: '🕯️',
};

const HIJO_POR_NIVEL: Partial<Record<NivelOrganizacionCodigo, NivelOrganizacionCodigo>> = {
  diocesis: 'parroquia',
  parroquia: 'capilla',
};

export function OrganizacionTreeNode({
  nodo,
  depth = 0,
  expandedIds,
  onToggle,
  onEditar,
  onAgregarHijo,
  aggregatesByOrgId,
  rolCodigo,
}: OrganizacionTreeNodeProps) {
  const hasChildren = nodo.hijos.length > 0;
  const isExpanded = expandedIds[nodo.organizacion.id] ?? depth === 0;
  const nivelCodigo = nodo.nivel.codigo as NivelOrganizacionCodigo;
  const isCapilla = nodo.nivel.esHoja;
  const totales = formatearTotalesAggregate(aggregatesByOrgId?.[nodo.organizacion.id]);
  const hijoNivel = HIJO_POR_NIVEL[nivelCodigo];
  const puedeAgregarHijo =
    hijoNivel && rolCodigo && onAgregarHijo && puedeCrearNivelOrganizacion(rolCodigo, hijoNivel);

  return (
    <View style={styles.wrapper}>
      <View style={[styles.row, { marginLeft: depth * 12 }]}>
        <Pressable
          onPress={() => onEditar(nodo)}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.icon}>{NIVEL_ICON[nivelCodigo] ?? '📍'}</Text>
            <View style={styles.cardCopy}>
              <Text style={styles.nombre} numberOfLines={1}>
                {nodo.organizacion.nombre}
              </Text>
              <Text style={styles.nivel}>{etiquetaNivelOrganizacion(nivelCodigo)}</Text>
            </View>
            {hasChildren ? (
              <Pressable onPress={() => onToggle(nodo.organizacion.id)} hitSlop={8}>
                <Text style={styles.expand}>{isExpanded ? '▾' : '▸'}</Text>
              </Pressable>
            ) : null}
          </View>

          {nodo.ubicacion?.direccion ? (
            <Text style={styles.meta} numberOfLines={1}>
              {nodo.ubicacion.direccion}
            </Text>
          ) : null}

          {!isCapilla ? (
            <View style={styles.totalsRow}>
              <Text style={styles.totalChip}>📦 {totales.bienesLabel}</Text>
              <Text style={styles.totalChip}>💰 {totales.ofrendasLabel}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable onPress={() => onEditar(nodo)} style={styles.actionBtn}>
              <Text style={styles.actionText}>Editar</Text>
            </Pressable>
            {puedeAgregarHijo ? (
              <Pressable
                onPress={() => onAgregarHijo!(nodo, hijoNivel!)}
                style={[styles.actionBtn, styles.actionBtnAccent]}
              >
                <Text style={styles.actionTextAccent}>
                  + {etiquetaNivelOrganizacion(hijoNivel!)}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </View>

      {hasChildren && isExpanded
        ? nodo.hijos.map((hijo) => (
            <OrganizacionTreeNode
              key={hijo.organizacion.id}
              nodo={hijo}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onEditar={onEditar}
              onAgregarHijo={onAgregarHijo}
              aggregatesByOrgId={aggregatesByOrgId}
              rolCodigo={rolCodigo}
            />
          ))
        : null}
    </View>
  );
}

export function nivelesCreacionDisponibles(
  rolCodigo?: UserRoleCodigoValue,
): NivelOrganizacionCodigo[] {
  if (!rolCodigo) {
    return [];
  }
  return nivelesCreablesPorRol(rolCodigo);
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  row: { alignSelf: 'stretch' },
  card: {
    backgroundColor: PremiumPalette.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { fontSize: 22 },
  cardCopy: { flex: 1, gap: 2 },
  nombre: { color: PremiumPalette.textOnDark, fontSize: 15, fontWeight: '700' },
  nivel: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  expand: { color: PremiumPalette.primary, fontSize: 16, fontWeight: '700', padding: 4 },
  meta: { color: PremiumPalette.textMutedOnDark, fontSize: 12 },
  totalsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  totalChip: {
    color: PremiumPalette.textSoftOnDark,
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: PremiumPalette.canvas,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: PremiumPalette.surfaceMuted,
  },
  actionBtnAccent: { backgroundColor: 'rgba(79, 70, 229, 0.2)' },
  actionText: { color: PremiumPalette.textSoftOnDark, fontSize: 12, fontWeight: '700' },
  actionTextAccent: { color: PremiumPalette.primary, fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.9 },
});
