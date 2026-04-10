import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
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
    </Stack.Navigator>
  );
}
