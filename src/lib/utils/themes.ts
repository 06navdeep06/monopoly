import type { BoardTheme, ColorGroup, ThemeConfig } from '@/types/game';

/** All board themes — ALL UNLOCKED, no paywall */
export const BOARD_THEMES: Record<BoardTheme, ThemeConfig> = {
  classic: {
    name: 'Classic',
    boardBg: '#1A2744',
    spaceBg: '#1E293B',
    spaceBorder: '#334155',
    accentColor: '#F59E0B',
    textColor: '#F8FAFC',
    fontClass: 'font-display',
    propertyColors: {
      brown: '#8B4513',
      light_blue: '#87CEEB',
      pink: '#FF69B4',
      orange: '#FF8C00',
      red: '#EF4444',
      yellow: '#F59E0B',
      green: '#10B981',
      dark_blue: '#1E40AF',
    },
  },
  space: {
    name: 'Space Station',
    boardBg: '#0B0E17',
    spaceBg: '#111827',
    spaceBorder: '#1F2937',
    accentColor: '#8B5CF6',
    textColor: '#E5E7EB',
    fontClass: 'font-mono',
    propertyColors: {
      brown: '#78350F',
      light_blue: '#06B6D4',
      pink: '#EC4899',
      orange: '#F97316',
      red: '#DC2626',
      yellow: '#EAB308',
      green: '#22C55E',
      dark_blue: '#6366F1',
    },
  },
  pirate: {
    name: 'Pirate Seas',
    boardBg: '#1C1917',
    spaceBg: '#292524',
    spaceBorder: '#44403C',
    accentColor: '#D97706',
    textColor: '#FAFAF9',
    fontClass: 'font-display',
    propertyColors: {
      brown: '#92400E',
      light_blue: '#0891B2',
      pink: '#DB2777',
      orange: '#EA580C',
      red: '#B91C1C',
      yellow: '#CA8A04',
      green: '#15803D',
      dark_blue: '#1D4ED8',
    },
  },
  neon: {
    name: 'Neon City',
    boardBg: '#09090B',
    spaceBg: '#18181B',
    spaceBorder: '#27272A',
    accentColor: '#F0ABFC',
    textColor: '#FAFAFA',
    fontClass: 'font-mono',
    propertyColors: {
      brown: '#A16207',
      light_blue: '#22D3EE',
      pink: '#F472B6',
      orange: '#FB923C',
      red: '#F87171',
      yellow: '#FACC15',
      green: '#4ADE80',
      dark_blue: '#818CF8',
    },
  },
  medieval: {
    name: 'Medieval Kingdom',
    boardBg: '#1A1510',
    spaceBg: '#272015',
    spaceBorder: '#3D3520',
    accentColor: '#B45309',
    textColor: '#FEF3C7',
    fontClass: 'font-display',
    propertyColors: {
      brown: '#78350F',
      light_blue: '#0E7490',
      pink: '#BE185D',
      orange: '#C2410C',
      red: '#991B1B',
      yellow: '#A16207',
      green: '#166534',
      dark_blue: '#1E3A8A',
    },
  },
  tropical: {
    name: 'Tropical Paradise',
    boardBg: '#042F2E',
    spaceBg: '#0F3D3D',
    spaceBorder: '#134E4A',
    accentColor: '#F59E0B',
    textColor: '#F0FDFA',
    fontClass: 'font-display',
    propertyColors: {
      brown: '#92400E',
      light_blue: '#67E8F9',
      pink: '#F472B6',
      orange: '#FB923C',
      red: '#EF4444',
      yellow: '#FDE047',
      green: '#34D399',
      dark_blue: '#3B82F6',
    },
  },
};

/** Get theme config by name */
export function getTheme(theme: BoardTheme): ThemeConfig {
  return BOARD_THEMES[theme] ?? BOARD_THEMES.classic;
}

/** Get all theme names */
export function getAllThemes(): { id: BoardTheme; name: string }[] {
  return Object.entries(BOARD_THEMES).map(([id, config]) => ({
    id: id as BoardTheme,
    name: config.name,
  }));
}
