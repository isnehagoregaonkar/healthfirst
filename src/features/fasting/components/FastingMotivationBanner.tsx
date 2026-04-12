import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../theme/tokens';

type FastingMotivationBannerProps = Readonly<{
  line: string;
}>;

export function FastingMotivationBanner({ line }: FastingMotivationBannerProps) {
  return (
    <View style={styles.motivationCard}>
      <Icon name="heart-outline" size={20} color={colors.primary} />
      <Text style={styles.motivationText}>{line}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  motivationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: `${colors.primary}33`,
    marginBottom: 14,
  },
  motivationText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 20,
  },
});
