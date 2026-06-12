import { Colors, Theme, type AppTheme, type LegacyTheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Tema central de diseño (siempre desde `shared/presentation/ui/theme.ts`) */
export function useAppTheme(): AppTheme {
  return Theme;
}

/**
 * Tokens planos para componentes que usan colores semánticos legacy
 * (text, backgroundElement, primary, danger, etc.)
 */
export function useTheme(): LegacyTheme {
  const scheme = useColorScheme();
  const mode = scheme === 'unspecified' ? 'light' : scheme;
  return Colors[mode];
}
