import {
  DrawerContentScrollView,
  DrawerItemList,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { signOut } from '../services/auth';
import { colors } from '../theme/tokens';
import { useDrawerUserProfile } from './hooks/useDrawerUserProfile';

export function CustomDrawerContent(props: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const profile = useDrawerUserProfile();

  const initial = profile?.name?.charAt(0).toUpperCase() ?? '?';

  const handleLogout = async () => {
    props.navigation.closeDrawer();
    await signOut();
  };

  const handleCollapse = () => {
    props.navigation.closeDrawer();
  };

  const collapseTop = Math.max(insets.top, 12) + (height - insets.top - insets.bottom) * 0.38;

  return (
    <View style={styles.root}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.profileBlock, { paddingTop: insets.top + 12 }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>{initial}</Text>
          </View>
          <Text style={styles.profileName} numberOfLines={1}>
            {profile?.name ?? '…'}
          </Text>
          <Text style={styles.profileEmail} numberOfLines={2}>
            {profile?.email ?? ''}
          </Text>
        </View>

        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close menu"
        onPress={handleCollapse}
        style={[
          styles.collapseEdge,
          {
            top: collapseTop,
          },
        ]}
      >
        <Icon name="chevron-left" size={22} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    paddingTop: 0,
    flexGrow: 1,
  },
  profileBlock: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: 8,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarLetter: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  profileEmail: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
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
  collapseEdge: {
    position: 'absolute',
    right: -14,
    width: 28,
    height: 52,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
});
