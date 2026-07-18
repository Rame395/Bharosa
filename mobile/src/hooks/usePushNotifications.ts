import { useContext, useEffect, useRef, useState } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiFetch } from '../api';
import { AuthContext } from '../context/AuthContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const usePushNotifications = () => {
  const { session } = useContext(AuthContext);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const register = async () => {
      // In a real app, you need a physical device for pushes.
      // Expo Go on Android supports pushes, iOS requires a paid developer account.
      if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
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
        // Automatically fetches projectId from app.json in managed Expo
        const pushToken = (await Notifications.getExpoPushTokenAsync()).data;
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
