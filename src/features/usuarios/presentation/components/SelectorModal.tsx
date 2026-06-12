import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/use-theme';
import { PrimaryButton } from '@/shared/presentation/ui/PrimaryButton';

export type SelectorOption = {
  id: string;
  label: string;
  subtitle?: string;
};

type SelectorModalProps = {
  visible: boolean;
  title: string;
  options: SelectorOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
};

export function SelectorModal({
  visible,
  title,
  options,
  selectedId,
  onSelect,
  onClose,
}: SelectorModalProps) {
  const theme = useAppTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
            },
            theme.shadows.medium,
          ]}
          onPress={(event) => event.stopPropagation()}
        >
          <ThemedText type="subtitle">{title}</ThemedText>

          <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: theme.spacing.sm }}>
            {options.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No hay opciones disponibles en tu alcance.
              </ThemedText>
            ) : (
              options.map((option) => {
                const activo = option.id === selectedId;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => {
                      onSelect(option.id);
                      onClose();
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      {
                        borderColor: activo ? theme.colors.primary : theme.colors.border,
                        backgroundColor: activo
                          ? 'rgba(79, 70, 229, 0.08)'
                          : theme.colors.background,
                        borderRadius: theme.borderRadius.md,
                        padding: theme.spacing.md,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText type="smallBold">{option.label}</ThemedText>
                    {option.subtitle ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        {option.subtitle}
                      </ThemedText>
                    ) : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <PrimaryButton label="Cerrar" variant="secondary" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    gap: 16,
    maxHeight: '80%',
  },
  option: {
    borderWidth: 1,
    gap: 4,
  },
  pressed: {
    opacity: 0.9,
  },
});
