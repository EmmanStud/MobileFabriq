import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ruler } from 'lucide-react-native';

export default function MeasurementHeightInput({ navigation }) {
  const [height, setHeight] = useState('');
  const [error, setError] = useState('');

  const handleContinue = () => {
    const trimmedHeight = height.trim();
    const numericHeight = Number(trimmedHeight);

    if (!trimmedHeight || !Number.isFinite(numericHeight)) {
      setError('Enter your height using numbers only.');
      return;
    }

    if (numericHeight < 100 || numericHeight > 250) {
      setError('Enter a height between 100 and 250 cm.');
      return;
    }

    setError('');
    navigation.navigate('MeasurementCamera', { height: numericHeight });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.iconCircle}>
            <Ruler size={28} color="#6B5D4F" />
          </View>
          <Text style={styles.title}>Digital Body Measurement</Text>
          <Text style={styles.description}>
            Your height helps our measurement service estimate body proportions more accurately.
            Enter it in centimetres to begin.
          </Text>

          <Text style={styles.label}>Height</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={(value) => {
                setHeight(value);
                if (error) setError('');
              }}
              placeholder="e.g. 170"
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              maxLength={3}
            />
            <Text style={styles.unit}>cm</Text>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Continue to Camera</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F0' },
  content: { flex: 1, justifyContent: 'space-between', padding: 24 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 28 },
  backText: { color: '#6B5D4F', fontSize: 14 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8DCC8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { color: '#333', fontSize: 28, fontWeight: '600', marginBottom: 12 },
  description: { color: '#6B5D4F', fontSize: 15, lineHeight: 23, marginBottom: 36 },
  label: { color: '#6B5D4F', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8DCC8',
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  input: { flex: 1, color: '#333', fontSize: 18, paddingVertical: 14 },
  unit: { color: '#6B5D4F', fontSize: 16 },
  error: { color: '#B42318', fontSize: 13, marginTop: 8 },
  button: {
    backgroundColor: '#000',
    borderRadius: 24,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
