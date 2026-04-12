import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../theme/tokens';
import { formatElapsed } from '../fastingScreenFormat';

type FastingTimerSectionProps = Readonly<{
  isFasting: boolean;
  elapsedMs: number;
  targetFastHours: number;
  eatingHours: number;
  progressPct: number;
}>;

export function FastingTimerSection({
  isFasting,
  elapsedMs,
  targetFastHours,
  eatingHours,
  progressPct,
}: FastingTimerSectionProps) {
  return (
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
            Start when you finish your last meal. Pick a fast length below anytime.
          </Text>
          <Text style={styles.timerHint}>
            Target · {targetFastHours}h fast · ~{eatingHours}h eating window
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  timerCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 12,
    marginBottom: 10,
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
});
