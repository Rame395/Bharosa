import React, { useContext, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity, Text } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { JobScreen } from '../screens/JobScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OtpScreen } from '../screens/OtpScreen';
import { RatingScreen } from '../screens/RatingScreen';
import { RegistrationScreen } from '../screens/RegistrationScreen';
import { ProviderDashboard } from '../screens/ProviderDashboard';
import { ProviderJobScreen } from '../screens/ProviderJobScreen';
import { AuthContext } from '../context/AuthContext';
import { apiFetch } from '../api';
import { usePushNotifications } from '../hooks/usePushNotifications';

export type RootStackParamList = {
  Home: undefined;
  Job: { jobId: string; providerName: string };
  Login: undefined;
  Otp: { phone: string };
  Registration: undefined;
  Rating: { jobId: string; providerName: string };
  ProviderDashboard: undefined;
  ProviderJob: { jobId: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  const { session, loading, appMode, setAppMode } = useContext(AuthContext);
  
  usePushNotifications(); // Automatically requests permission and syncs token if logged in

  const toggleMode = () => {
    setAppMode(appMode === 'customer' ? 'provider' : 'customer');
  };

  const HeaderRight = () => (
    <TouchableOpacity onPress={toggleMode} style={{ padding: 8 }}>
      <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>
        {appMode === 'customer' ? 'Provider Mode' : 'Customer Mode'}
      </Text>
    </TouchableOpacity>
  );

  useEffect(() => {
    if (session?.user && (session.user.user_metadata?.full_name || session.user.user_metadata?.name)) {
      apiFetch('/users/sync', {
        method: 'POST',
        body: JSON.stringify({ 
          name: session.user.user_metadata.full_name || session.user.user_metadata.name
        })
      }).catch(err => console.error('Failed to sync user', err));
    }
  }, [session]);

  if (loading) return null; // Or a splash screen

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{
          headerStyle: { backgroundColor: '#FDFBF7' },
          headerTintColor: '#2C2C2C',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        {!session ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Otp" component={OtpScreen} options={{ title: 'Verify OTP' }} />
          </>
        ) : (!session.user.user_metadata?.full_name && !session.user.user_metadata?.name) ? (
          <Stack.Screen name="Registration" component={RegistrationScreen} options={{ headerShown: false }} />
        ) : (
          appMode === 'customer' ? (
            <>
              <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Bharosa', headerRight: HeaderRight }} />
              <Stack.Screen name="Job" component={JobScreen} options={({ route }) => ({ title: route.params.providerName })} />
              <Stack.Screen name="Rating" component={RatingScreen} options={{ title: 'Rate Service' }} />
            </>
          ) : (
            <>
              <Stack.Screen name="ProviderDashboard" component={ProviderDashboard} options={{ title: 'Provider Portal', headerRight: HeaderRight }} />
              <Stack.Screen name="ProviderJob" component={ProviderJobScreen} options={{ title: 'Job Details' }} />
            </>
          )
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
