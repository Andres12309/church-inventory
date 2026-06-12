import { SymbolView } from 'expo-symbols';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { PremiumPalette } from './premiumPalette';

type HeaderBackButtonProps = {
  onPress: () => void;
  accessibilityLabel?: string;
};

export function HeaderBackButton({
  onPress,
  accessibilityLabel = 'Volver',
}: HeaderBackButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
    >
      <SymbolView
        name={{
          ios: 'chevron.left',
          android: 'arrow_back',
          web: 'arrow_back',
        }}
        size={Platform.OS === 'ios' ? 19 : 22}
        weight="semibold"
        tintColor={PremiumPalette.textOnDark}
        resizeMode="scaleAspectFit"
        style={styles.icon}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PremiumPalette.surfaceMuted,
    marginLeft: -2,
  },
  buttonPressed: {
    opacity: 0.82,
    backgroundColor: PremiumPalette.surface,
  },
  icon: {
    width: 22,
    height: 22,
  },
});
