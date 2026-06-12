import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

import { PremiumPalette } from './premiumPalette';

type EmptyStateProps = {
  icon?: string;
  title: string;
  message: string;
};

export function EmptyState({ icon = '📭', title, message }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.icon}>{icon}</ThemedText>
      <ThemedText style={styles.title}>{title}</ThemedText>
      <ThemedText style={styles.message}>{message}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 8,
  },
  icon: {
    fontSize: 40,
    marginBottom: 8,
  },
  title: {
    color: PremiumPalette.textSoftOnDark,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
});
