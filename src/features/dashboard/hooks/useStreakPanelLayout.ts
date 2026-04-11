import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

export function useStreakPanelLayout(currentStreak: number) {
  const { width: winW } = useWindowDimensions();

  return useMemo(() => {
    /** Body padding 18×2 + streak card padding 14×2 */
    const cardW = Math.max(260, winW - 64);
    const ringPct = Math.min(100, Math.round((currentStreak / 7) * 100));
    const ringDisplayPct = currentStreak === 0 ? 6 : Math.max(12, ringPct);
    const title =
      currentStreak > 0 ? "You've been keeping track" : 'Start your streak';
    const heroHeight = 128;
    const ringSize = 88;
    return { cardW, ringDisplayPct, title, heroHeight, ringSize };
  }, [winW, currentStreak]);
}
