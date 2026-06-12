import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/hooks/use-theme';

import { AppLogoMark } from './AppLogo';

type ModuleTileProps = {
  href: Href;
  title: string;
  description: string;
  stat?: string;
  glyph: string;
  layout?: 'row' | 'mosaic';
};

export function ModuleTile({
  href,
  title,
  description,
  stat,
  glyph,
  layout = 'row',
}: ModuleTileProps) {
  const theme = useAppTheme();
  const isMosaic = layout === 'mosaic';

  return (
    <Link href={href} asChild>
      <Pressable
        style={({ pressed }) => [
          isMosaic ? styles.tileMosaic : styles.tile,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            gap: theme.spacing.md,
          },
          isMosaic ? theme.shadows.medium : theme.shadows.light,
          pressed && styles.pressed,
        ]}
      >
        <View
          style={[
            isMosaic ? styles.glyphWrapMosaic : styles.glyphWrap,
            {
              backgroundColor: 'rgba(79, 70, 229, 0.10)',
              borderRadius: theme.borderRadius.md,
            },
          ]}
        >
          <ThemedText
            type="smallBold"
            style={{ color: theme.colors.primary, fontSize: isMosaic ? 32 : 18 }}
          >
            {glyph}
          </ThemedText>
        </View>
        <View style={isMosaic ? styles.copyMosaic : styles.copy}>
          <ThemedText type={isMosaic ? 'subtitle' : 'smallBold'}>{title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={isMosaic ? 3 : 2}>
            {description}
          </ThemedText>
          {stat ? (
            <ThemedText type="smallBold" style={{ color: theme.colors.accent }}>
              {stat}
            </ThemedText>
          ) : null}
        </View>
        {isMosaic ? null : <AppLogoMark size={22} />}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  tileMosaic: {
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  glyphWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphWrapMosaic: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  copyMosaic: {
    gap: 6,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
