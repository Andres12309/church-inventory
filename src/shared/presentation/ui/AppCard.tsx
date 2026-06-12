import { StyleSheet, type ViewProps } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useAppTheme } from '@/hooks/use-theme';

type AppCardProps = ViewProps & {
  elevated?: boolean;
  shadow?: 'light' | 'medium';
};

export function AppCard({ style, elevated = true, shadow = 'light', ...props }: AppCardProps) {
  const theme = useAppTheme();

  return (
    <ThemedView
      type="backgroundElement"
      style={[
        styles.card,
        {
          borderColor: theme.colors.border,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.md,
          gap: theme.spacing.sm,
        },
        elevated && theme.shadows[shadow],
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});
