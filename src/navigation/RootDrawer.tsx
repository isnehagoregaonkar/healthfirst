import { createDrawerNavigator } from '@react-navigation/drawer';
import React from 'react';
import { CustomDrawerContent } from './CustomDrawerContent';
import { MainTabNavigator } from './MainTabNavigator';
import { colors } from '../theme/tokens';
import type { RootDrawerParamList } from './types';

const Drawer = createDrawerNavigator<RootDrawerParamList>();

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
    </Drawer.Navigator>
  );
}
