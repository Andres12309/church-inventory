import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { AnimatedIcon } from "@/components/animated-icon";
import { AppActivityIndicator } from "@/shared/presentation/ui/AppActivityIndicator";
import { APP_SPLASH_ICON_SIZE } from "@/shared/constants/appBranding";
import { PremiumPalette } from "@/shared/presentation/ui/premiumPalette";
import { SocialCard, SocialScreen } from "@/shared/presentation/ui/socialUi";

import { InvalidPinError } from "../../domain/errors/InvalidPinError";
import { getRememberedUsernames, removeRememberedUsername } from "../../infrastructure/RememberedUsernamesStorage";
import { LoginUsernameField } from "../components/LoginUsernameField";
import { PIN_PAD_LENGTH, PinPad } from "../components/PinPad";
import { useAuthUseCases } from "../hooks/useAuthUseCases";
import { AUTH_ROUTES } from "../routes";
import { useAuthStore } from "../store/authStore";

export function LoginScreen() {
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const { repository, autenticarConPin } = useAuthUseCases();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const errorMessage = useAuthStore((state) => state.errorMessage);
  const clearError = useAuthStore((state) => state.clearError);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [rememberedUsernames, setRememberedUsernames] = useState<string[]>([]);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(AUTH_ROUTES.protectedHome);
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        await repository.ensureDefaultAdmin();
        const saved = await getRememberedUsernames();
        if (mounted) {
          setRememberedUsernames(saved);
          setUsername(saved[0] ?? "");
        }
      } finally {
        if (mounted) {
          setBootstrapping(false);
        }
      }
    }

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, [repository]);

  const canSubmit = username.trim().length > 0 && pin.length === PIN_PAD_LENGTH;

  const handleLogin = useCallback(async () => {
    if (!canSubmit) {
      return;
    }

    try {
      await login(username.trim(), pin, rememberMe, autenticarConPin);
      router.replace(AUTH_ROUTES.protectedHome);
    } catch (error) {
      if (error instanceof InvalidPinError) {
        setPin("");
      }
    }
  }, [autenticarConPin, canSubmit, login, pin, rememberMe, router, username]);

  useEffect(() => {
    if (canSubmit && !isLoading) {
      void handleLogin();
    }
  }, [canSubmit, handleLogin, isLoading]);

  const handleUsernameChange = (nextUsername: string) => {
    setUsername(nextUsername);
    if (errorMessage) {
      clearError();
    }
  };

  const handlePinChange = (nextPin: string) => {
    setPin(nextPin);
    if (errorMessage) {
      clearError();
    }
  };

  const handleRemoveRemembered = useCallback(async (entry: string) => {
    const next = await removeRememberedUsername(entry);
    setRememberedUsernames(next);
    if (entry.trim().toLowerCase() === username.trim().toLowerCase()) {
      setUsername("");
      setPin("");
    }
  }, [username]);

  const logoSize = useMemo(() => {
    if (windowHeight < 640) {
      return 56;
    }
    if (windowHeight < 740) {
      return APP_SPLASH_ICON_SIZE;
    }
    return 88;
  }, [windowHeight]);

  if (bootstrapping) {
    return (
      <View style={styles.centered}>
        <AppActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SocialScreen scroll="auto" edges={["top", "left", "right", "bottom"]} contentStyle={styles.screenContent}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <AnimatedIcon size={logoSize} />
          <Text style={[styles.title, windowHeight < 700 && styles.titleCompact]}>Fieles Bienes</Text>
          <Text style={styles.subtitle}>
            Inventario y finanzas eclesiásticas · ingresa usuario y PIN
          </Text>
        </View>

        <SocialCard>
          <Text style={styles.sectionLabel}>Usuario</Text>
          <LoginUsernameField
            value={username}
            onChange={handleUsernameChange}
            rememberedUsernames={rememberedUsernames}
            onRemoveRemembered={handleRemoveRemembered}
            disabled={isLoading}
          />

          <Text style={styles.sectionLabel}>PIN de acceso</Text>
          <PinPad
            value={pin}
            onChange={handlePinChange}
            disabled={isLoading || username.trim().length === 0}
          />

          <Pressable
            style={styles.rememberRow}
            onPress={() => setRememberMe((value) => !value)}
            disabled={isLoading}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: rememberMe }}
          >
            <Switch
              value={rememberMe}
              onValueChange={setRememberMe}
              disabled={isLoading}
              trackColor={{
                false: PremiumPalette.surfaceMuted,
                true: "rgba(79, 70, 229, 0.35)",
              }}
              thumbColor={
                rememberMe
                  ? PremiumPalette.primary
                  : PremiumPalette.textMutedOnDark
              }
            />
            <Text style={styles.rememberLabel}>Recordarme</Text>
          </Pressable>

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
          {isLoading ? <AppActivityIndicator style={styles.loader} /> : null}
        </SocialCard>
      </KeyboardAvoidingView>
    </SocialScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 12 },
  screenContent: {
    paddingBottom: 16,
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PremiumPalette.canvas,
  },
  header: { alignItems: "center", gap: 6, paddingTop: 4 },
  title: {
    color: PremiumPalette.textOnDark,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  titleCompact: {
    fontSize: 24,
  },
  subtitle: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  sectionLabel: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  rememberLabel: {
    color: PremiumPalette.textSoftOnDark,
    fontSize: 14,
    fontWeight: "600",
  },
  errorText: {
    color: PremiumPalette.danger,
    textAlign: "center",
    fontSize: 13,
  },
  loader: { marginTop: 8 },
});
