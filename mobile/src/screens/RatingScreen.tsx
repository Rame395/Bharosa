import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { T } from '../designSystem';

import { apiFetch } from '../api';

type Props = NativeStackScreenProps<RootStackParamList, 'Rating'>;

export const RatingScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId, providerName } = route.params;
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) return Alert.alert('Error', 'Please select a valid rating');
    
    setLoading(true);
    try {
      await apiFetch(`/jobs/${jobId}/rate`, { 
        method: 'POST', 
        body: JSON.stringify({ rating, comment }) 
      });
      
      Alert.alert('Success', 'Rating submitted. Thank you!', [
        { text: 'OK', onPress: () => navigation.popToTop() }
      ]);
    } catch (err) {
      // handled
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Rate {providerName}</Text>
        <Text style={styles.subtitle}>How was your service experience?</Text>

        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map(star => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <Text style={[styles.star, { color: star <= rating ? T.colors.primary : T.colors.border }]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Leave a comment (optional)"
          multiline
          numberOfLines={4}
          value={comment}
          onChangeText={setComment}
        />

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleSubmit} 
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Submitting...' : 'Submit Rating'}</Text>
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
    padding: T.spacing.xl,
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
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: T.spacing.md,
    marginBottom: T.spacing.xl,
  },
  star: {
    fontSize: 48,
  },
  input: {
    backgroundColor: T.colors.surface,
    padding: T.spacing.md,
    borderRadius: T.radius.medium,
    borderWidth: 1,
    borderColor: T.colors.border,
    marginBottom: T.spacing.lg,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
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
