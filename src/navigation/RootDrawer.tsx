import { createDrawerNavigator } from '@react-navigation/drawer';
import React from 'react';
import { CustomDrawerContent } from './CustomDrawerContent';
import { DrawerMenuButton } from './DrawerMenuButton';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { ExerciseHistoryScreen } from '../features/exercise/ExerciseHistoryScreen';
import { IntermittentFastingScreen } from '../features/fasting/IntermittentFastingScreen';
import { MealTrackingScreen } from '../features/meals/MealTrackingScreen';
import { ProgressHistoryScreen } from '../features/progress/ProgressHistoryScreen';
import { RemindersScreen } from '../features/reminders/RemindersScreen';
import { StepsTrackingScreen } from '../features/steps/StepsTrackingScreen';
import { WaterIntakeScreen } from '../features/water/WaterIntakeScreen';
import { colors } from '../theme/tokens';
import {
  DashboardDrawerIcon,
  ExerciseDrawerIcon,
  FastingDrawerIcon,
  MealDrawerIcon,
  ProgressDrawerIcon,
  RemindersDrawerIcon,
  StepsDrawerIcon,
  WaterDrawerIcon,
} from './drawerIcons';
import type { DrawerParamList } from './types';

const Drawer = createDrawerNavigator<DrawerParamList>();

function drawerHeaderMenuLeft() {
  return <DrawerMenuButton />;
}

export function RootDrawer() {
  return (
    <Drawer.Navigator
      initialRouteName="Dashboard"
      drawerContent={CustomDrawerContent}
      screenOptions={{
        headerShown: true,
        headerLeft: drawerHeaderMenuLeft,
        headerLeftContainerStyle: {
          paddingLeft: 16,
        },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textSecondary,
        drawerLabelStyle: { marginLeft: -8, fontSize: 15 },
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontWeight: '700', fontSize: 18, color: colors.textPrimary },
        drawerStyle: { backgroundColor: colors.surface, width: '86%' },
      }}
    >
      <Drawer.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          drawerIcon: DashboardDrawerIcon,
        }}
      />
      <Drawer.Screen
        name="MealTracking"
        component={MealTrackingScreen}
        options={{
          title: 'Meal tracking',
          drawerLabel: 'Meal tracking',
          drawerIcon: MealDrawerIcon,
        }}
      />
      <Drawer.Screen
        name="ProgressHistory"
        component={ProgressHistoryScreen}
        options={{
          title: 'Progress history',
          drawerLabel: 'Progress history',
          drawerIcon: ProgressDrawerIcon,
        }}
      />
      <Drawer.Screen
        name="WaterIntake"
        component={WaterIntakeScreen}
        options={{
          title: 'Water intake',
          drawerLabel: 'Water intake',
          drawerIcon: WaterDrawerIcon,
        }}
      />
      <Drawer.Screen
        name="StepsTracking"
        component={StepsTrackingScreen}
        options={{
          title: 'Steps tracking',
          drawerLabel: 'Steps tracking',
          drawerIcon: StepsDrawerIcon,
        }}
      />
      <Drawer.Screen
        name="ExerciseHistory"
        component={ExerciseHistoryScreen}
        options={{
          title: 'Exercise & streak',
          drawerLabel: 'Exercise & streak',
          drawerIcon: ExerciseDrawerIcon,
        }}
      />
      <Drawer.Screen
        name="IntermittentFasting"
        component={IntermittentFastingScreen}
        options={{
          title: 'Intermittent fasting',
          drawerLabel: 'Intermittent fasting',
          drawerIcon: FastingDrawerIcon,
        }}
      />
      <Drawer.Screen
        name="Reminders"
        component={RemindersScreen}
        options={{
          title: 'Reminders',
          drawerIcon: RemindersDrawerIcon,
        }}
      />
    </Drawer.Navigator>
  );
}
