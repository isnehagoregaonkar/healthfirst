import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/tokens';

export const SCREEN_HORIZONTAL_PADDING = 16;

type ScreenProps = Readonly<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  /**
   * When false, skips top safe-area padding (use under React Navigation’s opaque header
   * so content isn’t pushed down twice).
   */
  applyTopSafeArea?: boolean;
  /**
   * When false, skips bottom safe-area padding (tab bar already insets; avoids a large gap above it).
   */
  applyBottomSafeArea?: boolean;
}>;

export function Screen({
  children,
  style,
  backgroundColor = colors.background,
  applyTopSafeArea = true,
  applyBottomSafeArea = true,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const insetPad = {
    paddingTop: applyTopSafeArea ? insets.top : 0,
    paddingBottom: applyBottomSafeArea ? insets.bottom : 0,
  };

  return (
    <View style={[styles.container, { backgroundColor }, insetPad, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
