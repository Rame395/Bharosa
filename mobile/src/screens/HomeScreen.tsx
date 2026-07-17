import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Text, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ProviderCard } from '../components/ProviderCard';
import { T } from '../designSystem';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { apiFetch } from '../api';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const data = await apiFetch('/providers');
      setProviders(data);
    } catch (err) {
      // Error handled by apiFetch alert
    } finally {
      setLoading(false);
    }
  };

  const handleProviderPress = async (providerId: string, providerName: string) => {
    try {
      // Create a job request immediately when tapping a provider (for MVP flow)
      const newJob = await apiFetch('/jobs', {
        method: 'POST',
        body: JSON.stringify({ providerId }),
      });
      navigation.navigate('Job', { jobId: newJob.id, providerName });
    } catch (err) {
      // Error handled
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Bharosa</Text>
          <TouchableOpacity 
            style={styles.modeSwitch}
            onPress={() => navigation.navigate('ProviderDashboard')}
          >
            <Text style={styles.modeSwitchText}>Switch to Provider</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>Verified local services</Text>
      </View>
      
      {loading ? (
        <ActivityIndicator style={{ marginTop: T.spacing.xl }} size="large" color={T.colors.primary} />
      ) : (
        <FlatList
          data={providers}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <ProviderCard
              name={item.full_name}
              isVerified={item.is_verified}
              guarantorName={item.guarantor_name || 'Bharosa Admin'}
              rating={item.trust_score ? (item.trust_score / 10).toFixed(1) : 'New'}
              priceRange="Estimate Varies"
              isFixedPrice={false}
              responseTime={item.avg_response_time || 'Varies'}
              onPress={() => handleProviderPress(item.id, item.full_name)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.colors.background,
  },
  header: {
    padding: T.spacing.xl,
    backgroundColor: T.colors.primary,
    borderBottomLeftRadius: T.radius.large,
    borderBottomRightRadius: T.radius.large,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: T.spacing.xs,
  },
  title: {
    ...T.typography.heading,
    color: '#FFF',
  },
  modeSwitch: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: T.spacing.md,
    paddingVertical: T.spacing.sm,
    borderRadius: T.radius.small,
  },
  modeSwitchText: {
    ...T.typography.label,
    color: '#FFF',
  },
  subtitle: {
    ...T.typography.body,
    color: '#FFF',
    opacity: 0.9,
  },
  listContainer: {
    padding: T.spacing.md,
  },
});
