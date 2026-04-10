import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { DrawerDestinationId, MainTabParamList, RootDrawerParamList } from './types';

type DrawerRootNavigation = DrawerContentComponentProps['navigation'];
type DrawerNavState = DrawerContentComponentProps['state'];

type MainNavigatorParams = NavigatorScreenParams<MainTabParamList>;

type MainTabDrawerDestinationId = Exclude<
  DrawerDestinationId,
  'ProgressHistory' | 'ExerciseHistory' | 'IntermittentFasting' | 'Reminders'
>;

type LeafDrawerDestinationId = Extract<
  DrawerDestinationId,
  'ProgressHistory' | 'ExerciseHistory' | 'IntermittentFasting' | 'Reminders'
>;

const MAIN_NAV_BY_DESTINATION = {
  Dashboard: { screen: 'Home' },
  MealTracking: { screen: 'Meals' },
  WaterIntake: { screen: 'Water' },
  StepsTracking: { screen: 'Steps' },
} as const satisfies Record<MainTabDrawerDestinationId, MainNavigatorParams>;

const DRAWER_SCREEN_BY_DESTINATION = {
  ProgressHistory: 'ProgressHistory',
  ExerciseHistory: 'ExerciseHistory',
  IntermittentFasting: 'IntermittentFasting',
  Reminders: 'Reminders',
} as const satisfies Record<LeafDrawerDestinationId, keyof Pick<RootDrawerParamList, LeafDrawerDestinationId>>;

const TAB_ROUTE_TO_DESTINATION: Record<string, DrawerDestinationId> = {
  Home: 'Dashboard',
  Meals: 'MealTracking',
  Water: 'WaterIntake',
  Steps: 'StepsTracking',
};

const DRAWER_ROUTE_TO_DESTINATION: Partial<Record<keyof RootDrawerParamList, DrawerDestinationId>> = {
  ProgressHistory: 'ProgressHistory',
  ExerciseHistory: 'ExerciseHistory',
  IntermittentFasting: 'IntermittentFasting',
  Reminders: 'Reminders',
};

function getFocusedChildName(
  parent: { state?: { index?: number; routes?: { name: string }[] } } | undefined,
): string | undefined {
  const s = parent?.state;
  if (s === undefined || typeof s.index !== 'number' || !s.routes) {
    return undefined;
  }
  return s.routes[s.index]?.name;
}

export function navigateToDestination(navigation: DrawerRootNavigation, id: DrawerDestinationId) {
  navigation.closeDrawer();

  if (id in DRAWER_SCREEN_BY_DESTINATION) {
    const screen = DRAWER_SCREEN_BY_DESTINATION[id as LeafDrawerDestinationId];
    navigation.navigate(screen);
    return;
  }

  navigation.navigate('Main', MAIN_NAV_BY_DESTINATION[id as MainTabDrawerDestinationId]);
}

export function getActiveDestinationId(state: DrawerNavState): DrawerDestinationId | null {
  const route = state.routes[state.index];
  if (!route) {
    return null;
  }

  if (route.name !== 'Main') {
    const mapped = DRAWER_ROUTE_TO_DESTINATION[route.name as keyof RootDrawerParamList];
    return mapped ?? null;
  }

  const tabName = getFocusedChildName(route);
  if (!tabName) {
    return 'Dashboard';
  }

  if (tabName === 'More') {
    return null;
  }

  return TAB_ROUTE_TO_DESTINATION[tabName] ?? null;
}
