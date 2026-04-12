import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { IntermittentFastingScreen } from '../features/fasting/IntermittentFastingScreen';
import { appHeaderChrome, renderDrawerMenuHeaderLeft } from './navHeaderOptions';
import type { FastingStackParamList } from './types';

const Stack = createNativeStackNavigator<FastingStackParamList>();

export function FastingStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        ...appHeaderChrome,
        headerLeft: renderDrawerMenuHeaderLeft,
      }}
    >
      <Stack.Screen
        name="FastingHome"
        component={IntermittentFastingScreen}
        options={{ title: 'Fasting' }}
      />
    </Stack.Navigator>
  );
}
