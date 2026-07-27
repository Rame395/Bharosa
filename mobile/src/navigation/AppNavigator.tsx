import React, { useContext, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity, Text, View } from 'react-native';
import { supabase } from '../supabase';
import { HomeScreen } from '../screens/HomeScreen';
import { JobScreen } from '../screens/JobScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OtpScreen } from '../screens/OtpScreen';
import { RatingScreen } from '../screens/RatingScreen';
import { RegistrationScreen } from '../screens/RegistrationScreen';
import { ProviderDashboard } from '../screens/ProviderDashboard';
import { ProviderJobScreen } from '../screens/ProviderJobScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { AuthContext } from '../context/AuthContext';
import { apiFetch } from '../api';
import { usePushNotifications } from '../hooks/usePushNotifications';

export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Otp: { phone: string };
  Registration: undefined;
  Job: { jobId: number, providerName: string };
  Rating: { jobId: number, providerId: string, providerName: string };
  ProviderDashboard: undefined;
  ProviderJob: { jobId: number };
  Chat: { jobId: number, otherPartyName: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  const { session, loading, appMode, setAppMode } = useContext(AuthContext);
  
  usePushNotifications(); // Automatically requests permission and syncs token if logged in

  const toggleMode = () => {
    setAppMode(appMode === 'customer' ? 'provider' : 'customer');
  };

  const HeaderRight = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <TouchableOpacity onPress={toggleMode} style={{ padding: 8, marginRight: 8 }}>
        <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>
          {appMode === 'customer' ? 'Provider Mode' : 'Customer Mode'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Logout error:', error);
      }} style={{ padding: 8 }}>
        <Text style={{ color: '#FF3B30', fontWeight: 'bold' }}>Logout</Text>
      </TouchableOpacity>
    </View>
  );

  useEffect(() => {
    if (session?.user && (session.user.user_metadata?.full_name || session.user.user_metadata?.name)) {
      apiFetch('/users/sync', {
        method: 'POST',
        body: JSON.stringify({ 
          name: session.user.user_metadata.full_name || session.user.user_metadata.name,
          phone: session.user.user_metadata.phone || session.user.phone
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
        ) : (!(session.user.user_metadata?.full_name || session.user.user_metadata?.name) || !(session.user.phone || session.user.user_metadata?.phone)) ? (
          <Stack.Screen name="Registration" component={RegistrationScreen} options={{ headerShown: false }} />
        ) : (
          appMode === 'customer' ? (
            <>
              <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Bharosa', headerRight: HeaderRight }} />
              <Stack.Screen name="Job" component={JobScreen} options={{ title: 'Job Request' }} />
              <Stack.Screen name="Rating" component={RatingScreen} options={{ title: 'Rate Provider' }} />
              <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
            </>
          ) : (
            <>
              <Stack.Screen name="ProviderDashboard" component={ProviderDashboard} options={{ title: 'Provider Portal', headerRight: HeaderRight }} />
              <Stack.Screen name="ProviderJob" component={ProviderJobScreen} options={{ title: 'Manage Job' }} />
              <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
            </>
          )
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
