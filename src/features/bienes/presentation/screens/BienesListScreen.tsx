import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuthStore } from '@/features/auth/presentation/store/authStore';
import { resolverOrganizacionPorDefecto } from '@/features/bienes/application/services/BienAccessPolicy';
import { useOrganizacionesUseCases } from '@/features/organizaciones/presentation/hooks/useOrganizacionesUseCases';
import { useOrganizacionesStore } from '@/features/organizaciones/presentation/store/organizacionesStore';
import { puedeElegirOrganizacionEnCrud } from '@/shared/config/hierarchyAccess';
import { BienEstado, ModuloCodigo } from '@/shared/infrastructure/database/schema';
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
import { SocialVoiceSearchBar } from '@/shared/presentation/ui/SocialVoiceInput';

import { BienListItem } from '../components/BienListItem';
import { useBienesUseCases } from '../hooks/useBienesUseCases';
import { BIENES_ROUTES } from '../routes';
import { useBienesStore } from '../store/bienesStore';

const ESTADOS = Object.values(BienEstado);

export function BienesListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orgId?: string }>();

  const usuario = useAuthStore((s) => s.usuarioActual);
  const rol = useAuthStore((s) => s.rolActual);
  const permissionService = useAuthStore((s) => s.permissionService);
  const tieneAcceso = useAuthStore((s) => s.tieneAcceso(ModuloCodigo.INVENTARIO_BIENES));

  const capillas = useOrganizacionesStore((s) => s.capillas);
  const cargarEstructura = useOrganizacionesStore((s) => s.cargarEstructura);
  const { consultarInventario } = useBienesUseCases();
  const { obtenerEstructuraEclesial } = useOrganizacionesUseCases();

  const organizacionId = useBienesStore((s) => s.organizacionId);
  const bienes = useBienesStore((s) => s.bienes);
  const categorias = useBienesStore((s) => s.categorias);
  const busqueda = useBienesStore((s) => s.busqueda);
  const filtroCategoriaId = useBienesStore((s) => s.filtroCategoriaId);
  const filtroEstado = useBienesStore((s) => s.filtroEstado);
  const isLoading = useBienesStore((s) => s.isLoading);
  const errorMessage = useBienesStore((s) => s.errorMessage);
  const setOrganizacionId = useBienesStore((s) => s.setOrganizacionId);
  const setBusqueda = useBienesStore((s) => s.setBusqueda);
  const setFiltroCategoriaId = useBienesStore((s) => s.setFiltroCategoriaId);
  const setFiltroEstado = useBienesStore((s) => s.setFiltroEstado);
  const cargarCatalogo = useBienesStore((s) => s.cargarCatalogo);
  const cargarInventario = useBienesStore((s) => s.cargarInventario);

  const puedeElegirCapilla = rol ? puedeElegirOrganizacionEnCrud(rol.codigo) : false;

  const categoriasMap = useMemo(
    () => Object.fromEntries(categorias.map((c) => [c.id, c])),
    [categorias],
  );

  const capillaOpciones = useMemo(
    (): PillOption[] =>
      capillas.map((n) => ({ id: n.organizacion.id, label: n.organizacion.nombre })),
    [capillas],
  );

  const categoriaPills = useMemo(
    (): PillOption[] => categorias.map((c) => ({ id: c.id, label: c.nombre })),
    [categorias],
  );

  const estadoPills = useMemo(
    (): PillOption[] =>
      ESTADOS.map((e) => ({ id: e, label: e.charAt(0).toUpperCase() + e.slice(1) })),
    [],
  );

  useEffect(() => {
    if (!usuario || !rol || !permissionService || !puedeElegirCapilla || capillas.length > 0) {
      return;
    }
    void cargarEstructura(usuario, rol, permissionService, obtenerEstructuraEclesial);
  }, [
    capillas.length,
    cargarEstructura,
    obtenerEstructuraEclesial,
    permissionService,
    puedeElegirCapilla,
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
    void cargarCatalogo(permissionService, consultarInventario);
  }, [cargarCatalogo, consultarInventario, permissionService]);

  const refresh = useCallback(() => {
    if (!usuario || !rol || !permissionService) {
      return;
    }
    void cargarInventario(usuario, rol, permissionService, consultarInventario);
  }, [cargarInventario, consultarInventario, permissionService, rol, usuario]);

  useEffect(() => {
    refresh();
  }, [refresh, organizacionId, busqueda, filtroCategoriaId, filtroEstado]);

  const capillaSeleccionada = capillas.find((c) => c.organizacion.id === organizacionId);

  const handleNuevo = () => {
    if (!organizacionId) {
      return;
    }
    router.push(BIENES_ROUTES.nuevo(organizacionId));
  };

  const handleEditar = (id: string) => {
    if (!organizacionId) {
      return;
    }
    router.push(BIENES_ROUTES.editar(id, organizacionId));
  };

  if (!tieneAcceso) {
    return (
      <SocialScreen scroll={false}>
        <SocialEmpty icon="🔒" title="Sin acceso" message="Tu rol no puede consultar el inventario." />
      </SocialScreen>
    );
  }

  return (
    <SocialScreen scroll={false} contentStyle={styles.body}>
      <SocialHeader
        title="Inventario"
        subtitle="Patrimonio material por capilla"
        showBack={false}
        badge={`${bienes.length} bienes`}
      />

      {puedeElegirCapilla && capillaOpciones.length > 0 ? (
        <PillFilterRow
          options={capillaOpciones}
          selectedId={organizacionId}
          onSelect={setOrganizacionId}
        />
      ) : capillaSeleccionada ? (
        <OrgScopeBanner
          label="Tu capilla"
          nombre={capillaSeleccionada.organizacion.nombre}
        />
      ) : null}

      <SocialVoiceSearchBar
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Buscar por nombre…"
      />

      {categoriaPills.length > 0 ? (
        <PillFilterRow
          options={categoriaPills}
          selectedId={filtroCategoriaId}
          onSelect={setFiltroCategoriaId}
          allowNull
          nullLabel="Todas"
        />
      ) : null}

      <PillFilterRow
        options={estadoPills}
        selectedId={filtroEstado}
        onSelect={(id) => setFiltroEstado(id as (typeof ESTADOS)[number] | null)}
        allowNull
        nullLabel="Estados"
      />

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      {isLoading && bienes.length === 0 && organizacionId ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={PremiumPalette.primary} />
        </View>
      ) : !organizacionId ? (
        <SocialEmpty
          icon="⛪"
          title="Selecciona una capilla"
          message="Elige una capilla para ver y gestionar su inventario."
        />
      ) : bienes.length === 0 && !isLoading ? (
        <SocialEmpty
          icon="📦"
          title="Sin bienes"
          message="No hay bienes con estos filtros. Toca + Registrar bien para agregar el primero."
        />
      ) : (
        <FlashList
          data={bienes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BienListItem
              bien={item}
              categoria={categoriasMap[item.categoriaId]}
              onPress={() => handleEditar(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {organizacionId ? (
        <FloatingActionButton label="+ Registrar bien" onPress={handleNuevo} />
      ) : null}
    </SocialScreen>
  );
}

const styles = StyleSheet.create({
  body: { flexGrow: 1, gap: 10 },
  error: { color: PremiumPalette.danger, fontSize: 13 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 180 },
  listContent: { paddingBottom: 88, flexGrow: 1 },
});
