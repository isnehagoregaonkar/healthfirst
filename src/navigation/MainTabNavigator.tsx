import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { MealTrackingScreen } from '../features/meals/MealTrackingScreen';
import { StepsTrackingScreen } from '../features/steps/StepsTrackingScreen';
import { WaterIntakeScreen } from '../features/water/WaterIntakeScreen';
import { FastingStackNavigator } from './FastingStackNavigator';
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
        name="Steps"
        component={StepsTrackingScreen}
        options={{
          title: 'Steps tracking',
          tabBarLabel: 'Move',
        }}
      />
      <Tab.Screen
        name="Fasting"
        component={FastingStackNavigator}
        options={{
          headerShown: false,
          title: 'Intermittent fasting',
          tabBarLabel: 'Fasting',
        }}
      />
    </Tab.Navigator>
  );
}
