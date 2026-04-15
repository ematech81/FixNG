import { useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import api from '../api/index';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,  // We show our own in-app toast instead
    shouldPlaySound: false,
    shouldSetBadge:  true,
  }),
});

/**
 * usePushNotifications(userId)
 *
 * Call once at the app level (CustomerTabScreen) after the user is logged in.
 * - Requests permission
 * - Gets the Expo push token
 * - Saves it to the backend
 * - Sets up a tap-handler so tapping a notification navigates to the right screen
 *
 * @param {string|null} userId      - logged-in user's ID
 * @param {function}    onTap       - called with the notification data when user taps
 */
export default function usePushNotifications(userId, onTap) {
  const notificationListener = useRef(null);
  const responseListener     = useRef(null);

  useEffect(() => {
    if (!userId) return;

    registerForPushNotifications().then((token) => {
      if (token) saveTokenToBackend(token);
    });

    // Listener: notification arrives while app is in foreground
    // (We suppress the alert above and rely on our own in-app toast)
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      // No-op — socket handles foreground delivery via in-app toast
    });

    // Listener: user taps a notification (background or killed state)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (onTap && data) onTap(data);
      }
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function registerForPushNotifications() {
  // Push tokens only work on physical devices
  if (!Device.isDevice) {
    console.log('[Push] Skipped — running on emulator/simulator.');
    return null;
  }

  // Android: create a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name:              'Default',
      importance:        Notifications.AndroidImportance.MAX,
      vibrationPattern:  [0, 250, 250, 250],
      lightColor:        '#2563EB',
      sound:             true,
    });
  }

  // Request permission
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] Permission denied.');
    return null;
  }

  // Get the Expo push token
  // projectId comes from app.json > extra.eas.projectId (EAS builds)
  // Falls back gracefully when running inside Expo Go
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenObj = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    return tokenObj.data; // "ExponentPushToken[...]"
  } catch (err) {
    console.log('[Push] Token fetch failed:', err.message);
    return null;
  }
}

async function saveTokenToBackend(token) {
  try {
    await api.post('/auth/push-token', { token });
    console.log('[Push] Token saved.');
  } catch (err) {
    console.warn('[Push] Failed to save token:', err.message);
  }
}
