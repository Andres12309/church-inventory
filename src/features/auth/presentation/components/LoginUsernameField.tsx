import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';

type LoginUsernameFieldProps = {
  value: string;
  onChange: (value: string) => void;
  rememberedUsernames: string[];
  onRemoveRemembered?: (username: string) => void | Promise<void>;
  disabled?: boolean;
};

export function LoginUsernameField({
  value,
  onChange,
  rememberedUsernames,
  onRemoveRemembered,
  disabled = false,
}: LoginUsernameFieldProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const hasSuggestions = rememberedUsernames.length > 0;

  const suggestionsLabel = useMemo(() => {
    if (!hasSuggestions) {
      return null;
    }

    return `${rememberedUsernames.length} usuario${rememberedUsernames.length === 1 ? '' : 's'} recordado${rememberedUsernames.length === 1 ? '' : 's'}`;
  }, [hasSuggestions, rememberedUsernames.length]);

  const handleSelect = (username: string) => {
    onChange(username);
    setModalVisible(false);
  };

  const handleRemove = (username: string) => {
    Alert.alert(
      'Quitar usuario recordado',
      `¿Eliminar «${username}» de la lista de accesos rápidos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await onRemoveRemembered?.(username);
              if (username.trim().toLowerCase() === value.trim().toLowerCase()) {
                onChange('');
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        value={value}
        onChangeText={onChange}
        editable={!disabled}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Usuario"
        placeholderTextColor={PremiumPalette.textMutedOnDark}
        style={[styles.input, disabled && styles.inputDisabled]}
        accessibilityLabel="Nombre de usuario"
      />

      {hasSuggestions ? (
        <Pressable
          onPress={() => setModalVisible(true)}
          disabled={disabled}
          style={({ pressed }) => [styles.suggestionsTrigger, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Ver usuarios recordados"
        >
          <Text style={styles.suggestionsTriggerText}>{suggestionsLabel}</Text>
          <Text style={styles.chevron}>▾</Text>
        </Pressable>
      ) : (
        <Text style={styles.hint}>Ingresa tu usuario y PIN de acceso</Text>
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Usuarios recordados</Text>
            <Text style={styles.sheetSubtitle}>
              Toca para usar · 🗑️ para quitar de la lista
            </Text>

            <ScrollView
              style={styles.optionsScroll}
              contentContainerStyle={styles.optionsList}
              showsVerticalScrollIndicator={false}
            >
              {rememberedUsernames.map((username) => {
                const isActive = username.toLowerCase() === value.trim().toLowerCase();

                return (
                  <View
                    key={username}
                    style={[styles.optionRow, isActive && styles.optionRowActive]}
                  >
                    <Pressable
                      onPress={() => handleSelect(username)}
                      style={({ pressed }) => [styles.optionMain, pressed && styles.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel={`Usar ${username}`}
                    >
                      <Text style={styles.optionIcon}>👤</Text>
                      <Text style={styles.optionUsername}>{username}</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleRemove(username)}
                      disabled={!onRemoveRemembered}
                      style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel={`Eliminar ${username}`}
                    >
                      <Text style={styles.removeIcon}>🗑️</Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>

            <Pressable
              onPress={() => setModalVisible(false)}
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
            >
              <Text style={styles.cancelText}>Cerrar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
    backgroundColor: PremiumPalette.surface,
    color: PremiumPalette.textOnDark,
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  inputDisabled: { opacity: 0.5 },
  suggestionsTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  suggestionsTriggerText: {
    color: PremiumPalette.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  chevron: { color: PremiumPalette.primary, fontSize: 16, fontWeight: '700' },
  hint: { color: PremiumPalette.textMutedOnDark, fontSize: 12 },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
  },
  sheet: {
    backgroundColor: PremiumPalette.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
    maxHeight: '60%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: PremiumPalette.surfaceMuted,
    marginBottom: 12,
  },
  sheetTitle: { color: PremiumPalette.textOnDark, fontSize: 18, fontWeight: '800' },
  sheetSubtitle: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 12,
  },
  optionsScroll: { flexGrow: 0 },
  optionsList: { gap: 8, paddingBottom: 8 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
    backgroundColor: PremiumPalette.canvas,
    overflow: 'hidden',
  },
  optionRowActive: {
    borderColor: PremiumPalette.primary,
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
  },
  optionMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  optionIcon: { fontSize: 20 },
  optionUsername: { color: PremiumPalette.textOnDark, fontSize: 15, fontWeight: '700' },
  removeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: PremiumPalette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeIcon: { fontSize: 18 },
  cancelBtn: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: PremiumPalette.surfaceMuted,
  },
  cancelText: { color: PremiumPalette.textSoftOnDark, fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.9 },
});
