import {
  DrawerActions,
  type NavigationProp,
  type ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import React, { useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/tokens';

type NavMaybeDrawer = NavigationProp<ParamListBase> & { openDrawer?: () => void };

/**
 * Drawer lives above the tab navigator; leaf screens often don't handle DrawerActions.
 * Walk parents for `openDrawer` or a navigator with state.type === 'drawer', then dispatch.
 */
function openDrawerFromNavigation(navigation: NavigationProp<ParamListBase>) {
  let nav: NavigationProp<ParamListBase> | undefined = navigation;
  for (let depth = 0; depth < 8 && nav != null; depth += 1) {
    const od = (nav as NavMaybeDrawer).openDrawer;
    if (typeof od === 'function') {
      od();
      return;
    }
    nav = nav.getParent();
  }

  nav = navigation.getParent();
  for (let depth = 0; depth < 8 && nav != null; depth += 1) {
    const st = nav.getState() as { type?: string };
    if (st.type === 'drawer') {
      nav.dispatch(DrawerActions.openDrawer());
      return;
    }
    nav = nav.getParent();
  }

  navigation.dispatch(DrawerActions.openDrawer());
}

export function DrawerMenuButton() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const insets = useSafeAreaInsets();

  const onPress = useCallback(() => {
    openDrawerFromNavigation(navigation);
  }, [navigation]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      onPress={onPress}
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
