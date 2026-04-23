import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/tokens';
import { getActiveDestinationId, navigateToDestination } from '../drawerNavigation';
import {
  DashboardDrawerIcon,
  FastingDrawerIcon,
  GoalsDrawerIcon,
  MealDrawerIcon,
  ProfileDrawerIcon,
  ProgressDrawerIcon,
  RemindersDrawerIcon,
  StepsDrawerIcon,
  WaterDrawerIcon,
} from '../drawerIcons';
import type { DrawerDestinationId } from '../types';

type DrawerIconComponent = React.ComponentType<{
  color: string;
  size: number;
}>;

type DrawerNavRow = Readonly<{
  id: DrawerDestinationId;
  label: string;
  Icon: DrawerIconComponent;
}>;

const ROWS: DrawerNavRow[] = [
  { id: 'Dashboard', label: 'Dashboard', Icon: DashboardDrawerIcon },
  { id: 'MealTracking', label: 'Meal tracking', Icon: MealDrawerIcon },
  { id: 'Goals', label: 'Goals', Icon: GoalsDrawerIcon },
  { id: 'ProgressHistory', label: 'Progress history', Icon: ProgressDrawerIcon },
  { id: 'WaterIntake', label: 'Water intake', Icon: WaterDrawerIcon },
  { id: 'StepsTracking', label: 'Exercise', Icon: StepsDrawerIcon },
  { id: 'IntermittentFasting', label: 'Intermittent fasting', Icon: FastingDrawerIcon },
  { id: 'Reminders', label: 'Reminders', Icon: RemindersDrawerIcon },
  { id: 'Profile', label: 'Profile', Icon: ProfileDrawerIcon },
];

type DrawerNavItemsListProps = Readonly<{
  navigation: DrawerContentComponentProps['navigation'];
  drawerState: DrawerContentComponentProps['state'];
}>;

export function DrawerNavItemsList({ navigation, drawerState }: DrawerNavItemsListProps) {
  const activeId = useMemo(() => getActiveDestinationId(drawerState), [drawerState]);

  const onItemPress = useCallback(
    (id: DrawerDestinationId) => {
      navigateToDestination(navigation, id);
    },
    [navigation],
  );

  return (
    <View style={styles.list}>
      {ROWS.map((row) => {
        const focused = activeId === row.id;
        const tint = focused ? colors.primary : colors.textSecondary;
        const RowIcon = row.Icon;
        return (
          <Pressable
            key={row.id}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            onPress={() => onItemPress(row.id)}
            style={({ pressed }) => [
              styles.row,
              focused && styles.rowFocused,
              pressed && styles.rowPressed,
            ]}
          >
            <RowIcon color={tint} size={22} />
            <Text style={[styles.label, focused && styles.labelFocused]}>{row.label}</Text>
            <Icon name="chevron-right" size={20} color={colors.textSecondary} style={styles.chevron} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 12,
    gap: 14,
  },
  rowFocused: {
    backgroundColor: colors.primarySoft,
  },
  rowPressed: {
    opacity: 0.88,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  labelFocused: {
    color: colors.primary,
  },
  chevron: {
    opacity: 0.5,
  },
});
