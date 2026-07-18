import { useContext, useEffect, useState } from 'react';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { apiFetch } from '../api';
import { AuthContext } from '../context/AuthContext';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: any = null;

if (!isExpoGo) {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export const usePushNotifications = () => {
  const { session } = useContext(AuthContext);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const register = async () => {
      // In a real app, you need a physical device for pushes.
      // Expo Go on Android SDK 53+ doesn't support remote pushes at all.
      if (!Device.isDevice || isExpoGo || !Notifications || Platform.OS === 'web') {
        console.log('Push notifications disabled in Expo Go / Web / Simulators');
        return null;
      }
      
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Push notification permission denied');
        return null;
      }

      try {
        const pushToken = (await Notifications.getExpoPushTokenAsync({ projectId: Constants.expoConfig?.extra?.eas?.projectId })).data;
        return pushToken;
      } catch (e) {
        console.error('Push token error:', e);
        return null;
      }
    };

    register().then(pushToken => {
      if (isMounted && pushToken) {
        setToken(pushToken);
      }
    });

    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    // If we have a token and the user is signed in, sync it to our backend
    if (session && token) {
      apiFetch('/users/push-token', {
        method: 'POST',
        body: JSON.stringify({ pushToken: token })
      }).catch(err => console.error('Failed to sync push token:', err));
    }
  }, [session, token]);
};
