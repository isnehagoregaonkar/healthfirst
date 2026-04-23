import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { IntermittentFastingScreen } from '../features/fasting/IntermittentFastingScreen';
import { appHeaderChrome } from './navHeaderOptions';
import { DrawerMenuButton } from './DrawerMenuButton';
import type { FastingStackParamList } from './types';

const Stack = createNativeStackNavigator<FastingStackParamList>();

export function FastingStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        ...appHeaderChrome,
        headerLeft: () => (
          <View style={styles.leftInset}>
            <DrawerMenuButton />
          </View>
        ),
      }}
    >
      <Stack.Screen
        name="FastingHome"
        component={IntermittentFastingScreen}
        options={{ title: 'Intermittent fasting' }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  leftInset: {
    paddingLeft: 16,
  },
});
