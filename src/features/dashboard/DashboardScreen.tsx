import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/layout/Screen';
import { signOut } from '../../services/auth';
import { colors } from '../../theme/tokens';

export function DashboardScreen() {
  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>
          Your overview for meals, activity, water, and goals.
        </Text>

        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
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
  signOutButton: {
    marginTop: 28,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
