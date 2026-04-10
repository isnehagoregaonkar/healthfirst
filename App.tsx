/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { useState, type ReactNode } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginScreen } from './src/features/auth/LoginScreen';
import { RegisterScreen } from './src/features/auth/RegisterScreen';
import { useAuthSession } from './src/features/auth/hooks/useAuthSession';
import { HomeScreen } from './src/features/home/HomeScreen';
import { SplashScreen } from './src/features/splash/SplashScreen';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login');
  const { showSplash, isAuthenticated } = useAuthSession();

  let mainContent: ReactNode;
  if (showSplash) {
    mainContent = <SplashScreen />;
  } else if (isAuthenticated) {
    mainContent = <HomeScreen />;
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
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      {mainContent}
    </SafeAreaProvider>
  );
}

export default App;
