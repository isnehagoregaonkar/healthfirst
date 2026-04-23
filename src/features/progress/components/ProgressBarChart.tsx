import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

type ProgressBarChartPoint = Readonly<{
  label: string;
  value: number;
}>;

type ProgressBarChartProps = Readonly<{
  title: string;
  color: string;
  points: readonly ProgressBarChartPoint[];
  unit: string;
}>;

const WIDTH = 280;
const HEIGHT = 96;
const BAR_WIDTH = 12;

export function ProgressBarChart({ title, color, points, unit }: ProgressBarChartProps) {
  const max = Math.max(1, ...points.map(p => p.value));
  const safe = points.length > 10 ? points.slice(-10) : points;
  const gap = safe.length > 1 ? (WIDTH - safe.length * BAR_WIDTH) / (safe.length - 1) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>
          Peak {Math.round(max)} {unit}
        </Text>
      </View>
      <Svg width={WIDTH} height={HEIGHT} style={styles.svg}>
        {safe.map((p, idx) => {
          const h = Math.max(3, (p.value / max) * (HEIGHT - 8));
          const x = idx * (BAR_WIDTH + gap);
          return (
            <Rect
              key={`${p.label}-${idx}`}
              x={x}
              y={HEIGHT - h}
              width={BAR_WIDTH}
              height={h}
              rx={BAR_WIDTH / 2}
              fill={color}
              opacity={0.95}
            />
          );
        })}
      </Svg>
      <View style={styles.labelsRow}>
        <Text style={styles.labelText}>{safe[0]?.label ?? ''}</Text>
        <Text style={styles.labelText}>{safe.at(-1)?.label ?? ''}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6ECF4',
    padding: 14,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  meta: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  svg: {
    alignSelf: 'center',
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  labelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
});
