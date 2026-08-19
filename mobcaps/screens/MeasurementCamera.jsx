import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ArrowLeft, Camera, RefreshCw } from 'lucide-react-native';
import { fetchAPI } from '../services/apiConfig';
import { sessionService } from '../services/sessionService';

export default function MeasurementCamera({ navigation, route }) {
  const height = route?.params?.height;
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('front');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [message, setMessage] = useState('');
  const [invalidReason, setInvalidReason] = useState('');

  useEffect(() => {
    if (!Number.isFinite(Number(height))) {
      navigation.replace('MeasurementHeightInput');
    }
  }, [height, navigation]);

  const handleCapture = async () => {
    if (isAnalyzing || !cameraRef.current) return;

    setIsAnalyzing(true);
    setMessage('Analyzing your photo...');
    setInvalidReason('');

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: true });
      if (!photo?.base64) {
        throw new Error('The camera did not return an image.');
      }

      const session = await sessionService.getSession();
      const response = await fetchAPI('/body-measurement/analyze', {
        method: 'POST',
        headers: session?.token ? { Authorization: `Bearer ${session.token}` } : undefined,
        body: JSON.stringify({
          image: photo.base64,
          mimeType: photo.mimeType || 'image/jpeg',
          height: Number(height),
        }),
      });
      const data = await response.json().catch(() => null);
      const analysis = data?.analysis;

      if (!response.ok || data?.success !== true) {
        throw new Error('The measurement service could not analyze this photo.');
      }

      if (!analysis || analysis.imageSuitable !== true) {
        setInvalidReason(analysis?.reason || 'Please retake the photo with your full body clearly visible.');
        setMessage('This photo cannot be measured yet.');
        return;
      }

      if (!analysis.measurements || typeof analysis.measurements !== 'object') {
        throw new Error('The measurement service returned an incomplete result.');
      }

      navigation.navigate('MeasurementPreview', {
        height: Number(height),
        measurements: analysis.measurements,
      });
    } catch (error) {
      console.error('Body measurement analysis failed:', error);
      setMessage('We could not analyze that photo. Check your connection and try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!permission) {
    return <View style={styles.centered}><ActivityIndicator color="#D4AF37" /></View>;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionScreen}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={22} color="#333" />
        </TouchableOpacity>
        <View style={styles.permissionContent}>
          <Camera size={42} color="#6B5D4F" />
          <Text style={styles.title}>Camera access is needed</Text>
          <Text style={styles.body}>Allow camera access so we can capture a full-body photo for measurement.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryText}>Allow Camera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.cameraScreen}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing={facing} />
      <SafeAreaView style={styles.overlay}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton} disabled={isAnalyzing}>
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.cameraTitle}>Position yourself</Text>
          <TouchableOpacity onPress={() => setFacing((current) => current === 'front' ? 'back' : 'front')} style={styles.iconButton} disabled={isAnalyzing}>
            <RefreshCw size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>Full body in frame</Text>
          <Text style={styles.instructionText}>
            Stand upright and face the camera. Keep your arms and legs visible, remove anything blocking your body,
            use good lighting, and make sure only one person is visible. Stand far enough away for your entire body to fit.
          </Text>
        </View>

        <View style={styles.bottomControls}>
          {message ? <Text style={styles.status}>{message}</Text> : null}
          {invalidReason ? <Text style={styles.invalidReason}>{invalidReason}</Text> : null}
          {isAnalyzing ? (
            <View style={styles.loadingButton}>
              <ActivityIndicator color="#D4AF37" />
              <Text style={styles.loadingText}>Analyzing your photo...</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
              <View style={styles.captureInner}><Camera size={24} color="#000" /></View>
              <Text style={styles.captureLabel}>{invalidReason ? 'Retake Photo' : 'Capture Photo'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  cameraScreen: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: 'rgba(0,0,0,0.42)' },
  iconButton: { width: 42, height: 42, justifyContent: 'center', alignItems: 'center' },
  cameraTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  instructions: { alignSelf: 'center', width: '84%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', borderRadius: 18, padding: 18, backgroundColor: 'rgba(0,0,0,0.28)' },
  instructionTitle: { color: '#D4AF37', fontSize: 16, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  instructionText: { color: '#fff', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  bottomControls: { padding: 20, paddingBottom: 28, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center' },
  status: { color: '#fff', textAlign: 'center', fontSize: 14, marginBottom: 8 },
  invalidReason: { color: '#FFD6D2', textAlign: 'center', fontSize: 13, lineHeight: 18, marginBottom: 10 },
  captureButton: { alignItems: 'center' },
  captureInner: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#D4AF37', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#fff' },
  captureLabel: { color: '#fff', marginTop: 8, fontSize: 13 },
  loadingButton: { alignItems: 'center', paddingVertical: 12 },
  loadingText: { color: '#fff', marginTop: 8, fontSize: 14 },
  centered: { flex: 1, backgroundColor: '#FAF7F0', justifyContent: 'center', alignItems: 'center' },
  permissionScreen: { flex: 1, backgroundColor: '#FAF7F0', padding: 16 },
  backButton: { width: 42, height: 42, justifyContent: 'center' },
  permissionContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { color: '#333', fontSize: 24, fontWeight: '600', textAlign: 'center', marginTop: 18, marginBottom: 12 },
  body: { color: '#6B5D4F', fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 28 },
  primaryButton: { backgroundColor: '#000', borderRadius: 24, paddingVertical: 14, paddingHorizontal: 30 },
  primaryText: { color: '#fff', fontWeight: '600' },
});
