import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ExerciseHistoryScreen } from '../features/exercise/ExerciseHistoryScreen';
import { IntermittentFastingScreen } from '../features/fasting/IntermittentFastingScreen';
import { ProgressHistoryScreen } from '../features/progress/ProgressHistoryScreen';
import { RemindersScreen } from '../features/reminders/RemindersScreen';
import { MoreMenuScreen } from './more/MoreMenuScreen';
import { appHeaderChrome, renderDrawerMenuHeaderLeft } from './navHeaderOptions';
import type { MoreStackParamList } from './types';

const Stack = createNativeStackNavigator<MoreStackParamList>();

export function MoreStackNavigator() {
  return (
    <Stack.Navigator screenOptions={appHeaderChrome}>
      <Stack.Screen
        name="MoreHome"
        component={MoreMenuScreen}
        options={{
          title: 'More',
          headerLeft: renderDrawerMenuHeaderLeft,
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
