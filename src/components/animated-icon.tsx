import { useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  APP_SPLASH_BACKGROUND,
  APP_SPLASH_ICON_SIZE,
} from '@/shared/constants/appBranding';
import { AppLogo } from '@/shared/presentation/ui/AppLogo';

const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90;
const DURATION = 600;

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0: {
      transform: [{ scale: INITIAL_SCALE_FACTOR }],
      opacity: 1,
    },
    20: {
      opacity: 1,
    },
    70: {
      opacity: 0,
      easing: Easing.elastic(0.7),
    },
    100: {
      opacity: 0,
      transform: [{ scale: 1 }],
      easing: Easing.elastic(0.7),
    },
  });

  return (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.splashOverlay}
    >
      <AppLogo size={APP_SPLASH_ICON_SIZE} />
    </Animated.View>
  );
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: INITIAL_SCALE_FACTOR }],
  },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 1.2 }],
    opacity: 0,
  },
  40: {
    transform: [{ scale: 1.2 }],
    opacity: 0,
    easing: Easing.elastic(0.7),
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
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
    zIndex: 100,
  },
  logoWrap: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: APP_SPLASH_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
