import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { MealTrackingScreen } from '../features/meals/MealTrackingScreen';
import { ExerciseScreen } from '../features/exercise/ExerciseScreen';
import { WaterIntakeScreen } from '../features/water/WaterIntakeScreen';
import { MoreStackNavigator } from './MoreStackNavigator';
import { tabScreenOptions } from './navHeaderOptions';
import type { MainTabParamList } from './types';
import { HealthBottomTabBar } from './ui/HealthBottomTabBar';

const Tab = createBottomTabNavigator<MainTabParamList>();

function renderMainTabBar(props: BottomTabBarProps) {
  return <HealthBottomTabBar {...props} />;
}

export function MainTabNavigator() {
  return (
    <Tab.Navigator tabBar={renderMainTabBar} screenOptions={tabScreenOptions}>
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
        name="Exercise"
        component={ExerciseScreen}
        options={{
          title: 'Exercise',
          tabBarLabel: 'Exercise',
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
