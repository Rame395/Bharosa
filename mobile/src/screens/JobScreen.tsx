import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Linking, SafeAreaView, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { T } from '../designSystem';
import { apiFetch } from '../api';

type Props = NativeStackScreenProps<RootStackParamList, 'Job'>;

export const JobScreen: React.FC<Props> = ({ route, navigation }) => {
  const { jobId, providerName } = route.params;
  const [charges, setCharges] = useState<any[]>([]);
  const [jobStatus, setJobStatus] = useState('loading');
  const [jobPhone, setJobPhone] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      const data = await apiFetch(`/jobs/${jobId}`);
      setJobStatus(data.status);
      setCharges(data.charges || []);
      setJobPhone(data.provider_phone || '');
    } catch (err) {
      // Handled by apiFetch
    } finally {
      setLoading(false);
    }
  };

  const totalApproved = charges.filter(c => c.customer_approved_at !== null).reduce((sum, c) => sum + Number(c.amount), 0);
  const totalPending = charges.filter(c => c.customer_approved_at === null).reduce((sum, c) => sum + Number(c.amount), 0);

  const handleApprove = (chargeId: string, amount: number, isEstimate: boolean) => {
    const originalEstimate = charges.filter(c => c.is_estimate).reduce((sum, c) => sum + Number(c.amount), 0);
    const newTotal = totalApproved + Number(amount);
    
    // Only warn about overage if this isn't the estimate itself, and an estimate exists
    const isOverage = !isEstimate && originalEstimate > 0 && newTotal > (originalEstimate * 1.5);

    const alertTitle = isOverage ? '⚠️ Significant Overage Warning' : 'Approve Charge';
    const alertMessage = isOverage 
      ? `This charge brings the total to Rs. ${newTotal}, which is significantly higher than the original estimate of Rs. ${originalEstimate}. Are you sure you want to approve?`
      : `Are you sure you want to approve Rs. ${amount} for this ${isEstimate ? 'estimate' : 'fixed charge'}?`;

    Alert.alert(
      alertTitle,
      alertMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Approve', 
          onPress: async () => {
            try {
              await apiFetch(`/charges/${chargeId}/approve`, { method: 'POST' });
              fetchJobDetails(); // Refresh
            } catch (err) {}
          }
        }
      ]
    );
  };

  const handleCancelJob = () => {
    Alert.alert(
      "Cancel Job",
      "Are you sure you want to cancel this job? This action cannot be undone.",
      [
        { text: "No", style: "cancel" },
        { 
          text: "Yes, Cancel", 
          style: "destructive",
          onPress: async () => {
            try {
              await apiFetch(`/jobs/${jobId}/cancel`, { method: 'POST' });
              setJobStatus('cancelled');
              Alert.alert("Cancelled", "Your job has been cancelled successfully.");
            } catch (err) {}
          }
        }
      ]
    );
  };

  const handleCallProvider = () => {
    if (jobPhone) {
      Linking.openURL(`tel:${jobPhone}`);
    } else {
      Alert.alert('Error', 'Provider phone number not available.');
    }
  };

  const renderCharge = ({ item }: { item: any }) => (
    <View style={styles.chargeCard}>
      <View style={styles.chargeHeader}>
        <Text style={styles.chargeDescription}>{item.description}</Text>
        <Text style={styles.chargeAmount}>Rs. {item.amount}</Text>
      </View>
      <View style={styles.chargeFooter}>
        <View style={[styles.badge, { backgroundColor: item.is_estimate ? T.colors.warning : T.colors.success }]}>
          <Text style={styles.badgeText}>{item.is_estimate ? 'Estimate' : 'Fixed'}</Text>
        </View>
        
        {item.customer_approved_at === null ? (
          <TouchableOpacity 
            style={styles.approveButton} 
            onPress={() => handleApprove(item.id, item.amount, item.is_estimate)}
          >
            <Text style={styles.approveButtonText}>Approve Charge</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.approvedText}>✓ Approved</Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={T.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Job Status: {jobStatus.toUpperCase()}</Text>
        <Text style={styles.summaryTotal}>Total Pending: Rs. {totalPending}</Text>
        <Text style={styles.summaryApproved}>Total Approved: Rs. {totalApproved}</Text>
      </View>

      <FlatList
        data={charges}
        keyExtractor={item => item.id}
        renderItem={renderCharge}
        contentContainerStyle={styles.listContainer}
        ListFooterComponent={
          <View style={styles.actionContainer}>
            <TouchableOpacity 
              style={[styles.completeButton, (totalPending > 0 || jobStatus === 'requested' || jobStatus === 'cancelled') && styles.completeButtonDisabled]}
              disabled={totalPending > 0 || jobStatus === 'requested' || jobStatus === 'cancelled'}
              onPress={() => navigation.navigate('Rating', { jobId, providerName })}
            >
              <Text style={styles.completeButtonText}>Complete Job & Rate</Text>
            </TouchableOpacity>

            <View style={styles.secondaryActions}>
              <TouchableOpacity style={styles.callButton} onPress={handleCallProvider}>
                <Text style={styles.callButtonText}>📞 Call Provider</Text>
              </TouchableOpacity>
              
              {jobStatus !== 'cancelled' && (
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancelJob}>
                  <Text style={styles.cancelButtonText}>Cancel Job</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.colors.background,
  },
  actionContainer: {
    marginTop: T.spacing.xl,
    gap: T.spacing.md,
  },
  completeButton: {
    backgroundColor: T.colors.textPrimary,
    padding: T.spacing.md,
    borderRadius: T.radius.medium,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    opacity: 0.5,
  },
  completeButtonText: {
    color: '#FFF',
    ...T.typography.subheading,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: T.spacing.md,
  },
  callButton: {
    flex: 1,
    backgroundColor: T.colors.success,
    padding: T.spacing.md,
    borderRadius: T.radius.medium,
    alignItems: 'center',
  },
  callButtonText: {
    color: '#FFF',
    ...T.typography.label,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: T.colors.surface,
    padding: T.spacing.md,
    borderRadius: T.radius.medium,
    borderWidth: 1,
    borderColor: T.colors.error,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: T.colors.error,
    ...T.typography.label,
  },
  summaryCard: {
    backgroundColor: T.colors.primary,
    padding: T.spacing.lg,
    margin: T.spacing.md,
    borderRadius: T.radius.large,
  },
  summaryTitle: {
    ...T.typography.heading,
    color: '#FFF',
    fontSize: 20,
    marginBottom: T.spacing.sm,
  },
  summaryTotal: {
    ...T.typography.body,
    color: '#FFF',
    opacity: 0.9,
  },
  summaryApproved: {
    ...T.typography.body,
    color: '#FFF',
    opacity: 0.9,
  },
  listContainer: {
    padding: T.spacing.md,
  },
  chargeCard: {
    backgroundColor: T.colors.surface,
    padding: T.spacing.md,
    borderRadius: T.radius.medium,
    marginBottom: T.spacing.md,
    ...T.shadows.card,
  },
  chargeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: T.spacing.sm,
  },
  chargeDescription: {
    ...T.typography.subheading,
    flex: 1,
  },
  chargeAmount: {
    ...T.typography.heading,
    fontSize: 18,
    color: T.colors.primary,
  },
  chargeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: T.spacing.sm,
    paddingVertical: 4,
    borderRadius: T.radius.small,
  },
  badgeText: {
    ...T.typography.caption,
    color: '#FFF',
  },
  approveButton: {
    backgroundColor: T.colors.primary,
    paddingHorizontal: T.spacing.md,
    paddingVertical: T.spacing.sm,
    borderRadius: T.radius.small,
  },
  approveButtonText: {
    ...T.typography.label,
    color: '#FFF',
  },
  approvedText: {
    ...T.typography.label,
    color: T.colors.success,
  }
});
