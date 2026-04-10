import React from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type DrawerIconProps = Readonly<{
  color: string;
  size: number;
}>;

export function DashboardDrawerIcon({ color, size }: DrawerIconProps) {
  return <Icon name="view-dashboard-outline" size={size} color={color} />;
}

export function MealDrawerIcon({ color, size }: DrawerIconProps) {
  return <Icon name="food-apple-outline" size={size} color={color} />;
}

export function ProgressDrawerIcon({ color, size }: DrawerIconProps) {
  return <Icon name="chart-line" size={size} color={color} />;
}

export function WaterDrawerIcon({ color, size }: DrawerIconProps) {
  return <Icon name="cup-water" size={size} color={color} />;
}

export function StepsDrawerIcon({ color, size }: DrawerIconProps) {
  return <Icon name="walk" size={size} color={color} />;
}

export function ExerciseDrawerIcon({ color, size }: DrawerIconProps) {
  return <Icon name="dumbbell" size={size} color={color} />;
}

export function FastingDrawerIcon({ color, size }: DrawerIconProps) {
  return <Icon name="timer-outline" size={size} color={color} />;
}

export function RemindersDrawerIcon({ color, size }: DrawerIconProps) {
  return <Icon name="bell-outline" size={size} color={color} />;
}
