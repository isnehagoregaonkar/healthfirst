import { DrawerActions, useNavigation } from '@react-navigation/native';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/tokens';

export function DrawerMenuButton() {
  const navigation = useNavigation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
      style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
    >
      <Icon name="menu" size={26} color={colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    marginLeft: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.65,
  },
});
