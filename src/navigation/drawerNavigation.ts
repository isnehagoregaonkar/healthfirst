import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import type { DrawerDestinationId } from './types';

type DrawerRootNavigation = DrawerContentComponentProps['navigation'];

export function navigateToDestination(navigation: DrawerRootNavigation, id: DrawerDestinationId) {
  navigation.closeDrawer();

  switch (id) {
    case 'Dashboard':
      navigation.navigate('Main', { screen: 'Home' });
      break;
    case 'MealTracking':
      navigation.navigate('Main', { screen: 'Meals' });
      break;
    case 'WaterIntake':
      navigation.navigate('Main', { screen: 'Water' });
      break;
    case 'StepsTracking':
      navigation.navigate('Main', { screen: 'Steps' });
      break;
    case 'ProgressHistory':
      navigation.navigate('Main', {
        screen: 'More',
        params: { screen: 'ProgressHistory' },
      });
      break;
    case 'ExerciseHistory':
      navigation.navigate('Main', {
        screen: 'More',
        params: { screen: 'ExerciseHistory' },
      });
      break;
    case 'IntermittentFasting':
      navigation.navigate('Main', {
        screen: 'More',
        params: { screen: 'IntermittentFasting' },
      });
      break;
    case 'Reminders':
      navigation.navigate('Main', {
        screen: 'More',
        params: { screen: 'Reminders' },
      });
      break;
    default:
      break;
  }
}

type DrawerNavState = DrawerContentComponentProps['state'];

export function getActiveDestinationId(state: DrawerNavState): DrawerDestinationId | null {
  const root = state.routes[0];
  if (!root || root.name !== 'Main') {
    return null;
  }

  const tabState = root.state;
  if (!tabState || typeof tabState.index !== 'number') {
    return 'Dashboard';
  }

  const tabRoute = tabState.routes[tabState.index];
  if (!tabRoute) {
    return 'Dashboard';
  }

  if (tabRoute.name === 'More') {
    const moreState = tabRoute.state as { index: number; routes: { name: string }[] } | undefined;
    if (moreState && typeof moreState.index === 'number') {
      const leaf = moreState.routes[moreState.index];
      if (leaf?.name === 'MoreHome') {
        return null;
      }
      if (leaf?.name === 'ProgressHistory') {
        return 'ProgressHistory';
      }
      if (leaf?.name === 'ExerciseHistory') {
        return 'ExerciseHistory';
      }
      if (leaf?.name === 'IntermittentFasting') {
        return 'IntermittentFasting';
      }
      if (leaf?.name === 'Reminders') {
        return 'Reminders';
      }
    }
    return null;
  }

  const tabMap: Record<string, DrawerDestinationId> = {
    Home: 'Dashboard',
    Meals: 'MealTracking',
    Water: 'WaterIntake',
    Steps: 'StepsTracking',
  };

  return tabMap[tabRoute.name] ?? null;
}
