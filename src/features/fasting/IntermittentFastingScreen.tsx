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
import { Screen } from '../../components/layout/Screen';
import { colors } from '../../theme/tokens';
import type { FastingSession } from './fastingTypes';
import { useFasting } from './useFasting';

const PREFERRED_HOURS = [12, 14, 16, 18, 20] as const;

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
  }
  return `${m}m ${String(sec).padStart(2, '0')}s`;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDurationMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h <= 0) {
    return `${m} min`;
  }
  return `${h}h ${m}m`;
}

function HistoryRow({ row }: Readonly<{ row: FastingSession }>) {
  return (
    <View style={styles.historyRow}>
      <View style={styles.historyIcon}>
        <Icon name="check-circle-outline" size={22} color={colors.primary} />
      </View>
      <View style={styles.historyBody}>
        <Text style={styles.historyTitle}>{formatShortDate(row.startedAt)}</Text>
        <Text style={styles.historyMeta}>
          {formatDurationMin(row.durationMin)} · goal {row.targetHours}h fast
        </Text>
      </View>
    </View>
  );
}

export function IntermittentFastingScreen() {
  const {
    loading,
    isFasting,
    elapsedMs,
    targetFastHours,
    setTargetFastHours,
    startFast,
    endFast,
    history,
  } = useFasting();

  const targetMs = targetFastHours * 3600 * 1000;
  const progressPct = isFasting
    ? Math.min(100, (elapsedMs / Math.max(targetMs, 1)) * 100)
    : 0;
  const eatingHours = Math.max(0, 24 - targetFastHours);

  return (
    <Screen backgroundColor={colors.background} applyBottomSafeArea={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Fasting</Text>
        <Text style={styles.screenSub}>
          Track your eating window and fast length. Progress is saved on this device.
        </Text>

        {loading ? (
          <View style={styles.loadRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadLabel}>Loading…</Text>
          </View>
        ) : (
          <>
            <View style={styles.timerCard}>
              <View style={styles.timerHeader}>
                <Icon
                  name={isFasting ? 'moon-waning-crescent' : 'weather-sunny'}
                  size={28}
                  color={isFasting ? colors.primary : colors.textSecondary}
                />
                <Text style={styles.timerEyebrow}>
                  {isFasting ? 'Fasting' : 'Not fasting'}
                </Text>
              </View>
              {isFasting ? (
                <>
                  <Text style={styles.elapsed}>{formatElapsed(elapsedMs)}</Text>
                  <Text style={styles.timerHint}>
                    Goal · {targetFastHours}h fast · ~{eatingHours}h eating window
                  </Text>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
                  </View>
                  <Text style={styles.progressLabel}>
                    {progressPct >= 100
                      ? 'Goal reached — end when you are ready'
                      : `${Math.round(progressPct)}% of goal`}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.idleBody}>
                    Start a fast when you finish your last meal. Choose a typical fast length
                    below (you can change it anytime).
                  </Text>
                  <Text style={styles.timerHint}>
                    Target · {targetFastHours}h fast · ~{eatingHours}h eating window
                  </Text>
                </>
              )}
            </View>

            <Text style={styles.sectionLabel}>Fast length (hours)</Text>
            <View style={styles.chipRow}>
              {PREFERRED_HOURS.map(h => {
                const on = targetFastHours === h;
                return (
                  <Pressable
                    key={h}
                    onPress={() => void setTargetFastHours(h)}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{h}h</Text>
                  </Pressable>
                );
              })}
            </View>

            {isFasting ? (
              <Pressable
                onPress={() => void endFast()}
                style={({ pressed }) => [styles.dangerBtn, pressed && styles.pressed]}
              >
                <Icon name="stop-circle-outline" size={22} color={colors.surface} />
                <Text style={styles.dangerBtnText}>End fast</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => void startFast()}
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              >
                <Icon name="play-circle-outline" size={22} color={colors.surface} />
                <Text style={styles.primaryBtnText}>Start fast</Text>
              </Pressable>
            )}

            <Text style={styles.sectionTitle}>Recent fasts</Text>
            <Text style={styles.sectionHint}>Last {Math.min(history.length, 50)} completed on this device</Text>
            {history.length === 0 ? (
              <View style={styles.emptyCard}>
                <Icon name="history" size={36} color={colors.textSecondary} />
                <Text style={styles.emptyTitle}>No completed fasts yet</Text>
                <Text style={styles.emptySub}>
                  When you end a fast, it will show up here with duration and goal.
                </Text>
              </View>
            ) : (
              history.slice(0, 15).map(row => <HistoryRow key={row.id} row={row} />)
            )}
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  screenSub: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  loadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  loadLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  timerCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  timerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  timerEyebrow: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  elapsed: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  timerHint: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  idleBody: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 22,
  },
  progressTrack: {
    marginTop: 16,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  progressLabel: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
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
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 28,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.error,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 28,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.surface,
  },
  dangerBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.surface,
  },
  pressed: {
    opacity: 0.9,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  emptySub: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  historyRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBody: {
    flex: 1,
    minWidth: 0,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  historyMeta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
