import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';

const PIN_LENGTH = 4;

type PinKey = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '0' | 'clear' | 'backspace';

const KEY_ROWS: PinKey[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['clear', '0', 'backspace'],
];

type PinPadProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

function keyLabel(key: PinKey): string {
  if (key === 'backspace') {
    return '⌫';
  }
  if (key === 'clear') {
    return 'C';
  }
  return key;
}

function keyAccessibilityLabel(key: PinKey): string {
  if (key === 'backspace') {
    return 'Borrar último dígito';
  }
  if (key === 'clear') {
    return 'Limpiar PIN';
  }
  return `Dígito ${key}`;
}

export function PinPad({ value, onChange, disabled = false }: PinPadProps) {
  const handleKeyPress = (key: PinKey) => {
    if (disabled) {
      return;
    }

    if (key === 'backspace') {
      onChange(value.slice(0, -1));
      return;
    }

    if (key === 'clear') {
      onChange('');
      return;
    }

    if (value.length >= PIN_LENGTH) {
      return;
    }

    onChange(`${value}${key}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.dotsRow}>
        {Array.from({ length: PIN_LENGTH }).map((_, index) => {
          const filled = index < value.length;
          return (
            <View
              key={index}
              style={[styles.dot, filled ? styles.dotFilled : styles.dotEmpty]}
            />
          );
        })}
      </View>

      <View style={styles.keypad}>
        {KEY_ROWS.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.keyRow}>
            {row.map((key) => {
              const isUtility = key === 'backspace' || key === 'clear';

              return (
                <Pressable
                  key={key}
                  disabled={disabled}
                  onPress={() => handleKeyPress(key)}
                  accessibilityRole="button"
                  accessibilityLabel={keyAccessibilityLabel(key)}
                  style={({ pressed }) => [
                    styles.key,
                    isUtility ? styles.keyUtility : styles.keyDigit,
                    pressed && !disabled && styles.keyPressed,
                    disabled && styles.keyDisabled,
                  ]}
                >
                  <Text style={[styles.keyText, isUtility && styles.keyTextUtility]}>
                    {keyLabel(key)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

export const PIN_PAD_LENGTH = PIN_LENGTH;

const KEY_SIZE = 72;

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  dotFilled: {
    backgroundColor: PremiumPalette.primary,
    borderWidth: 0,
  },
  dotEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: PremiumPalette.surfaceMuted,
  },
  keypad: {
    alignSelf: 'center',
    gap: 12,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: KEY_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyDigit: {
    backgroundColor: 'rgba(79, 70, 229, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.2)',
  },
  keyUtility: {
    backgroundColor: PremiumPalette.surfaceMuted,
    borderWidth: 1,
    borderColor: PremiumPalette.surfaceMuted,
  },
  keyText: {
    color: PremiumPalette.textOnDark,
    fontSize: 26,
    fontWeight: '600',
  },
  keyTextUtility: {
    fontSize: 22,
    fontWeight: '700',
    color: PremiumPalette.textSoftOnDark,
  },
  keyPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  keyDisabled: {
    opacity: 0.4,
  },
});
