/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { useEffect, useState, type ReactNode } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginScreen } from './src/features/auth/LoginScreen';
import { RegisterScreen } from './src/features/auth/RegisterScreen';
import { SplashScreen } from './src/features/splash/SplashScreen';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [showSplash, setShowSplash] = useState(true);
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login');

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setShowSplash(false);
    }, 2200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  let mainContent: ReactNode;
  if (showSplash) {
    mainContent = <SplashScreen />;
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
