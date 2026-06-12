export const PremiumPalette = {
  canvas: '#0F172A',
  surface: '#1E293B',
  surfaceLight: '#FFFFFF',
  surfaceMuted: '#334155',
  textOnDark: '#FFFFFF',
  textSoftOnDark: '#F3F4F6',
  textMutedOnDark: '#94A3B8',
  textOnLight: '#111827',
  textMutedOnLight: '#6B7280',
  primary: '#4F46E5',
  accent: '#10B981',
  primarySoft: 'rgba(79, 70, 229, 0.1)',
  danger: '#EF4444',
  dangerSoft: 'rgba(239, 68, 68, 0.12)',
} as const;

export const PremiumShadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  fab: {
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;
