import "@/shared/infrastructure/background/consolidationTask";
import "@/shared/infrastructure/background/purgeSyncChangesTask";
import "react-native-gesture-handler";
import "react-native-get-random-values";

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { AuthHydrator } from "@/features/auth/presentation/components/AuthHydrator";
import { ConsolidationBootstrap } from "@/shared/infrastructure/background/ConsolidationBootstrap";
import { DatabaseProvider } from "@/shared/infrastructure/database/DatabaseProvider";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider
        statusBarTranslucent
        navigationBarTranslucent
        preserveEdgeToEdge
      >
        <DatabaseProvider>
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <ConsolidationBootstrap />
            <AnimatedSplashOverlay />
            <AuthHydrator>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(protected)" />
              </Stack>
            </AuthHydrator>
          </ThemeProvider>
        </DatabaseProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
