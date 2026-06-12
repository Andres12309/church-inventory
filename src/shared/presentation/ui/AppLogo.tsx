import { Image } from 'expo-image';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { APP_ICON } from '@/shared/constants/appBranding';

type AppLogoProps = {
  size?: number;
  style?: ViewStyle;
};

export function AppLogo({ size = 88, style }: AppLogoProps) {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Image
        source={APP_ICON}
        style={{ width: size, height: size }}
        contentFit="contain"
        accessibilityLabel="Fieles Bienes"
      />
    </View>
  );
}

export function AppLogoMark({ size = 32 }: { size?: number }) {
  return (
    <Image
      source={APP_ICON}
      style={{ width: size, height: size, borderRadius: size * 0.22 }}
      contentFit="contain"
      accessibilityLabel="Fieles Bienes"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
