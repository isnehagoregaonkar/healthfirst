import React, { useCallback, useEffect, useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../../../theme/tokens';
import type { TimeOfDay } from '../fastingTypes';

/** Original minimal layout: two wheels + colon + soft green selection band (no card / preview). */
const ITEM_H = 40;
const VISIBLE_ROWS = 5;
const PAD = ((VISIBLE_ROWS - 1) / 2) * ITEM_H;

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

type FastingScrollTimePickerProps = Readonly<{
  value: TimeOfDay;
  onChange: (date: Date) => void;
}>;

function clampIndex(idx: number, len: number): number {
  return Math.max(0, Math.min(len - 1, idx));
}

type WheelColumnProps = Readonly<{
  values: readonly number[];
  selected: number;
  formatLabel: (n: number) => string;
  onSelectIndex: (index: number) => void;
}>;

function WheelColumn({
  values,
  selected,
  formatLabel,
  onSelectIndex,
}: WheelColumnProps) {
  const scrollRef = useRef<ScrollView>(null);
  const len = values.length;

  const scrollToIndex = useCallback(
    (index: number, animated: boolean) => {
      const y = clampIndex(index, len) * ITEM_H;
      scrollRef.current?.scrollTo({ y, animated });
    },
    [len],
  );

  useEffect(() => {
    const idx = clampIndex(values.indexOf(selected), len);
    const id = requestAnimationFrame(() => {
      scrollToIndex(idx, false);
    });
    return () => cancelAnimationFrame(id);
  }, [len, selected, scrollToIndex, values]);

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const idx = clampIndex(Math.round(y / ITEM_H), len);
      scrollToIndex(idx, true);
      onSelectIndex(idx);
    },
    [len, onSelectIndex, scrollToIndex],
  );

  return (
    <View style={styles.wheelFrame}>
      <View style={styles.wheelHighlight} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        style={styles.wheelScroll}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        snapToAlignment="start"
        decelerationRate="fast"
        bounces={false}
        nestedScrollEnabled
        removeClippedSubviews={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onMomentumScrollEnd={onScrollEnd}
        contentContainerStyle={styles.wheelContent}
        {...(Platform.OS === 'android' ? { overScrollMode: 'never' as const } : {})}
      >
        {values.map(v => (
          <View key={v} style={styles.wheelItem}>
            <Text style={styles.wheelItemText}>{formatLabel(v)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * Custom scroll wheels — same idea as the very first version before card/preview/captions.
 * (Native RNDateTimePicker stays unused — it was “Unimplemented” on this app.)
 */
export function FastingScrollTimePicker({
  value,
  onChange,
}: FastingScrollTimePickerProps) {
  const emit = useCallback(
    (hour: number, minute: number) => {
      const d = new Date();
      d.setHours(hour, minute, 0, 0);
      onChange(d);
    },
    [onChange],
  );

  const onHourIndex = useCallback(
    (idx: number) => {
      emit(HOURS[idx] ?? 0, value.minute);
    },
    [emit, value.minute],
  );

  const onMinuteIndex = useCallback(
    (idx: number) => {
      emit(value.hour, MINUTES[idx] ?? 0);
    },
    [emit, value.hour],
  );

  const fmtHour = useCallback((h: number) => String(h).padStart(2, '0'), []);
  const fmtMin = useCallback((m: number) => String(m).padStart(2, '0'), []);

  const a11y = `Time ${fmtHour(value.hour)}:${fmtMin(value.minute)}`;

  return (
    <View style={styles.row} accessibilityLabel={a11y}>
      <WheelColumn
        values={HOURS}
        selected={value.hour}
        formatLabel={fmtHour}
        onSelectIndex={onHourIndex}
      />
      <Text style={styles.colon} accessibilityElementsHidden>
        :
      </Text>
      <WheelColumn
        values={MINUTES}
        selected={value.minute}
        formatLabel={fmtMin}
        onSelectIndex={onMinuteIndex}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    alignSelf: 'stretch',
    marginVertical: 4,
  },
  colon: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginHorizontal: 4,
    marginTop: Platform.OS === 'ios' ? 0 : -4,
    fontVariant: ['tabular-nums'],
  },
  wheelFrame: {
    width: 72,
    height: VISIBLE_ROWS * ITEM_H,
    overflow: 'hidden',
    position: 'relative',
  },
  wheelScroll: {
    width: 72,
    height: VISIBLE_ROWS * ITEM_H,
    zIndex: 1,
  },
  wheelHighlight: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
    marginVertical: ITEM_H * 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: `${colors.primary}55`,
    backgroundColor: colors.primarySoft,
  },
  wheelContent: {
    paddingTop: PAD,
    paddingBottom: PAD,
  },
  wheelItem: {
    height: ITEM_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelItemText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
});
