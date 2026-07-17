import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { T } from '../designSystem';
import { apiFetch } from '../api';
import { useIsFocused } from '@react-navigation/native';

export const ProviderDashboard = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
      <TouchableOpacity style={styles.jobCard}>
        <View style={styles.jobHeader}>
          <Text style={styles.customerName}>Customer ID: {item.customer_id.substring(0, 8)}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.status.replace('_', ' ').toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.jobDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
        {totalCharges > 0 && (
          <Text style={styles.jobCharges}>Total Quoted: Rs. {totalCharges}</Text>
        )}
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>Manage Job / Add Charge</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Provider Portal</Text>
        <Text style={styles.subtitle}>Manage your assigned jobs</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: T.spacing.xl }} size="large" color={T.colors.primary} />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={item => item.id.toString()}
          renderItem={renderJob}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No jobs found.</Text>}
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
    marginBottom: T.spacing.sm,
  },
  jobCharges: {
    ...T.typography.label,
    color: T.colors.primary,
    marginBottom: T.spacing.md,
  },
  actionButton: {
    backgroundColor: T.colors.primary,
    padding: T.spacing.md,
    borderRadius: T.radius.medium,
    alignItems: 'center',
    marginTop: T.spacing.sm,
  },
  actionText: {
    color: '#FFF',
    ...T.typography.label,
  }
});
