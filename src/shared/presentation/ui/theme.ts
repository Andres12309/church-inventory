/**
 * Punto único de configuración visual de Fieles Bienes.
 * Modifica este archivo para cambiar colores, espaciados, bordes y sombras en toda la app.
 */

export const Theme = {
  colors: {
    // Colores base llamativos
    primary: '#4F46E5', // Índigo moderno y eléctrico
    primarySecondary: '#818CF8',
    accent: '#10B981', // Esmeralda vibrante para éxitos, totales y ofrendas
    danger: '#EF4444', // Carmesí para alertas, eliminaciones y bajas
    warning: '#F59E0B', // Ámbar para estados regulares o advertencias

    // Neutros de alta calidad
    background: '#F3F4F6', // Gris claro limpio para fondos de pantalla
    surface: '#FFFFFF', // Blanco puro para tarjetas y contenedores
    border: '#E5E7EB', // Gris sutil para separadores

    // Tipografía
    text: {
      primary: '#111827', // Gris casi negro para máxima legibilidad
      secondary: '#4B5563', // Gris medio para descripciones y subtítulos
      muted: '#9CA3AF', // Gris claro para placeholders o fechas
      inverse: '#FFFFFF', // Texto blanco sobre fondos oscuros
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 6,
    md: 12,
    lg: 20,
    full: 9999,
  },
  shadows: {
    light: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    medium: {
      shadowColor: '#4F46E5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
  },
} as const;

export type AppTheme = typeof Theme;
