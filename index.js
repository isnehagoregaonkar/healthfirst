/**
 * @format
 */

import 'react-native-gesture-handler';
import { AppRegistry, NativeModules } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { markPendingFastingStartFromNotification } from './src/features/fasting/fastingReminderNotifications';

try {
  if (NativeModules.NotifeeApiModule != null) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const notifeePkg = require('@notifee/react-native');
    notifeePkg.default.onBackgroundEvent(async ({ type, detail }) => {
      if (
        type === notifeePkg.EventType.PRESS ||
        type === notifeePkg.EventType.ACTION_PRESS
      ) {
        if (detail.notification?.id === 'fasting-reminder-begin') {
          const raw = detail.notification?.data?.durationMin;
          const d = Number.parseInt(raw ?? '', 10);
          await markPendingFastingStartFromNotification(
            Number.isFinite(d) ? d : null,
          );
        }
      }
    });
  }
} catch {
  // Notifee unavailable; skip background press handling.
}

AppRegistry.registerComponent(appName, () => App);
