import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { T } from '../designSystem';
import { apiFetch } from '../api';
import { RootStackParamList } from '../navigation/AppNavigator';

type ProviderNavProp = NativeStackNavigationProp<RootStackParamList, 'ProviderDashboard'>;

export const ProviderDashboard = () => {
  const [profile, setProfile] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [vouchRequests, setVouchRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<ProviderNavProp>();
  const isFocused = useIsFocused();

  const [activeTab, setActiveTab] = useState<'new'|'active'|'history'|'requests'>('new');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (isFocused) {
      fetchDashboardData();
    }
  }, [isFocused]);

  const fetchDashboardData = async () => {
    try {
      const prof = await apiFetch('/providers/me');
      setProfile(prof);
      
      if (prof.is_verified) {
        const jobsData = await apiFetch('/provider/jobs');
        setJobs(jobsData);
        
        const reqsData = await apiFetch('/providers/vouch-requests');
        setVouchRequests(reqsData);
      }
    } catch (err) {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  const handleRequestVouch = async () => {
    if (!guarantorPhone) return Alert.alert('Error', 'Enter a guarantor phone number');
    setRequesting(true);
    try {
      await apiFetch('/providers/request-vouch', {
        method: 'POST',
        body: JSON.stringify({ guarantorPhone })
      });
      Alert.alert('Success', 'Verification request sent to Guarantor!');
      setGuarantorPhone('');
    } catch (err) {
      // Error handled by apiFetch
    } finally {
      setRequesting(false);
    }
  };

  const handleApproveVouch = async (requestId: string) => {
    try {
      await apiFetch(`/providers/vouch-requests/${requestId}/approve`, { method: 'POST' });
      Alert.alert('Approved', 'You have verified this provider.');
      fetchDashboardData();
    } catch (err) {}
  };

  const renderJob = ({ item }: any) => {
    const totalCharges = item.charges ? item.charges.reduce((sum: number, c: any) => sum + Number(c.amount), 0) : 0;
    
    return (
      <TouchableOpacity 
        style={styles.jobCard}
        onPress={() => navigation.navigate('ProviderJob', { jobId: item.id })}
      >
        <View style={styles.jobHeader}>
          <Text style={styles.customerName}>Customer ID: {item.customer_id.substring(0, 8)}</Text>
          <View style={[styles.badge, item.status === 'requested' && { backgroundColor: T.colors.secondary }]}>
            <Text style={[styles.badgeText, item.status === 'requested' && { color: '#000' }]}>{item.status.replace('_', ' ').toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.jobDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
        <Text style={styles.jobDesc} numberOfLines={2}>{item.description || 'No description provided'}</Text>
        {totalCharges > 0 && (
          <Text style={styles.jobCharges}>Total Quoted: Rs. {totalCharges}</Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderRequest = ({ item }: any) => (
    <View style={styles.jobCard}>
      <Text style={styles.customerName}>{item.vouchee_name}</Text>
      <Text style={styles.jobDate}>Phone: {item.vouchee_phone}</Text>
      <Text style={styles.jobDesc}>This provider is requesting your verification.</Text>
      <TouchableOpacity 
        style={[styles.button, { marginTop: 12 }]} 
        onPress={() => handleApproveVouch(item.id)}
      >
        <Text style={styles.buttonText}>Approve & Verify</Text>
      </TouchableOpacity>
    </View>
  );

  const getFilteredJobs = (statusGroup: string) => {
    if (statusGroup === 'new') return jobs.filter(j => j.status === 'requested');
    if (statusGroup === 'active') return jobs.filter(j => !['requested', 'completed', 'cancelled'].includes(j.status));
    if (statusGroup === 'history') return jobs.filter(j => ['completed', 'cancelled'].includes(j.status));
    return [];
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={T.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Provider Portal</Text>
        {profile?.is_verified ? (
          <Text style={styles.subtitle}>Manage your assigned jobs</Text>
        ) : (
          <Text style={styles.subtitle}>Action Required: Verification</Text>
        )}
      </View>

      {!profile?.is_verified ? (
        <View style={styles.unverifiedContainer}>
          <Text style={styles.unverifiedTitle}>You are not verified yet!</Text>
          <Text style={styles.unverifiedDesc}>
            To receive jobs from customers, you must be verified by an existing, trusted Provider (a Guarantor).
          </Text>
          
          <TextInput
            style={styles.input}
            placeholder="Enter Guarantor's Phone Number"
            keyboardType="phone-pad"
            value={guarantorPhone}
            onChangeText={setGuarantorPhone}
          />
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleRequestVouch}
            disabled={requesting}
          >
            <Text style={styles.buttonText}>{requesting ? 'Requesting...' : 'Request Verification'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.tabsContainer}>
            <TouchableOpacity style={[styles.tab, activeTab === 'new' && styles.activeTab]} onPress={() => setActiveTab('new')}>
              <Text style={[styles.tabText, activeTab === 'new' && styles.activeTabText]}>New ({getFilteredJobs('new').length})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, activeTab === 'active' && styles.activeTab]} onPress={() => setActiveTab('active')}>
              <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>Active ({getFilteredJobs('active').length})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, activeTab === 'history' && styles.activeTab]} onPress={() => setActiveTab('history')}>
              <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History</Text>
            </TouchableOpacity>
            {vouchRequests.length > 0 && (
              <TouchableOpacity style={[styles.tab, activeTab === 'requests' && styles.activeTab]} onPress={() => setActiveTab('requests')}>
                <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText, { color: T.colors.error }]}>Reqs ({vouchRequests.length})</Text>
              </TouchableOpacity>
            )}
          </View>

          {activeTab === 'requests' ? (
            <FlatList
              data={vouchRequests}
              keyExtractor={item => item.id.toString()}
              renderItem={renderRequest}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No pending requests.</Text>}
            />
          ) : (
            <FlatList
              data={getFilteredJobs(activeTab)}
              keyExtractor={item => item.id.toString()}
              renderItem={renderJob}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No jobs in this category.</Text>}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.colors.background },
  header: {
    padding: T.spacing.xl,
    backgroundColor: T.colors.primary,
    borderBottomLeftRadius: T.radius.large,
    borderBottomRightRadius: T.radius.large,
  },
  title: { ...T.typography.heading, color: '#FFF' },
  subtitle: { ...T.typography.body, color: '#FFF', opacity: 0.9 },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: T.colors.border,
  },
  tab: { flex: 1, paddingVertical: T.spacing.md, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: T.colors.primary },
  tabText: { ...T.typography.subheading, color: T.colors.textSecondary },
  activeTabText: { color: T.colors.primary, fontWeight: 'bold' },
  listContainer: { padding: T.spacing.md },
  jobCard: {
    backgroundColor: T.colors.surface,
    padding: T.spacing.lg,
    borderRadius: T.radius.medium,
    marginBottom: T.spacing.md,
    ...T.shadows.card,
  },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: T.spacing.xs },
  customerName: { ...T.typography.subheading },
  badge: { backgroundColor: T.colors.background, paddingHorizontal: T.spacing.sm, paddingVertical: 2, borderRadius: T.radius.small },
  badgeText: { ...T.typography.caption },
  jobDate: { ...T.typography.body, color: T.colors.textSecondary, marginBottom: T.spacing.xs },
  jobDesc: { ...T.typography.body, color: T.colors.text, marginBottom: T.spacing.sm, fontStyle: 'italic' },
  jobCharges: { ...T.typography.label, color: T.colors.primary, marginTop: T.spacing.sm },
  
  // New Styles for Unverified UI
  unverifiedContainer: {
    flex: 1,
    padding: T.spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unverifiedTitle: {
    ...T.typography.heading,
    color: T.colors.error,
    marginBottom: T.spacing.sm,
    textAlign: 'center'
  },
  unverifiedDesc: {
    ...T.typography.body,
    textAlign: 'center',
    marginBottom: T.spacing.xl,
    color: T.colors.textSecondary,
    paddingHorizontal: T.spacing.md
  },
  input: {
    width: '100%',
    backgroundColor: T.colors.surface,
    borderWidth: 1,
    borderColor: T.colors.border,
    borderRadius: T.radius.medium,
    padding: T.spacing.md,
    marginBottom: T.spacing.lg,
    fontSize: 16
  },
  button: {
    width: '100%',
    backgroundColor: T.colors.primary,
    padding: T.spacing.md,
    borderRadius: T.radius.medium,
    alignItems: 'center'
  },
  buttonText: {
    ...T.typography.subheading,
    color: '#FFF'
  }
});
