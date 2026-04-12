import {
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import type { FastingReminderSettings, TimeOfDay } from './fastingTypes';

const ANDROID_CHANNEL_ID = 'fasting-reminders';
export const FASTING_NOTIF_ID_BEGIN = 'fasting-reminder-begin';
export const FASTING_NOTIF_ID_BREAK = 'fasting-reminder-break';

type NotifeeNamespace = typeof import('@notifee/react-native');

let cachedNotifee: NotifeeNamespace | null | undefined;

/** Notifee only works if the legacy native module is registered on the bridge. */
function isNotifeeNativePresent(): boolean {
  try {
    return NativeModules.NotifeeApiModule != null;
  } catch {
    return false;
  }
}

/**
 * Do not `require('@notifee/react-native')` unless the native module exists. Loading the JS
 * package without native code causes the first API call to throw ("Notifee native module not found"),
 * and that error can surface as an uncaught redbox even inside try/catch in some RN/Hermes paths.
 */
function getNotifee(): NotifeeNamespace | null {
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
        '[fasting] Notifee native module is not linked (NativeModules.NotifeeApiModule is missing). Reminders are off. iOS: set RCT_USE_PREBUILT_RNCORE=0 in Podfile, pod install, clean build — prebuilt RN 0.85 often omits legacy bridge modules.',
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
      console.warn(
        '[fasting] Failed to load @notifee/react-native JavaScript package.',
        e,
      );
    }
  }
  return cachedNotifee;
}

export function nextDailyTriggerMillis(hour: number, minute: number): number {
  const now = new Date();
  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setMilliseconds(0);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime();
}

async function ensureAndroidPostNotifications(): Promise<boolean> {
  if (Platform.OS !== 'android' || Platform.Version < 33) {
    return true;
  }
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function requestFastingReminderPermission(): Promise<{
  granted: boolean;
}> {
  const n = getNotifee();
  if (!n) {
    return { granted: false };
  }
  try {
    const androidOk = await ensureAndroidPostNotifications();
    if (!androidOk) {
      return { granted: false };
    }
    const settings = await n.default.requestPermission();
    const ok =
      settings.authorizationStatus === n.AuthorizationStatus.AUTHORIZED ||
      settings.authorizationStatus === n.AuthorizationStatus.PROVISIONAL;
    return { granted: ok };
  } catch {
    return { granted: false };
  }
}

/**
 * Call after the main shell is visible (e.g. post-splash, signed-in) so the OS permission
 * dialog appears in context, not buried behind loading UI.
 */
export function scheduleFastingNotificationPermissionPrompt(
  delayMs = 700,
): void {
  setTimeout(() => {
    void requestFastingReminderPermission();
  }, delayMs);
}

async function ensureAndroidChannel(n: NotifeeNamespace): Promise<void> {
  await n.default.createChannel({
    id: ANDROID_CHANNEL_ID,
    name: 'Fasting reminders',
    importance: n.AndroidImportance.DEFAULT,
    vibration: true,
  });
}

function scheduleOne(
  n: NotifeeNamespace,
  id: string,
  title: string,
  body: string,
  at: TimeOfDay,
): Promise<string> {
  const timestamp = nextDailyTriggerMillis(at.hour, at.minute);
  return n.default.createTriggerNotification(
    {
      id,
      title,
      body,
      android: {
        channelId: ANDROID_CHANNEL_ID,
      },
    },
    {
      type: n.TriggerType.TIMESTAMP,
      timestamp,
      repeatFrequency: n.RepeatFrequency.DAILY,
    },
  );
}

export async function syncFastingReminderNotifications(
  settings: FastingReminderSettings,
): Promise<void> {
  const n = getNotifee();
  if (!n) {
    return;
  }

  try {
    await n.default.cancelNotification(FASTING_NOTIF_ID_BEGIN);
    await n.default.cancelNotification(FASTING_NOTIF_ID_BREAK);

    if (!settings.enabled) {
      return;
    }

    if (Platform.OS === 'android') {
      await ensureAndroidChannel(n);
    }

    await scheduleOne(
      n,
      FASTING_NOTIF_ID_BEGIN,
      'Begin your fast',
      'Gentle nudge: wrap up eating and start your fasting window when you are ready.',
      settings.beginFast,
    );

    await scheduleOne(
      n,
      FASTING_NOTIF_ID_BREAK,
      'Break your fast',
      'Your eating window is open — time to nourish yourself.',
      settings.breakFast,
    );
  } catch (e) {
    if (__DEV__) {
      console.warn('[fasting] Failed to sync reminder notifications.', e);
    }
  }
}
