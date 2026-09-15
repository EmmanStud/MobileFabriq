import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Path, Ellipse } from 'react-native-svg';
import { ArrowLeft, Camera, RefreshCw } from 'lucide-react-native';
import { fetchAPI } from '../services/apiConfig';
import { sessionService } from '../services/sessionService';
import { useChatVisibility } from '../contexts/ChatVisibilityContext';

export default function MeasurementCamera({ navigation, route }) {
  const { setChatHidden } = useChatVisibility();
  const height = route?.params?.height;
  const cameraRef = useRef(null);
  const countdownRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('front');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [message, setMessage] = useState('');
  const [invalidReason, setInvalidReason] = useState('');
  const [countdown, setCountdown] = useState(null);
  const [timerDuration, setTimerDuration] = useState(0); // 0 = Instant (default), 5, or 10 seconds
  const [timerMenuOpen, setTimerMenuOpen] = useState(false);

  useEffect(() => {
    setChatHidden(true);
    return () => setChatHidden(false);
  }, [setChatHidden]);

  useEffect(() => {
    if (!Number.isFinite(Number(height))) {
      navigation.replace('MeasurementHeightInput');
    }
  }, [height, navigation]);

  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
        warningTimeoutRef.current = null;
      }
    };
  }, []);

  const startCountdown = () => {
    if (isAnalyzing || countdown !== null) return;

    if (timerDuration === 0) {
      handleCapture();
      return;
    }

    let secondsLeft = timerDuration;
    setCountdown(secondsLeft);
    countdownRef.current = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
        setCountdown(null);
        handleCapture();
      } else {
        setCountdown(secondsLeft);
      }
    }, 1000);
  };

  const timerOptions = [
    { label: 'Instant', value: 0 },
    { label: '5s', value: 5 },
    { label: '10s', value: 10 },
  ];

  const cancelCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(null);
  };

  const handleCapture = async () => {
    if (isAnalyzing || !cameraRef.current) return;

    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }

    setIsAnalyzing(true);
    setMessage('Analyzing your photo... this can take up to 30 seconds');
    setInvalidReason('');

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: true });
      if (!photo?.base64) {
        throw new Error('The camera did not return an image.');
      }

      const session = await sessionService.getSession();
      if (!session?.token) {
        throw new Error('Please sign in before using body measurements.');
      }
      const response = await fetchAPI('/body-measurement/analyze', {
        method: 'POST',
        timeout: 45000,
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
        throw new Error(data?.message || data?.error || `Measurement service error (${response.status})`);
      }

      if (!analysis || analysis.imageSuitable !== true) {
        setInvalidReason(analysis?.reason || 'Please retake the photo with your full body clearly visible.');
        setMessage('This photo cannot be measured yet.');
        warningTimeoutRef.current = setTimeout(() => {
          setInvalidReason('');
          setMessage('');
          warningTimeoutRef.current = null;
        }, 5000);
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
      {!isAnalyzing && (
        <View style={styles.guideOverlay} pointerEvents="none">
          <Svg width="220" height="480" viewBox="0 0 220 480">
            <Ellipse cx="110" cy="45" rx="32" ry="38" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeDasharray="6,6" fill="none" />
            <Path
              d="M 78 90 Q 60 130 55 180 L 45 300 L 60 460 L 90 460 L 95 320 L 110 320 L 125 320 L 130 460 L 160 460 L 175 300 L 165 180 Q 160 130 142 90 Q 110 105 78 90 Z"
              stroke="rgba(255,255,255,0.55)"
              strokeWidth="2"
              strokeDasharray="6,6"
              fill="none"
            />
          </Svg>
        </View>
      )}
      {timerMenuOpen && countdown === null && (
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => setTimerMenuOpen(false)}
        />
      )}
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
          {message && !isAnalyzing ? <Text style={styles.status}>{message}</Text> : null}
          {invalidReason ? <Text style={styles.invalidReason}>{invalidReason}</Text> : null}
          {isAnalyzing ? (
            <View style={styles.loadingButton}>
              <ActivityIndicator color="#D4AF37" />
              <Text style={styles.loadingText}>Analyzing your photo... this can take up to 30 seconds</Text>
            </View>
          ) : (
            <View style={styles.captureRow}>
              <TouchableOpacity style={styles.captureButton} onPress={startCountdown} disabled={countdown !== null}>
                <View style={styles.captureInner}><Camera size={24} color="#000" /></View>
                <Text style={styles.captureLabel}>{invalidReason ? 'Retake Photo' : 'Capture Photo'}</Text>
              </TouchableOpacity>

              <View style={styles.timerDropdownWrap}>
                {timerMenuOpen && (
                  <View style={styles.timerMenu}>
                    {timerOptions.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.timerMenuItem, timerDuration === opt.value && styles.timerMenuItemActive]}
                        onPress={() => {
                          setTimerDuration(opt.value);
                          setTimerMenuOpen(false);
                        }}
                      >
                        <Text style={[styles.timerMenuItemText, timerDuration === opt.value && styles.timerMenuItemTextActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <TouchableOpacity
                  style={styles.timerDropdownButton}
                  disabled={countdown !== null}
                  onPress={() => setTimerMenuOpen((open) => !open)}
                >
                  <Text style={styles.timerDropdownText}>
                    {timerOptions.find((o) => o.value === timerDuration)?.label} ⌄
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
      {countdown !== null && (
        <TouchableOpacity style={styles.countdownOverlay} onPress={cancelCountdown} activeOpacity={0.8}>
          <Text style={styles.countdownNumber}>{countdown}</Text>
          <Text style={styles.countdownHint}>Tap to cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cameraScreen: { flex: 1, backgroundColor: '#000' },
  guideOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  countdownNumber: { color: '#D4AF37', fontSize: 96, fontWeight: '700' },
  countdownHint: { color: '#fff', fontSize: 14, marginTop: 8 },
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
  captureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  timerDropdownWrap: { position: 'relative' },
  timerDropdownButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  timerDropdownText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  timerMenu: { position: 'absolute', bottom: '115%', right: 0, backgroundColor: '#1a1a1a', borderRadius: 10, paddingVertical: 4, minWidth: 90, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  timerMenuItem: { paddingVertical: 10, paddingHorizontal: 14 },
  timerMenuItemActive: { backgroundColor: 'rgba(212,175,55,0.2)' },
  timerMenuItemText: { color: '#fff', fontSize: 13 },
  timerMenuItemTextActive: { color: '#D4AF37', fontWeight: '700' },
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
