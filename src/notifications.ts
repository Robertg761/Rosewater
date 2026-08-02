import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// expo-notifications throws at import time in Expo Go on Android (SDK 53+
// removed notification support there), so it must be required lazily and
// only outside Expo Go. In Expo Go, reminders are reported as unavailable.
const isExpoGoAndroid =
  Platform.OS === 'android' &&
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

type NotifModule = typeof import('expo-notifications');
let cached: NotifModule | null | undefined;

function getModule(): NotifModule | null {
  if (cached !== undefined) return cached;
  if (isExpoGoAndroid) {
    cached = null;
    return cached;
  }
  try {
    const mod = require('expo-notifications') as NotifModule;
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    cached = mod;
  } catch {
    cached = null;
  }
  return cached;
}

export function remindersAvailable(): boolean {
  return getModule() !== null;
}

export async function setupNotifications(): Promise<boolean> {
  const N = getModule();
  if (!N) return false;
  if (Platform.OS === 'android') {
    await N.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: N.AndroidImportance.DEFAULT,
    });
  }
  const settings = await N.getPermissionsAsync();
  if (settings.granted) return true;
  const req = await N.requestPermissionsAsync();
  return req.granted;
}

const WASH_ID = 'wash-reminder';
const VITAMIN_ID = 'vitamin-reminder';
const TRIM_ID = 'trim-reminder';

export async function scheduleWashReminder(intervalDays: number): Promise<void> {
  const N = getModule();
  if (!N) return;
  await N.cancelScheduledNotificationAsync(WASH_ID);
  await N.scheduleNotificationAsync({
    identifier: WASH_ID,
    content: {
      title: 'Wash day 💧',
      body: 'Time to give your hair some love today.',
    },
    trigger: {
      type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: intervalDays * 86400,
      repeats: true,
      channelId: 'reminders',
    },
  });
}

export async function scheduleVitaminReminder(hour: number, minute: number): Promise<void> {
  const N = getModule();
  if (!N) return;
  await N.cancelScheduledNotificationAsync(VITAMIN_ID);
  await N.scheduleNotificationAsync({
    identifier: VITAMIN_ID,
    content: {
      title: 'Vitamins 💊',
      body: "Don't forget to check off today's vitamins.",
    },
    trigger: {
      type: N.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: 'reminders',
    },
  });
}

export async function scheduleTrimReminder(weeks: number): Promise<void> {
  const N = getModule();
  if (!N) return;
  await N.cancelScheduledNotificationAsync(TRIM_ID);
  await N.scheduleNotificationAsync({
    identifier: TRIM_ID,
    content: {
      title: 'Trim check ✂️',
      body: `It's been about ${weeks} weeks — time to think about a trim.`,
    },
    trigger: {
      type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: weeks * 7 * 86400,
      repeats: true,
      channelId: 'reminders',
    },
  });
}

export async function cancelWashReminder(): Promise<void> {
  await getModule()?.cancelScheduledNotificationAsync(WASH_ID);
}

export async function cancelVitaminReminder(): Promise<void> {
  await getModule()?.cancelScheduledNotificationAsync(VITAMIN_ID);
}

export async function cancelTrimReminder(): Promise<void> {
  await getModule()?.cancelScheduledNotificationAsync(TRIM_ID);
}
