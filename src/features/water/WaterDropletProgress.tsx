import React, { useId, useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

const WATER_BLUE = '#3B82F6';
const WATER_MID = '#38BDF8';
const WATER_LIGHT = '#7DD3FC';
const WATER_DEEP = '#1D4ED8';
const OUTLINE = '#94A3B8';
const SOFT = '#E8EEF3';

const VB_W = 100;
const VB_H = 128;

const DROPLET_D =
  'M50 4 C28 36 8 58 8 82 C8 106 26 124 50 124 C74 124 92 106 92 82 C92 58 72 36 50 4Z';

type WaterDropletProgressProps = Readonly<{
  percent: number;
  style?: StyleProp<ViewStyle>;
}>;

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, n));
}

export function WaterDropletProgress({ percent, style }: WaterDropletProgressProps) {
  const p = clampPct(percent);
  const rawId = useId();
  const safe = useMemo(() => rawId.replaceAll(/[^a-zA-Z0-9]/g, ''), [rawId]);
  const clipId = `wd-${safe}`;
  const gradBody = `wdb-${safe}`;
  const gradDeep = `wdd-${safe}`;
  const radId = `wdr-${safe}`;

  const fillH = (118 * p) / 100;
  const yTop = 126 - fillH;

  const waveY = yTop + 3;
  const wave1 = useMemo(
    () =>
      [
        'M 0',
        waveY + 5,
        'Q 22',
        waveY - 2,
        '44',
        waveY + 1,
        'T 88',
        waveY,
        'T 100',
        waveY + 4,
        'L 100 130 L 0 130 Z',
      ].join(' '),
    [waveY],
  );

  const wave2 = useMemo(
    () =>
      [
        'M 0',
        waveY + 8,
        'Q 30',
        waveY + 2,
        '55',
        waveY + 5,
        'T 100',
        waveY + 3,
        'L 100 130 L 0 130 Z',
      ].join(' '),
    [waveY],
  );

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.svgSizer}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid meet">
          <Defs>
            <LinearGradient id={gradBody} x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor={WATER_DEEP} stopOpacity={1} />
              <Stop offset="0.45" stopColor={WATER_BLUE} stopOpacity={1} />
              <Stop offset="0.85" stopColor={WATER_MID} stopOpacity={0.95} />
              <Stop offset="1" stopColor={WATER_LIGHT} stopOpacity={0.85} />
            </LinearGradient>
            <LinearGradient id={gradDeep} x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0" stopColor="#0F172A" stopOpacity={0.35} />
              <Stop offset="0.55" stopColor={WATER_BLUE} stopOpacity={0.15} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
            <RadialGradient id={radId} cx="32%" cy="35%" rx="45%" ry="40%" fx="28%" fy="32%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.45} />
              <Stop offset="0.35" stopColor="#E0F2FE" stopOpacity={0.2} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
            <ClipPath id={clipId}>
              <Path d={DROPLET_D} />
            </ClipPath>
          </Defs>

          <Path d={DROPLET_D} fill={SOFT} />

          {p > 0 ? (
            <G clipPath={`url(#${clipId})`}>
              <Rect x={0} y={yTop} width={VB_W} height={fillH + 10} fill={`url(#${gradBody})`} />
              <Rect
                x={0}
                y={yTop + fillH * 0.35}
                width={VB_W}
                height={fillH * 0.65 + 8}
                fill={`url(#${gradDeep})`}
                opacity={0.9}
              />
              <Rect
                x={0}
                y={yTop}
                width={VB_W}
                height={Math.min(fillH * 0.55, 48)}
                fill={WATER_LIGHT}
                opacity={0.22}
              />
              <Path d={wave2} fill={WATER_LIGHT} opacity={0.35} />
              <Path d={wave1} fill="#E0F2FE" opacity={0.55} />
              <Ellipse cx={36} cy={yTop + 14} rx={22} ry={10} fill={`url(#${radId})`} opacity={0.85} />
            </G>
          ) : null}

          <Path d={DROPLET_D} fill="none" stroke={OUTLINE} strokeWidth={1.35} strokeLinejoin="round" />
        </Svg>
      </View>
      <Text style={styles.pct}>{Math.round(p)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  svgSizer: {
    width: '100%',
    aspectRatio: VB_W / VB_H,
    maxHeight: 220,
  },
  pct: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '800',
    color: WATER_BLUE,
    letterSpacing: 0.3,
  },
});
