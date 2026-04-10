import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { DrawerDestinationId, MainTabParamList } from './types';

type DrawerRootNavigation = DrawerContentComponentProps['navigation'];
type DrawerNavState = DrawerContentComponentProps['state'];

type MainNavigatorParams = NavigatorScreenParams<MainTabParamList>;

const MAIN_NAV_BY_DESTINATION = {
  Dashboard: { screen: 'Home' },
  MealTracking: { screen: 'Meals' },
  WaterIntake: { screen: 'Water' },
  StepsTracking: { screen: 'Steps' },
  ProgressHistory: { screen: 'More', params: { screen: 'ProgressHistory' } },
  ExerciseHistory: { screen: 'More', params: { screen: 'ExerciseHistory' } },
  IntermittentFasting: { screen: 'More', params: { screen: 'IntermittentFasting' } },
  Reminders: { screen: 'More', params: { screen: 'Reminders' } },
} as const satisfies Record<DrawerDestinationId, MainNavigatorParams>;

const TAB_ROUTE_TO_DESTINATION: Record<string, DrawerDestinationId> = {
  Home: 'Dashboard',
  Meals: 'MealTracking',
  Water: 'WaterIntake',
  Steps: 'StepsTracking',
};

const MORE_LEAF_TO_DESTINATION: Partial<Record<string, DrawerDestinationId | null>> = {
  MoreHome: null,
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
  navigation.navigate('Main', MAIN_NAV_BY_DESTINATION[id]);
}

export function getActiveDestinationId(state: DrawerNavState): DrawerDestinationId | null {
  const main = state.routes[0];
  if (!main || main.name !== 'Main') {
    return null;
  }

  const tabName = getFocusedChildName(main);
  if (!tabName) {
    return 'Dashboard';
  }

  if (tabName === 'More') {
    const tabIndex = main.state?.index;
    const tabRoute =
      main.state?.routes !== undefined && typeof tabIndex === 'number'
        ? main.state.routes[tabIndex]
        : undefined;
    const leafName = getFocusedChildName(tabRoute);
    if (leafName === undefined) {
      return null;
    }
    const mapped = MORE_LEAF_TO_DESTINATION[leafName];
    return mapped === undefined ? null : mapped;
  }

  return TAB_ROUTE_TO_DESTINATION[tabName] ?? null;
}
