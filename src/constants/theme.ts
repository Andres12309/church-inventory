/**
 * Capa de compatibilidad y tokens de layout.
 * Los valores visuales provienen de `src/shared/presentation/ui/theme.ts`.
 */

import '@/global.css';

import { Platform } from 'react-native';

import { Theme } from '@/shared/presentation/ui/theme';

export { Theme, type AppTheme } from '@/shared/presentation/ui/theme';

/** Tokens planos derivados del Theme central — usados por ThemedText / ThemedView legacy */
export const Colors = {
  light: {
    text: Theme.colors.text.primary,
    background: Theme.colors.background,
    backgroundElement: Theme.colors.surface,
    backgroundSelected: '#EEF2FF',
    textSecondary: Theme.colors.text.secondary,
    textMuted: Theme.colors.text.muted,
    primary: Theme.colors.primary,
    primarySecondary: Theme.colors.primarySecondary,
    primaryMuted: 'rgba(79, 70, 229, 0.10)',
    accent: Theme.colors.accent,
    accentMuted: 'rgba(16, 185, 129, 0.12)',
    warning: Theme.colors.warning,
    border: Theme.colors.border,
    danger: Theme.colors.danger,
    onPrimary: Theme.colors.text.inverse,
    link: Theme.colors.primary,
    shadow: 'rgba(17, 24, 39, 0.08)',
  },
  dark: {
    text: '#F9FAFB',
    background: '#111827',
    backgroundElement: '#1F2937',
    backgroundSelected: '#312E81',
    textSecondary: '#D1D5DB',
    textMuted: '#9CA3AF',
    primary: Theme.colors.primarySecondary,
    primarySecondary: '#A5B4FC',
    primaryMuted: 'rgba(129, 140, 248, 0.18)',
    accent: Theme.colors.accent,
    accentMuted: 'rgba(16, 185, 129, 0.16)',
    warning: Theme.colors.warning,
    border: '#374151',
    danger: '#F87171',
    onPrimary: Theme.colors.text.inverse,
    link: Theme.colors.primarySecondary,
    shadow: 'rgba(0, 0, 0, 0.4)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type LegacyTheme = (typeof Colors)[keyof typeof Colors];

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/** Alias legacy → Theme.spacing */
export const Spacing = {
  half: Theme.spacing.xs,
  one: Theme.spacing.xs,
  two: Theme.spacing.sm,
  three: Theme.spacing.md,
  four: Theme.spacing.lg,
  five: Theme.spacing.xl,
  six: 64,
  xs: Theme.spacing.xs,
  sm: Theme.spacing.sm,
  md: Theme.spacing.md,
  lg: Theme.spacing.lg,
  xl: Theme.spacing.xl,
} as const;

/** Alias legacy → Theme.borderRadius */
export const Radius = {
  sm: Theme.borderRadius.sm,
  md: Theme.borderRadius.md,
  lg: Theme.borderRadius.lg,
  xl: Theme.borderRadius.lg,
  pill: Theme.borderRadius.full,
  full: Theme.borderRadius.full,
} as const;

export const Shadows = Theme.shadows;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
