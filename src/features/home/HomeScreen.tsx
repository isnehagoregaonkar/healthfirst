import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/layout/Screen';
import { signOut } from '../../services/auth';
import { colors } from '../../theme/tokens';

export function HomeScreen() {
  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Welcome to HealthFirst</Text>
        <Text style={styles.subtitle}>You are signed in.</Text>

        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  signOutButton: {
    marginTop: 24,
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
