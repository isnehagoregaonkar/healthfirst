import React from 'react';
import { colors } from '../theme/tokens';
import { DrawerMenuButton } from './DrawerMenuButton';

export function renderDrawerMenuHeaderLeft() {
  return <DrawerMenuButton />;
}

/** Shared native header chrome (stack + tab headers) */
export const appHeaderChrome = {
  headerTintColor: colors.primary,
  headerStyle: { backgroundColor: colors.surface },
  headerTitleStyle: { fontWeight: '700' as const, fontSize: 18, color: colors.textPrimary },
};

/** Tab screens: menu opens drawer */
export const tabScreenOptions = {
  ...appHeaderChrome,
  headerShown: true,
  headerLeft: renderDrawerMenuHeaderLeft,
  headerLeftContainerStyle: { paddingLeft: 16 },
};

/** Fasting stack uses the same header chrome as tab screens (drawer menu control). */
