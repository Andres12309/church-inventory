import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  APP_SPLASH_BACKGROUND,
  APP_SPLASH_ICON_SIZE,
} from "@/shared/constants/appBranding";
import { AppLogo } from "@/shared/presentation/ui/AppLogo";
import { PremiumPalette } from "@/shared/presentation/ui/premiumPalette";

import {
  WELCOME_MIN_DURATION_MS,
  buildWelcomeContent,
} from "../utils/welcomeContent";

type WelcomeBackScreenProps = {
  displayName: string;
  roleName: string | null;
  userId: string;
  onComplete: () => void;
};

function GlowOrb({ style }: { style: object }) {
  const pulse = useSharedValue(0.55);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.55, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: 0.92 + pulse.value * 0.12 }],
  }));

  return <Animated.View style={[styles.glowOrb, style, animatedStyle]} />;
}

function RunningSegment({
  trackWidth,
  phaseOffset,
  dimmed = false,
}: {
  trackWidth: SharedValue<number>;
  phaseOffset: number;
  dimmed?: boolean;
}) {
  const run = useSharedValue(phaseOffset);
  const blink = useSharedValue(1);

  useEffect(() => {
    run.value = phaseOffset;
    run.value = withRepeat(
      withTiming(phaseOffset + 1, { duration: 1050, easing: Easing.linear }),
      -1,
      false,
    );

    blink.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 220 }),
        withTiming(0.15, { duration: 160 }),
        withTiming(1, { duration: 220 }),
        withTiming(0.1, { duration: 160 }),
      ),
      -1,
      false,
    );
  }, [blink, phaseOffset, run]);

  const barStyle = useAnimatedStyle(() => {
    const width = trackWidth.value;
    const barWidth = Math.max(width * 0.3, 24);
    const travel = width + barWidth;
    const phase = run.value % 1;

    return {
      width: barWidth,
      opacity: blink.value * (dimmed ? 0.55 : 1),
      transform: [{ translateX: -barWidth + phase * travel }],
    };
  });

  return (
    <Animated.View
      style={[styles.progressFill, dimmed && styles.progressFillDim, barStyle]}
    />
  );
}

function IndeterminateProgressBar() {
  const trackWidth = useSharedValue(0);

  return (
    <View
      style={styles.progressTrack}
      onLayout={(event) => {
        trackWidth.value = event.nativeEvent.layout.width;
      }}
    >
      <RunningSegment trackWidth={trackWidth} phaseOffset={0} />
      <RunningSegment trackWidth={trackWidth} phaseOffset={0.5} dimmed />
    </View>
  );
}

export function WelcomeBackScreen({
  displayName,
  roleName,
  userId,
  onComplete,
}: WelcomeBackScreenProps) {
  const content = useMemo(
    () => buildWelcomeContent({ userId, displayName, roleName }),
    [displayName, roleName, userId],
  );
  const logoPulse = useSharedValue(1);

  useEffect(() => {
    logoPulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    const timer = setTimeout(onComplete, WELCOME_MIN_DURATION_MS);
    return () => clearTimeout(timer);
  }, [logoPulse, onComplete]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoPulse.value }],
  }));

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.backgroundBase} />
      <View style={styles.backgroundGlowTop} />
      <View style={styles.backgroundGlowBottom} />
      <GlowOrb style={styles.orbLeft} />
      <GlowOrb style={styles.orbRight} />

      <SafeAreaView
        style={styles.safeArea}
        edges={["top", "bottom", "left", "right"]}
      >
        <Animated.View entering={FadeIn.duration(500)} style={styles.badge}>
          <Text style={styles.badgeEmoji}>✨</Text>
          <Text style={styles.badgeText}>Sesión activa</Text>
        </Animated.View>

        <View style={styles.hero}>
          <Animated.View style={[styles.logoRingOuter, logoStyle]}>
            <View style={styles.logoRingInner}>
              <AppLogo size={APP_SPLASH_ICON_SIZE + 8} />
            </View>
          </Animated.View>

          <Animated.Text
            entering={FadeInUp.delay(180).duration(650)}
            style={styles.kicker}
          >
            ¡Bienvenido de nuevo!
          </Animated.Text>

          <Animated.Text
            entering={FadeInUp.delay(320).duration(650)}
            style={styles.headline}
          >
            {content.headline}
          </Animated.Text>

          <Animated.Text
            entering={FadeInUp.delay(460).duration(650)}
            style={styles.subline}
          >
            {content.subline}
          </Animated.Text>

          <Animated.View
            entering={FadeInDown.delay(620).duration(700)}
            style={styles.quoteCard}
          >
            <Text style={styles.quoteMark}>“</Text>
            <Text style={styles.quoteText}>{content.quote}</Text>
          </Animated.View>
        </View>

        <Animated.View
          entering={FadeIn.delay(780).duration(500)}
          style={styles.footer}
        >
          <Text style={styles.footerLabel}>
            Preparando tu espacio de trabajo
          </Text>
          <IndeterminateProgressBar />
          <Text style={styles.footerHint}>
            Fieles Bienes · inventario y finanzas eclesiásticas
          </Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: APP_SPLASH_BACKGROUND,
  },
  backgroundBase: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#0B3D91",
  },
  backgroundGlowTop: {
    position: "absolute",
    top: -120,
    left: -40,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  backgroundGlowBottom: {
    position: "absolute",
    bottom: -80,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(16, 185, 129, 0.18)",
  },
  glowOrb: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  orbLeft: {
    width: 180,
    height: 180,
    top: "18%",
    left: -70,
  },
  orbRight: {
    width: 140,
    height: 140,
    bottom: "22%",
    right: -40,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    justifyContent: "space-between",
  },
  badge: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
  },
  badgeEmoji: { fontSize: 14 },
  badgeText: {
    color: PremiumPalette.textSoftOnDark,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  hero: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 8,
  },
  logoRingOuter: {
    padding: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.28)",
    marginBottom: 8,
  },
  logoRingInner: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
  },
  kicker: {
    color: "rgba(255, 255, 255, 0.88)",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  headline: {
    color: PremiumPalette.textOnDark,
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 40,
  },
  subline: {
    color: "rgba(255, 255, 255, 0.82)",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
  },
  quoteCard: {
    marginTop: 10,
    width: "100%",
    maxWidth: 360,
    minHeight: 108,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: "rgba(15, 23, 42, 0.28)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    gap: 4,
    justifyContent: "center",
  },
  quoteMark: {
    color: PremiumPalette.accent,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 28,
    marginBottom: -4,
  },
  quoteText: {
    color: PremiumPalette.textSoftOnDark,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "500",
    fontStyle: "italic",
  },
  footer: {
    gap: 10,
    paddingBottom: 4,
  },
  footerLabel: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  progressTrack: {
    position: "relative",
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  progressFill: {
    position: "absolute",
    left: 0,
    top: 0,
    height: "100%",
    borderRadius: 999,
    backgroundColor: PremiumPalette.accent,
  },
  progressFillDim: {
    backgroundColor: "rgba(16, 185, 129, 0.55)",
  },
  footerHint: {
    color: "rgba(255, 255, 255, 0.65)",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.2,
  },
});
