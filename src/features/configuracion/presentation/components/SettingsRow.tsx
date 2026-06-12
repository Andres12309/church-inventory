import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';

type SettingsRowProps = {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
  loading?: boolean;
};

export function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  showChevron = true,
  destructive = false,
  loading = false,
}: SettingsRowProps) {
  const content = (
    <View style={[styles.row, destructive && styles.rowDestructive]}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.copy}>
        <Text style={[styles.title, destructive && styles.titleDestructive]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {loading ? <Text style={styles.subtitle}>Procesando…</Text> : null}
      </View>
      {showChevron && onPress ? <Text style={styles.chevron}>›</Text> : null}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowDestructive: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 12,
  },
  icon: {
    fontSize: 22,
    width: 28,
    textAlign: 'center',
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: PremiumPalette.textOnDark,
    fontSize: 15,
    fontWeight: '600',
  },
  titleDestructive: {
    color: '#FCA5A5',
  },
  subtitle: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 13,
    lineHeight: 18,
  },
  chevron: {
    color: PremiumPalette.textMutedOnDark,
    fontSize: 22,
    fontWeight: '300',
  },
  pressed: {
    opacity: 0.88,
  },
});
