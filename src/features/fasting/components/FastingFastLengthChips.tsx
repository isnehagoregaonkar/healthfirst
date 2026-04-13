import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../theme/tokens';

type FastingFastLengthChipsProps = Readonly<{
  preferredHours: readonly number[];
  targetFastHours: number;
  customSelectedLabel?: string | null;
  onSelectHours: (h: number) => void;
}>;

export function FastingFastLengthChips({
  preferredHours,
  targetFastHours,
  customSelectedLabel,
  onSelectHours,
}: FastingFastLengthChipsProps) {
  const customActive = Boolean(customSelectedLabel);
  const hasPreset = preferredHours.includes(targetFastHours);
  return (
    <>
      <Text style={styles.sectionHeading}>Fast length</Text>
      <View style={styles.chipRow}>
        {preferredHours.map(h => {
          const on = !customActive && targetFastHours === h;
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
        {customActive ? (
          <View style={[styles.chip, styles.chipOn, styles.chipStatic]}>
            <Text
              style={[styles.chipText, styles.chipTextOn]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {customSelectedLabel}
            </Text>
          </View>
        ) : hasPreset ? null : (
          <View style={[styles.chip, styles.chipOn, styles.chipStatic]}>
            <Text
              style={[styles.chipText, styles.chipTextOn]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {targetFastHours}h
            </Text>
          </View>
        )}
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
    flexWrap: 'nowrap',
    gap: 6,
    marginBottom: 10,
  },
  chip: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 6,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  chipStatic: {
    justifyContent: 'center',
  },
  chipOn: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  chipTextOn: {
    color: colors.primary,
  },
});
