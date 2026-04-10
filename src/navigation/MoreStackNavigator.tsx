import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ExerciseHistoryScreen } from '../features/exercise/ExerciseHistoryScreen';
import { IntermittentFastingScreen } from '../features/fasting/IntermittentFastingScreen';
import { ProgressHistoryScreen } from '../features/progress/ProgressHistoryScreen';
import { RemindersScreen } from '../features/reminders/RemindersScreen';
import { colors } from '../theme/tokens';
import { DrawerMenuButton } from './DrawerMenuButton';
import { MoreMenuScreen } from './more/MoreMenuScreen';
import type { MoreStackParamList } from './types';

const Stack = createNativeStackNavigator<MoreStackParamList>();

function moreHomeHeaderLeft() {
  return <DrawerMenuButton />;
}

const stackHeader = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.primary,
  headerTitleStyle: { fontWeight: '700' as const, fontSize: 18, color: colors.textPrimary },
};

export function MoreStackNavigator() {
  return (
    <Stack.Navigator screenOptions={stackHeader}>
      <Stack.Screen
        name="MoreHome"
        component={MoreMenuScreen}
        options={{
          title: 'More',
          headerLeft: moreHomeHeaderLeft,
        }}
      />
      <Stack.Screen
        name="ProgressHistory"
        component={ProgressHistoryScreen}
        options={{ title: 'Progress history' }}
      />
      <Stack.Screen
        name="ExerciseHistory"
        component={ExerciseHistoryScreen}
        options={{ title: 'Exercise & streak' }}
      />
      <Stack.Screen
        name="IntermittentFasting"
        component={IntermittentFastingScreen}
        options={{ title: 'Intermittent fasting' }}
      />
      <Stack.Screen name="Reminders" component={RemindersScreen} options={{ title: 'Reminders' }} />
    </Stack.Navigator>
  );
}
