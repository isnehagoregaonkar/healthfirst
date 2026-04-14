import { createDrawerNavigator } from '@react-navigation/drawer';
import React from 'react';
import { ExerciseScreen } from '../features/exercise/ExerciseScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { ProgressHistoryScreen } from '../features/progress/ProgressHistoryScreen';
import { RemindersScreen } from '../features/reminders/RemindersScreen';
import { colors } from '../theme/tokens';
import { CustomDrawerContent } from './CustomDrawerContent';
import { MainTabNavigator } from './MainTabNavigator';
import { appHeaderChrome, renderDrawerMenuHeaderLeft } from './navHeaderOptions';
import type { RootDrawerParamList } from './types';

const Drawer = createDrawerNavigator<RootDrawerParamList>();

const drawerLeafScreenOptions = {
  headerShown: true,
  ...appHeaderChrome,
  headerLeft: renderDrawerMenuHeaderLeft,
  headerLeftContainerStyle: { paddingLeft: 16 },
} as const;

export function RootDrawer() {
  return (
    <Drawer.Navigator
      initialRouteName="Main"
      drawerContent={CustomDrawerContent}
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textSecondary,
        drawerLabelStyle: { marginLeft: -8, fontSize: 15 },
        drawerStyle: {
          backgroundColor: colors.surface,
          width: '86%',
          overflow: 'visible',
        },
      }}
    >
      <Drawer.Screen name="Main" component={MainTabNavigator} options={{ title: 'HealthFirst' }} />
      <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          ...drawerLeafScreenOptions,
          title: 'Profile',
        }}
      />
      <Drawer.Screen
        name="ProgressHistory"
        component={ProgressHistoryScreen}
        options={{
          ...drawerLeafScreenOptions,
          title: 'Progress history',
        }}
      />
      <Drawer.Screen
        name="ExerciseHistory"
        component={ExerciseScreen}
        options={{
          ...drawerLeafScreenOptions,
          title: 'Exercise history',
        }}
      />
      <Drawer.Screen
        name="Reminders"
        component={RemindersScreen}
        options={{
          ...drawerLeafScreenOptions,
          title: 'Reminders',
        }}
      />
    </Drawer.Navigator>
  );
}
