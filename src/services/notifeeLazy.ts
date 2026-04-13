import { NativeModules } from 'react-native';

type NotifeeNamespace = typeof import('@notifee/react-native');

let cachedNotifee: NotifeeNamespace | null | undefined;

export function isNotifeeNativePresent(): boolean {
  try {
    return NativeModules.NotifeeApiModule != null;
  } catch {
    return false;
  }
}

/**
 * Lazy-load Notifee only when the native module exists (avoids redbox if not linked).
 */
export function getNotifee(): NotifeeNamespace | null {
  if (cachedNotifee === null) {
    return null;
  }
  if (cachedNotifee !== undefined) {
    return cachedNotifee;
  }
  if (!isNotifeeNativePresent()) {
    cachedNotifee = null;
    if (__DEV__) {
      console.warn(
        '[notifee] Native module missing (NotifeeApiModule). Scheduled reminders are disabled until the app is built with Notifee linked.',
      );
    }
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedNotifee = require('@notifee/react-native') as NotifeeNamespace;
  } catch (e) {
    cachedNotifee = null;
    if (__DEV__) {
      console.warn('[notifee] Failed to load @notifee/react-native JS package.', e);
    }
  }
  return cachedNotifee;
}
