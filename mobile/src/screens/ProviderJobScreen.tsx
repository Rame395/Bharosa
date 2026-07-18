import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Linking, Platform } from 'react-native';
import { T } from '../designSystem';
import { apiFetch } from '../api';
import { MapView, Marker } from '../components/Map';

export const ProviderJobScreen = ({ route, navigation }: any) => {
  const { jobId } = route.params;
  const [job, setJob] = useState<any>(null);
  const [chargeDesc, setChargeDesc] = useState('');
  const [chargeAmt, setChargeAmt] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJob();
  }, []);

  const fetchJob = async () => {
    try {
      const data = await apiFetch(`/jobs/${jobId}`);
      setJob(data);
    } catch (err) {
      Alert.alert('Error', 'Failed to fetch job');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      await apiFetch(`/jobs/${jobId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      fetchJob();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const addCharge = async () => {
    if (!chargeDesc || !chargeAmt) return Alert.alert('Error', 'Please fill both fields');
    try {
      await apiFetch(`/jobs/${jobId}/charges`, {
        method: 'POST',
        body: JSON.stringify({ description: chargeDesc, amount: Number(chargeAmt) })
      });
      setChargeDesc('');
      setChargeAmt('');
      fetchJob();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  if (loading || !job) return <View style={styles.container}><Text>Loading...</Text></View>;

  const totalCharges = job.charges?.reduce((sum: number, c: any) => sum + Number(c.amount), 0) || 0;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.title}>Job #{job.id}</Text>
            <Text style={styles.status}>Status: {job.status.replace('_', ' ').toUpperCase()}</Text>
          </View>
          <TouchableOpacity style={styles.chatButton} onPress={() => navigation.navigate('Chat', { jobId, otherPartyName: `Customer ${job.customer_id.substring(0,8)}` })}>
            <Text style={styles.chatButtonText}>💬 Chat</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.desc}>"{job.description || 'No description provided'}"</Text>

        {job.latitude && job.longitude && (
          <View style={styles.mapContainer}>
            <Text style={styles.mapTitle}>Customer Location</Text>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: Number(job.latitude),
                longitude: Number(job.longitude),
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker coordinate={{ latitude: Number(job.latitude), longitude: Number(job.longitude) }} />
            </MapView>
            <TouchableOpacity 
              style={styles.directionsBtn}
              onPress={() => Linking.openURL(`google.navigation:q=${job.latitude},${job.longitude}`)}
            >
              <Text style={styles.directionsBtnText}>🗺️ Get Directions</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Advance Job Status</Text>
        <View style={styles.row}>
          {['diagnosing', 'quoted', 'in_progress', 'completed', 'cancelled'].map(status => (
            <TouchableOpacity key={status} style={styles.statusBtn} onPress={() => updateStatus(status)}>
              <Text style={styles.statusText}>{status.replace('_', ' ')}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Charges & Estimates (Total: Rs. {totalCharges})</Text>
        {job.charges?.map((c: any) => (
          <View key={c.id} style={styles.chargeRow}>
            <Text style={styles.chargeDesc}>{c.description} {c.customer_approved_at ? '✅ (Approved)' : '⏳ (Pending)'}</Text>
            <Text style={styles.chargeAmt}>Rs. {c.amount}</Text>
          </View>
        ))}
        
        <View style={styles.addChargeContainer}>
          <TextInput style={styles.input} placeholder="Description (e.g. Spare pipe)" value={chargeDesc} onChangeText={setChargeDesc} />
          <TextInput style={styles.input} placeholder="Amount (Rs)" value={chargeAmt} onChangeText={setChargeAmt} keyboardType="number-pad" />
          <TouchableOpacity style={styles.button} onPress={addCharge}>
            <Text style={styles.buttonText}>Add Charge</Text>
          </TouchableOpacity>
        </View>
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.colors.background },
  header: { padding: T.spacing.xl, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: T.colors.border },
  title: { ...T.typography.heading },
  status: { ...T.typography.subheading, color: T.colors.primary, marginVertical: T.spacing.sm },
  desc: { ...T.typography.body, fontStyle: 'italic', color: T.colors.textSecondary },
  chatButton: { backgroundColor: T.colors.secondary, padding: 10, borderRadius: 8 },
  chatButtonText: { color: '#000', fontWeight: 'bold' },
  mapContainer: { marginTop: 16 },
  mapTitle: { fontWeight: 'bold', marginBottom: 8 },
  map: { height: 150, width: '100%', borderRadius: 8 },
  directionsBtn: { backgroundColor: T.colors.success, padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  directionsBtnText: { color: '#FFF', fontWeight: 'bold' },
  section: { padding: T.spacing.lg },
  sectionTitle: { ...T.typography.subheading, marginBottom: T.spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statusBtn: { backgroundColor: T.colors.surface, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: T.colors.border },
  statusText: { color: T.colors.text, textTransform: 'capitalize' },
  chargeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.colors.border },
  chargeDesc: { flex: 1, ...T.typography.body },
  chargeAmt: { fontWeight: 'bold' },
  addChargeContainer: { marginTop: 20, gap: 10 },
  input: { backgroundColor: '#FFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: T.colors.border },
  button: { backgroundColor: T.colors.primary, padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: 'bold' }
});
