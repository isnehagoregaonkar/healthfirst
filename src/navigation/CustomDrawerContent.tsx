import {
  DrawerContentScrollView,
  DrawerItemList,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { signOut } from '../services/auth';
import { colors } from '../theme/tokens';
import { useDrawerUserProfile } from './hooks/useDrawerUserProfile';
import { DrawerProfileHeader } from './ui/DrawerProfileHeader';

const FOOTER_MIN_PADDING = 14;

export function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { navigation } = props;
  const insets = useSafeAreaInsets();
  const profile = useDrawerUserProfile();

  const handleCloseDrawer = useCallback(() => {
    navigation.closeDrawer();
  }, [navigation]);

  const handleLogout = useCallback(async () => {
    navigation.closeDrawer();
    await signOut();
  }, [navigation]);

  return (
    <View style={styles.root}>
      <DrawerContentScrollView
        {...props}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <DrawerProfileHeader profile={profile} onClosePress={handleCloseDrawer} />

        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, FOOTER_MIN_PADDING) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log out"
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPressed]}
        >
          <Icon name="logout" size={22} color={colors.error} />
          <Text style={styles.logoutLabel}>Log out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
    flexGrow: 1,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: colors.surface,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  logoutPressed: {
    backgroundColor: colors.background,
  },
  logoutLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
});
