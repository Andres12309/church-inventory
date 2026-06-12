import { usePathname, useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ASISTENTE_ROUTES } from '@/features/asistente/presentation/routes';
import {
  ASSISTANT_STORAGE_KEY,
  DraggableFab,
  STORAGE_KEY,
} from '@/shared/presentation/ui/DraggableFab';
import { PremiumPalette, PremiumShadow } from '@/shared/presentation/ui/premiumPalette';
import { PrimaryButton } from '@/shared/presentation/ui/PrimaryButton';

import { useQuickActionsList } from '../hooks/useQuickActionsList';

export function TabFabOverlay() {
  return (
    <View style={styles.overlayHost} pointerEvents="box-none">
      <TabFabOverlayContent />
    </View>
  );
}

function TabFabOverlayContent() {
  const router = useRouter();
  const pathname = usePathname();
  const [quickActionsVisible, setQuickActionsVisible] = useState(false);

  const { actions, isRecalculating } = useQuickActionsList();

  const isHomeTab =
    pathname.endsWith('/index') ||
    pathname.endsWith('/(tabs)') ||
    pathname.endsWith('/(tabs)/') ||
    pathname === '/';

  const expandActions = [
    {
      id: 'asistente',
      icon: '🤖',
      label: 'Asistente Fieles',
      onPress: () => router.push(ASISTENTE_ROUTES.pantalla),
    },
    {
      id: 'acciones',
      icon: '⚡',
      label: 'Acciones rápidas',
      onPress: () => setQuickActionsVisible(true),
    },
  ];

  const handleQuickAction = (action: (typeof actions)[number]) => {
    setQuickActionsVisible(false);
    action.onPress();
  };

  if (isHomeTab) {
    return (
      <>
        <DraggableFab
          expandActions={expandActions}
          storageKey={STORAGE_KEY}
          accessibilityLabel="Menú flotante"
        />

        <Modal
          visible={quickActionsVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setQuickActionsVisible(false)}
        >
          <Pressable style={styles.backdrop} onPress={() => setQuickActionsVisible(false)}>
            <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
              <Text style={styles.sheetTitle}>Acciones rápidas</Text>
              <Text style={styles.sheetSubtitle}>
                Atajos según tu rol. Arrastra el botón ⚡ para moverlo en pantalla.
              </Text>

              <ScrollView
                style={styles.actionScroll}
                contentContainerStyle={styles.actionList}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
              >
                {actions.map((action) => (
                  <Pressable
                    key={action.id}
                    onPress={() => handleQuickAction(action)}
                    disabled={action.id === 'recalcular' && isRecalculating}
                    style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
                  >
                    <Text style={styles.actionIcon}>{action.icon}</Text>
                    <Text style={styles.actionLabel}>{action.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <PrimaryButton
                label="Cerrar"
                variant="secondary"
                onPress={() => setQuickActionsVisible(false)}
              />
            </Pressable>
          </Pressable>
        </Modal>
      </>
    );
  }

  return (
    <DraggableFab
      variant="assistant"
      storageKey={ASSISTANT_STORAGE_KEY}
      accessibilityLabel="Asistente Fieles"
      onPress={() => router.push(ASISTENTE_ROUTES.pantalla)}
    />
  );
}

const styles = StyleSheet.create({
  overlayHost: {
    ...StyleSheet.absoluteFill,
    pointerEvents: 'box-none',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    maxWidth: 480,
    width: '100%',
    maxHeight: '82%',
    alignSelf: 'center',
    backgroundColor: PremiumPalette.surfaceLight,
    borderRadius: 20,
    padding: 24,
    gap: 14,
    ...PremiumShadow.card,
  },
  sheetTitle: {
    color: PremiumPalette.textOnLight,
    fontSize: 20,
    fontWeight: '800',
  },
  sheetSubtitle: {
    color: PremiumPalette.textMutedOnLight,
    fontSize: 14,
    lineHeight: 20,
  },
  actionScroll: {
    flexGrow: 0,
  },
  actionList: {
    gap: 8,
    paddingBottom: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
  },
  actionIcon: {
    fontSize: 22,
    width: 28,
    textAlign: 'center',
  },
  actionLabel: {
    flex: 1,
    color: PremiumPalette.textOnLight,
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.88,
  },
});
