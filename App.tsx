/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { StatusBar, useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginScreen } from './src/features/auth/LoginScreen';
import { SplashScreen } from './src/features/splash/SplashScreen';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setShowSplash(false);
    }, 2200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      {showSplash ? <SplashScreen /> : <LoginScreen />}
    </SafeAreaProvider>
  );
}

export default App;
