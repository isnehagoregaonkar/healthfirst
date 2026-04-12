import type { NavigatorScreenParams } from '@react-navigation/native';

/** Bottom tab: intermittent fasting timer and history. */
export type FastingStackParamList = {
  FastingHome: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Meals: undefined;
  Water: undefined;
  Steps: undefined;
  Fasting: NavigatorScreenParams<FastingStackParamList>;
};

export type RootDrawerParamList = {
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  ProgressHistory: undefined;
  ExerciseHistory: undefined;
  Reminders: undefined;
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
