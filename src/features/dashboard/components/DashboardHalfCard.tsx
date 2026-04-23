import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';
import { colors } from '../../../theme/tokens';

type DashboardHalfCardProps = Readonly<{
  onPress: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}>;

export function DashboardHalfCard({
  onPress,
  accessibilityLabel,
  style,
  children,
}: DashboardHalfCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.card,
        styles.cardHalf,
        styles.dashboardTwinCard,
        style,
        pressed && styles.cardPressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardHalf: {
    flex: 1,
    minWidth: 0,
  },
  dashboardTwinCard: {
    minHeight: 148,
  },
});
