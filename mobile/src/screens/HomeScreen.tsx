import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Text, SafeAreaView, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
import { ProviderCard } from '../components/ProviderCard';
import { T } from '../designSystem';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { apiFetch } from '../api';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<{id: string, name: string} | null>(null);
  const [problemDescription, setProblemDescription] = useState('');

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

  const handleProviderPress = (providerId: string, providerName: string) => {
    setSelectedProvider({ id: providerId, name: providerName });
  };

  const confirmCreateJob = async () => {
    if (!selectedProvider) return;
    try {
      const data = await apiFetch('/jobs', {
        method: 'POST',
        body: JSON.stringify({ providerId: selectedProvider.id, description: problemDescription })
      });
      const provName = selectedProvider.name;
      setSelectedProvider(null);
      setProblemDescription('');
      navigation.navigate('Job', { jobId: data.id, providerName: provName });
    } catch (err) {
      // Handled by apiFetch
    }
  };

  const cancelCreateJob = () => {
    setSelectedProvider(null);
    setProblemDescription('');
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

      <Modal visible={!!selectedProvider} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Job</Text>
            <Text style={styles.modalSubtitle}>Describe the problem for {selectedProvider?.name}</Text>
            
            <TextInput 
              style={styles.textInput}
              placeholder="e.g. My sink is leaking..."
              multiline
              numberOfLines={4}
              value={problemDescription}
              onChangeText={setProblemDescription}
              textAlignVertical="top"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelBtn]} onPress={cancelCreateJob}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.submitBtn]} onPress={confirmCreateJob}>
                <Text style={styles.submitBtnText}>Request Job</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: T.spacing.lg,
  },
  modalContent: {
    backgroundColor: T.colors.surface,
    padding: T.spacing.lg,
    borderRadius: T.radius.large,
  },
  modalTitle: {
    ...T.typography.heading,
    marginBottom: T.spacing.xs,
  },
  modalSubtitle: {
    ...T.typography.body,
    color: T.colors.textSecondary,
    marginBottom: T.spacing.md,
  },
  textInput: {
    borderWidth: 1,
    borderColor: T.colors.border,
    borderRadius: T.radius.medium,
    padding: T.spacing.md,
    height: 100,
    marginBottom: T.spacing.lg,
    ...T.typography.body,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: T.spacing.md,
  },
  modalButton: {
    flex: 1,
    padding: T.spacing.md,
    borderRadius: T.radius.medium,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: T.colors.background,
    borderWidth: 1,
    borderColor: T.colors.border,
  },
  submitBtn: {
    backgroundColor: T.colors.primary,
  },
  cancelBtnText: {
    ...T.typography.label,
  },
  submitBtnText: {
    ...T.typography.label,
    color: '#FFF',
  }
});
