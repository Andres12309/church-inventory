import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

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
  SocialCard,
  SocialEmpty,
  SocialHeader,
  SocialScreen,
  SocialStatCard,
  type PillOption,
} from '@/shared/presentation/ui/socialUi';

import { resolverOrganizacionPorDefecto } from '../../application/services/OfrendaAccessPolicy';
import { OfrendaListItem } from '../components/OfrendaListItem';
import { useOfrendasUseCases } from '../hooks/useOfrendasUseCases';
import { OFRENDAS_ROUTES } from '../routes';
import { formatearMonto, useOfrendasStore } from '../store/ofrendasStore';

export function OfrendasDashboardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orgId?: string }>();

  const usuario = useAuthStore((s) => s.usuarioActual);
  const rol = useAuthStore((s) => s.rolActual);
  const permissionService = useAuthStore((s) => s.permissionService);
  const tieneAcceso = useAuthStore((s) => s.tieneAcceso(ModuloCodigo.OFRENDAS));

  const estructura = useOrganizacionesStore((s) => s.estructura);
  const capillas = useOrganizacionesStore((s) => s.capillas);
  const cargarEstructura = useOrganizacionesStore((s) => s.cargarEstructura);
  const { obtenerEstructuraEclesial } = useOrganizacionesUseCases();
  const { consultarFinanzas } = useOfrendasUseCases();

  const organizacionId = useOfrendasStore((s) => s.organizacionId);
  const ofrendas = useOfrendasStore((s) => s.ofrendas);
  const tiposActividad = useOfrendasStore((s) => s.tiposActividad);
  const fechaInicio = useOfrendasStore((s) => s.fechaInicio);
  const fechaFin = useOfrendasStore((s) => s.fechaFin);
  const filtroTipoActividadId = useOfrendasStore((s) => s.filtroTipoActividadId);
  const totalRecaudado = useOfrendasStore((s) => s.totalRecaudado);
  const totalesPorTipo = useOfrendasStore((s) => s.totalesPorTipo);
  const isLoading = useOfrendasStore((s) => s.isLoading);
  const errorMessage = useOfrendasStore((s) => s.errorMessage);
  const setOrganizacionId = useOfrendasStore((s) => s.setOrganizacionId);
  const setFechaInicio = useOfrendasStore((s) => s.setFechaInicio);
  const setFechaFin = useOfrendasStore((s) => s.setFechaFin);
  const setFiltroTipoActividadId = useOfrendasStore((s) => s.setFiltroTipoActividadId);
  const cargarCatalogo = useOfrendasStore((s) => s.cargarCatalogo);
  const cargarRecaudaciones = useOfrendasStore((s) => s.cargarRecaudaciones);

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

  const orgSeleccionada = orgOpciones.find((o) => o.id === organizacionId);

  const tipoPills = useMemo(
    (): PillOption[] => tiposActividad.map((t) => ({ id: t.id, label: t.nombre })),
    [tiposActividad],
  );

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
    if (!usuario || !permissionService) {
      return;
    }
    const resolved = resolverOrganizacionPorDefecto(usuario, rol!, params.orgId);
    setOrganizacionId(resolved);
  }, [usuario, rol, permissionService, params.orgId, setOrganizacionId]);

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
  }, [refresh, organizacionId, fechaInicio, fechaFin, filtroTipoActividadId]);

  const handleNueva = () => {
    if (!organizacionId) {
      return;
    }
    router.push(OFRENDAS_ROUTES.nuevo(organizacionId));
  };

  const handleEditar = (id: string) => {
    if (!organizacionId) {
      return;
    }
    router.push(OFRENDAS_ROUTES.editar(id, organizacionId));
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
    <SocialScreen scroll={false} contentStyle={styles.screenBody}>
      <SocialHeader
        title="Finanzas"
        subtitle="Ofrendas e ingresos por organización"
        showBack={false}
        badge="v1"
      />

      {puedeElegirOrganizacion && orgOpciones.length > 0 ? (
        <PillFilterRow
          options={orgOpciones}
          selectedId={organizacionId}
          onSelect={setOrganizacionId}
        />
      ) : orgSeleccionada || organizacionId ? (
        <OrgScopeBanner
          label="Capilla activa"
          nombre={orgSeleccionada?.label ?? organizacionId ?? '—'}
        />
      ) : null}

      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <Text style={styles.dateLabel}>Desde</Text>
          <TextInput
            value={fechaInicio}
            onChangeText={setFechaInicio}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={PremiumPalette.textMutedOnDark}
            style={styles.dateInput}
          />
        </View>
        <View style={styles.dateField}>
          <Text style={styles.dateLabel}>Hasta</Text>
          <TextInput
            value={fechaFin}
            onChangeText={setFechaFin}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={PremiumPalette.textMutedOnDark}
            style={styles.dateInput}
          />
        </View>
      </View>

      <SocialStatCard label="Total en el rango" value={formatearMonto(totalRecaudado)} accent />

      {totalesPorTipo.length > 0 ? (
        <SocialCard>
          <Text style={styles.cardTitle}>Desglose por actividad</Text>
          {totalesPorTipo.map((item) => (
            <View key={item.tipoActividadId} style={styles.desgloseRow}>
              <Text style={styles.desgloseLabel}>
                {tiposMap[item.tipoActividadId]?.nombre ?? 'Tipo'}
              </Text>
              <Text style={styles.desgloseValue}>{formatearMonto(item.total)}</Text>
            </View>
          ))}
        </SocialCard>
      ) : null}

      {tipoPills.length > 0 ? (
        <PillFilterRow
          options={tipoPills}
          selectedId={filtroTipoActividadId}
          onSelect={setFiltroTipoActividadId}
          allowNull
          nullLabel="Todas"
        />
      ) : null}

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {isLoading && ofrendas.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={PremiumPalette.primary} />
        </View>
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
                organizacionId
                  ? 'No hay recaudaciones en el período seleccionado.'
                  : 'Elige una organización para ver el historial.'
              }
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {organizacionId ? (
        <FloatingActionButton label="+ Registrar ingreso" onPress={handleNueva} />
      ) : null}
    </SocialScreen>
  );
}

const styles = StyleSheet.create({
  screenBody: { flexGrow: 1, gap: 12 },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateField: { flex: 1, gap: 4 },
  dateLabel: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dateInput: {
    backgroundColor: PremiumPalette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
    color: PremiumPalette.textOnDark,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cardTitle: {
    color: PremiumPalette.textOnDark,
    fontSize: 14,
    fontWeight: '700',
  },
  desgloseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  desgloseLabel: { color: PremiumPalette.textMutedOnDark, fontSize: 13 },
  desgloseValue: { color: PremiumPalette.textOnDark, fontSize: 13, fontWeight: '700' },
  errorText: { color: PremiumPalette.danger, fontSize: 13, paddingHorizontal: 4 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 160 },
  listContent: { paddingBottom: 88, flexGrow: 1 },
});
