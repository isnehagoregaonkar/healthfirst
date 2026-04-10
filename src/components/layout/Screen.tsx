import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/tokens';

type ScreenProps = Readonly<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  /**
   * When false, skips top safe-area padding (use under React Navigation’s opaque header
   * so content isn’t pushed down twice).
   */
  applyTopSafeArea?: boolean;
}>;

export function Screen({
  children,
  style,
  backgroundColor = colors.background,
  applyTopSafeArea = true,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor,
          paddingTop: applyTopSafeArea ? insets.top : 0,
          paddingBottom: insets.bottom,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
