import type { NavigatorScreenParams } from '@react-navigation/native';

/** More tab stack — reserved for future tools (not the same as drawer destinations). */
export type MoreStackParamList = {
  MoreHome: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Meals: undefined;
  Water: undefined;
  Exercise: undefined;
  More: NavigatorScreenParams<MoreStackParamList>;
};

export type RootDrawerParamList = {
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  ProgressHistory: undefined;
  ExerciseHistory: undefined;
  IntermittentFasting: undefined;
  Reminders: undefined;
};

/** Used for drawer highlight + navigation targets */
export type DrawerDestinationId =
  | 'Dashboard'
  | 'MealTracking'
  | 'WaterIntake'
  | 'Exercise'
  | 'ProgressHistory'
  | 'ExerciseHistory'
  | 'IntermittentFasting'
  | 'Reminders';
