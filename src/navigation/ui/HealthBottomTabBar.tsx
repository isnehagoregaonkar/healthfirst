import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/tokens';

const WATER_ROUTE = 'Water';

type TabVisual = Readonly<{
  defaultLabel: string;
  icon: string;
}>;

const TAB_CONFIG: Record<string, TabVisual> = {
  Home: { defaultLabel: 'Home', icon: 'view-dashboard-outline' },
  Meals: { defaultLabel: 'Meals', icon: 'food-apple-outline' },
  Water: { defaultLabel: 'Water', icon: 'cup-water' },
  Exercise: { defaultLabel: 'Exercise', icon: 'dumbbell' },
  More: { defaultLabel: 'More', icon: 'dots-horizontal' },
};

type TabSlotProps = Readonly<{
  label: string;
  icon: string;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  isWater: boolean;
}>;

function TabSlot({ label, icon, focused, onPress, onLongPress, isWater }: TabSlotProps) {
  if (isWater) {
    return (
      <View style={styles.waterColumn}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: focused }}
          accessibilityLabel={label}
          onPress={onPress}
          onLongPress={onLongPress}
          style={({ pressed }) => [styles.waterHit, pressed && styles.waterHitPressed]}
        >
          <View style={[styles.waterFab, focused && styles.waterFabFocused]}>
            <Icon name={icon} size={26} color={colors.surface} />
          </View>
        </Pressable>
        <Text style={[styles.waterLabel, focused && styles.labelFocused]}>{label}</Text>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
    >
      <Icon name={icon} size={22} color={focused ? colors.primary : colors.textSecondary} />
      <Text style={[styles.label, focused && styles.labelFocused]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function HealthBottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.pill}>
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;
            const cfg = TAB_CONFIG[route.name];
            const label =
              typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : cfg?.defaultLabel ?? route.name;
            const icon = cfg?.icon ?? 'circle-outline';
            const isWater = route.name === WATER_ROUTE;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <TabSlot
                key={route.key}
                label={label}
                icon={icon}
                focused={focused}
                onPress={onPress}
                onLongPress={onLongPress}
                isWater={isWater}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    paddingHorizontal: 14,
    backgroundColor: 'transparent',
  },
  pill: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 4,
  },
  tabPressed: {
    opacity: 0.75,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  labelFocused: {
    color: colors.primary,
  },
  waterColumn: {
    flex: 1,
    alignItems: 'center',
  },
  waterHit: {
    marginTop: -26,
    marginBottom: 2,
    borderRadius: 32,
  },
  waterHitPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
  waterFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.surface,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  waterFabFocused: {
    transform: [{ scale: 1.04 }],
  },
  waterLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
