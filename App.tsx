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
import { HomeScreen } from './src/features/home/HomeScreen';
import { SplashScreen } from './src/features/splash/SplashScreen';
import { supabase } from './src/services/supabase';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [showSplash, setShowSplash] = useState(true);
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setShowSplash(false);
    }, 2200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const hydrateSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (isMounted) {
        setIsAuthenticated(Boolean(data.session));
      }
    };

    hydrateSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session));
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
