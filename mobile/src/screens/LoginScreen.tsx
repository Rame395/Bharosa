import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, SafeAreaView, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../supabase';
import { T } from '../designSystem';

WebBrowser.maybeCompleteAuthSession();

export const LoginScreen = ({ navigation }: any) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!phone) return Alert.alert('Error', 'Please enter your phone number');
    
    setLoading(true);
    // Note: Supabase expects phone numbers in E.164 format, e.g., +97798XXXXXXXX
    const formattedPhone = phone.startsWith('+') ? phone : `+977${phone}`;

    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      navigation.navigate('Otp', { phone: formattedPhone });
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      
      if (Platform.OS === 'web') {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          },
        });
        if (error) throw error;
      } else {
        const redirectUrl = Linking.createURL('/auth');
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
          },
        });

        if (error) throw error;

        if (data?.url) {
          const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
          if (result.type === 'success' && result.url) {
            const fragment = result.url.split('#')[1];
            if (fragment) {
              const params = fragment.split('&').reduce((acc, current) => {
                const [key, value] = current.split('=');
                acc[key] = value;
                return acc;
              }, {} as Record<string, string>);
              if (params.access_token && params.refresh_token) {
                await supabase.auth.setSession({ 
                  access_token: params.access_token, 
                  refresh_token: params.refresh_token 
                });
              }
            }
          }
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Bharosa</Text>
        <Text style={styles.subtitle}>Enter your phone number to continue</Text>

        <TextInput
          style={styles.input}
          placeholder="Phone Number (e.g. 98XXXXXXXX)"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          autoCapitalize="none"
        />

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleSendOtp} 
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send OTP'}</Text>
        </TouchableOpacity>

        {/* Placeholder for Google OAuth fallback */}
        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn} disabled={loading}>
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.colors.background,
  },
  content: {
    flex: 1,
    padding: T.spacing.xl,
    justifyContent: 'center',
  },
  title: {
    ...T.typography.heading,
    color: T.colors.primary,
    marginBottom: T.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...T.typography.body,
    color: T.colors.textSecondary,
    marginBottom: T.spacing.xl,
    textAlign: 'center',
  },
  input: {
    backgroundColor: T.colors.surface,
    padding: T.spacing.md,
    borderRadius: T.radius.medium,
    borderWidth: 1,
    borderColor: T.colors.border,
    marginBottom: T.spacing.lg,
    fontSize: 16,
  },
  button: {
    backgroundColor: T.colors.primary,
    padding: T.spacing.md,
    borderRadius: T.radius.medium,
    alignItems: 'center',
    marginBottom: T.spacing.md,
  },
  buttonText: {
    color: '#FFF',
    ...T.typography.subheading,
  },
  googleButton: {
    backgroundColor: T.colors.surface,
    padding: T.spacing.md,
    borderRadius: T.radius.medium,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.colors.border,
  },
  googleButtonText: {
    color: T.colors.textPrimary,
    ...T.typography.subheading,
  }
});
