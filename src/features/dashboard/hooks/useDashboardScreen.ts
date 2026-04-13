import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useDrawerUserProfile } from '../../../navigation/hooks/useDrawerUserProfile';
import type { MainTabParamList } from '../../../navigation/types';
import {
  saveMealCalorieProfile,
  type MealCalorieProfile,
} from '../../../services/mealCalorieTarget';
import { useDashboardData } from './useDashboardData';
import { useDashboardReminders } from './useDashboardReminders';
import { useDashboardStreakModel } from './useDashboardStreakModel';
import { useDashboardTodayMetrics } from './useDashboardTodayMetrics';

type TabNav = BottomTabNavigationProp<MainTabParamList>;

export function useDashboardScreen() {
  const navigation = useNavigation<TabNav>();
  const user = useDrawerUserProfile();
  const { snapshot, loading, error, refresh } = useDashboardData();
  const [hrModal, setHrModal] = useState(false);
  const [weightModal, setWeightModal] = useState(false);
  const { width: winW } = useWindowDimensions();

  const onHrLogged = useCallback(() => {
    void refresh();
  }, [refresh]);

  const onWeightSaved = useCallback(
    async (profile: MealCalorieProfile) => {
      await saveMealCalorieProfile(profile);
      await refresh();
    },
    [refresh],
  );

  const streakModel = useDashboardStreakModel(snapshot);
  const todayMetrics = useDashboardTodayMetrics(snapshot);
  const reminders = useDashboardReminders(
    snapshot,
    navigation,
    todayMetrics.waterPct,
    todayMetrics.exerciseToday,
  );

  return {
    navigation,
    user,
    snapshot,
    loading,
    error,
    refresh,
    hrModal,
    setHrModal,
    weightModal,
    setWeightModal,
    winW,
    onHrLogged,
    onWeightSaved,
    streakModel,
    reminders,
    ...todayMetrics,
  };
}
