import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

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
  const totalRecaudado = useOfrendasStore((s) => s.totalRecaudado);
  const totalesPorTipo = useOfrendasStore((s) => s.totalesPorTipo);
  const isLoading = useOfrendasStore((s) => s.isLoading);
  const isSaving = useOfrendasStore((s) => s.isSaving);
  const errorMessage = useOfrendasStore((s) => s.errorMessage);
  const setOrganizacionId = useOfrendasStore((s) => s.setOrganizacionId);
  const setFechaInicio = useOfrendasStore((s) => s.setFechaInicio);
  const setFechaFin = useOfrendasStore((s) => s.setFechaFin);
  const setFiltroTipoActividadId = useOfrendasStore((s) => s.setFiltroTipoActividadId);
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

  const orgSeleccionada = orgOpciones.find((o) => o.id === organizacionId);
  const capillaSeleccionada = capillas.find((c) => c.organizacion.id === organizacionId);

  const tipoPills = useMemo(
    (): PillOption[] => tiposActividad.map((t) => ({ id: t.id, label: t.nombre })),
    [tiposActividad],
  );

  const periodoLabel = useMemo(() => {
    if (fechaInicio === fechaFin) {
      return fechaInicio;
    }
    return `${fechaInicio} → ${fechaFin}`;
  }, [fechaFin, fechaInicio]);

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

  const handleCrearTipo = async (nombre: string) => {
    if (!permissionService) {
      return;
    }
    await crearTipoActividad(nombre, permissionService, gestionarTipoActividad);
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
      <SocialHeader
        title="Finanzas"
        subtitle={orgSeleccionada?.label ?? capillaSeleccionada?.organizacion.nombre ?? 'Ingresos y ofrendas'}
        showBack={false}
        badge={formatearMonto(totalRecaudado)}
      />

      {!puedeElegirOrganizacion && capillaSeleccionada ? (
        <OrgScopeBanner label="Tu capilla" nombre={capillaSeleccionada.organizacion.nombre} />
      ) : null}

      <View style={styles.toolbar}>
        <Pressable
          onPress={() => {
            clearError();
            setFiltrosVisible(true);
          }}
          style={({ pressed }) => [styles.toolBtn, pressed && styles.toolBtnPressed]}
        >
          <Text style={styles.toolBtnIcon}>📅</Text>
          <View style={styles.toolBtnCopy}>
            <Text style={styles.toolBtnLabel}>Período</Text>
            <Text style={styles.toolBtnValue} numberOfLines={1}>
              {periodoLabel}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => {
            clearError();
            setTiposVisible(true);
          }}
          style={({ pressed }) => [styles.toolBtn, pressed && styles.toolBtnPressed]}
        >
          <Text style={styles.toolBtnIcon}>🏷️</Text>
          <View style={styles.toolBtnCopy}>
            <Text style={styles.toolBtnLabel}>Tipos</Text>
            <Text style={styles.toolBtnValue}>{tiposActividad.length} activos</Text>
          </View>
        </Pressable>
      </View>

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

      <View style={styles.listHost}>
        {isLoading && ofrendas.length === 0 ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={PremiumPalette.primary} />
          </View>
        ) : !organizacionId ? (
          <SocialEmpty
            icon="⛪"
            title="Selecciona una organización"
            message="Abre filtros para elegir capilla o parroquia y ver los movimientos."
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
                message="No hay ingresos en este período. Toca + Registrar ingreso."
              />
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      {organizacionId ? (
        <FloatingActionButton label="+ Registrar ingreso" onPress={handleNueva} />
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
        totalRecaudado={totalRecaudado}
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
    gap: 8,
    paddingBottom: 8,
  },
  toolbar: {
    flexDirection: 'row',
    gap: 8,
  },
  toolBtn: {
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
  toolBtnPressed: { opacity: 0.88 },
  toolBtnIcon: { fontSize: 18 },
  toolBtnCopy: { flex: 1, gap: 1 },
  toolBtnLabel: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  toolBtnValue: {
    color: PremiumPalette.textOnDark,
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: { color: PremiumPalette.danger, fontSize: 13, paddingHorizontal: 2 },
  listHost: {
    flex: 1,
    minHeight: 0,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  listContent: {
    paddingBottom: 88,
    flexGrow: 1,
  },
});
