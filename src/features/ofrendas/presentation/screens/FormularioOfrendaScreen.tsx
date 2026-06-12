import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuthStore } from '@/features/auth/presentation/store/authStore';
import { ModuloCodigo } from '@/shared/infrastructure/database/schema';
import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';
import {
  PillFilterRow,
  SocialCard,
  SocialDangerLink,
  SocialEmpty,
  SocialFormField,
  SocialFormScreen,
  SocialHeader,
  SocialInput,
  SocialPrimaryButton,
} from '@/shared/presentation/ui/socialUi';
import { SocialVoiceInput } from '@/shared/presentation/ui/SocialVoiceInput';

import { obtenerFechaHoyIso } from '../../application/services/OfrendaAccessPolicy';
import { useOfrendasUseCases } from '../hooks/useOfrendasUseCases';
import { useOfrendasStore } from '../store/ofrendasStore';

export function FormularioOfrendaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; orgId?: string }>();
  const isEditing = Boolean(params.id);

  const usuario = useAuthStore((s) => s.usuarioActual);
  const rol = useAuthStore((s) => s.rolActual);
  const permissionService = useAuthStore((s) => s.permissionService);
  const tieneAcceso = useAuthStore((s) => s.tieneAcceso(ModuloCodigo.OFRENDAS));

  const { consultarFinanzas, registrarRecaudacion } = useOfrendasUseCases();

  const tiposActividad = useOfrendasStore((s) => s.tiposActividad);
  const formulario = useOfrendasStore((s) => s.formulario);
  const isSaving = useOfrendasStore((s) => s.isSaving);
  const errorMessage = useOfrendasStore((s) => s.errorMessage);
  const cargarCatalogo = useOfrendasStore((s) => s.cargarCatalogo);
  const iniciarFormulario = useOfrendasStore((s) => s.iniciarFormulario);
  const actualizarFormulario = useOfrendasStore((s) => s.actualizarFormulario);
  const guardarFormulario = useOfrendasStore((s) => s.guardarFormulario);
  const eliminarOfrenda = useOfrendasStore((s) => s.eliminarOfrenda);
  const clearError = useOfrendasStore((s) => s.clearError);

  const [isLoading, setIsLoading] = useState(isEditing);

  useEffect(() => {
    if (!permissionService) {
      return;
    }
    void cargarCatalogo(permissionService, consultarFinanzas);
  }, [cargarCatalogo, consultarFinanzas, permissionService]);

  useEffect(() => {
    if (!usuario || !rol || !permissionService) {
      return;
    }

    const orgId = params.orgId;
    if (!orgId) {
      return;
    }

    if (!isEditing) {
      iniciarFormulario(orgId);
      setIsLoading(false);
      return;
    }

    let mounted = true;

    async function loadOfrenda() {
      try {
        const ofrenda = await consultarFinanzas.obtenerRecaudacion(
          params.id!,
          usuario!,
          rol!,
          permissionService!,
        );
        if (mounted) {
          iniciarFormulario(orgId!, ofrenda);
        }
      } catch (error) {
        if (mounted) {
          const message =
            error instanceof Error ? error.message : 'No se pudo cargar la recaudación';
          Alert.alert('Error', message, [{ text: 'Volver', onPress: () => router.back() }]);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadOfrenda();

    return () => {
      mounted = false;
    };
  }, [
    consultarFinanzas,
    iniciarFormulario,
    isEditing,
    params.id,
    params.orgId,
    permissionService,
    rol,
    router,
    usuario,
  ]);

  const updateField = useCallback(
    <K extends keyof NonNullable<typeof formulario>>(field: K, value: NonNullable<typeof formulario>[K]) => {
      actualizarFormulario({ [field]: value });
    },
    [actualizarFormulario],
  );

  const handleGuardar = async () => {
    if (!usuario || !rol || !permissionService || !formulario) {
      return;
    }

    try {
      await guardarFormulario(usuario, rol, permissionService, registrarRecaudacion);
      router.back();
    } catch {
      // errorMessage en store
    }
  };

  const handleEliminar = () => {
    if (!params.id || !usuario || !rol || !permissionService) {
      return;
    }

    Alert.alert('Eliminar recaudación', '¿Deseas eliminar este ingreso del historial?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void eliminarOfrenda(
            params.id!,
            usuario,
            rol,
            permissionService,
            registrarRecaudacion,
          ).then(() => {
            router.back();
          });
        },
      },
    ]);
  };

  const usarFechaHoy = () => {
    updateField('fecha', obtenerFechaHoyIso());
    clearError();
  };

  if (!tieneAcceso) {
    return (
      <SocialFormScreen keyboard={false}>
        <SocialEmpty icon="🔒" title="Sin acceso" message="Tu rol no puede registrar finanzas." />
      </SocialFormScreen>
    );
  }

  if (isLoading || !formulario) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={PremiumPalette.primary} />
      </View>
    );
  }

  return (
    <SocialFormScreen>
      <SocialHeader
        title={isEditing ? 'Editar ingreso' : 'Nuevo ingreso'}
        subtitle="Registra ofrendas y recaudaciones de la capilla"
        badge={isEditing ? 'Edición' : 'Alta'}
      />

      <SocialCard>
        <SocialFormField label="Monto (USD)">
          <SocialInput
            value={formulario.monto}
            onChangeText={(text) => updateField('monto', text.replace(/[^0-9.,]/g, ''))}
            placeholder="0.00"
            keyboardType="decimal-pad"
            style={styles.montoInput}
          />
        </SocialFormField>

        <SocialFormField label="Tipo de actividad">
          <PillFilterRow
            options={tiposActividad.map((tipo) => ({ id: tipo.id, label: tipo.nombre }))}
            selectedId={formulario.tipoActividadId}
            onSelect={(id) => id && updateField('tipoActividadId', id)}
          />
        </SocialFormField>
      </SocialCard>

      <SocialCard>
        <SocialFormField label="Fecha">
          <View style={styles.fechaRow}>
            <SocialInput
              value={formulario.fecha}
              onChangeText={(text) => updateField('fecha', text)}
              placeholder="YYYY-MM-DD"
              style={styles.fechaInput}
            />
            <Pressable onPress={usarFechaHoy} style={styles.hoyBtn}>
              <Text style={styles.hoyBtnText}>Hoy</Text>
            </Pressable>
          </View>
        </SocialFormField>

        <SocialFormField label="Nota / descripción" hint="Toca 🎙️ para dictar.">
          <SocialVoiceInput
            multiline
            value={formulario.descripcion}
            onChangeText={(text) => updateField('descripcion', text)}
            placeholder='Ej. "Colecta misa de confirmación 10:00 AM"'
          />
        </SocialFormField>
      </SocialCard>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <SocialPrimaryButton
        label="Guardar recaudación"
        loading={isSaving}
        onPress={() => void handleGuardar()}
        variant="accent"
      />

      {isEditing ? (
        <SocialDangerLink
          label="Eliminar del historial"
          onPress={handleEliminar}
          disabled={isSaving}
        />
      ) : null}
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
  montoInput: { fontSize: 28, fontWeight: '800', color: PremiumPalette.accent },
  fechaRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  fechaInput: { flex: 1 },
  hoyBtn: {
    backgroundColor: PremiumPalette.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  hoyBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  error: { color: PremiumPalette.danger, fontSize: 13, textAlign: 'center' },
});
