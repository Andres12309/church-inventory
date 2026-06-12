import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomTabInset } from '@/constants/theme';
import { useAuthStore } from '@/features/auth/presentation/store/authStore';
import { flattenOrganizacionTree } from '@/features/organizaciones/application/services/OrganizacionTreeBuilder';
import { useOrganizacionesUseCases } from '@/features/organizaciones/presentation/hooks/useOrganizacionesUseCases';
import { useOrganizacionesStore } from '@/features/organizaciones/presentation/store/organizacionesStore';
import { puedeElegirOrganizacionEnCrud } from '@/shared/config/hierarchyAccess';
import { ModuloCodigo, UserRoleCodigo } from '@/shared/infrastructure/database/schema';
import { FloatingActionButton } from '@/shared/presentation/ui/PrimaryButton';
import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';
import {
  OrgScopeBanner,
  PillFilterRow,
  SocialEmpty,
  SocialHeader,
  SocialScreen,
  type PillOption,
} from '@/shared/presentation/ui/socialUi';

import { resolverOrganizacionPorDefecto } from '../../application/services/OfrendaAccessPolicy';
import { FinanzaNaturaleza, type FinanzaFiltroNaturaleza } from '../../domain/entities/FinanzaNaturaleza';
import { FinanzasFiltrosSheet } from '../components/FinanzasFiltrosSheet';
import { OfrendaListItem } from '../components/OfrendaListItem';
import { TiposActividadSheet } from '../components/TiposActividadSheet';
import { useOfrendasUseCases } from '../hooks/useOfrendasUseCases';
import { OFRENDAS_ROUTES } from '../routes';
import { formatearMonto, useOfrendasStore } from '../store/ofrendasStore';

export function OfrendasDashboardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orgId?: string; tipos?: string }>();

  const usuario = useAuthStore((s) => s.usuarioActual);
  const rol = useAuthStore((s) => s.rolActual);
  const permissionService = useAuthStore((s) => s.permissionService);
  const tieneAcceso = useAuthStore((s) => s.tieneAcceso(ModuloCodigo.OFRENDAS));

  const estructura = useOrganizacionesStore((s) => s.estructura);
  const capillas = useOrganizacionesStore((s) => s.capillas);
  const cargarEstructura = useOrganizacionesStore((s) => s.cargarEstructura);
  const { obtenerEstructuraEclesial } = useOrganizacionesUseCases();
  const { consultarFinanzas, gestionarTipoActividad } = useOfrendasUseCases();

  const organizacionId = useOfrendasStore((s) => s.organizacionId);
  const ofrendas = useOfrendasStore((s) => s.ofrendas);
  const tiposActividad = useOfrendasStore((s) => s.tiposActividad);
  const fechaInicio = useOfrendasStore((s) => s.fechaInicio);
  const fechaFin = useOfrendasStore((s) => s.fechaFin);
  const filtroTipoActividadId = useOfrendasStore((s) => s.filtroTipoActividadId);
  const filtroNaturaleza = useOfrendasStore((s) => s.filtroNaturaleza);
  const totalIngresos = useOfrendasStore((s) => s.totalIngresos);
  const totalEgresos = useOfrendasStore((s) => s.totalEgresos);
  const saldo = useOfrendasStore((s) => s.saldo);
  const totalesPorTipo = useOfrendasStore((s) => s.totalesPorTipo);
  const isLoading = useOfrendasStore((s) => s.isLoading);
  const isSaving = useOfrendasStore((s) => s.isSaving);
  const errorMessage = useOfrendasStore((s) => s.errorMessage);
  const setOrganizacionId = useOfrendasStore((s) => s.setOrganizacionId);
  const setFechaInicio = useOfrendasStore((s) => s.setFechaInicio);
  const setFechaFin = useOfrendasStore((s) => s.setFechaFin);
  const setFiltroTipoActividadId = useOfrendasStore((s) => s.setFiltroTipoActividadId);
  const setFiltroNaturaleza = useOfrendasStore((s) => s.setFiltroNaturaleza);
  const cargarCatalogo = useOfrendasStore((s) => s.cargarCatalogo);
  const cargarRecaudaciones = useOfrendasStore((s) => s.cargarRecaudaciones);
  const crearTipoActividad = useOfrendasStore((s) => s.crearTipoActividad);
  const clearError = useOfrendasStore((s) => s.clearError);

  const [filtrosVisible, setFiltrosVisible] = useState(false);
  const [tiposVisible, setTiposVisible] = useState(params.tipos === '1');

  useEffect(() => {
    if (params.tipos === '1') {
      setTiposVisible(true);
    }
  }, [params.tipos]);

  const puedeElegirOrganizacion = rol ? puedeElegirOrganizacionEnCrud(rol.codigo) : false;

  const tiposMap = useMemo(
    () => Object.fromEntries(tiposActividad.map((t) => [t.id, t])),
    [tiposActividad],
  );

  const orgOpciones = useMemo((): PillOption[] => {
    if (!puedeElegirOrganizacion) {
      return [];
    }

    const options: PillOption[] = [];
    const seen = new Set<string>();

    const push = (id: string, label: string) => {
      if (seen.has(id)) {
        return;
      }
      seen.add(id);
      options.push({ id, label });
    };

    if (rol?.codigo === UserRoleCodigo.PARROCO && usuario?.organizacionId && estructura) {
      const parroquia = estructura.nodos.find((n) => n.organizacion.id === usuario.organizacionId);
      if (parroquia) {
        push(parroquia.organizacion.id, `${parroquia.organizacion.nombre} · Parroquia`);
      }
    }

    if (
      (rol?.codigo === UserRoleCodigo.OBISPO || rol?.codigo === UserRoleCodigo.SUPER_ADMIN) &&
      estructura?.nodos.length
    ) {
      for (const nodo of flattenOrganizacionTree(estructura.nodos)) {
        if (nodo.nivel.codigo === 'parroquia') {
          push(nodo.organizacion.id, `${nodo.organizacion.nombre} · Parroquia`);
        }
      }
    }

    for (const nodo of capillas) {
      push(nodo.organizacion.id, nodo.organizacion.nombre);
    }

    return options;
  }, [capillas, estructura, puedeElegirOrganizacion, rol?.codigo, usuario?.organizacionId]);

  const orgIdsGestionables = useMemo(() => orgOpciones.map((o) => o.id), [orgOpciones]);

  const orgSeleccionada = orgOpciones.find((o) => o.id === organizacionId);
  const capillaSeleccionada = capillas.find((c) => c.organizacion.id === organizacionId);

  const tipoPills = useMemo((): PillOption[] => {
    const base =
      filtroNaturaleza === 'todos'
        ? tiposActividad
        : tiposActividad.filter((t) => t.naturaleza === filtroNaturaleza);
    return base.map((t) => ({ id: t.id, label: t.nombre }));
  }, [tiposActividad, filtroNaturaleza]);

  const naturalezaPills = useMemo(
    (): PillOption[] => [
      { id: 'todos', label: 'Todos' },
      { id: FinanzaNaturaleza.INGRESO, label: 'Ingresos' },
      { id: FinanzaNaturaleza.EGRESO, label: 'Gastos' },
    ],
    [],
  );

  const periodoLabel = useMemo(() => {
    if (fechaInicio === fechaFin) {
      return fechaInicio;
    }
    return `${fechaInicio} → ${fechaFin}`;
  }, [fechaFin, fechaInicio]);

  const filtroTipoLabel = useMemo(() => {
    if (!filtroTipoActividadId) {
      return 'Todas';
    }
    return tiposMap[filtroTipoActividadId]?.nombre ?? 'Tipo';
  }, [filtroTipoActividadId, tiposMap]);

  useEffect(() => {
    if (!usuario || !rol || !permissionService || !puedeElegirOrganizacion || capillas.length > 0) {
      return;
    }
    void cargarEstructura(usuario, rol, permissionService, obtenerEstructuraEclesial);
  }, [
    capillas.length,
    cargarEstructura,
    obtenerEstructuraEclesial,
    permissionService,
    puedeElegirOrganizacion,
    rol,
    usuario,
  ]);

  useEffect(() => {
    if (!usuario || !permissionService || !rol) {
      return;
    }
    const resolved = resolverOrganizacionPorDefecto(
      usuario,
      rol,
      params.orgId,
      orgIdsGestionables,
    );
    setOrganizacionId(resolved);
  }, [usuario, rol, permissionService, params.orgId, orgIdsGestionables, setOrganizacionId]);

  useEffect(() => {
    if (!permissionService) {
      return;
    }
    void cargarCatalogo(permissionService, consultarFinanzas);
  }, [cargarCatalogo, consultarFinanzas, permissionService]);

  const refresh = useCallback(() => {
    if (!usuario || !rol || !permissionService) {
      return;
    }
    void cargarRecaudaciones(usuario, rol, permissionService, consultarFinanzas);
  }, [cargarRecaudaciones, consultarFinanzas, permissionService, rol, usuario]);

  useEffect(() => {
    refresh();
  }, [refresh, organizacionId, fechaInicio, fechaFin, filtroTipoActividadId, filtroNaturaleza]);

  const handleNuevo = (naturaleza: typeof FinanzaNaturaleza.INGRESO | typeof FinanzaNaturaleza.EGRESO) => {
    if (!organizacionId) {
      return;
    }
    router.push(OFRENDAS_ROUTES.nuevo(organizacionId, naturaleza));
  };

  const handleEditar = (id: string) => {
    if (!organizacionId) {
      return;
    }
    router.push(OFRENDAS_ROUTES.editar(id, organizacionId));
  };

  const handleCrearTipo = async (nombre: string, naturaleza: typeof FinanzaNaturaleza.INGRESO | typeof FinanzaNaturaleza.EGRESO) => {
    if (!permissionService) {
      return;
    }
    await crearTipoActividad(nombre, naturaleza, permissionService, gestionarTipoActividad);
  };

  const abrirTipos = () => {
    clearError();
    setTiposVisible(true);
  };

  if (!tieneAcceso) {
    return (
      <SocialScreen scroll={false}>
        <SocialEmpty
          icon="🔒"
          title="Sin acceso"
          message="Tu perfil no tiene permiso para ver finanzas y recaudaciones."
        />
      </SocialScreen>
    );
  }

  return (
    <SocialScreen scroll={false} contentStyle={styles.screen}>
      <View style={styles.topSection}>
        <SocialHeader
          title="Finanzas"
          subtitle={orgSeleccionada?.label ?? capillaSeleccionada?.organizacion.nombre ?? 'Ingresos, gastos y saldo'}
          showBack={false}
          badge={formatearMonto(saldo)}
        />

        {!puedeElegirOrganizacion && capillaSeleccionada ? (
          <OrgScopeBanner label="Tu capilla" nombre={capillaSeleccionada.organizacion.nombre} />
        ) : null}

        <View style={styles.resumenRow}>
          <View style={[styles.resumenCard, styles.ingresosCard]}>
            <Text style={styles.resumenLabel}>Ingresos</Text>
            <Text style={[styles.resumenValue, styles.ingresosValue]}>{formatearMonto(totalIngresos)}</Text>
          </View>
          <View style={[styles.resumenCard, styles.egresosCard]}>
            <Text style={styles.resumenLabel}>Gastos</Text>
            <Text style={[styles.resumenValue, styles.egresosValue]}>{formatearMonto(totalEgresos)}</Text>
          </View>
        </View>

        <View style={styles.pillsBlock}>
          <Text style={styles.pillsHint}>Ver movimientos</Text>
          <PillFilterRow
            options={naturalezaPills}
            selectedId={filtroNaturaleza}
            onSelect={(id) => setFiltroNaturaleza((id ?? 'todos') as FinanzaFiltroNaturaleza)}
          />
        </View>

        <View style={styles.quickFilters}>
          <Pressable
            onPress={() => {
              clearError();
              setFiltrosVisible(true);
            }}
            style={({ pressed }) => [styles.quickChip, pressed && styles.quickChipPressed]}
          >
            <Text style={styles.quickChipIcon}>📅</Text>
            <View style={styles.quickChipCopy}>
              <Text style={styles.quickChipLabel}>Período</Text>
              <Text style={styles.quickChipValue} numberOfLines={1}>
                {periodoLabel}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={abrirTipos}
            style={({ pressed }) => [styles.quickChip, pressed && styles.quickChipPressed]}
          >
            <Text style={styles.quickChipIcon}>🏷️</Text>
            <View style={styles.quickChipCopy}>
              <Text style={styles.quickChipLabel}>Tipos</Text>
              <Text style={styles.quickChipValue}>{tiposActividad.length} activos</Text>
            </View>
          </Pressable>
        </View>

        {tipoPills.length > 0 ? (
          <View style={styles.pillsBlock}>
            <Text style={styles.pillsHint}>Filtrar: {filtroTipoLabel}</Text>
            <PillFilterRow
              options={tipoPills}
              selectedId={filtroTipoActividadId}
              onSelect={setFiltroTipoActividadId}
              allowNull
              nullLabel="Todas"
            />
          </View>
        ) : (
          <Pressable onPress={abrirTipos} style={({ pressed }) => [styles.tiposCta, pressed && styles.quickChipPressed]}>
            <Text style={styles.tiposCtaIcon}>🏷️</Text>
            <View style={styles.tiposCtaCopy}>
              <Text style={styles.tiposCtaTitle}>Configura tipos de actividad</Text>
              <Text style={styles.tiposCtaText}>Necesarios para clasificar ingresos y gastos</Text>
            </View>
            <Text style={styles.tiposCtaAction}>→</Text>
          </Pressable>
        )}

        <View style={styles.listHeading}>
          <Text style={styles.listHeadingTitle}>Movimientos</Text>
          <Text style={styles.listHeadingMeta}>
            {ofrendas.length} {ofrendas.length === 1 ? 'registro' : 'registros'}
          </Text>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </View>

      <View style={styles.listHost}>
        {isLoading && ofrendas.length === 0 ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={PremiumPalette.primary} />
          </View>
        ) : !organizacionId ? (
          <SocialEmpty
            icon="⛪"
            title="Selecciona una organización"
            message="Abre Período para elegir capilla o parroquia y ver los movimientos."
          />
        ) : (
          <FlashList
            data={ofrendas}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <OfrendaListItem
                ofrenda={item}
                tipoActividad={tiposMap[item.tipoActividadId]}
                onPress={() => handleEditar(item.id)}
              />
            )}
            ListEmptyComponent={
              <SocialEmpty
                icon="💰"
                title="Sin movimientos"
                message={
                  filtroNaturaleza === FinanzaNaturaleza.EGRESO
                    ? 'No hay gastos en este período. Toca − Registrar gasto.'
                    : filtroNaturaleza === FinanzaNaturaleza.INGRESO
                      ? 'No hay ingresos en este período. Toca + Registrar ingreso.'
                      : 'No hay movimientos en este período. Registra un ingreso o un gasto.'
                }
              />
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      {organizacionId ? (
        <View style={styles.fabRow}>
          <FloatingActionButton
            label="+ Ingreso"
            onPress={() => handleNuevo(FinanzaNaturaleza.INGRESO)}
            style={styles.fabIngreso}
          />
          <FloatingActionButton
            label="− Gasto"
            onPress={() => handleNuevo(FinanzaNaturaleza.EGRESO)}
            style={styles.fabGasto}
          />
        </View>
      ) : null}

      <FinanzasFiltrosSheet
        visible={filtrosVisible}
        onClose={() => setFiltrosVisible(false)}
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        onFechaInicioChange={setFechaInicio}
        onFechaFinChange={setFechaFin}
        orgOpciones={orgOpciones}
        organizacionId={organizacionId}
        onOrganizacionChange={setOrganizacionId}
        puedeElegirOrganizacion={puedeElegirOrganizacion}
        orgLabel={orgSeleccionada?.label ?? capillaSeleccionada?.organizacion.nombre}
        totalIngresos={totalIngresos}
        totalEgresos={totalEgresos}
        saldo={saldo}
        totalesPorTipo={totalesPorTipo}
        tiposMap={tiposMap}
      />

      <TiposActividadSheet
        visible={tiposVisible}
        onClose={() => setTiposVisible(false)}
        tipos={tiposActividad}
        isSaving={isSaving}
        onCrear={handleCrearTipo}
      />
    </SocialScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: 0,
    paddingBottom: BottomTabInset + 12,
  },
  topSection: {
    flexShrink: 0,
    gap: 8,
  },
  resumenRow: {
    flexDirection: 'row',
    gap: 8,
  },
  resumenCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
  ingresosCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: PremiumPalette.accent,
  },
  egresosCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: PremiumPalette.danger,
  },
  resumenLabel: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  resumenValue: { fontSize: 16, fontWeight: '900' },
  ingresosValue: { color: PremiumPalette.accent },
  egresosValue: { color: PremiumPalette.danger },
  quickFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  quickChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PremiumPalette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  quickChipPressed: { opacity: 0.88 },
  quickChipIcon: { fontSize: 18 },
  quickChipCopy: { flex: 1, gap: 1 },
  quickChipLabel: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  quickChipValue: {
    color: PremiumPalette.textOnDark,
    fontSize: 12,
    fontWeight: '700',
  },
  pillsBlock: {
    flexShrink: 0,
    gap: 4,
  },
  pillsHint: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 2,
  },
  tiposCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PremiumPalette.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tiposCtaIcon: { fontSize: 18 },
  tiposCtaCopy: { flex: 1, gap: 2 },
  tiposCtaTitle: { color: PremiumPalette.textOnDark, fontSize: 13, fontWeight: '700' },
  tiposCtaText: { color: PremiumPalette.textMutedOnDark, fontSize: 12 },
  tiposCtaAction: { color: PremiumPalette.primary, fontSize: 18, fontWeight: '700' },
  listHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginTop: 2,
  },
  listHeadingTitle: {
    color: PremiumPalette.textOnDark,
    fontSize: 15,
    fontWeight: '800',
  },
  listHeadingMeta: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: { color: PremiumPalette.danger, fontSize: 13, paddingHorizontal: 2 },
  listHost: {
    flex: 1,
    minHeight: 0,
    marginTop: 4,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  listContent: {
    paddingBottom: 100,
  },
  fabRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: BottomTabInset + 8,
    flexDirection: 'row',
    gap: 10,
  },
  fabIngreso: {
    flex: 1,
    position: 'relative',
    right: 0,
    bottom: 0,
  },
  fabGasto: {
    flex: 1,
    position: 'relative',
    right: 0,
    bottom: 0,
    backgroundColor: PremiumPalette.danger,
  },
});
