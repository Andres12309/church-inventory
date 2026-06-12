import type { ViewStyle } from 'react-native';

import { SocialHeader } from './socialUi';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  badge?: string;
  style?: ViewStyle;
};

/** Wrapper de compatibilidad — preferir `SocialHeader` directamente. */
export function ScreenHeader({
  title,
  subtitle,
  showBack,
  onBack,
  badge,
}: ScreenHeaderProps) {
  return (
    <SocialHeader
      title={title}
      subtitle={subtitle}
      showBack={showBack}
      onBack={onBack}
      badge={badge}
    />
  );
}
