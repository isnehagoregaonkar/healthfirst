import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen } from '../../components/layout/Screen';
import { colors } from '../../theme/tokens';
import type { MoreStackParamList } from '../types';

type Nav = NativeStackNavigationProp<MoreStackParamList>;

type MoreTile = Readonly<{
  title: string;
  subtitle: string;
  icon: string;
  target: keyof MoreStackParamList;
}>;

const TILES: MoreTile[] = [
  {
    title: 'Progress history',
    subtitle: 'Trends & charts',
    icon: 'chart-line',
    target: 'ProgressHistory',
  },
  {
    title: 'Exercise & streak',
    subtitle: 'Workouts & consistency',
    icon: 'dumbbell',
    target: 'ExerciseHistory',
  },
  {
    title: 'Intermittent fasting',
    subtitle: 'Windows & timers',
    icon: 'timer-outline',
    target: 'IntermittentFasting',
  },
  {
    title: 'Reminders',
    subtitle: 'Nudges & habits',
    icon: 'bell-outline',
    target: 'Reminders',
  },
];

export function MoreMenuScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>Tools & insights</Text>
        <View style={styles.grid}>
          {TILES.map((tile) => (
            <Pressable
              key={tile.target}
              onPress={() => navigation.navigate(tile.target)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <View style={styles.iconWrap}>
                <Icon name={tile.icon} size={28} color={colors.primary} />
              </View>
              <Text style={styles.cardTitle}>{tile.title}</Text>
              <Text style={styles.cardSubtitle}>{tile.subtitle}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  lead: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  card: {
    width: '47%',
    minWidth: 148,
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});
