import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import {
    PIN_PAD_LENGTH,
    PinPad,
} from "@/features/auth/presentation/components/PinPad";
import { useAuthStore } from "@/features/auth/presentation/store/authStore";
import { useDashboardStore } from "@/features/dashboard/presentation/store/dashboardStore";
import { etiquetaJerarquiaRol } from "@/shared/config/hierarchyAccess";
import { ModuloCodigo } from "@/shared/infrastructure/database/schema";
import { PremiumPalette } from "@/shared/presentation/ui/premiumPalette";
import {
    SocialCard,
    SocialEmpty,
    SocialFormField,
    SocialFormScreen,
    SocialHeader,
    SocialInput,
    SocialOptionPicker,
    SocialPrimaryButton,
} from "@/shared/presentation/ui/socialUi";
import { SocialVoiceInput } from "@/shared/presentation/ui/SocialVoiceInput";

import type { OpcionesRegistroUsuario } from "../../application/use-cases/ObtenerOpcionesRegistroUsuario";
import { useUsuariosUseCases } from "../hooks/useUsuariosUseCases";

type PinStep = "pin" | "confirmacion";

export function NuevoUsuarioScreen() {
  const router = useRouter();

  const usuario = useAuthStore((s) => s.usuarioActual);
  const rol = useAuthStore((s) => s.rolActual);
  const permissionService = useAuthStore((s) => s.permissionService);
  const tieneAcceso = useAuthStore((s) => s.tieneAcceso);

  const { crearUsuarioLocal, obtenerOpcionesRegistroUsuario } =
    useUsuariosUseCases();

  const [opciones, setOpciones] = useState<OpcionesRegistroUsuario | null>(
    null,
  );
  const [isLoadingOpciones, setIsLoadingOpciones] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [nombre, setNombre] = useState("");
  const [roleId, setRoleId] = useState<string | null>(null);
  const [organizacionId, setOrganizacionId] = useState<string | null>(null);
  const [pinStep, setPinStep] = useState<PinStep>("pin");
  const [pin, setPin] = useState("");
  const [pinConfirmacion, setPinConfirmacion] = useState("");

  const puedeAcceder = tieneAcceso(ModuloCodigo.USUARIOS);

  useEffect(() => {
    if (!usuario || !rol || !permissionService || !puedeAcceder) {
      setIsLoadingOpciones(false);
      return;
    }

    let mounted = true;

    async function cargarOpciones() {
      try {
        const data = await obtenerOpcionesRegistroUsuario.execute(
          usuario!,
          rol!,
          permissionService!,
        );
        if (!mounted) {
          return;
        }

        setOpciones(data);
        const primerRol = data.roles[0] ?? null;
        setRoleId(primerRol?.id ?? null);
        const primerOrg = primerRol
          ? data.organizacionesPorRol[primerRol.id]?.[0]
          : null;
        setOrganizacionId(primerOrg?.id ?? null);
      } catch (error) {
        if (mounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar las opciones",
          );
        }
      } finally {
        if (mounted) {
          setIsLoadingOpciones(false);
        }
      }
    }

    void cargarOpciones();

    return () => {
      mounted = false;
    };
  }, [
    obtenerOpcionesRegistroUsuario,
    permissionService,
    puedeAcceder,
    rol,
    usuario,
  ]);

  const rolSeleccionado =
    opciones?.roles.find((item) => item.id === roleId) ?? null;
  const organizacionesDisponibles = useMemo(() => {
    if (!opciones || !roleId) {
      return [];
    }
    return opciones.organizacionesPorRol[roleId] ?? [];
  }, [opciones, roleId]);

  useEffect(() => {
    if (organizacionesDisponibles.length === 0) {
      setOrganizacionId(null);
      return;
    }

    if (
      !organizacionId ||
      !organizacionesDisponibles.some((org) => org.id === organizacionId)
    ) {
      setOrganizacionId(organizacionesDisponibles[0]?.id ?? null);
    }
  }, [organizacionId, organizacionesDisponibles]);

  const rolOptions = useMemo(
    () =>
      (opciones?.roles ?? []).map((item) => ({
        id: item.id,
        label: item.nombre,
        subtitle: item.codigo,
      })),
    [opciones?.roles],
  );

  const orgOptions = useMemo(
    () =>
      organizacionesDisponibles.map((org) => ({
        id: org.id,
        label: org.nombre,
        subtitle: org.codigoInterno,
      })),
    [organizacionesDisponibles],
  );

  const handlePinChange = (value: string) => {
    if (pinStep === "pin") {
      setPin(value);
      if (value.length === PIN_PAD_LENGTH) {
        setPinStep("confirmacion");
      }
      return;
    }

    setPinConfirmacion(value);
  };

  const pinActual = pinStep === "pin" ? pin : pinConfirmacion;

  const handleGuardar = useCallback(async () => {
    if (!usuario || !rol || !permissionService || !roleId || !organizacionId) {
      return;
    }

    if (username.trim().length < 3) {
      setErrorMessage("Ingresa un usuario válido (mínimo 3 caracteres)");
      return;
    }

    if (nombre.trim().length < 3) {
      setErrorMessage("Ingresa un nombre completo válido");
      return;
    }

    if (
      pin.length !== PIN_PAD_LENGTH ||
      pinConfirmacion.length !== PIN_PAD_LENGTH
    ) {
      setErrorMessage("Completa y confirma el PIN de 4 dígitos");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await crearUsuarioLocal.execute(
        { username, nombre, roleId, organizacionId, pin, pinConfirmacion },
        usuario,
        rol,
        permissionService,
      );

      useDashboardStore.getState().bumpRefresh();

      Alert.alert(
        "Usuario registrado",
        `${nombre.trim()} puede iniciar sesión con el usuario "${username.trim().toLowerCase()}".`,
        [{ text: "Entendido", onPress: () => router.back() }],
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo registrar el usuario",
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    crearUsuarioLocal,
    nombre,
    username,
    organizacionId,
    permissionService,
    pin,
    pinConfirmacion,
    roleId,
    rol,
    router,
    usuario,
  ]);

  if (!puedeAcceder) {
    return (
      <SocialFormScreen keyboard={false}>
        <SocialEmpty
          icon="🔒"
          title="Acceso restringido"
          message="Tu rol no tiene permiso para registrar usuarios locales."
        />
        <SocialPrimaryButton
          label="Volver"
          onPress={() => router.back()}
          variant="accent"
        />
      </SocialFormScreen>
    );
  }

  if (isLoadingOpciones) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={PremiumPalette.primary} />
      </View>
    );
  }

  return (
    <SocialFormScreen>
      <SocialHeader
        title="Nuevo usuario"
        subtitle="Crea un acceso local con PIN bajo tu jurisdicción"
        badge="Paso 1/2"
      />

      <SocialCard>
        <SocialFormField
          label="Usuario de acceso"
          hint="Letras minúsculas, números, puntos o guiones. Se usa para iniciar sesión."
        >
          <SocialInput
            value={username}
            onChangeText={(value) => {
              setUsername(value.toLowerCase());
              setErrorMessage(null);
            }}
            placeholder="Ej: maria.encargada"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </SocialFormField>

        <SocialFormField label="Nombre completo" hint="Toca 🎙️ para dictar.">
          <SocialVoiceInput
            value={nombre}
            onChangeText={(value) => {
              setNombre(value);
              setErrorMessage(null);
            }}
            placeholder="Ej: María Encargada"
            autoCapitalize="words"
          />
        </SocialFormField>

        <SocialFormField label="Rol asignado">
          <SocialOptionPicker
            options={rolOptions}
            selectedId={roleId}
            onSelect={setRoleId}
            placeholder="Seleccionar rol"
            modalTitle="Rol del nuevo usuario"
          />
        </SocialFormField>

        <SocialFormField
          label="Organización"
          hint={
            rolSeleccionado
              ? `Asigna la ${etiquetaJerarquiaRol(rolSeleccionado.codigo).toLowerCase()} que gestionará este usuario. Puede haber varios usuarios en la misma organización.`
              : "Selecciona primero un rol."
          }
        >
          <SocialOptionPicker
            options={orgOptions}
            selectedId={organizacionId}
            onSelect={setOrganizacionId}
            placeholder="Sin organizaciones disponibles"
            disabled={organizacionesDisponibles.length === 0}
            modalTitle="Organización asignada"
          />
        </SocialFormField>
      </SocialCard>

      <SocialCard>
        <SocialFormField
          label={pinStep === "pin" ? "PIN de acceso" : "Confirmar PIN"}
          hint={
            pinStep === "pin"
              ? "4 dígitos para iniciar sesión en este dispositivo."
              : "Repite el mismo PIN para confirmar."
          }
        >
          <PinPad
            value={pinActual}
            onChange={handlePinChange}
            disabled={isSaving}
          />
        </SocialFormField>

        {pinStep === "confirmacion" ? (
          <Pressable
            onPress={() => {
              setPinStep("pin");
              setPinConfirmacion("");
            }}
          >
            <Text style={styles.link}>Cambiar PIN inicial</Text>
          </Pressable>
        ) : null}
      </SocialCard>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <SocialPrimaryButton
        label="Guardar usuario"
        loading={isSaving}
        onPress={() => void handleGuardar()}
      />
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
  link: { color: PremiumPalette.primary, fontSize: 13, fontWeight: "600" },
  error: { color: PremiumPalette.danger, fontSize: 13, textAlign: "center" },
});
