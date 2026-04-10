import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

export function useAuthCardWidth() {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    if (width >= 900) {
      return 520;
    }
    if (width >= 600) {
      return Math.min(width * 0.72, 460);
    }
    return width - 32;
  }, [width]);
}
