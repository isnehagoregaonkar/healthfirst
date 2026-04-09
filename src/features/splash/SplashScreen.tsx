import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Screen } from '../../components/layout/Screen';
import { colors } from '../../theme/tokens';

export function SplashScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <Image
          source={require('../../assets/logo/health-first-animation.gif')}
          resizeMode="contain"
          style={styles.logo}
        />
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
  logo: {
    width: 220,
    height: 220,
  },
  title: {
    marginTop: 16,
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
