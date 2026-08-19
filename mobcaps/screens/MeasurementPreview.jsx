import React, { useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, Check } from 'lucide-react-native';
import { fetchAPI } from '../services/apiConfig';
import { sessionService } from '../services/sessionService';

const measurementFields = [
  { key: 'shoulderWidth', label: 'Shoulder Width' },
  { key: 'chest', label: 'Chest' },
  { key: 'waist', label: 'Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'armLength', label: 'Arm Length' },
  { key: 'inseam', label: 'Inseam' },
  { key: 'torsoLength', label: 'Torso Length' },
  { key: 'neck', label: 'Neck' },
];

const validNumber = (value) => typeof value === 'number' && Number.isFinite(value);

export default function MeasurementPreview({ navigation, route }) {
  const height = Number(route?.params?.height);
  const measurements = route?.params?.measurements && typeof route.params.measurements === 'object'
    ? route.params.measurements
    : {};
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const visibleMeasurements = measurementFields.filter(({ key }) => validNumber(measurements[key]));

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setError('');
    setMessage('Saving your measurements...');

    try {
      const session = await sessionService.getSession();
      const customerId = session?.userId;
      if (!customerId) {
        setMessage('');
        setError('We could not find your customer session. Please sign in again and retry.');
        return;
      }

      const numericMeasurements = {};
      measurementFields.forEach(({ key }) => {
        if (validNumber(measurements[key])) numericMeasurements[key] = measurements[key];
      });

      const response = await fetchAPI('/body-measurement/save', {
        method: 'POST',
        headers: session?.token ? { Authorization: `Bearer ${session.token}` } : undefined,
        body: JSON.stringify({
          customerId,
          measurements: { height, ...numericMeasurements },
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.success !== true) {
        throw new Error('The measurements could not be saved.');
      }

      setMessage('Measurements saved successfully.');
      await new Promise((resolve) => setTimeout(resolve, 700));
      navigation.navigate('Profile', { measurementsSavedAt: Date.now() });
    } catch (saveError) {
      console.error('Body measurement save failed:', saveError);
      setError('We could not save your measurements. Check your connection and try again.');
      setMessage('');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} disabled={isSaving}>
          <ArrowLeft size={22} color="#333" />
          <Text style={styles.backText}>Back to Camera</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Review Your Measurements</Text>
        <Text style={styles.subtitle}>Check the AI estimate before saving it to your FabriQ profile.</Text>

        <View style={styles.measurementsGrid}>
          <MeasurementItem label="Height" value={height} />
          {visibleMeasurements.map(({ key, label }) => (
            <MeasurementItem key={key} label={label} value={measurements[key]} />
          ))}
        </View>

        {visibleMeasurements.length !== measurementFields.length ? (
          <Text style={styles.unavailable}>Some measurements were unavailable and were left out of the save.</Text>
        ) : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color="#fff" /> : <Check size={18} color="#fff" />}
          <Text style={styles.saveText}>{isSaving ? 'Saving...' : 'Save to Profile'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.retakeButton} onPress={() => navigation.navigate('MeasurementCamera', { height })} disabled={isSaving}>
          <Text style={styles.retakeText}>Retake Photo</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function MeasurementItem({ label, value }) {
  return (
    <View style={styles.measurementItem}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{validNumber(value) ? `${value} cm` : 'Unavailable'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F0' },
  content: { padding: 24, paddingBottom: 40 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, marginBottom: 28 },
  backText: { color: '#6B5D4F', fontSize: 14 },
  title: { color: '#333', fontSize: 28, fontWeight: '600', marginBottom: 10 },
  subtitle: { color: '#6B5D4F', fontSize: 15, lineHeight: 22, marginBottom: 28 },
  measurementsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  measurementItem: { width: '48%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8DCC8', borderRadius: 10, padding: 14 },
  label: { color: '#6B5D4F', fontSize: 12, marginBottom: 8 },
  value: { color: '#333', fontSize: 18, fontWeight: '600' },
  unavailable: { color: '#6B5D4F', fontSize: 13, lineHeight: 18, marginTop: 18 },
  success: { color: '#16794D', fontSize: 14, textAlign: 'center', marginTop: 18 },
  error: { color: '#B42318', fontSize: 14, textAlign: 'center', lineHeight: 19, marginTop: 18 },
  saveButton: { backgroundColor: '#000', borderRadius: 24, paddingVertical: 15, marginTop: 28, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  retakeButton: { alignItems: 'center', paddingVertical: 16 },
  retakeText: { color: '#6B5D4F', fontSize: 14, fontWeight: '600' },
});
