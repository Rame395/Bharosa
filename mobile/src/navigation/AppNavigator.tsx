import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { JobScreen } from '../screens/JobScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OtpScreen } from '../screens/OtpScreen';
import { RatingScreen } from '../screens/RatingScreen';
import { ProviderDashboard } from '../screens/ProviderDashboard';
import { AuthContext } from '../context/AuthContext';

export type RootStackParamList = {
  Home: undefined;
  Job: { jobId: string; providerName: string };
  Login: undefined;
  Otp: { phone: string };
  Rating: { jobId: string; providerName: string };
  ProviderDashboard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  const { session, loading } = useContext(AuthContext);

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
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Bharosa' }} />
            <Stack.Screen name="Job" component={JobScreen} options={({ route }) => ({ title: route.params.providerName })} />
            <Stack.Screen name="Rating" component={RatingScreen} options={{ title: 'Rate Service' }} />
            <Stack.Screen name="ProviderDashboard" component={ProviderDashboard} options={{ title: 'Provider Portal' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
