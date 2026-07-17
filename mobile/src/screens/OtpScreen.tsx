import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { supabase } from '../supabase';
import { T } from '../designSystem';

export const OtpScreen = ({ route, navigation }: any) => {
  const { phone } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!otp) return Alert.alert('Error', 'Please enter the OTP');
    
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: 'sms',
    });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      // The AuthContext will automatically detect the session change and navigate to the Home screen
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Verify OTP</Text>
        <Text style={styles.subtitle}>Enter the code sent to {phone}</Text>

        <TextInput
          style={styles.input}
          placeholder="6-digit code"
          keyboardType="number-pad"
          value={otp}
          onChangeText={setOtp}
          maxLength={6}
        />

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleVerify} 
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify & Login'}</Text>
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
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 4,
  },
  button: {
    backgroundColor: T.colors.primary,
    padding: T.spacing.md,
    borderRadius: T.radius.medium,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    ...T.typography.subheading,
  }
});
