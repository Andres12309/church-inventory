import { StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';

import { APP_SPLASH_ICON_SIZE } from '@/shared/constants/appBranding';
import { AppLogo } from '@/shared/presentation/ui/AppLogo';

const DURATION = 300;

export function AnimatedSplashOverlay() {
  return null;
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: 0 }],
  },
  60: {
    transform: [{ scale: 1.2 }],
    easing: Easing.elastic(1.2),
  },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(1.2),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    opacity: 0,
  },
  60: {
    transform: [{ scale: 1.2 }],
    opacity: 0,
    easing: Easing.elastic(1.2),
  },
  100: {
    transform: [{ scale: 1 }],
    opacity: 1,
    easing: Easing.elastic(1.2),
  },
});

type AnimatedIconProps = {
  size?: number;
};

export function AnimatedIcon({ size = APP_SPLASH_ICON_SIZE }: AnimatedIconProps) {
  const boxSize = size + 16;

  return (
    <View style={[styles.iconContainer, { width: boxSize, height: boxSize }]}>
      <Animated.View entering={keyframe.duration(DURATION)} style={styles.logoWrap}>
        <AppLogo size={size} />
      </Animated.View>
      <Animated.View style={styles.logoWrap} entering={logoKeyframe.duration(DURATION)}>
        <AppLogo size={size} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrap: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
