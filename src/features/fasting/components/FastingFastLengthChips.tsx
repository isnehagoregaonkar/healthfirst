import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../theme/tokens';

type FastingFastLengthChipsProps = Readonly<{
  preferredHours: readonly number[];
  targetFastHours: number;
  onSelectHours: (h: number) => void;
}>;

export function FastingFastLengthChips({
  preferredHours,
  targetFastHours,
  onSelectHours,
}: FastingFastLengthChipsProps) {
  return (
    <>
      <Text style={styles.sectionHeading}>Fast length</Text>
      <View style={styles.chipRow}>
        {preferredHours.map(h => {
          const on = targetFastHours === h;
          return (
            <Pressable
              key={h}
              onPress={() => onSelectHours(h)}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{h}h</Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  chipTextOn: {
    color: colors.primary,
  },
});
