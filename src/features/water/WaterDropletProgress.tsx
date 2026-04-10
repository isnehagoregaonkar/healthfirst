import React, { useEffect, useId, useLayoutEffect, useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { clampWaterPercent } from './waterDayUtils';
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

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

const VB_W = 100;
const VB_H = 128;

const DROPLET_D =
  'M50 4 C28 36 8 58 8 82 C8 106 26 124 50 124 C74 124 92 106 92 82 C92 58 72 36 50 4Z';

const SOFT_EMPTY = '#E8EEF3';

type RGB = Readonly<{ r: number; g: number; b: number }>;

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: RGB): string {
  const c = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

function lerpHex(a: string, b: string, t: number): string {
  return rgbToHex(lerpRgb(hexToRgb(a), hexToRgb(b), t));
}

type DropletPalette = Readonly<{
  deep: string;
  mid: string;
  light: string;
  surface: string;
  outline: string;
  accent: string;
  deepOverlay: string;
}>;

const PALETTE_STOPS: ReadonlyArray<Readonly<{ t: number } & DropletPalette>> = [
  {
    t: 0,
    deep: '#475569',
    mid: '#64748B',
    light: '#CBD5E1',
    surface: '#E2E8F0',
    outline: '#94A3B8',
    accent: '#64748B',
    deepOverlay: '#0F172A',
  },
  {
    t: 0.22,
    deep: '#0369A1',
    mid: '#0EA5E9',
    light: '#7DD3FC',
    surface: '#BAE6FD',
    outline: '#7DD3FC',
    accent: '#0284C7',
    deepOverlay: '#0C4A6E',
  },
  {
    t: 0.5,
    deep: '#1D4ED8',
    mid: '#3B82F6',
    light: '#93C5FD',
    surface: '#BFDBFE',
    outline: '#94A3B8',
    accent: '#2563EB',
    deepOverlay: '#172554',
  },
  {
    t: 0.78,
    deep: '#0E7490',
    mid: '#06B6D4',
    light: '#A5F3FC',
    surface: '#CFFAFE',
    outline: '#67E8F9',
    accent: '#0891B2',
    deepOverlay: '#134E4A',
  },
  {
    t: 1,
    deep: '#047857',
    mid: '#059669',
    light: '#6EE7B7',
    surface: '#D1FAE5',
    outline: '#34D399',
    accent: '#059669',
    deepOverlay: '#064E3B',
  },
];

export function getDropletPalette(percent: number): DropletPalette {
  const p = clampWaterPercent(percent) / 100;
  let i = 0;
  for (let k = 0; k < PALETTE_STOPS.length - 1; k += 1) {
    if (p >= PALETTE_STOPS[k].t) {
      i = k;
    }
  }
  const a = PALETTE_STOPS[i];
  const b = PALETTE_STOPS[Math.min(i + 1, PALETTE_STOPS.length - 1)];
  const span = Math.max(1e-6, b.t - a.t);
  const t = a.t === b.t ? 0 : Math.min(1, Math.max(0, (p - a.t) / span));
  return {
    deep: lerpHex(a.deep, b.deep, t),
    mid: lerpHex(a.mid, b.mid, t),
    light: lerpHex(a.light, b.light, t),
    surface: lerpHex(a.surface, b.surface, t),
    outline: lerpHex(a.outline, b.outline, t),
    accent: lerpHex(a.accent, b.accent, t),
    deepOverlay: lerpHex(a.deepOverlay, b.deepOverlay, t),
  };
}

type WaterDropletProgressProps = Readonly<{
  percent: number;
  style?: StyleProp<ViewStyle>;
}>;

export function WaterDropletProgress({ percent, style }: WaterDropletProgressProps) {
  const p = clampWaterPercent(percent);
  const palette = useMemo(() => getDropletPalette(p), [p]);
  const rawId = useId();
  const safe = useMemo(() => rawId.replaceAll(/[^a-zA-Z0-9]/g, ''), [rawId]);
  const clipId = `wd-${safe}`;
  const gradBody = `wdb-${safe}`;
  const gradDeep = `wdd-${safe}`;
  const radId = `wdr-${safe}`;

  const breath = useSharedValue(1);
  const drift = useSharedValue(0);
  /** 0 → 1 loop for wave + ripple phase */
  const flowPhase = useSharedValue(0);
  /** Water surface Y in viewBox coords (synced when fill changes) */
  const surfaceY = useSharedValue(126);

  useEffect(() => {
    breath.value = withRepeat(
      withTiming(1.004, { duration: 3200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    drift.value = withRepeat(
      withSequence(
        withTiming(-0.55, { duration: 3800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.55, { duration: 3800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    flowPhase.value = withRepeat(
      withTiming(1, { duration: 4200, easing: Easing.linear }),
      -1,
      false,
    );
  }, [breath, drift, flowPhase]);

  const motionStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: drift.value }, { scale: breath.value }],
  }));

  const fillH = (118 * p) / 100;
  const yTop = 126 - fillH;

  const waveY = yTop + 3;

  useLayoutEffect(() => {
    surfaceY.value = waveY;
  }, [waveY, surfaceY]);

  const waveGroupProps = useAnimatedProps(() => {
    const t = flowPhase.value * Math.PI * 2;
    const tx = 2.1 * Math.sin(t);
    const ty = 0.55 * Math.sin(t * 1.17 + 0.9);
    return {
      transform: `translate(${tx}, ${ty})`,
    };
  });

  const rippleOuterProps = useAnimatedProps(() => {
    const t = flowPhase.value * Math.PI * 2;
    const pulse = 0.5 + 0.5 * Math.sin(t);
    const y = surfaceY.value + 5;
    return {
      cx: 50,
      cy: y,
      rx: 21 + 5 * pulse,
      ry: 5 + 1.8 * pulse,
      opacity: 0.05 + 0.11 * pulse,
    };
  });

  const rippleInnerProps = useAnimatedProps(() => {
    const t = flowPhase.value * Math.PI * 2 + 1.7;
    const pulse = 0.5 + 0.5 * Math.sin(t);
    const y = surfaceY.value + 5;
    return {
      cx: 50,
      cy: y,
      rx: 15 + 3.5 * pulse,
      ry: 3.5 + 1.1 * pulse,
      opacity: 0.08 + 0.14 * pulse,
    };
  });

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
    <View style={[styles.wrap, style]} pointerEvents="box-none">
      <Animated.View style={[styles.motion, motionStyle]} pointerEvents="none">
        <View style={styles.svgSizer}>
          <Svg width="100%" height="100%" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid meet">
            <Defs>
              <LinearGradient id={gradBody} x1="0" y1="1" x2="0" y2="0">
                <Stop offset="0" stopColor={palette.deep} stopOpacity={1} />
                <Stop offset="0.45" stopColor={palette.mid} stopOpacity={1} />
                <Stop offset="0.85" stopColor={palette.light} stopOpacity={0.95} />
                <Stop offset="1" stopColor={palette.surface} stopOpacity={0.88} />
              </LinearGradient>
              <LinearGradient id={gradDeep} x1="0" y1="1" x2="1" y2="0">
                <Stop offset="0" stopColor={palette.deepOverlay} stopOpacity={0.38} />
                <Stop offset="0.55" stopColor={palette.mid} stopOpacity={0.18} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
              </LinearGradient>
              <RadialGradient id={radId} cx="32%" cy="35%" rx="45%" ry="40%" fx="28%" fy="32%">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.5} />
                <Stop offset="0.35" stopColor={palette.light} stopOpacity={0.22} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
              </RadialGradient>
              <ClipPath id={clipId}>
                <Path d={DROPLET_D} />
              </ClipPath>
            </Defs>

            <Path d={DROPLET_D} fill={SOFT_EMPTY} />

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
                  fill={palette.light}
                  opacity={0.24}
                />
                <AnimatedG animatedProps={waveGroupProps}>
                  <Path d={wave2} fill={palette.light} opacity={0.38} />
                  <Path d={wave1} fill={palette.surface} opacity={0.52} />
                </AnimatedG>
                <AnimatedEllipse
                  animatedProps={rippleOuterProps}
                  fill="#FFFFFF"
                  stroke={palette.light}
                  strokeWidth={0.35}
                />
                <AnimatedEllipse
                  animatedProps={rippleInnerProps}
                  fill={palette.surface}
                />
                <Ellipse cx={36} cy={yTop + 14} rx={22} ry={10} fill={`url(#${radId})`} opacity={0.85} />
              </G>
            ) : null}

            <Path d={DROPLET_D} fill="none" stroke={palette.outline} strokeWidth={1.35} strokeLinejoin="round" />
          </Svg>
        </View>
      </Animated.View>
      <Text style={[styles.pct, { color: palette.accent }]} pointerEvents="none">
        {Math.round(p)}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  motion: {
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
    letterSpacing: 0.3,
  },
});
