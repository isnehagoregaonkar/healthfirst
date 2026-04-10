/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { NavigationContainer } from '@react-navigation/native';
import { useState, type ReactNode } from 'react';
import { StatusBar, StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginScreen } from './src/features/auth/LoginScreen';
import { RegisterScreen } from './src/features/auth/RegisterScreen';
import { useAuthSession } from './src/features/auth/hooks/useAuthSession';
import { RootDrawer } from './src/navigation/RootDrawer';
import { SplashScreen } from './src/features/splash/SplashScreen';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login');
  const { showSplash, isAuthenticated } = useAuthSession();

  let mainContent: ReactNode;
  if (showSplash) {
    mainContent = <SplashScreen />;
  } else if (isAuthenticated) {
    mainContent = (
      <NavigationContainer>
        <RootDrawer />
      </NavigationContainer>
    );
  } else if (authScreen === 'login') {
    mainContent = (
      <LoginScreen onNavigateToRegister={() => setAuthScreen('register')} />
    );
  } else {
    mainContent = (
      <RegisterScreen onNavigateToLogin={() => setAuthScreen('login')} />
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        {mainContent}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
