import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/tokens';

type AppLoadingSpinnerProps = Readonly<{
  title?: string;
  subtitle?: string;
  color?: string;
  compact?: boolean;
}>;

export function AppLoadingSpinner({
  title = 'Loading…',
  subtitle,
  color = colors.primary,
  compact = false,
}: AppLoadingSpinnerProps) {
  if (compact) {
    return (
      <View style={styles.compactRow}>
        <ActivityIndicator size="small" color={color} />
        <Text style={styles.compactText}>{title}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.badge}>
        <ActivityIndicator size="large" color={color} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 28,
  },
  badge: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4CAF5060',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
