/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { NavigationContainer } from '@react-navigation/native';
import { Component, useState, type ErrorInfo, type ReactNode } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginScreen } from './src/features/auth/LoginScreen';
import { RegisterScreen } from './src/features/auth/RegisterScreen';
import { useAuthSession } from './src/features/auth/hooks/useAuthSession';
import { RootDrawer } from './src/navigation/RootDrawer';
import { SplashScreen } from './src/features/splash/SplashScreen';

type ErrorBoundaryProps = Readonly<{ children: ReactNode }>;
type ErrorBoundaryState = { error: Error | null };

class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('AppErrorBoundary', error.message, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <View style={errorStyles.fallback}>
          <Text style={errorStyles.title}>Something went wrong</Text>
          <ScrollView style={errorStyles.scroll}>
            <Text style={errorStyles.message}>{this.state.error.message}</Text>
          </ScrollView>
          <Text style={errorStyles.hint}>
            If you see a blank screen on Android, ensure Metro is running and the device can reach it
            (same Wi‑Fi, or run: adb reverse tcp:8081 tcp:8081).
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

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
    <AppErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
          {mainContent}
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}

export default App;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const errorStyles = StyleSheet.create({
  fallback: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111827',
  },
  scroll: { maxHeight: 200, marginBottom: 16 },
  message: { fontSize: 14, color: '#374151' },
  hint: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
});
