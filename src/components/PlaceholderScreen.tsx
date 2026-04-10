import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from './layout/Screen';
import { colors } from '../theme/tokens';

type PlaceholderScreenProps = Readonly<{
  title: string;
  subtitle?: string;
}>;

export function PlaceholderScreen({ title, subtitle = 'Content coming soon.' }: PlaceholderScreenProps) {
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
