import { Platform } from 'react-native';
import { getNotifee } from '../../services/notifeeLazy';
import { nextDailyTriggerMillis } from '../fasting/fastingReminderNotifications';
import type { TimeOfDay } from '../fasting/fastingTypes';
import type { GeneralRemindersPersisted } from './remindersSettingsTypes';
import {
  WATER_NOTIF_ID_LEGACY,
  WATER_REMINDER_SLOT_COUNT,
  waterNotifId,
} from './remindersWaterConstants';

const ANDROID_CHANNEL_ID = 'health-general-reminders';

export const MEAL_BREAKFAST_NOTIF_ID = 'health-reminder-meal-breakfast';
export const MEAL_LUNCH_NOTIF_ID = 'health-reminder-meal-lunch';
export const MEAL_DINNER_NOTIF_ID = 'health-reminder-meal-dinner';

type NotifeeNamespace = NonNullable<ReturnType<typeof getNotifee>>;

async function ensureChannel(n: NotifeeNamespace): Promise<void> {
  await n.default.createChannel({
    id: ANDROID_CHANNEL_ID,
    name: 'Water & meal reminders',
    importance: n.AndroidImportance.HIGH,
    vibration: true,
  });
}

function scheduleDaily(
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
        pressAction: { id: 'default' },
      },
      ios: { sound: 'default' },
    },
    {
      type: n.TriggerType.TIMESTAMP,
      timestamp,
      repeatFrequency: n.RepeatFrequency.DAILY,
    },
  );
}

function allWaterNotifIdsToCancel(): string[] {
  const ids = [WATER_NOTIF_ID_LEGACY];
  for (let i = 0; i < WATER_REMINDER_SLOT_COUNT; i += 1) {
    ids.push(waterNotifId(i));
  }
  return ids;
}

const MEAL_IDS = [
  MEAL_BREAKFAST_NOTIF_ID,
  MEAL_LUNCH_NOTIF_ID,
  MEAL_DINNER_NOTIF_ID,
] as const;

export async function syncGeneralReminderNotifications(
  settings: GeneralRemindersPersisted,
): Promise<void> {
  const n = getNotifee();
  if (!n) {
    return;
  }
  try {
    for (const id of allWaterNotifIdsToCancel()) {
      await n.default.cancelNotification(id);
    }
    for (const id of MEAL_IDS) {
      await n.default.cancelNotification(id);
    }

    const anyOn = settings.water.enabled || settings.meals.enabled;
    if (!anyOn) {
      return;
    }

    if (Platform.OS === 'android') {
      await ensureChannel(n);
    }

    if (settings.water.enabled) {
      const times = settings.water.times;
      for (let i = 0; i < times.length; i += 1) {
        const at = times[i];
        await scheduleDaily(
          n,
          waterNotifId(i),
          '💧 Water check-in',
          `Reminder ${i + 1} of ${times.length} — log water in HealthFirst.`,
          at,
        );
      }
    }

    if (settings.meals.enabled) {
      await scheduleDaily(
        n,
        MEAL_BREAKFAST_NOTIF_ID,
        '🍳 Breakfast',
        'Log breakfast in Meals to keep your day on track.',
        settings.meals.breakfast,
      );
      await scheduleDaily(
        n,
        MEAL_LUNCH_NOTIF_ID,
        '🥗 Lunch',
        'Time for a lunch log — add what you ate in Meals.',
        settings.meals.lunch,
      );
      await scheduleDaily(
        n,
        MEAL_DINNER_NOTIF_ID,
        '🌙 Dinner',
        'Log dinner in Meals to close out your food diary.',
        settings.meals.dinner,
      );
    }
  } catch (e) {
    if (__DEV__) {
      console.warn('[reminders] Failed to sync water/meal notifications.', e);
    }
  }
}
