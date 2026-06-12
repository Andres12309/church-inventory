import * as SecureStore from 'expo-secure-store';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PremiumPalette, PremiumShadow } from './premiumPalette';

const FAB_SIZE = 56;
const SUB_ACTION_HEIGHT = 48;
const SUB_ACTION_GAP = 12;
const EDGE_MARGIN = 16;
const FAB_TAB_CLEARANCE = 8;
const TAB_BAR_HEIGHT = Platform.select({ ios: 49, android: 64, default: 56 }) ?? 56;
const STORAGE_KEY = 'fieles-bienes.draggable-fab-position';
const ASSISTANT_STORAGE_KEY = 'fieles-bienes.assistant-fab-position';
const COLLAPSE_MS = 5000;

type FabPosition = {
  x: number;
  y: number;
};

type FabSide = 'left' | 'right';

type FabBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  windowWidth: number;
};

export type FabExpandAction = {
  id: string;
  icon: string;
  label: string;
  onPress: () => void;
};

type DraggableFabProps = {
  onPress?: () => void;
  expandActions?: FabExpandAction[];
  collapseAfterMs?: number;
  storageKey?: string;
  accessibilityLabel?: string;
  variant?: 'bolt' | 'assistant';
};

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

function resolveFabSide(x: number, bounds: FabBounds): FabSide {
  const screenMid = (bounds.minX + bounds.maxX + FAB_SIZE) / 2;
  return x + FAB_SIZE / 2 < screenMid ? 'left' : 'right';
}

function expandStackHeight(actionCount: number): number {
  if (actionCount <= 0) {
    return 0;
  }
  return actionCount * SUB_ACTION_HEIGHT + (actionCount - 1) * SUB_ACTION_GAP + SUB_ACTION_GAP;
}

function computeBounds(
  windowHeight: number,
  windowWidth: number,
  topInset: number,
  bottomInset: number,
): FabBounds {
  const minX = EDGE_MARGIN;
  const maxX = windowWidth - FAB_SIZE - EDGE_MARGIN;
  const minY = topInset + EDGE_MARGIN;
  const maxY = windowHeight - FAB_SIZE - TAB_BAR_HEIGHT - bottomInset - FAB_TAB_CLEARANCE;

  return {
    minX,
    maxX,
    minY,
    maxY: Math.max(minY, maxY),
    windowWidth,
  };
}

function yForExpandedMenu(y: number, actionCount: number, bounds: FabBounds): number {
  const neededTop = y - expandStackHeight(actionCount);
  if (neededTop < bounds.minY) {
    return bounds.minY + expandStackHeight(actionCount);
  }
  return y;
}

export function DraggableFab({
  onPress,
  expandActions,
  collapseAfterMs = COLLAPSE_MS,
  storageKey = STORAGE_KEY,
  accessibilityLabel = 'Acciones rápidas',
  variant = 'bolt',
}: DraggableFabProps) {
  const insets = useSafeAreaInsets();
  const [bounds, setBounds] = useState<FabBounds | null>(null);
  const [fabSide, setFabSide] = useState<FabSide>('right');
  const [fabX, setFabX] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const expandedRef = useRef(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restingY = useRef(0);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const dragStartY = useSharedValue(0);

  const actionCount = expandActions?.length ?? 0;
  const isExpandable = actionCount > 0;

  const syncFabSide = useCallback((x: number, nextBounds: FabBounds) => {
    setFabX(x);
    setFabSide(resolveFabSide(x, nextBounds));
  }, []);

  const clearCollapseTimer = useCallback(() => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
  }, []);

  const collapse = useCallback(() => {
    clearCollapseTimer();
    expandedRef.current = false;
    setExpanded(false);
    if (bounds) {
      translateY.value = withSpring(restingY.current, { damping: 22, stiffness: 240 });
    }
  }, [bounds, clearCollapseTimer, translateY]);

  const scheduleCollapse = useCallback(() => {
    clearCollapseTimer();
    collapseTimer.current = setTimeout(() => {
      expandedRef.current = false;
      setExpanded(false);
      if (bounds) {
        translateY.value = withSpring(restingY.current, { damping: 22, stiffness: 240 });
      }
    }, collapseAfterMs);
  }, [bounds, clearCollapseTimer, collapseAfterMs, translateY]);

  const openExpanded = useCallback(() => {
    if (!bounds || !isExpandable) {
      return;
    }

    expandedRef.current = true;
    setExpanded(true);
    const adjustedY = yForExpandedMenu(restingY.current, actionCount, bounds);
    translateY.value = withSpring(adjustedY, { damping: 22, stiffness: 240 });
    scheduleCollapse();
  }, [actionCount, bounds, isExpandable, scheduleCollapse, translateY]);

  const toggleExpanded = useCallback(() => {
    if (expandedRef.current) {
      collapse();
      return;
    }
    openExpanded();
  }, [collapse, openExpanded]);

  const onDragStart = useCallback(() => {
    if (expandedRef.current) {
      collapse();
    }
  }, [collapse]);

  const handleMainPress = useCallback(() => {
    if (isExpandable) {
      toggleExpanded();
      return;
    }
    onPress?.();
  }, [isExpandable, onPress, toggleExpanded]);

  const handleExpandAction = useCallback(
    (action: FabExpandAction) => {
      collapse();
      action.onPress();
    },
    [collapse],
  );

  const persistPosition = useCallback(
    async (position: FabPosition) => {
      try {
        await SecureStore.setItemAsync(storageKey, JSON.stringify(position));
      } catch {
        // Posición efímera si falla el almacenamiento
      }
    },
    [storageKey],
  );

  const applyPosition = useCallback(
    (x: number, y: number, nextBounds: FabBounds, animate = false) => {
      const clampedX = clamp(x, nextBounds.minX, nextBounds.maxX);
      const clampedY = clamp(y, nextBounds.minY, nextBounds.maxY);
      const snappedX =
        clampedX + FAB_SIZE / 2 < (nextBounds.minX + nextBounds.maxX + FAB_SIZE) / 2
          ? nextBounds.minX
          : nextBounds.maxX;

      restingY.current = clampedY;

      if (animate) {
        translateX.value = withSpring(snappedX, { damping: 22, stiffness: 240 });
        translateY.value = withSpring(
          expandedRef.current ? yForExpandedMenu(clampedY, actionCount, nextBounds) : clampedY,
          { damping: 22, stiffness: 240 },
        );
      } else {
        translateX.value = snappedX;
        translateY.value = expandedRef.current
          ? yForExpandedMenu(clampedY, actionCount, nextBounds)
          : clampedY;
      }

      syncFabSide(snappedX, nextBounds);
      void persistPosition({ x: snappedX, y: clampedY });
    },
    [actionCount, persistPosition, syncFabSide, translateX, translateY],
  );

  useEffect(() => {
    const { width, height } = Dimensions.get('window');
    const nextBounds = computeBounds(height, width, insets.top, insets.bottom);
    setBounds(nextBounds);

    void (async () => {
      let initialX = nextBounds.maxX;
      let initialY = nextBounds.maxY;

      try {
        const raw = await SecureStore.getItemAsync(storageKey);
        if (raw) {
          const saved = JSON.parse(raw) as FabPosition;
          initialX = clamp(saved.x, nextBounds.minX, nextBounds.maxX);
          initialY = clamp(saved.y, nextBounds.minY, nextBounds.maxY);
        }
      } catch {
        // Esquina inferior derecha por defecto
      }

      applyPosition(initialX, initialY, nextBounds, false);
    })();
  }, [applyPosition, insets.bottom, insets.top, storageKey]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      const nextBounds = computeBounds(window.height, window.width, insets.top, insets.bottom);
      setBounds(nextBounds);
      applyPosition(translateX.value, restingY.current, nextBounds, true);
    });

    return () => subscription.remove();
  }, [applyPosition, insets.bottom, insets.top, translateX]);

  useEffect(() => () => clearCollapseTimer(), [clearCollapseTimer]);

  const snapToEdges = useCallback(
    (x: number, y: number) => {
      if (!bounds) {
        return;
      }
      applyPosition(x, y, bounds, true);
    },
    [applyPosition, bounds],
  );

  const panGesture = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .activeOffsetY([-8, 8])
    .onStart(() => {
      runOnJS(onDragStart)();
      dragStartX.value = translateX.value;
      dragStartY.value = translateY.value;
    })
    .onUpdate((event) => {
      if (!bounds) {
        return;
      }

      translateX.value = clamp(dragStartX.value + event.translationX, bounds.minX, bounds.maxX);
      translateY.value = clamp(dragStartY.value + event.translationY, bounds.minY, bounds.maxY);
    })
    .onEnd(() => {
      runOnJS(snapToEdges)(translateX.value, translateY.value);
    });

  const tapGesture = Gesture.Tap().maxDuration(250).onEnd(() => {
    runOnJS(handleMainPress)();
  });

  const gesture = Gesture.Exclusive(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  if (!bounds) {
    return null;
  }

  const labelMaxWidth =
    fabSide === 'right'
      ? Math.max(120, fabX - EDGE_MARGIN - SUB_ACTION_HEIGHT - 12)
      : Math.max(
          120,
          bounds.windowWidth - fabX - FAB_SIZE - EDGE_MARGIN - SUB_ACTION_HEIGHT - 12,
        );

  const mainFabStyle = [
    styles.fab,
    variant === 'assistant' ? styles.fabAssistant : styles.fabBolt,
    expanded && styles.fabExpanded,
  ];

  return (
    <View style={styles.overlayRoot} pointerEvents="box-none">
      {expanded ? (
        <Pressable
          style={styles.backdrop}
          onPress={collapse}
          accessibilityLabel="Cerrar menú flotante"
        />
      ) : null}

      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.fabAnchor, animatedStyle]} pointerEvents="box-none">
          {expanded && expandActions
            ? expandActions.map((action, index) => (
                <View
                  key={action.id}
                  style={[
                    styles.subActionRow,
                    fabSide === 'right' ? styles.subActionRowRight : styles.subActionRowLeft,
                    {
                      bottom: FAB_SIZE + SUB_ACTION_GAP + index * (SUB_ACTION_HEIGHT + SUB_ACTION_GAP),
                      maxWidth: bounds.windowWidth - EDGE_MARGIN * 2,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => handleExpandAction(action)}
                    style={({ pressed }) => [styles.subFab, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                  >
                    <Text style={styles.subFabIcon}>{action.icon}</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleExpandAction(action)}
                    style={({ pressed }) => [styles.subLabel, { maxWidth: labelMaxWidth }, pressed && styles.pressed]}
                  >
                    <Text style={styles.subLabelText} numberOfLines={1}>
                      {action.label}
                    </Text>
                  </Pressable>
                </View>
              ))
            : null}

          <View style={mainFabStyle} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
            {variant === 'assistant' ? (
              <Text style={styles.emojiIcon}>🤖</Text>
            ) : (
              <View style={styles.iconWrap}>
                <SymbolView
                  name={{
                    ios: expanded ? 'xmark' : 'bolt.fill',
                    android: expanded ? 'close' : 'bolt',
                    web: expanded ? 'close' : 'bolt',
                  }}
                  size={Platform.OS === 'ios' ? 22 : 24}
                  weight="semibold"
                  tintColor="#FFFFFF"
                  resizeMode="scaleAspectFit"
                  style={styles.icon}
                />
              </View>
            )}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export { ASSISTANT_STORAGE_KEY, STORAGE_KEY };

const styles = StyleSheet.create({
  overlayRoot: {
    ...StyleSheet.absoluteFill,
    zIndex: 50,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    zIndex: 1,
  },
  fabAnchor: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: FAB_SIZE,
    height: FAB_SIZE,
    overflow: 'visible',
    zIndex: 2,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...PremiumShadow.fab,
  },
  fabBolt: {
    backgroundColor: PremiumPalette.accent,
  },
  fabAssistant: {
    backgroundColor: PremiumPalette.primary,
  },
  fabExpanded: {
    backgroundColor: PremiumPalette.surfaceMuted,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 26,
    height: 26,
  },
  emojiIcon: {
    fontSize: 26,
  },
  subActionRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subActionRowRight: {
    right: 0,
    flexDirection: 'row-reverse',
  },
  subActionRowLeft: {
    left: 0,
    flexDirection: 'row',
  },
  subLabel: {
    backgroundColor: PremiumPalette.surface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
    ...PremiumShadow.card,
  },
  subLabelText: {
    color: PremiumPalette.textOnDark,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  subFab: {
    width: SUB_ACTION_HEIGHT,
    height: SUB_ACTION_HEIGHT,
    borderRadius: SUB_ACTION_HEIGHT / 2,
    backgroundColor: PremiumPalette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...PremiumShadow.fab,
  },
  subFabIcon: {
    fontSize: 22,
  },
  pressed: { opacity: 0.88 },
});
