import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { supabase } from '../supabase';
import { T } from '../designSystem';

export const RegistrationScreen = () => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCompleteRegistration = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Please enter your name');
    
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: name.trim() }
    });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>What should we call you?</Text>
        <Text style={styles.subtitle}>Please enter your full name to continue.</Text>

        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleCompleteRegistration} 
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.colors.background },
  content: { flex: 1, padding: T.spacing.xl, justifyContent: 'center' },
  title: { ...T.typography.heading, color: T.colors.primary, marginBottom: T.spacing.sm, textAlign: 'center' },
  subtitle: { ...T.typography.body, color: T.colors.textSecondary, marginBottom: T.spacing.xl, textAlign: 'center' },
  input: { backgroundColor: T.colors.surface, padding: T.spacing.md, borderRadius: T.radius.medium, borderWidth: 1, borderColor: T.colors.border, marginBottom: T.spacing.lg, fontSize: 16 },
  button: { backgroundColor: T.colors.primary, padding: T.spacing.md, borderRadius: T.radius.medium, alignItems: 'center' },
  buttonText: { color: '#FFF', ...T.typography.subheading }
});
