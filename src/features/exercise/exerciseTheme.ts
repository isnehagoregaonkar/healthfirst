import { colors } from '../../theme/tokens';
import { DASH_EXERCISE, DASH_MUTED, DASH_SLATE } from '../dashboard/dashboardTokens';

/** Exercise tab — aligned with app green primary + dashboard violet accent. */
export const exerciseTheme = {
  ...colors,
  slate: DASH_SLATE,
  muted: DASH_MUTED,
  accent: DASH_EXERCISE,
  accentSoft: '#F5F3FF',
  stepsTint: colors.primary,
  stepsSoft: colors.primarySoft,
  surface: colors.surface,
  border: colors.border,
  cardShadow: '#0F172A',
} as const;
