import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/layout/Screen';
import { colors } from '../../theme/tokens';

export function DashboardScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>
          Your overview for meals, activity, water, and goals.
        </Text>
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
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
