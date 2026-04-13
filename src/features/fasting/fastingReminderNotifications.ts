import {
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FastingReminderSettings, TimeOfDay } from './fastingTypes';
import { fastWindowMinutes } from './fastingScheduleDuration';

const ANDROID_CHANNEL_ID = 'fasting-reminders';
export const FASTING_NOTIF_ID_BEGIN = 'fasting-reminder-begin';
export const FASTING_NOTIF_ID_BREAK = 'fasting-reminder-break';
const FASTING_PENDING_START_KEY = '@HealthFirst/fasting/pending-start';

type NotifeeNamespace = typeof import('@notifee/react-native');
type PendingFastingStart = Readonly<{
  durationMin: number | null;
}>;

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

function nextTimestampAfterMillis(msFromNow: number): number {
  const now = Date.now();
  const t = now + Math.max(1, msFromNow);
  return t;
}

function formatDurationHm(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) {
    return `${m}m`;
  }
  if (m === 0) {
    return `${h}h`;
  }
  return `${h}h ${m}m`;
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
    importance: n.AndroidImportance.HIGH,
    vibration: true,
  });
}

function scheduleOne(
  n: NotifeeNamespace,
  id: string,
  title: string,
  body: string,
  at: TimeOfDay,
  data?: Record<string, string>,
): Promise<string> {
  const timestamp = nextDailyTriggerMillis(at.hour, at.minute);
  return n.default.createTriggerNotification(
    {
      id,
      title,
      body,
      android: {
        channelId: ANDROID_CHANNEL_ID,
        pressAction: { id: 'default' },
      },
      ios: {
        sound: 'default',
      },
      data,
    },
    {
      type: n.TriggerType.TIMESTAMP,
      timestamp,
      repeatFrequency: n.RepeatFrequency.DAILY,
    },
  );
}

function scheduleOneAtTimestamp(
  n: NotifeeNamespace,
  id: string,
  title: string,
  body: string,
  timestamp: number,
): Promise<string> {
  return n.default.createTriggerNotification(
    {
      id,
      title,
      body,
      android: {
        channelId: ANDROID_CHANNEL_ID,
        pressAction: { id: 'default' },
      },
      ios: {
        sound: 'default',
      },
    },
    {
      type: n.TriggerType.TIMESTAMP,
      timestamp,
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

    const durationMin = fastWindowMinutes(settings.beginFast, settings.breakFast);
    await scheduleOne(
      n,
      FASTING_NOTIF_ID_BEGIN,
      '🕒 Scheduled Fast Time',
      `▶ Start your ${formatDurationHm(durationMin)} scheduled fast now. You got this!`,
      settings.beginFast,
      { durationMin: String(durationMin) },
    );

    // Break reminder is intentionally not scheduled here.
    // It is scheduled only after a fast actually starts.
  } catch (e) {
    if (__DEV__) {
      console.warn('[fasting] Failed to sync reminder notifications.', e);
    }
  }
}

export async function scheduleBreakNotificationForStartedFast(
  targetFastHours: number,
): Promise<void> {
  const n = getNotifee();
  if (!n) {
    return;
  }
  try {
    if (Platform.OS === 'android') {
      await ensureAndroidChannel(n);
    }
    await n.default.cancelNotification(FASTING_NOTIF_ID_BREAK);
    const timestamp = nextTimestampAfterMillis(
      Math.round(targetFastHours * 3600 * 1000),
    );
    await scheduleOneAtTimestamp(
      n,
      FASTING_NOTIF_ID_BREAK,
      '🥗 Time To Break Fast',
      '✨ Great job staying consistent. Your eating window is open now.',
      timestamp,
    );
  } catch (e) {
    if (__DEV__) {
      console.warn('[fasting] Failed to schedule break reminder.', e);
    }
  }
}

export async function cancelBreakNotification(): Promise<void> {
  const n = getNotifee();
  if (!n) {
    return;
  }
  try {
    await n.default.cancelNotification(FASTING_NOTIF_ID_BREAK);
  } catch {
    // ignore
  }
}

export async function markPendingFastingStartFromNotification(
  durationMin?: number | null,
): Promise<void> {
  try {
    const payload: PendingFastingStart = {
      durationMin:
        typeof durationMin === 'number' && Number.isFinite(durationMin)
          ? Math.max(1, Math.round(durationMin))
          : null,
    };
    await AsyncStorage.setItem(FASTING_PENDING_START_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export async function consumePendingFastingStartFromNotification(): Promise<PendingFastingStart | null> {
  try {
    const raw = await AsyncStorage.getItem(FASTING_PENDING_START_KEY);
    if (!raw) {
      return null;
    }
    await AsyncStorage.removeItem(FASTING_PENDING_START_KEY);
    const parsed = JSON.parse(raw) as Partial<PendingFastingStart>;
    return {
      durationMin:
        typeof parsed.durationMin === 'number' && Number.isFinite(parsed.durationMin)
          ? Math.max(1, Math.round(parsed.durationMin))
          : null,
    };
  } catch {
    return null;
  }
}

export function startFastingNotificationOpenListener(
  onStartFastNotificationOpen?: () => void,
): () => void {
  const n = getNotifee();
  if (!n) {
    return () => {};
  }

  void n.default
    .getInitialNotification()
    .then(initial => {
      if (initial?.notification?.id === FASTING_NOTIF_ID_BEGIN) {
        const d = Number.parseInt(
          String(initial.notification.data?.durationMin ?? ''),
          10,
        );
        void markPendingFastingStartFromNotification(Number.isFinite(d) ? d : null);
        onStartFastNotificationOpen?.();
      }
    })
    .catch(() => {
      // ignore
    });

  return n.default.onForegroundEvent(({ type, detail }) => {
    if (
      type !== n.EventType.PRESS &&
      type !== n.EventType.ACTION_PRESS
    ) {
      return;
    }
    if (detail.notification?.id === FASTING_NOTIF_ID_BEGIN) {
      const d = Number.parseInt(
        String(detail.notification.data?.durationMin ?? ''),
        10,
      );
      void markPendingFastingStartFromNotification(Number.isFinite(d) ? d : null);
      onStartFastNotificationOpen?.();
    }
  });
}

export async function fireFastingReminderEnabledTest(): Promise<void> {
  const n = getNotifee();
  if (!n) {
    return;
  }
  try {
    if (Platform.OS === 'android') {
      await ensureAndroidChannel(n);
    }
    await n.default.displayNotification({
      id: 'fasting-reminder-enabled-test',
      title: '🔔 Fasting reminders are ON',
      body: 'You will now get your scheduled Start / Break Fast alerts.',
      android: {
        channelId: ANDROID_CHANNEL_ID,
        pressAction: { id: 'default' },
      },
      ios: {
        sound: 'default',
      },
    });
  } catch (e) {
    if (__DEV__) {
      console.warn('[fasting] Failed to show reminder test notification.', e);
    }
  }
}
