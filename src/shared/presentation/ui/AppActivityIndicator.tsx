import { ActivityIndicator, type ActivityIndicatorProps } from 'react-native';

import { Theme } from '@/shared/presentation/ui/theme';

export function AppActivityIndicator(props: Omit<ActivityIndicatorProps, 'color'>) {
  return <ActivityIndicator color={Theme.colors.primary} {...props} />;
}
