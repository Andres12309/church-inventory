import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuthStore } from '@/features/auth/presentation/store/authStore';
import { BIENES_ROUTES } from '@/features/bienes/presentation/routes';
import { useInventarioAggregateRepository } from '@/features/configuracion/presentation/hooks/useInventarioAggregateRepository';
import { OFRENDAS_ROUTES } from '@/features/ofrendas/presentation/routes';
import { createConsolidationService } from '@/shared/infrastructure/background/createConsolidationTrigger';
import type { NivelOrganizacionCodigo } from '@/shared/config/hierarchy';
import {
  etiquetaNivelOrganizacion,
  nivelesCreablesPorRol,
} from '@/shared/config/hierarchyAccess';
import { ModuloCodigo } from '@/shared/infrastructure/database/schema';
import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';
import {
  SocialCard,
  SocialEmpty,
  SocialHeader,
  SocialPrimaryButton,
  SocialScreen,
} from '@/shared/presentation/ui/socialUi';
import { useSQLiteContext } from 'expo-sqlite';

import type { OrganizacionNodo } from '../../application/dto/EstructuraEclesial';
import { OrganizacionTreeNode } from '../components/OrganizacionTreeNode';
import { useOrganizacionesUseCases } from '../hooks/useOrganizacionesUseCases';
import { ORGANIZACIONES_ROUTES } from '../routes';
import { useOrganizacionesStore } from '../store/organizacionesStore';

export function OrganizacionesDashboardScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const aggregateRepository = useInventarioAggregateRepository();
  const { obtenerEstructuraEclesial } = useOrganizacionesUseCases();

  const usuario = useAuthStore((s) => s.usuarioActual);
  const rol = useAuthStore((s) => s.rolActual);
  const permissionService = useAuthStore((s) => s.permissionService);
  const tieneAcceso = useAuthStore((s) => s.tieneAcceso(ModuloCodigo.ORGANIZACIONES));

  const estructura = useOrganizacionesStore((s) => s.estructura);
  const capillas = useOrganizacionesStore((s) => s.capillas);
  const isLoading = useOrganizacionesStore((s) => s.isLoading);
  const errorMessage = useOrganizacionesStore((s) => s.errorMessage);
  const expandedIds = useOrganizacionesStore((s) => s.expandedIds);
  const aggregatesByOrgId = useOrganizacionesStore((s) => s.aggregatesByOrgId);
  const cargarEstructura = useOrganizacionesStore((s) => s.cargarEstructura);
  const cargarAggregates = useOrganizacionesStore((s) => s.cargarAggregates);
  const toggleExpanded = useOrganizacionesStore((s) => s.toggleExpanded);
  const materializacionEnCursoRef = useRef(false);

  const nivelesCreables = useMemo(
    () => (rol ? nivelesCreablesPorRol(rol.codigo) : []),
    [rol],
  );

  const refresh = useCallback(() => {
    if (!usuario || !rol || !permissionService) {
      return;
    }
    void cargarEstructura(usuario, rol, permissionService, obtenerEstructuraEclesial);
  }, [cargarEstructura, obtenerEstructuraEclesial, permissionService, rol, usuario]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!estructura?.nodos.length) {
      return;
    }

    let cancelled = false;

    void (async () => {
      if (materializacionEnCursoRef.current) {
        return;
      }
      materializacionEnCursoRef.current = true;

      try {
        await cargarAggregates(aggregateRepository);
        if (cancelled) {
          return;
        }

        const { aggregatesByOrgId: cached } = useOrganizacionesStore.getState();
        if (Object.keys(cached).length > 0) {
          return;
        }

        await createConsolidationService(db).consolidarTodoElArbol();
        if (!cancelled) {
          await cargarAggregates(aggregateRepository);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('[Organizaciones] Materialización inicial falló:', error);
        }
      } finally {
        materializacionEnCursoRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [aggregateRepository, cargarAggregates, db, estructura]);

  const navegarEditar = (nodo: OrganizacionNodo) => {
    const codigo = nodo.nivel.codigo as NivelOrganizacionCodigo;
    if (codigo === 'diocesis') {
      router.push(ORGANIZACIONES_ROUTES.editarCatedral(nodo.organizacion.id));
    } else if (codigo === 'parroquia') {
      router.push(ORGANIZACIONES_ROUTES.editarParroquia(nodo.organizacion.id));
    } else {
      router.push(ORGANIZACIONES_ROUTES.editarCapilla(nodo.organizacion.id));
    }
  };

  const navegarNuevoHijo = (nodo: OrganizacionNodo, nivelHijo: NivelOrganizacionCodigo) => {
    if (nivelHijo === 'parroquia') {
      router.push(ORGANIZACIONES_ROUTES.nuevaParroquia(nodo.organizacion.id));
    } else if (nivelHijo === 'capilla') {
      router.push(ORGANIZACIONES_ROUTES.nuevaCapilla(nodo.organizacion.id));
    }
  };

  const navegarNuevoNivel = (nivel: NivelOrganizacionCodigo) => {
    if (nivel === 'diocesis') {
      router.push(ORGANIZACIONES_ROUTES.nuevaCatedral);
      return;
    }
    const raiz = estructura?.nodos[0];
    if (nivel === 'parroquia' && raiz) {
      router.push(ORGANIZACIONES_ROUTES.nuevaParroquia(raiz.organizacion.id));
      return;
    }
    if (nivel === 'capilla' && raiz?.hijos[0]) {
      router.push(ORGANIZACIONES_ROUTES.nuevaCapilla(raiz.hijos[0].organizacion.id));
    }
  };

  const handleVerInventario = (nodo: OrganizacionNodo) => {
    router.push(BIENES_ROUTES.listado(nodo.organizacion.id));
  };

  const handleVerFinanzas = (nodo: OrganizacionNodo) => {
    router.push(OFRENDAS_ROUTES.dashboard(nodo.organizacion.id));
  };

  if (!tieneAcceso) {
    return (
      <SocialScreen scroll={false}>
        <SocialEmpty
          icon="🔒"
          title="Sin acceso"
          message="Tu perfil no puede administrar la estructura eclesiástica."
        />
      </SocialScreen>
    );
  }

  if (isLoading && !estructura) {
    return (
      <View style={styles.loaderFull}>
        <ActivityIndicator size="large" color={PremiumPalette.primary} />
      </View>
    );
  }

  const sinOrganizaciones = !estructura?.nodos.length;

  return (
    <SocialScreen>
      <SocialHeader
        title="Organizaciones"
        subtitle="Catedral → Parroquia → Capilla · consolidación jerárquica"
        badge={`${capillas.length} capillas`}
      />

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {sinOrganizaciones && nivelesCreables.includes('diocesis') ? (
        <SocialCard>
          <Text style={styles.emptyTitle}>Configura la primera catedral</Text>
          <Text style={styles.muted}>
            El administrador del sistema debe registrar la catedral raíz. Luego podrás agregar
            parroquias y capillas.
          </Text>
          <SocialPrimaryButton
            label="+ Nueva catedral"
            onPress={() => router.push(ORGANIZACIONES_ROUTES.nuevaCatedral)}
          />
        </SocialCard>
      ) : (
        <SocialCard>
          <Text style={styles.cardTitle}>Jerarquía eclesiástica</Text>
          {estructura?.nodos.length ? (
            estructura.nodos.map((nodo) => (
              <OrganizacionTreeNode
                key={nodo.organizacion.id}
                nodo={nodo}
                expandedIds={expandedIds}
                onToggle={toggleExpanded}
                onEditar={navegarEditar}
                onAgregarHijo={estructura.puedeAdministrar ? navegarNuevoHijo : undefined}
                aggregatesByOrgId={aggregatesByOrgId}
                rolCodigo={rol?.codigo}
              />
            ))
          ) : (
            <Text style={styles.muted}>No hay organizaciones en tu alcance.</Text>
          )}
        </SocialCard>
      )}

      {capillas.length > 0 ? (
        <SocialCard>
          <Text style={styles.cardTitle}>Capillas · inventario y finanzas</Text>
          {capillas.map((nodo) => (
            <View key={nodo.organizacion.id} style={styles.capillaRow}>
              <Pressable
                onPress={() => navegarEditar(nodo)}
                style={({ pressed }) => [styles.capillaInfo, pressed && styles.pressed]}
              >
                <Text style={styles.capillaNombre}>{nodo.organizacion.nombre}</Text>
                <Text style={styles.capillaMeta}>
                  {nodo.ubicacion?.direccion ?? 'Sin dirección'}
                </Text>
              </Pressable>
              <View style={styles.actions}>
                <Pressable
                  onPress={() => handleVerInventario(nodo)}
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.actionText}>📦 Inventario</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleVerFinanzas(nodo)}
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.actionText}>💰 Finanzas</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </SocialCard>
      ) : null}

      {estructura?.puedeAdministrar && nivelesCreables.length > 0 ? (
        <View style={styles.createSection}>
          <Text style={styles.createLabel}>Crear organización</Text>
          {nivelesCreables.map((nivel) => (
            <SocialPrimaryButton
              key={nivel}
              label={`+ Nueva ${etiquetaNivelOrganizacion(nivel).toLowerCase()}`}
              onPress={() => navegarNuevoNivel(nivel)}
              variant={nivel === 'diocesis' ? 'primary' : 'accent'}
            />
          ))}
        </View>
      ) : null}
    </SocialScreen>
  );
}

const styles = StyleSheet.create({
  loaderFull: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PremiumPalette.canvas,
  },
  cardTitle: { color: PremiumPalette.textOnDark, fontSize: 15, fontWeight: '800' },
  emptyTitle: { color: PremiumPalette.textOnDark, fontSize: 16, fontWeight: '700' },
  muted: { color: PremiumPalette.textMutedOnDark, fontSize: 13, lineHeight: 20 },
  errorText: { color: PremiumPalette.danger, fontSize: 13 },
  capillaRow: {
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PremiumPalette.surfaceMuted,
  },
  capillaInfo: { gap: 2 },
  capillaNombre: { color: PremiumPalette.textOnDark, fontSize: 15, fontWeight: '700' },
  capillaMeta: { color: PremiumPalette.textMutedOnDark, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: {
    backgroundColor: PremiumPalette.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  actionText: { color: PremiumPalette.primary, fontSize: 12, fontWeight: '700' },
  createSection: { gap: 10 },
  createLabel: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pressed: { opacity: 0.88 },
});
