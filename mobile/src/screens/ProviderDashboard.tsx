import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { T } from '../designSystem';
import { apiFetch } from '../api';
import { RootStackParamList } from '../navigation/AppNavigator';

type ProviderNavProp = NativeStackNavigationProp<RootStackParamList, 'ProviderDashboard'>;

export const ProviderDashboard = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<ProviderNavProp>();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      fetchJobs();
    }
  }, [isFocused]);

  const fetchJobs = async () => {
    try {
      const data = await apiFetch('/provider/jobs');
      setJobs(data);
    } catch (err) {
      // Handled
    } finally {
      setLoading(false);
    }
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

  const getFilteredJobs = (statusGroup: string) => {
    if (statusGroup === 'new') return jobs.filter(j => j.status === 'requested');
    if (statusGroup === 'active') return jobs.filter(j => !['requested', 'completed', 'cancelled'].includes(j.status));
    if (statusGroup === 'history') return jobs.filter(j => ['completed', 'cancelled'].includes(j.status));
    return [];
  };

  const [activeTab, setActiveTab] = useState<'new'|'active'|'history'>('new');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Provider Portal</Text>
        <Text style={styles.subtitle}>Manage your assigned jobs</Text>
      </View>

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
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: T.spacing.xl }} size="large" color={T.colors.primary} />
      ) : (
        <FlatList
          data={getFilteredJobs(activeTab)}
          keyExtractor={item => item.id.toString()}
          renderItem={renderJob}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No jobs in this category.</Text>}
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
  title: {
    ...T.typography.heading,
    color: '#FFF',
  },
  subtitle: {
    ...T.typography.body,
    color: '#FFF',
    opacity: 0.9,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: T.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: T.spacing.md,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: T.colors.primary,
  },
  tabText: {
    ...T.typography.subheading,
    color: T.colors.textSecondary,
  },
  activeTabText: {
    color: T.colors.primary,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: T.spacing.md,
  },
  jobCard: {
    backgroundColor: T.colors.surface,
    padding: T.spacing.lg,
    borderRadius: T.radius.medium,
    marginBottom: T.spacing.md,
    ...T.shadows.card,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: T.spacing.xs,
  },
  customerName: {
    ...T.typography.subheading,
  },
  badge: {
    backgroundColor: T.colors.background,
    paddingHorizontal: T.spacing.sm,
    paddingVertical: 2,
    borderRadius: T.radius.small,
  },
  badgeText: {
    ...T.typography.caption,
  },
  jobDate: {
    ...T.typography.body,
    color: T.colors.textSecondary,
    marginBottom: T.spacing.xs,
  },
  jobDesc: {
    ...T.typography.body,
    color: T.colors.text,
    marginBottom: T.spacing.sm,
    fontStyle: 'italic',
  },
  jobCharges: {
    ...T.typography.label,
    color: T.colors.primary,
    marginTop: T.spacing.sm,
  },
});
