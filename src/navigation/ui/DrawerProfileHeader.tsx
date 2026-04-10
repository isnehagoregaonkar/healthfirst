import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/tokens';
import type { DrawerUserProfile } from '../hooks/useDrawerUserProfile';

const PROFILE_TOP_EXTRA = 12;

type DrawerProfileHeaderProps = Readonly<{
  profile: DrawerUserProfile | null;
}>;

export function DrawerProfileHeader({ profile }: DrawerProfileHeaderProps) {
  const insets = useSafeAreaInsets();
  const initial = profile?.name?.charAt(0).toUpperCase() ?? '?';

  return (
    <View style={[styles.block, { paddingTop: insets.top + PROFILE_TOP_EXTRA }]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarLetter}>{initial}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {profile?.name ?? '…'}
      </Text>
      <Text style={styles.email} numberOfLines={2}>
        {profile?.email ?? ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    paddingHorizontal: 20,
    paddingRight: 28,
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
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  email: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
