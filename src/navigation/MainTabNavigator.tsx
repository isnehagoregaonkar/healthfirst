import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { MealTrackingScreen } from '../features/meals/MealTrackingScreen';
import { StepsTrackingScreen } from '../features/steps/StepsTrackingScreen';
import { WaterIntakeScreen } from '../features/water/WaterIntakeScreen';
import { colors } from '../theme/tokens';
import { DrawerMenuButton } from './DrawerMenuButton';
import { MoreStackNavigator } from './MoreStackNavigator';
import type { MainTabParamList } from './types';
import { HealthBottomTabBar } from './ui/HealthBottomTabBar';

const Tab = createBottomTabNavigator<MainTabParamList>();

function tabScreenHeaderLeft() {
  return <DrawerMenuButton />;
}

function renderMainTabBar(props: BottomTabBarProps) {
  return <HealthBottomTabBar {...props} />;
}

const headerOptions = {
  headerShown: true,
  headerLeft: tabScreenHeaderLeft,
  headerLeftContainerStyle: { paddingLeft: 16 },
  headerTintColor: colors.primary,
  headerStyle: { backgroundColor: colors.surface },
  headerTitleStyle: { fontWeight: '700' as const, fontSize: 18, color: colors.textPrimary },
};

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={renderMainTabBar}
      screenOptions={{
        ...headerOptions,
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="Meals"
        component={MealTrackingScreen}
        options={{
          title: 'Meal tracking',
          tabBarLabel: 'Meals',
        }}
      />
      <Tab.Screen
        name="Water"
        component={WaterIntakeScreen}
        options={{
          title: 'Water intake',
          tabBarLabel: 'Water',
        }}
      />
      <Tab.Screen
        name="Steps"
        component={StepsTrackingScreen}
        options={{
          title: 'Steps tracking',
          tabBarLabel: 'Move',
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreStackNavigator}
        options={{
          headerShown: false,
          tabBarLabel: 'More',
        }}
      />
    </Tab.Navigator>
  );
}
