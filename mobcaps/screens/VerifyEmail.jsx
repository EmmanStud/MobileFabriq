import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { API_URL } from '../services/apiConfig';

export default function VerifyEmail({ navigation, route }) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const email = route?.params?.email || '';

  useEffect(() => {
    console.log('Verification screen mounted');
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) return undefined;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleVerify = async () => {
    setError('');
    setMessage('');
    const trimmedCode = (code || '').trim();
    if (!email) {
      setError('Missing email. Please sign up again.');
      return;
    }
    if (!/^\d{6}$/.test(trimmedCode)) {
      setError('Please enter a valid 6-digit code.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/verify-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: trimmedCode }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || data.message || 'Verification failed');
        return;
      }

      setMessage('Email verified successfully. You can now sign in.');
      setTimeout(() => {
        navigation.navigate('Home', { openAuth: true });
      }, 800);
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setMessage('');
    if (!email) {
      setError('Missing email. Please sign up again.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || data.message || 'Failed to resend code');
        return;
      }
      setMessage('Verification code sent. Please check your email.');
      setTimeLeft(60);
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Verify Email</Text>
        <Text style={styles.subtitle}>Enter the 6-digit code sent to {email || 'your email'}.</Text>

        <TextInput
          style={styles.input}
          value={code}
          onChangeText={(val) => setCode((val || '').replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          keyboardType="number-pad"
          maxLength={6}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!message && <Text style={styles.message}>{message}</Text>}

        <TouchableOpacity style={[styles.button, isLoading && styles.buttonDisabled]} onPress={handleVerify} disabled={isLoading}>
          <Text style={styles.buttonText}>{isLoading ? 'Please wait...' : 'Verify'}</Text>
        </TouchableOpacity>
        {timeLeft > 0 ? (
          <View style={styles.resendRow}>
            <Text style={styles.resendTimerText}>Resend code in {timeLeft}s</Text>
          </View>
        ) : (
          <TouchableOpacity style={[styles.secondaryButton, isLoading && styles.buttonDisabled]} onPress={handleResend} disabled={isLoading}>
            <Text style={styles.secondaryButtonText}>Resend Code</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F0', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E8DCC8', padding: 20 },
  title: { fontSize: 28, color: '#1a1a1a', fontFamily: 'serif', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#6B5D4F', marginBottom: 16, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#D1CDC7', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, textAlign: 'center', letterSpacing: 4, backgroundColor: '#fff', color: '#1a1a1a' },
  button: { marginTop: 14, backgroundColor: '#1a1a1a', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', textTransform: 'uppercase', fontSize: 13 },
  secondaryButton: { marginTop: 10, borderWidth: 1, borderColor: '#1a1a1a', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  secondaryButtonText: { color: '#1a1a1a', fontWeight: '700', textTransform: 'uppercase', fontSize: 12 },
  buttonDisabled: { opacity: 0.6 },
  resendRow: { marginTop: 14, alignItems: 'center' },
  resendTimerText: { fontSize: 11, color: '#9B8F85', letterSpacing: 0.3 },
  error: { marginTop: 10, color: '#dc2626', fontSize: 12, textAlign: 'center' },
  message: { marginTop: 10, color: '#16a34a', fontSize: 12, textAlign: 'center' },
});
