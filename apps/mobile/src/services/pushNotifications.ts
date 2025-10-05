import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export type PushRegistrationResult = {
  token: string;
  platform: 'ios' | 'android' | 'unknown';
} | null;

export const registerForPushNotificationsAsync = async (): Promise<PushRegistrationResult> => {
  if (!Device.isDevice) {
    console.log('Push notifications registration skipped: running on simulator');
    return null;
  }

  const permissions = await Notifications.getPermissionsAsync();
  let finalStatus = permissions.status as string;
  if (finalStatus !== 'granted') {
    const request = await Notifications.requestPermissionsAsync();
    finalStatus = request.status as string;
  }
  if (finalStatus !== 'granted') {
    console.warn('Push notification permissions not granted');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId: string | undefined = (() => {
    const expoConfig = Constants.expoConfig as
      | undefined
      | { extra?: { eas?: { projectId?: string } } };
    if (expoConfig?.extra?.eas?.projectId) {
      return expoConfig.extra.eas.projectId;
    }
    return Constants.easConfig?.projectId ?? undefined;
  })();

  if (!projectId) {
    console.warn('Expo projectId not found; push registration skipped.');
    return null;
  }

  const expoToken = await Notifications.getExpoPushTokenAsync({ projectId });
  return {
    token: expoToken.data,
    platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'unknown',
  };
};
