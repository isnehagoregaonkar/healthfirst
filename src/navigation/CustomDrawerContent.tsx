import {
  DrawerContentScrollView,
  DrawerItemList,
  type DrawerContentComponentProps,
  useDrawerProgress,
} from '@react-navigation/drawer';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { signOut } from '../services/auth';
import { colors } from '../theme/tokens';
import { useDrawerUserProfile } from './hooks/useDrawerUserProfile';

type DrawerCollapseControlProps = Readonly<{
  onPress: () => void;
}>;

function DrawerCollapseControl({ onPress }: DrawerCollapseControlProps) {
  const progress = useDrawerProgress();

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0, 0.15, 1], [0, 1, 1]),
      transform: [
        { translateX: interpolate(p, [0, 1], [10, 0]) },
        { scale: interpolate(p, [0, 1], [0.88, 1]) },
      ],
    };
  });

  return (
    <Animated.View style={[styles.collapseWrap, animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close menu"
        onPress={onPress}
        style={({ pressed }) => [styles.collapseButton, pressed && styles.collapsePressed]}
      >
        <Icon name="chevron-left" size={22} color={colors.primary} />
      </Pressable>
    </Animated.View>
  );
}

export function CustomDrawerContent(props: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const profile = useDrawerUserProfile();

  const initial = profile?.name?.charAt(0).toUpperCase() ?? '?';

  const handleLogout = async () => {
    props.navigation.closeDrawer();
    await signOut();
  };

  const handleCollapse = () => {
    props.navigation.closeDrawer();
  };

  return (
    <View style={styles.root}>
      <DrawerContentScrollView
        {...props}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.profileBlock, { paddingTop: insets.top + 12 }]}>
          <View style={styles.profileRow}>
            <View style={styles.profileTextCol}>
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
            <DrawerCollapseControl onPress={handleCollapse} />
          </View>
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
  profileBlock: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: 8,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  profileTextCol: {
    flex: 1,
    minWidth: 0,
  },
  collapseWrap: {
    marginTop: 4,
  },
  collapseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  collapsePressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
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
});
