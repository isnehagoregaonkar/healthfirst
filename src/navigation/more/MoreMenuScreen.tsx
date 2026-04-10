import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/layout/Screen';
import { colors } from '../../theme/tokens';

/**
 * More tab hub — drawer items (progress, exercise, fasting, reminders) live as
 * their own drawer routes so each keeps state. Use this screen for future extras.
 */
export function MoreMenuScreen() {
  return (
    <Screen>
      <View style={styles.body}>
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>
          This space is for additional tools and settings. Health screens are available from the
          side menu so each one stays put when you switch away and come back.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
});
