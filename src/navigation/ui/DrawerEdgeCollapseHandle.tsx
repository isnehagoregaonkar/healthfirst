import { useDrawerProgress, useDrawerStatus } from '@react-navigation/drawer';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/tokens';

/** Pixels of shape painted left of the seam (same fill as drawer — seamless blend). */
const OVERLAP = 12;
/** How far the tab extends past the drawer edge into the main screen. */
const TAB_OUT = 40;
const VB_MIN_X = -OVERLAP;
const VB_MAX_X = TAB_OUT;
const VIEWBOX_W = VB_MAX_X - VB_MIN_X;
const H = 118;

/**
 * Seam at x=0; x < 0 overlaps drawer; x > 0 protrudes. Smooth scoops + outward tab.
 */
const d = [
  `M ${VB_MIN_X} 0`,
  `L 0 0`,
  `L 0 20`,
  `C 0 28, 7 34, 14 36`,
  `L 22 36`,
  `C 30 36, 38 44, 39 54`,
  `L 39 64`,
  `C 38 74, 30 82, 22 82`,
  `L 14 82`,
  `C 7 84, 0 90, 0 98`,
  `L 0 ${H}`,
  `L ${VB_MIN_X} ${H}`,
  `Z`,
].join(' ');

const OPACITY_INPUT = [0, 0.1, 1] as const;
const OPACITY_OUTPUT = [0, 1, 1] as const;
const SLIDE_INPUT = [0, 1] as const;
/** Extra slide while opening (on top of TAB_OUT base shift). */
const SLIDE_OUTPUT = [10, 0] as const;

type DrawerEdgeCollapseHandleProps = Readonly<{
  onPress: () => void;
  top: number;
}>;

export function DrawerEdgeCollapseHandle({ onPress, top }: DrawerEdgeCollapseHandleProps) {
  const progress = useDrawerProgress();
  const drawerStatus = useDrawerStatus();
  /** Android still hit-tests opacity-0 views; this tab would sit over the header menu otherwise. */
  const pointerEvents = drawerStatus === 'open' ? 'box-none' : 'none';

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, OPACITY_INPUT, OPACITY_OUTPUT),
      transform: [
        {
          translateX:
            TAB_OUT + interpolate(p, SLIDE_INPUT, SLIDE_OUTPUT),
        },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents={pointerEvents}
      style={[
        styles.anchor,
        {
          top,
          width: VIEWBOX_W,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.shadow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          onPress={onPress}
          style={({ pressed }) => [styles.hit, pressed && styles.hitPressed]}
        >
          <Svg width={VIEWBOX_W} height={H} viewBox={`${VB_MIN_X} 0 ${VIEWBOX_W} ${H}`}>
            <Path d={d} fill={colors.surface} />
          </Svg>
          <View style={styles.iconWrap} pointerEvents="none">
            <Icon name="chevron-left" size={22} color={colors.primary} />
          </View>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    right: 0,
    zIndex: 50,
  },
  shadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 8,
  },
  hit: {
    width: VIEWBOX_W,
    height: H,
  },
  hitPressed: {
    opacity: 0.92,
  },
  iconWrap: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: OVERLAP + 6,
  },
});
