import { StyleSheet } from 'react-native';
import type { MealType } from '../../services/meals';
import { colors } from '../../theme/tokens';

export const MEAL_PRIMARY = colors.primary;

/** Richer green for hero bands and strong CTAs. */
export const MEAL_PRIMARY_DEEP = '#2E7D32';

export const MEAL_TYPE_ACCENTS: Record<
  MealType,
  Readonly<{
    primary: string;
    soft: string;
    border: string;
    deep: string;
  }>
> = {
  breakfast: {
    primary: '#EA580C',
    soft: '#FFF7ED',
    border: '#FDBA74',
    deep: '#C2410C',
  },
  lunch: {
    primary: '#0284C7',
    soft: '#F0F9FF',
    border: '#7DD3FC',
    deep: '#0369A1',
  },
  dinner: {
    primary: '#7C3AED',
    soft: '#F5F3FF',
    border: '#C4B5FD',
    deep: '#5B21B6',
  },
  snack: {
    primary: '#DB2777',
    soft: '#FDF2F8',
    border: '#F9A8D4',
    deep: '#BE185D',
  },
};

/** MaterialCommunityIcons names per meal type. */
export const MEAL_TYPE_MCI: Record<MealType, string> = {
  breakfast: 'weather-sunset-up',
  lunch: 'bowl-mix',
  dinner: 'moon-waning-crescent',
  snack: 'cookie',
};

export function mealAccentFor(type: MealType) {
  return MEAL_TYPE_ACCENTS[type];
}

export const mealCard = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 4,
  },
  dashed: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  elevated: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
});

export const mealTypography = StyleSheet.create({
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  body: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  caption: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelBold: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
});
