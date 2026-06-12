import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";

import { useAuthStore } from "@/features/auth/presentation/store/authStore";
import {
    BienEstado,
    ModuloCodigo,
} from "@/shared/infrastructure/database/schema";
import { PremiumPalette } from "@/shared/presentation/ui/premiumPalette";
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
    SocialStepper,
} from "@/shared/presentation/ui/socialUi";
import { SocialVoiceInput } from "@/shared/presentation/ui/SocialVoiceInput";

import { FotoBienPicker } from "../components/FotoBienPicker";
import { useBienesUseCases } from "../hooks/useBienesUseCases";
import { useBienesStore } from "../store/bienesStore";

const ESTADOS = Object.values(BienEstado);

export function FormularioBienScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; orgId?: string }>();
  const isEditing = Boolean(params.id);

  const usuario = useAuthStore((s) => s.usuarioActual);
  const rol = useAuthStore((s) => s.rolActual);
  const permissionService = useAuthStore((s) => s.permissionService);
  const tieneAcceso = useAuthStore((s) =>
    s.tieneAcceso(ModuloCodigo.INVENTARIO_BIENES),
  );

  const { consultarInventario, gestionarBien } = useBienesUseCases();

  const categorias = useBienesStore((s) => s.categorias);
  const formulario = useBienesStore((s) => s.formulario);
  const isSaving = useBienesStore((s) => s.isSaving);
  const errorMessage = useBienesStore((s) => s.errorMessage);
  const cargarCatalogo = useBienesStore((s) => s.cargarCatalogo);
  const iniciarFormulario = useBienesStore((s) => s.iniciarFormulario);
  const actualizarFormulario = useBienesStore((s) => s.actualizarFormulario);
  const guardarFormulario = useBienesStore((s) => s.guardarFormulario);
  const eliminarBien = useBienesStore((s) => s.eliminarBien);
  const clearError = useBienesStore((s) => s.clearError);

  const [isLoading, setIsLoading] = useState(isEditing);

  const previewFotoUri = useMemo(() => {
    if (!formulario) {
      return null;
    }
    if (formulario.eliminarFoto) {
      return null;
    }
    return formulario.nuevaFotoTempUri ?? formulario.fotoUri;
  }, [formulario]);

  useEffect(() => {
    if (!permissionService) {
      return;
    }
    void cargarCatalogo(permissionService, consultarInventario);
  }, [cargarCatalogo, consultarInventario, permissionService]);

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

    async function loadBien() {
      try {
        const bien = await consultarInventario.obtenerBien(
          params.id!,
          usuario!,
          rol!,
          permissionService!,
        );
        if (mounted) {
          iniciarFormulario(orgId!, bien);
        }
      } catch (error) {
        if (mounted) {
          const message =
            error instanceof Error
              ? error.message
              : "No se pudo cargar el bien";
          Alert.alert("Error", message, [
            { text: "Volver", onPress: () => router.back() },
          ]);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadBien();

    return () => {
      mounted = false;
    };
  }, [
    consultarInventario,
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
    <K extends keyof NonNullable<typeof formulario>>(
      field: K,
      value: NonNullable<typeof formulario>[K],
    ) => {
      actualizarFormulario({ [field]: value });
    },
    [actualizarFormulario],
  );

  const handleGuardar = async () => {
    if (!usuario || !rol || !permissionService || !formulario) {
      return;
    }

    try {
      await guardarFormulario(usuario, rol, permissionService, gestionarBien);
      router.back();
    } catch {
      // errorMessage en store
    }
  };

  const handleEliminar = () => {
    if (!params.id || !usuario || !rol || !permissionService) {
      return;
    }

    Alert.alert("Eliminar bien", "¿Deseas eliminar este bien del inventario?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          void eliminarBien(
            params.id!,
            usuario,
            rol,
            permissionService,
            gestionarBien,
          ).then(() => {
            router.back();
          });
        },
      },
    ]);
  };

  if (!tieneAcceso) {
    return (
      <SocialFormScreen keyboard={false}>
        <SocialEmpty
          icon="🔒"
          title="Sin acceso"
          message="Tu rol no puede gestionar el inventario."
        />
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
        title={isEditing ? "Editar bien" : "Nuevo bien"}
        subtitle="Registra patrimonio material de la capilla"
        badge={isEditing ? "Edición" : "Alta"}
      />

      <SocialCard>
        <SocialFormField
          label="Nombre"
          hint="Toca 🎙️ para dictar el nombre del bien."
        >
          <SocialVoiceInput
            value={formulario.nombre}
            onChangeText={(text) => updateField("nombre", text)}
            placeholder="Ej. Crucifijo procesional"
          />
        </SocialFormField>

        <SocialFormField label="Categoría">
          <PillFilterRow
            options={categorias.map((cat) => ({
              id: cat.id,
              label: cat.nombre,
            }))}
            selectedId={formulario.categoriaId}
            onSelect={(id) => id && updateField("categoriaId", id)}
          />
        </SocialFormField>

        <SocialFormField label="Cantidad">
          <SocialStepper
            value={formulario.cantidad}
            onChange={(value) => updateField("cantidad", value)}
          />
        </SocialFormField>

        <SocialFormField label="Estado">
          <PillFilterRow
            options={ESTADOS.map((estado) => ({
              id: estado,
              label: estado.charAt(0).toUpperCase() + estado.slice(1),
            }))}
            selectedId={formulario.estado}
            onSelect={(id) =>
              id && updateField("estado", id as (typeof ESTADOS)[number])
            }
          />
        </SocialFormField>
      </SocialCard>

      <SocialCard>
        <SocialFormField label="Valor estimado (USD)">
          <SocialInput
            value={formulario.valorEstimado}
            onChangeText={(text) =>
              updateField("valorEstimado", text.replace(/[^0-9.,]/g, ""))
            }
            placeholder="0.00"
            keyboardType="decimal-pad"
            style={styles.montoInput}
          />
        </SocialFormField>

        <SocialFormField label="Descripción" hint="Toca 🎙️ para dictar.">
          <SocialVoiceInput
            multiline
            value={formulario.descripcion}
            onChangeText={(text) => updateField("descripcion", text)}
            placeholder="Detalle del bien, material, uso litúrgico…"
          />
        </SocialFormField>

        <SocialFormField label="Observaciones" hint="Toca 🎙️ para dictar.">
          <SocialVoiceInput
            multiline
            value={formulario.observaciones}
            onChangeText={(text) => updateField("observaciones", text)}
            placeholder="Notas de conservación o ubicación física…"
          />
        </SocialFormField>
      </SocialCard>

      <SocialCard>
        <FotoBienPicker
          fotoUri={previewFotoUri}
          disabled={isSaving}
          onChange={(uri) => {
            clearError();
            actualizarFormulario({
              nuevaFotoTempUri: uri,
              eliminarFoto: false,
            });
          }}
          onRemove={() => {
            actualizarFormulario({
              nuevaFotoTempUri: null,
              eliminarFoto: true,
            });
          }}
        />
      </SocialCard>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <SocialPrimaryButton
        label="Guardar bien"
        loading={isSaving}
        onPress={() => void handleGuardar()}
      />

      {isEditing ? (
        <SocialDangerLink
          label="Eliminar del inventario"
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PremiumPalette.canvas,
  },
  montoInput: { fontSize: 22, fontWeight: "700" },
  error: { color: PremiumPalette.danger, fontSize: 13, textAlign: "center" },
});
