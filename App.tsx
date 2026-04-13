/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import {
  createNavigationContainerRef,
  NavigationContainer,
} from '@react-navigation/native';
import { useEffect, useState, type ReactNode } from 'react';
import { StatusBar, StyleSheet, useColorScheme } from 'react-native';
import {
  scheduleFastingNotificationPermissionPrompt,
  startFastingNotificationOpenListener,
} from './src/features/fasting/fastingReminderNotifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginScreen } from './src/features/auth/LoginScreen';
import { RegisterScreen } from './src/features/auth/RegisterScreen';
import { useAuthSession } from './src/features/auth/hooks/useAuthSession';
import { RootDrawer } from './src/navigation/RootDrawer';
import type { RootDrawerParamList } from './src/navigation/types';
import { SplashScreen } from './src/features/splash/SplashScreen';

const navRef = createNavigationContainerRef<RootDrawerParamList>();

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login');
  const [pendingNavigateToFasting, setPendingNavigateToFasting] =
    useState(false);
  const { showSplash, isAuthenticated } = useAuthSession();

  const navigateToFastingTab = () => {
    if (!isAuthenticated) {
      return;
    }
    if (!navRef.isReady()) {
      setPendingNavigateToFasting(true);
      return;
    }
    navRef.navigate('Main', {
      screen: 'Fasting',
      params: { screen: 'FastingHome' },
    });
  };

  useEffect(() => {
    if (showSplash || !isAuthenticated) {
      return;
    }
    scheduleFastingNotificationPermissionPrompt();
    const unsub = startFastingNotificationOpenListener(() => {
      navigateToFastingTab();
    });
    return () => {
      unsub();
    };
  }, [showSplash, isAuthenticated]);

  let mainContent: ReactNode;
  if (showSplash) {
    mainContent = <SplashScreen />;
  } else if (isAuthenticated) {
    mainContent = (
      <NavigationContainer
        ref={navRef}
        onReady={() => {
          if (pendingNavigateToFasting) {
            setPendingNavigateToFasting(false);
            navigateToFastingTab();
          }
        }}
      >
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
