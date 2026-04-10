import { DrawerActions, useNavigation } from '@react-navigation/native';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/tokens';

export function DrawerMenuButton() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
      style={({ pressed }) => [
        styles.hit,
        { marginLeft: Math.max(insets.left, 0) },
        pressed && styles.pressed,
      ]}
    >
      <Icon name="menu" size={24} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  pressed: {
    opacity: 0.65,
  },
});
