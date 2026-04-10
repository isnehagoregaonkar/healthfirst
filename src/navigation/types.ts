import type { NavigatorScreenParams } from '@react-navigation/native';

export type MoreStackParamList = {
  MoreHome: undefined;
  ProgressHistory: undefined;
  ExerciseHistory: undefined;
  IntermittentFasting: undefined;
  Reminders: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Meals: undefined;
  Water: undefined;
  Steps: undefined;
  More: NavigatorScreenParams<MoreStackParamList>;
};

/** Single drawer screen wrapping bottom tabs + nested stacks */
export type RootDrawerParamList = {
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
};

/** Used for drawer highlight + navigation targets */
export type DrawerDestinationId =
  | 'Dashboard'
  | 'MealTracking'
  | 'WaterIntake'
  | 'StepsTracking'
  | 'ProgressHistory'
  | 'ExerciseHistory'
  | 'IntermittentFasting'
  | 'Reminders';
