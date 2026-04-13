import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/tokens';
import type { DrawerUserProfile } from '../hooks/useDrawerUserProfile';

const PROFILE_TOP_EXTRA = 12;

type DrawerProfileHeaderProps = Readonly<{
  profile: DrawerUserProfile | null;
  avatarUri: string | null;
  onPressProfile?: () => void;
}>;

export function DrawerProfileHeader({
  profile,
  avatarUri,
  onPressProfile,
}: DrawerProfileHeaderProps) {
  const insets = useSafeAreaInsets();
  const initial = profile?.name?.charAt(0).toUpperCase() ?? '?';

  return (
    <Pressable
      accessibilityRole={onPressProfile ? 'button' : undefined}
      accessibilityLabel={onPressProfile ? 'Open profile' : undefined}
      disabled={!onPressProfile}
      onPress={onPressProfile}
      style={({ pressed }) => [
        styles.block,
        { paddingTop: insets.top + PROFILE_TOP_EXTRA },
        pressed && onPressProfile && styles.blockPressed,
      ]}
    >
      <View style={styles.avatar}>
        {avatarUri ? (
          <Image
            key={avatarUri}
            source={{ uri: avatarUri }}
            style={styles.avatarImage}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.avatarLetter}>{initial}</Text>
        )}
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {profile?.name ?? '…'}
      </Text>
      <Text style={styles.email} numberOfLines={2}>
        {profile?.email ?? ''}
      </Text>
    </Pressable>
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
  blockPressed: {
    opacity: 0.92,
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
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
