import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { useAuthStore } from '@/features/auth/presentation/store/authStore';
import { useDashboardStore } from '@/features/dashboard/presentation/store/dashboardStore';
import type { NivelOrganizacionCodigo } from '@/shared/config/hierarchy';
import {
  etiquetaNivelOrganizacion,
  nivelOrganizacionIdParaCodigo,
  parentNivelRequerido,
} from '@/shared/config/hierarchyAccess';
import { UserRoleCodigo } from '@/shared/infrastructure/database/schema';
import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';
import {
  SocialCard,
  SocialFormField,
  SocialFormScreen,
  SocialHeader,
  SocialInfoBanner,
  SocialOptionPicker,
  SocialPrimaryButton,
} from '@/shared/presentation/ui/socialUi';
import { SocialVoiceInput } from '@/shared/presentation/ui/SocialVoiceInput';

import type { Organizacion } from '../../domain/entities/Organizacion';
import { useOrganizacionesUseCases } from '../hooks/useOrganizacionesUseCases';
import { useOrganizacionesStore } from '../store/organizacionesStore';

type FormState = {
  nombre: string;
  direccion: string;
  ciudad: string;
  provincia: string;
};

const emptyForm: FormState = {
  nombre: '',
  direccion: '',
  ciudad: '',
  provincia: '',
};

type FormularioOrganizacionScreenProps = {
  nivel: NivelOrganizacionCodigo;
};

export function FormularioOrganizacionScreen({ nivel }: FormularioOrganizacionScreenProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; parentId?: string }>();
  const isEditing = Boolean(params.id);
  const etiqueta = etiquetaNivelOrganizacion(nivel);
  const requiereParent = parentNivelRequerido(nivel) !== null;

  const {
    repository,
    administrarOrganizacion,
    crearCapilla,
    crearParroquia,
    crearCatedral,
    obtenerEstructuraEclesial,
  } = useOrganizacionesUseCases();

  const usuario = useAuthStore((s) => s.usuarioActual);
  const rol = useAuthStore((s) => s.rolActual);
  const permissionService = useAuthStore((s) => s.permissionService);

  const estructura = useOrganizacionesStore((s) => s.estructura);
  const cargarEstructura = useOrganizacionesStore((s) => s.cargarEstructura);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [ubicacionId, setUbicacionId] = useState<string | undefined>();
  const [codigoInternoActual, setCodigoInternoActual] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(
    requiereParent ? (params.parentId ?? null) : null,
  );
  const [parentOptions, setParentOptions] = useState<Organizacion[]>([]);
  const [parentBloqueado, setParentBloqueado] = useState(false);
  const [parentNombreBloqueado, setParentNombreBloqueado] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const parentNivelCodigo = parentNivelRequerido(nivel);
  const parentNivelId = parentNivelCodigo ? nivelOrganizacionIdParaCodigo(parentNivelCodigo) : null;

  useEffect(() => {
    if (!usuario || !rol || !requiereParent || !parentNivelId) {
      return;
    }

    let mounted = true;

    async function cargarPadres() {
      try {
        if (rol!.codigo === UserRoleCodigo.PARROCO && nivel === 'capilla') {
          const parroquia = await repository.obtenerPorId(usuario!.organizacionId);
          if (!mounted) {
            return;
          }
          setParentId(usuario!.organizacionId);
          setParentNombreBloqueado(parroquia?.nombre ?? 'Parroquia asignada');
          setParentBloqueado(true);
          return;
        }

        if (rol!.codigo === UserRoleCodigo.OBISPO && nivel === 'parroquia') {
          const catedral = await repository.obtenerPorId(usuario!.organizacionId);
          if (!mounted) {
            return;
          }
          setParentId(usuario!.organizacionId);
          setParentNombreBloqueado(catedral?.nombre ?? 'Catedral asignada');
          setParentBloqueado(true);
          return;
        }

        const subarbol = await repository.obtenerSubarbol(usuario!.organizacionId);
        const padres = subarbol.filter((org) => org.nivelId === parentNivelId && org.activo);

        if (!mounted) {
          return;
        }

        setParentOptions(padres);
        const inicial = params.parentId ?? padres[0]?.id ?? null;
        setParentId(inicial);
      } catch (error) {
        if (mounted) {
          setErrorMessage(
            error instanceof Error ? error.message : 'No se pudo cargar organizaciones padre',
          );
        }
      }
    }

    void cargarPadres();

    return () => {
      mounted = false;
    };
  }, [nivel, params.parentId, parentNivelId, repository, requiereParent, rol, usuario]);

  useEffect(() => {
    if (!isEditing || !params.id) {
      return;
    }

    let mounted = true;

    async function loadOrg() {
      try {
        const org = await repository.obtenerPorId(params.id!);
        const ubicacion = org ? await repository.obtenerUbicacion(org.id) : null;

        if (!mounted || !org) {
          return;
        }

        setParentId(org.parentId);
        setCodigoInternoActual(org.codigoInterno);
        setForm({
          nombre: org.nombre,
          direccion: ubicacion?.direccion ?? '',
          ciudad: ubicacion?.ciudad ?? '',
          provincia: ubicacion?.provincia ?? '',
        });
        setUbicacionId(ubicacion?.id);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadOrg();

    return () => {
      mounted = false;
    };
  }, [isEditing, params.id, repository]);

  const parentPickerOptions = useMemo(
    () =>
      parentOptions.map((org) => ({
        id: org.id,
        label: org.nombre,
        subtitle: org.codigoInterno,
      })),
    [parentOptions],
  );

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrorMessage(null);
  };

  const direccionObligatoria = nivel === 'capilla';

  const handleGuardar = useCallback(async () => {
    if (!usuario || !rol || !permissionService) {
      return;
    }

    if (requiereParent && !parentId) {
      setErrorMessage(`Debe indicarse la ${etiquetaNivelOrganizacion(parentNivelCodigo!)} padre`);
      return;
    }

    if (!form.nombre.trim()) {
      setErrorMessage('El nombre es obligatorio');
      return;
    }

    if (direccionObligatoria && !form.direccion.trim()) {
      setErrorMessage('Sector o referencia geográfica es obligatorio para capillas');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (isEditing && params.id) {
        await administrarOrganizacion.guardar(
          {
            id: params.id,
            nivelId: nivelOrganizacionIdParaCodigo(nivel),
            parentId: requiereParent ? parentId : null,
            nombre: form.nombre,
            activo: true,
            ubicacion: form.direccion.trim()
              ? {
                  id: ubicacionId,
                  direccion: form.direccion,
                  ciudad: form.ciudad || null,
                  provincia: form.provincia || null,
                  latitud: null,
                  longitud: null,
                }
              : undefined,
          },
          usuario,
          rol,
          permissionService,
        );
      } else if (nivel === 'diocesis') {
        await crearCatedral.execute(
          {
            nombre: form.nombre,
            direccion: form.direccion,
            ciudad: form.ciudad,
            provincia: form.provincia,
          },
          usuario,
          rol,
          permissionService,
        );
      } else if (nivel === 'parroquia') {
        await crearParroquia.execute(
          {
            parentId: parentId!,
            nombre: form.nombre,
            direccion: form.direccion,
            ciudad: form.ciudad,
            provincia: form.provincia,
          },
          usuario,
          rol,
          permissionService,
        );
      } else {
        await crearCapilla.execute(
          {
            parentId: parentId!,
            nombre: form.nombre,
            sectorReferencia: form.direccion,
            ciudad: form.ciudad,
            provincia: form.provincia,
          },
          usuario,
          rol,
          permissionService,
        );
      }

      if (estructura && permissionService) {
        await cargarEstructura(usuario, rol, permissionService, obtenerEstructuraEclesial);
      }

      useDashboardStore.getState().bumpRefresh();

      Alert.alert(
        isEditing ? `${etiqueta} actualizada` : `${etiqueta} registrada`,
        isEditing
          ? 'Los datos se guardaron correctamente.'
          : `La nueva ${etiqueta.toLowerCase()} ya forma parte de la jerarquía.`,
        [{ text: 'Entendido', onPress: () => router.back() }],
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  }, [
    administrarOrganizacion,
    cargarEstructura,
    crearCapilla,
    crearCatedral,
    crearParroquia,
    direccionObligatoria,
    estructura,
    etiqueta,
    form,
    isEditing,
    nivel,
    obtenerEstructuraEclesial,
    params.id,
    parentId,
    parentNivelCodigo,
    permissionService,
    requiereParent,
    rol,
    router,
    ubicacionId,
    usuario,
  ]);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={PremiumPalette.primary} />
      </View>
    );
  }

  const parentLabel =
    parentNivelCodigo === 'diocesis'
      ? 'Catedral jurisdiccional'
      : parentNivelCodigo === 'parroquia'
        ? 'Parroquia jurisdiccional'
        : null;

  return (
    <SocialFormScreen>
      <SocialHeader
        title={isEditing ? `Editar ${etiqueta.toLowerCase()}` : `Nueva ${etiqueta.toLowerCase()}`}
        subtitle={
          nivel === 'diocesis'
            ? 'Sede diocesana · consolida parroquias y capillas'
            : nivel === 'parroquia'
              ? 'Depende de una catedral · consolida sus capillas'
              : 'Depende de una parroquia · inventario y finanzas locales'
        }
        badge={isEditing ? 'Edición' : 'Alta'}
      />

      <SocialCard>
        {requiereParent && parentLabel ? (
          <SocialFormField label={parentLabel}>
            {parentBloqueado ? (
              <SocialInfoBanner
                accent
                title={parentNombreBloqueado ?? 'Organización padre'}
                message="Asignada automáticamente según tu rol y alcance."
              />
            ) : (
              <SocialOptionPicker
                options={parentPickerOptions}
                selectedId={parentId}
                onSelect={setParentId}
                placeholder={`Seleccionar ${etiquetaNivelOrganizacion(parentNivelCodigo!)}`}
                modalTitle={parentLabel}
              />
            )}
          </SocialFormField>
        ) : null}

        <SocialFormField label="Nombre" hint="Toca 🎙️ para dictar.">
          <SocialVoiceInput
            value={form.nombre}
            onChangeText={(v) => updateField('nombre', v)}
            placeholder={`Nombre de la ${etiqueta.toLowerCase()}`}
            autoCapitalize="words"
          />
        </SocialFormField>

        {isEditing && codigoInternoActual ? (
          <SocialInfoBanner
            title={`Código interno: ${codigoInternoActual}`}
            message="Asignado automáticamente al crear la organización."
          />
        ) : null}
      </SocialCard>

      <SocialCard>
        <SocialFormField
          label={nivel === 'capilla' ? 'Sector / referencia' : 'Dirección'}
          hint={direccionObligatoria ? 'Obligatorio para capillas. Toca 🎙️ para dictar.' : 'Opcional. Toca 🎙️ para dictar.'}
        >
          <SocialVoiceInput
            value={form.direccion}
            onChangeText={(v) => updateField('direccion', v)}
            placeholder="Barrio, calle o referencia geográfica"
          />
        </SocialFormField>

        <SocialFormField label="Ciudad" hint="Toca 🎙️ para dictar.">
          <SocialVoiceInput
            value={form.ciudad}
            onChangeText={(v) => updateField('ciudad', v)}
            placeholder="Quito"
          />
        </SocialFormField>

        <SocialFormField label="Provincia" hint="Toca 🎙️ para dictar.">
          <SocialVoiceInput
            value={form.provincia}
            onChangeText={(v) => updateField('provincia', v)}
            placeholder="Pichincha"
          />
        </SocialFormField>
      </SocialCard>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <SocialPrimaryButton
        label={isEditing ? 'Guardar cambios' : `Registrar ${etiqueta.toLowerCase()}`}
        loading={isSaving}
        onPress={() => void handleGuardar()}
        variant={nivel === 'diocesis' ? 'primary' : 'accent'}
      />
    </SocialFormScreen>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PremiumPalette.canvas,
  },
  error: { color: PremiumPalette.danger, fontSize: 13, textAlign: 'center' },
});
