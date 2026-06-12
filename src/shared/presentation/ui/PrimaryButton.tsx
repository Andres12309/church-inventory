import { ActivityIndicator, Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/use-theme';

type PrimaryButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'accent' | 'danger';
  style?: ViewStyle;
};

export function PrimaryButton({
  label,
  loading = false,
  variant = 'primary',
  disabled,
  style,
  ...props
}: PrimaryButtonProps) {
  const theme = useAppTheme();

  const isSecondary = variant === 'secondary';
  const palette = {
    primary: {
      bg: theme.colors.primary,
      text: theme.colors.text.inverse,
      spinner: theme.colors.text.inverse,
    },
    secondary: {
      bg: theme.colors.surface,
      text: theme.colors.primary,
      spinner: theme.colors.primary,
    },
    accent: {
      bg: theme.colors.accent,
      text: theme.colors.text.inverse,
      spinner: theme.colors.text.inverse,
    },
    danger: {
      bg: theme.colors.danger,
      text: theme.colors.text.inverse,
      spinner: theme.colors.text.inverse,
    },
  }[variant];

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.bg,
          borderRadius: theme.borderRadius.md,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          borderWidth: isSecondary ? 1.5 : 0,
          borderColor: isSecondary ? theme.colors.primary : 'transparent',
        },
        theme.shadows.light,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={palette.spinner} />
      ) : (
        <ThemedText type="smallBold" style={{ color: palette.text }}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

export function FloatingActionButton({ style, ...props }: Omit<PrimaryButtonProps, 'variant'>) {
  const theme = useAppTheme();

  return (
    <PrimaryButton
      {...props}
      style={StyleSheet.flatten([
        {
          position: 'absolute',
          right: theme.spacing.md,
          bottom: theme.spacing.md,
          borderRadius: theme.borderRadius.lg,
        },
        style,
      ])}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
