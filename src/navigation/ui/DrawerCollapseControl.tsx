import { useDrawerProgress } from '@react-navigation/drawer';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/tokens';

const OPACITY_INPUT = [0, 0.15, 1] as const;
const OPACITY_OUTPUT = [0, 1, 1] as const;
const SLIDE_INPUT = [0, 1] as const;
const SLIDE_OUTPUT = [10, 0] as const;
const SCALE_INPUT = [0, 1] as const;
const SCALE_OUTPUT = [0.88, 1] as const;

type DrawerCollapseControlProps = Readonly<{
  onPress: () => void;
}>;

export function DrawerCollapseControl({ onPress }: DrawerCollapseControlProps) {
  const progress = useDrawerProgress();

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, OPACITY_INPUT, OPACITY_OUTPUT),
      transform: [
        { translateX: interpolate(p, SLIDE_INPUT, SLIDE_OUTPUT) },
        { scale: interpolate(p, SCALE_INPUT, SCALE_OUTPUT) },
      ],
    };
  });

  return (
    <Animated.View style={[styles.wrap, animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close menu"
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
      >
        <Icon name="chevron-left" size={22} color={colors.primary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  buttonPressed: {
    opacity: 0.88,
  },
});
