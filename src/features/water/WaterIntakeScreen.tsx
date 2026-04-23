import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppLoadingSpinner } from '../../components/feedback/AppLoadingSpinner';
import {
  Screen,
  SCREEN_HORIZONTAL_PADDING,
} from '../../components/layout/Screen';
import { ScreenTopCard } from '../../components/screenTop';
import { colors } from '../../theme/tokens';
import { useWaterIntakeScreen } from './hooks/useWaterIntakeScreen';
import { formatWaterEntryTime } from './waterDayUtils';
import { WaterDropletProgress } from './WaterDropletProgress';
import { WaterMiniCharts } from './WaterMiniCharts';

const QUICK_ADD_ML = [250, 500, 1000] as const;

const WATER_BLUE = '#3B82F6';
const WATER_TRACK = '#E5E7EB';

export function WaterIntakeScreen() {
  const {
    goalMl,
    selectedDay,
    selectDay,
    loading,
    error,
    totalMl,
    entries,
    weekTotals,
    percent,
    leftMl,
    coachingLines,
    dropletPalette,
    timelineEntries,
    compareSlice,
    adding,
    deletingId,
    addMl,
    confirmRemoveEntry,
  } = useWaterIntakeScreen();

  return (
    <Screen applyTopSafeArea={false} applyBottomSafeArea={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <ScreenTopCard
          mode="date"
          selectedDay={selectedDay}
          onSelectDay={selectDay}
          stripScope="scrollablePast"
        />

        <View style={styles.progressCard}>
          {loading ? (
            <View style={styles.loadingBlock}>
              <AppLoadingSpinner title="Loading water…" />
            </View>
          ) : (
            <>
              <View style={styles.progressTopRow}>
                <View style={styles.dropletCol}>
                  <WaterDropletProgress
                    percent={percent}
                    style={styles.dropletInner}
                  />
                </View>
                <View style={styles.statsColumn}>
                  <View style={[styles.statCard, styles.statCardDone]}>
                    <View style={styles.statIconWrap}>
                      <Icon name="cup-water" size={20} color={WATER_BLUE} />
                    </View>
                    <Text style={styles.statLabel}>Drank</Text>
                    <Text style={styles.statValue}>{totalMl} ml</Text>
                  </View>
                  <View style={[styles.statCard, styles.statCardLeft]}>
                    <View style={styles.statIconWrap}>
                      <Icon name="water-minus" size={20} color="#D97706" />
                    </View>
                    <Text style={styles.statLabel}>Left</Text>
                    <Text
                      style={[
                        styles.statValue,
                        leftMl === 0 && styles.statValueMuted,
                      ]}
                    >
                      {leftMl} ml
                    </Text>
                  </View>
                  <View style={[styles.statCard, styles.statCardGoal]}>
                    <View style={styles.statIconWrap}>
                      <Icon name="target" size={20} color={colors.primary} />
                    </View>
                    <Text style={styles.statLabel}>Goal</Text>
                    <Text style={styles.statValue}>{goalMl} ml</Text>
                  </View>
                </View>
              </View>

              {entries.length > 0 ? (
                <Text style={styles.lastDrink}>
                  Last drink · {formatWaterEntryTime(entries[0].createdAt)}
                </Text>
              ) : (
                <Text style={styles.lastDrinkMuted}>
                  No drinks logged for this day yet.
                </Text>
              )}

              {coachingLines.length > 0 ? (
                <View style={styles.coachingBlock}>
                  {coachingLines.map((line, idx) => (
                    <View
                      key={`${line.kind}-${idx}`}
                      style={[
                        styles.coachingCard,
                        line.kind === 'almostThere' && styles.coachingAlmost,
                        line.kind === 'behindSchedule' && styles.coachingBehind,
                        line.kind === 'goalMet' && styles.coachingGoal,
                      ]}
                    >
                      <Text style={styles.coachingTitle}>{line.title}</Text>
                      {line.subtitle ? (
                        <Text style={styles.coachingSub}>{line.subtitle}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          )}
        </View>

        <View style={styles.quickAddSection}>
          <Text style={styles.quickAddTitle}>Quick add</Text>
          <View style={styles.buttonsRow}>
            {QUICK_ADD_ML.map(ml => (
              <Pressable
                key={ml}
                accessibilityRole="button"
                accessibilityLabel={`Add ${ml} milliliters`}
                disabled={adding || loading}
                onPress={() => {
                  addMl(ml).catch(() => {});
                }}
                style={({ pressed }) => [
                  styles.addButton,
                  pressed && styles.addButtonPressed,
                  (adding || loading) && styles.addButtonDisabled,
                ]}
              >
                <Text style={styles.addButtonText}>+{ml} ml</Text>
              </Pressable>
            ))}
          </View>
          {adding ? (
            <View style={styles.inlineLoading}>
              <AppLoadingSpinner title="Saving…" compact />
            </View>
          ) : null}
        </View>

        {!loading && weekTotals.length > 0 ? (
          <View style={styles.insightsWrap}>
            {compareSlice ? (
              <Text style={styles.insightsSectionTitle}>
                {compareSlice.compareTitle}
              </Text>
            ) : null}
            <View style={styles.insightsCard}>
              {compareSlice ? (
                <WaterMiniCharts.Compare
                  showTitle={false}
                  title={compareSlice.compareTitle}
                  leftLabel={compareSlice.leftLabel}
                  rightLabel={compareSlice.rightLabel}
                  leftMl={compareSlice.prev.totalMl}
                  rightMl={compareSlice.current.totalMl}
                  goalMl={goalMl}
                />
              ) : null}
              {compareSlice ? <View style={styles.chartDivider} /> : null}
              <WaterMiniCharts.Week days={weekTotals} goalMl={goalMl} />
            </View>
          </View>
        ) : null}

        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>Intake timeline</Text>
          {loading ? (
            <Text style={styles.mutedBody}>Loading…</Text>
          ) : timelineEntries.length === 0 ? (
            <Text style={styles.mutedBody}>No intake events for this day.</Text>
          ) : (
            <View style={styles.timelineCard}>
              {timelineEntries.map((entry, index) => {
                const isLast = index === timelineEntries.length - 1;
                const busy = deletingId === entry.id;
                return (
                  <View key={entry.id} style={styles.tlRow}>
                    <View style={styles.tlAxis}>
                      <View
                        style={[
                          styles.tlDot,
                          { backgroundColor: dropletPalette.accent },
                        ]}
                      />
                      {!isLast ? <View style={styles.tlLine} /> : null}
                    </View>
                    <View style={styles.tlMain}>
                      <Text style={styles.tlTime}>
                        {formatWaterEntryTime(entry.createdAt)}
                      </Text>
                      <Text style={styles.tlAmount}>+{entry.amountMl} ml</Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${entry.amountMl} milliliters`}
                      disabled={busy || adding}
                      onPress={() => confirmRemoveEntry(entry)}
                      style={({ pressed }) => [
                        styles.tlDelete,
                        (busy || adding) && styles.tlDeleteDisabled,
                        pressed && !busy && !adding && styles.tlDeletePressed,
                      ]}
                    >
                      {busy ? (
                        <ActivityIndicator size="small" color={colors.error} />
                      ) : (
                        <Icon
                          name="trash-can-outline"
                          size={22}
                          color={colors.error}
                        />
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const cardChrome = {
  backgroundColor: colors.surface,
  borderRadius: 16,
  padding: 18,
  borderWidth: 1,
  borderColor: colors.border,
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 3,
} as const;

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingTop: 4,
    paddingBottom: 28,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  progressCard: {
    ...cardChrome,
    marginTop: 12,
    marginBottom: 14,
  },
  lastDrink: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 14,
  },
  lastDrinkMuted: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 14,
  },
  coachingBlock: {
    marginTop: 4,
    gap: 10,
  },
  coachingCard: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  coachingAlmost: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  coachingBehind: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  coachingGoal: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  coachingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  coachingSub: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 18,
  },
  insightsWrap: {
    marginTop: 22,
  },
  insightsSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  insightsCard: {
    ...cardChrome,
    marginBottom: 14,
    gap: 0,
  },
  chartDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginTop: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  mutedBody: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  timelineSection: {
    marginTop: 4,
    marginBottom: 8,
  },
  timelineCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tlRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 48,
  },
  tlAxis: {
    width: 22,
    alignItems: 'center',
    paddingTop: 4,
  },
  tlDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  tlLine: {
    flex: 1,
    width: 2,
    marginTop: 2,
    minHeight: 28,
    backgroundColor: WATER_TRACK,
    borderRadius: 1,
  },
  tlMain: {
    flex: 1,
    paddingVertical: 10,
    paddingLeft: 8,
    paddingRight: 6,
    justifyContent: 'center',
    minWidth: 0,
  },
  tlTime: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  tlAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  tlDelete: {
    padding: 8,
    marginTop: 4,
    borderRadius: 10,
  },
  tlDeletePressed: {
    opacity: 0.75,
    backgroundColor: '#FEF2F2',
  },
  tlDeleteDisabled: {
    opacity: 0.45,
  },
  loadingBlock: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 12,
  },
  progressTopRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    marginBottom: 20,
  },
  dropletCol: {
    flexBasis: '62%',
    maxWidth: '65%',
    flexGrow: 0,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dropletInner: {
    alignSelf: 'stretch',
  },
  statsColumn: {
    flex: 1,
    minWidth: 0,
    gap: 9,
    justifyContent: 'center',
    paddingLeft: 2,
  },
  statCard: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statCardDone: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  statCardLeft: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  statCardGoal: {
    backgroundColor: colors.primarySoft,
    borderColor: '#C8E6C9',
  },
  statIconWrap: {
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statValueMuted: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  quickAddSection: {
    paddingTop: 4,
    marginBottom: 10,
  },
  quickAddTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addButton: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonPressed: {
    opacity: 0.88,
  },
  addButtonDisabled: {
    opacity: 0.55,
  },
  addButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  inlineLoading: {
    marginTop: 10,
    alignItems: 'center',
  },
});
