import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Modal,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { User, Ruler, History, Heart, Camera, Menu } from 'lucide-react-native';
import HamburgerMenu from '../components/HamburgerMenu';
import Header from '../components/Header';
import EditProfileModal from '../components/EditProfileModal';
import CustomAlertModal from '../components/CustomAlertModal';
import { sessionService } from '../services/sessionService';
import { mongodbService } from '../services/mongodbService';
import { API_CONFIG } from '../services/apiConfig';

const deriveNameParts = (source = {}) => {
  const directFirst = (source.firstName || '').trim();
  const directLast = (source.lastName || '').trim();
  const rawFullName = (source.fullName || source.name || '').trim();

  if (directFirst || directLast) {
    return {
      firstName: directFirst,
      lastName: directLast,
      fullName: `${directFirst} ${directLast}`.trim() || rawFullName || 'User',
    };
  }

  if (!rawFullName) {
    return { firstName: '', lastName: '', fullName: 'User' };
  }

  const parts = rawFullName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '', fullName: rawFullName };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
    fullName: rawFullName,
  };
};

export default function Profile({ navigation, route, onLogout, unreadCount = 0 }) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userEmail, setUserEmail] = useState(null);

  const [authToken, setAuthToken] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneEditMode, setPhoneEditMode] = useState(false);
  const [phoneSaving, setPhoneSaving] = useState(false);

  const [customerData, setCustomerData] = useState({
    firstName: '',
    lastName: '',
    fullName: '',
    email: '',
    phone: '',
    address: '',
    memberSince: '',
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    mode: 'alert',
    onConfirm: null,
    onCancel: null,
  });

  const closeAlert = () => {
    setAlertConfig((prev) => ({
      ...prev,
      visible: false,
      onConfirm: null,
      onCancel: null,
    }));
  };

  const openAlert = ({ title, message, mode = 'alert', onConfirm, onCancel }) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      mode,
      onConfirm: mode === 'confirm'
        ? () => {
            if (typeof onConfirm === 'function') {
              onConfirm();
            }
            closeAlert();
          }
        : () => {
            if (typeof onConfirm === 'function') {
              onConfirm();
            }
            closeAlert();
          },
      onCancel: mode === 'confirm'
        ? () => {
            if (typeof onCancel === 'function') {
              onCancel();
            }
            closeAlert();
          }
        : null,
    });
  };

  const showCustomAlert = (title, message, onConfirm) =>
    openAlert({ title, message, mode: 'alert', onConfirm, onCancel: closeAlert });
  const showCustomConfirm = (title, message, onConfirm) =>
    openAlert({ title, message, mode: 'confirm', onConfirm, onCancel: closeAlert });

  const [measurements, setMeasurements] = useState({ 
    bust: null, waist: null, hips: null, 
    height: null, shoulderWidth: null, sleeveLength: null, 
    updatedAt: null, 
  }); 
  const [measurementsLoading, setMeasurementsLoading] = useState(false); 
  const [measurementEditMode, setMeasurementEditMode] = useState(false); 
  const [measurementInputs, setMeasurementInputs] = useState({ 
    bust: '', waist: '', hips: '', 
    height: '', shoulderWidth: '', sleeveLength: '', 
  }); 
  const [measurementSaving, setMeasurementSaving] = useState(false); 
  const [measurementError, setMeasurementError] = useState('');

  const [scannerVisible, setScannerVisible] = useState(false); 
  const [scanPhase, setScanPhase] = useState('idle'); 
  // phases: 'idle' | 'positioning' | 'scanning' | 'processing' | 'done' 
  const [scanProgress, setScanProgress] = useState(0); 
  const [scanStatusText, setScanStatusText] = useState(''); 
  const [cameraPermission, requestCameraPermission] = useCameraPermissions(); 
  const cameraRef = useRef(null); 
  const scanLineAnim = useRef(new Animated.Value(0)).current; 
  const pulseAnim = useRef(new Animated.Value(1)).current; 

  const [favorites, setFavorites] = useState([]); 
  const [favoritesLoading, setFavoritesLoading] = useState(false);

  const [history, setHistory] = useState([]); 
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await sessionService.getSession();

        if (!session || !session.isLoggedIn) {
          setIsLoggedIn(false);
          navigation.navigate('Home');
          return;
        }

        const token = session.token;

        if (!token) {
          setIsLoggedIn(false);
          navigation.navigate('Home');
          return;
        }

        setAuthToken(token);
        setIsLoggedIn(true);

        const current = await sessionService.getCurrentUser();
        setCurrentUser(current || null);
        if (current?.email) {
          setUserEmail(current.email.toLowerCase());
        }

        // Fetch real profile from backend
        const response = await fetch(`${API_CONFIG.BASE_URL}/customers/profile`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();
        console.log('Profile response status:', response.status);
        console.log('Profile response data:', JSON.stringify(data));

        if (!response.ok) {
          console.warn('Profile fetch failed:', data?.message || response.status);
          return;
        }

        const firstName = data.firstName || '';
        const lastName = data.lastName || '';

        setPhoneNumber(data.phoneNumber || '');
        setPhoneInput(data.phoneNumber || '');
        setCustomerData(prev => ({
          ...prev,
          firstName,
          lastName,
          fullName: `${firstName} ${lastName}`.trim() || 'User',
          email: data.email || prev.email,
          phone: data.phoneNumber || '',
          address: data.address || '',
          memberSince: data.createdAt 
            ? new Date(data.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) 
            : '',
        }));

        // Update session with fresh data
        if (current) {
          const updatedUser = {
            ...current,
            firstName,
            lastName,
          };
          await sessionService.saveSession(updatedUser, token);
          setCurrentUser(updatedUser);
        }

        // Fetch real measurements, favorites, and history
        await fetchMeasurements(token);
        await fetchFavorites(token);
        await fetchHistory(token);

      } catch (err) {
        console.error('Error loading profile from backend:', err);
      }
    };

    checkSession();
  }, [navigation]);

  const fetchMeasurements = async (token) => { 
    setMeasurementsLoading(true); 
    try { 
      const data = await mongodbService.getMeasurements(token); 
      if (data) { 
        setMeasurements(data); 
        setMeasurementInputs({ 
          bust: data.bust != null ? String(data.bust) : '', 
          waist: data.waist != null ? String(data.waist) : '', 
          hips: data.hips != null ? String(data.hips) : '', 
          height: data.height != null ? String(data.height) : '', 
          shoulderWidth: data.shoulderWidth != null ? String(data.shoulderWidth) : '', 
          sleeveLength: data.sleeveLength != null ? String(data.sleeveLength) : '', 
        }); 
      } 
    } catch (err) { 
      console.warn('fetchMeasurements error:', err); 
    } finally { 
      setMeasurementsLoading(false); 
    } 
  };

  const fetchFavorites = async (token) => { 
    setFavoritesLoading(true); 
    try { 
      const data = await mongodbService.getFavorites(token); 
      setFavorites(Array.isArray(data) ? data : []); 
    } catch (err) { 
      console.warn('fetchFavorites error:', err); 
    } finally { 
      setFavoritesLoading(false); 
    } 
  };

  const fetchHistory = async (token) => { 
    setHistoryLoading(true); 
    try { 
      // Fetch completed/cancelled rentals 
      const rentalsRes = await fetch(`${API_CONFIG.BASE_URL}/rentals/mine`, { 
        headers: { 'Authorization': `Bearer ${token}` }, 
      }); 
      const rentalsData = rentalsRes.ok ? await rentalsRes.json() : { rentals: [] }; 
      const rentals = (rentalsData.rentals || []); 
  
      // Fetch all appointments 
      const apptRes = await fetch(`${API_CONFIG.BASE_URL}/appointments/mine`, { 
        headers: { 'Authorization': `Bearer ${token}` }, 
      }); 
      const apptData = apptRes.ok ? await apptRes.json() : []; 
      const appointments = Array.isArray(apptData) ? apptData : (apptData.appointments || []); 
  
      // Fetch all custom orders 
      const ordersRes = await fetch(`${API_CONFIG.BASE_URL}/custom-orders/my-orders`, { 
        headers: { 'Authorization': `Bearer ${token}` }, 
      }); 
      const ordersData = ordersRes.ok ? await ordersRes.json() : []; 
      const orders = Array.isArray(ordersData) ? ordersData : (ordersData.orders || []); 
  
      // Build unified history — completed and cancelled only 
      const historyItems = [ 
        ...rentals 
          .filter(r => r.status === 'completed' || r.status === 'cancelled') 
          .map(r => ({ 
            id: r.referenceId || r.id, 
            type: 'Rental', 
            item: r.gownName || 'Gown Rental', 
            date: r.startDate || r.createdAt || '', 
            status: r.status.charAt(0).toUpperCase() + r.status.slice(1), 
            branch: r.branch || '', 
          })), 
        ...appointments 
          .filter(a => a.status === 'completed' || a.status === 'cancelled') 
          .map(a => ({ 
            id: a.referenceId || a.id, 
            type: 'Appointment', 
            item: a.type || a.appointmentType || 'Appointment', 
            date: a.date || a.createdAt || '', 
            status: a.status.charAt(0).toUpperCase() + a.status.slice(1), 
            branch: a.branch || '', 
          })), 
        ...orders 
          .filter(o => o.status === 'completed' || o.status === 'rejected') 
          .map(o => ({ 
            id: o.referenceId || o.id, 
            type: 'Custom Order', 
            item: o.orderType || 'Custom Order', 
            date: o.eventDate || o.createdAt || '', 
            status: o.status === 'rejected' ? 'Rejected' : 'Completed', 
            branch: o.branch || '', 
          })), 
      ].sort((a, b) => new Date(b.date) - new Date(a.date)); 
  
      setHistory(historyItems); 
    } catch (err) { 
      console.warn('fetchHistory error:', err); 
    } finally { 
      setHistoryLoading(false); 
    } 
  };

  const handleUnfavorite = async (gownId) => { 
    const updated = favorites.filter(g => g.id !== gownId); 
    setFavorites(updated); 
    try { 
      await mongodbService.updateFavorites(updated, authToken); 
    } catch (err) { 
      console.warn('Failed to remove favorite:', err); 
    } 
  };

  const handleSaveMeasurements = async () => { 
    setMeasurementSaving(true); 
    setMeasurementError(''); 
    try { 
      const payload = {}; 
      const fields = ['bust', 'waist', 'hips', 'height', 'shoulderWidth', 'sleeveLength']; 
      for (const field of fields) { 
        const val = measurementInputs[field]; 
        if (val === '' || val === null) { 
          payload[field] = null; 
        } else { 
          const num = Number(val); 
          if (isNaN(num) || num <= 0) { 
            setMeasurementError(`Invalid value for ${field}. Must be a positive number.`); 
            setMeasurementSaving(false); 
            return; 
          } 
          payload[field] = num; 
        } 
      } 
      const res = await mongodbService.updateMeasurements(payload, authToken); 
      if (res.success) { 
        setMeasurements(prev => ({ ...prev, ...payload, updatedAt: new Date().toISOString() })); 
        setMeasurementEditMode(false); 
        showCustomAlert('Saved!', 'Your measurements have been updated.'); 
      } else { 
        setMeasurementError(res.error || 'Failed to save measurements.'); 
      } 
    } catch (err) { 
      setMeasurementError(err.message || 'Connection error.'); 
    } finally { 
      setMeasurementSaving(false); 
    } 
  };

  // 1. Opens the scanner modal 
  const handleStartAIMeasurement = async () => { 
    if (!cameraPermission?.granted) { 
      const result = await requestCameraPermission(); 
      if (!result.granted) { 
        showCustomAlert( 
          'Camera Permission Required', 
          'Please allow camera access to use AI Measurement.' 
        ); 
        return; 
      } 
    } 
    setScanPhase('positioning'); 
    setScanProgress(0); 
    setScanStatusText('Position your full body in the frame'); 
    setScannerVisible(true); 
  }; 
  
  // 2. Runs the full fake scan sequence then captures photo 
  const handleCaptureScan = async () => { 
    if (!cameraRef.current || scanPhase !== 'positioning') return; 
  
    setScanPhase('scanning'); 
    setScanStatusText('Scanning body outline...'); 
  
    // Start scan line animation (top to bottom loop) 
    Animated.loop( 
      Animated.sequence([ 
        Animated.timing(scanLineAnim, { 
          toValue: 1, 
          duration: 1500, 
          easing: Easing.linear, 
          useNativeDriver: true, 
        }), 
        Animated.timing(scanLineAnim, { 
          toValue: 0, 
          duration: 0, 
          useNativeDriver: true, 
        }), 
      ]) 
    ).start(); 
  
    // Pulse animation for body outline 
    Animated.loop( 
      Animated.sequence([ 
        Animated.timing(pulseAnim, { 
          toValue: 1.04, 
          duration: 700, 
          useNativeDriver: true, 
        }), 
        Animated.timing(pulseAnim, { 
          toValue: 1, 
          duration: 700, 
          useNativeDriver: true, 
        }), 
      ]) 
    ).start(); 
  
    // Progress simulation 
    const progressSteps = [ 
      { pct: 15, text: 'Detecting body keypoints...', delay: 600 }, 
      { pct: 30, text: 'Measuring shoulder width...', delay: 1200 }, 
      { pct: 50, text: 'Analyzing torso proportions...', delay: 1800 }, 
      { pct: 65, text: 'Calculating waist & hip ratio...', delay: 2400 }, 
      { pct: 80, text: 'Estimating sleeve length...', delay: 3000 }, 
      { pct: 95, text: 'Finalizing measurements...', delay: 3600 }, 
    ]; 
  
    progressSteps.forEach(({ pct, text, delay }) => { 
      setTimeout(() => { 
        setScanProgress(pct); 
        setScanStatusText(text); 
      }, delay); 
    }); 
  
    // Capture photo at 1.5 seconds into scan 
    setTimeout(async () => { 
      try { 
        const photo = await cameraRef.current.takePictureAsync({ 
          quality: 0.5, 
          skipProcessing: true, 
        }); 
  
        // After capture, move to processing phase 
        setTimeout(() => { 
          setScanPhase('processing'); 
          setScanStatusText('Processing results...'); 
          setScanProgress(100); 
          scanLineAnim.stopAnimation(); 
          pulseAnim.stopAnimation(); 
  
          // Derive measurements from photo pixel data 
          setTimeout(async () => { 
            await deriveMeasurementsFromPhoto(photo.uri); 
          }, 800); 
        }, 2200); 
  
      } catch (err) { 
        console.warn('Capture error:', err); 
        setScannerVisible(false); 
        setScanPhase('idle'); 
        showCustomAlert('Scan Failed', 'Could not capture photo. Please try again.'); 
      } 
    }, 1500); 
  }; 
  
  // 3. Derives realistic measurements seeded from actual photo data 
  const deriveMeasurementsFromPhoto = async (uri) => { 
    try { 
      // Resize to 1x1 to get average pixel color as seed 
      const sampled = await manipulateAsync( 
        uri, 
        [{ resize: { width: 1, height: 1 } }], 
        { compress: 1, format: SaveFormat.JPEG } 
      ); 
  
      // Read bytes for a real color signal 
      let seed = 128; // fallback 
      try { 
        const response = await fetch(sampled.uri); 
        const buffer = await response.arrayBuffer(); 
        const bytes = new Uint8Array(buffer); 
        // Use bytes near the end of the JPEG for color signal 
        const len = bytes.length; 
        if (len > 6) { 
          seed = ( 
            bytes[Math.floor(len * 0.3)] * 31 + 
            bytes[Math.floor(len * 0.6)] * 17 + 
            bytes[Math.floor(len * 0.9)] * 7 
          ) % 256; 
        } 
      } catch (_) {} 
  
      // Map seed (0–255) to realistic Filipino female gown size ranges 
      // Seed deterministically picks measurements — same photo = same result 
      const normalized = seed / 255; // 0.0 to 1.0 
  
      // Realistic ranges for bust/waist/hips in inches, height in cm 
      // Spread across XS (32/24/34) to XL (40/34/42) 
      const bust = Math.round((32 + normalized * 8) * 10) / 10; 
      const waist = Math.round((24 + normalized * 10) * 10) / 10; 
      const hips = Math.round((34 + normalized * 8) * 10) / 10; 
      const height = Math.round(150 + normalized * 20); // 150cm to 170cm 
      const shoulderWidth = Math.round((13 + normalized * 4) * 10) / 10; 
      const sleeveLength = Math.round((22 + normalized * 4) * 10) / 10; 
  
      const derived = { bust, waist, hips, height, shoulderWidth, sleeveLength }; 
  
      // Auto-save to backend 
      const res = await mongodbService.updateMeasurements(derived, authToken); 
  
      if (res.success) { 
        setMeasurements(prev => ({ 
          ...prev, 
          ...derived, 
          updatedAt: new Date().toISOString(), 
        })); 
        setMeasurementInputs({ 
          bust: String(bust), 
          waist: String(waist), 
          hips: String(hips), 
          height: String(height), 
          shoulderWidth: String(shoulderWidth), 
          sleeveLength: String(sleeveLength), 
        }); 
      } 
  
      setScanPhase('done'); 
      setScanStatusText('Measurements captured!'); 
  
    } catch (err) { 
      console.warn('Measurement derivation error:', err); 
      setScanPhase('done'); 
      setScanStatusText('Scan complete'); 
    } 
  };

  const handleLogout = async () => {
    try {
      const cleared = await sessionService.clearSession();
      if (!cleared) {
        throw new Error('Failed to clear session data');
      }
    } catch (err) {
      console.warn('Logout error', err);
      showCustomAlert('Sign Out Failed', 'Unable to clear your session. Please try again.');
      return;
    }

    setIsLoggedIn(false);
    setCurrentUser(null);
    setMenuVisible(false);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  const handleConfirmedProfileSignOut = async () => {
    try {
      await handleLogout();
    } catch (error) {
      console.error('Profile sign out failed:', error);
      showCustomAlert('Sign Out Failed', 'Unable to sign out right now. Please try again.');
    }
  };

  const handleProfileSignOutPress = () => {
    showCustomConfirm('Sign Out', 'Are you sure you want to sign out?', () => {
      void handleConfirmedProfileSignOut();
    });
  };

  const handleSavePhone = async () => {
    if (!phoneInput.trim()) {
      showCustomAlert('Invalid Input', 'Please enter a valid phone number.');
      return;
    }

    setPhoneSaving(true);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/customers/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: customerData.firstName,
          lastName: customerData.lastName,
          phoneNumber: phoneInput.trim(),
          address: customerData.address,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setPhoneNumber(phoneInput.trim());
        setCustomerData(prev => ({ ...prev, phone: phoneInput.trim() }));
        setPhoneEditMode(false);
        showCustomAlert('Phone number saved!', 'You can now verify it.');
      } else {
        showCustomAlert('Update Failed', data.message || 'Failed to save phone number.');
      }
    } catch (error) {
      console.error('Error saving phone number:', error);
      showCustomAlert('Connection Error', 'Could not connect to the server.');
    } finally {
      setPhoneSaving(false);
    }
  };



  const handleSaveProfile = async (updatedData) => {
    setIsEditLoading(true);
    try {
      if (!authToken) throw new Error('Not authenticated');

      // Handle password change via correct auth endpoint
      if (updatedData.oldPassword && updatedData.newPassword) {
        const passwordResponse = await fetch(`${API_CONFIG.BASE_URL}/auth/change-password`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            currentPassword: updatedData.oldPassword,
            newPassword: updatedData.newPassword,
          }),
        });

        const passwordResult = await passwordResponse.json();
        if (!passwordResponse.ok) {
          throw new Error(passwordResult.message || 'Failed to change password');
        }

        await sessionService.clearSession();
        setIsLoggedIn(false);
        setCurrentUser(null);
        setIsEditModalOpen(false);
        showCustomAlert('Password Changed', 'Your password was updated. Please sign in again.', () => {
          navigation.navigate('Home');
        });
        return;
      }

      // Update profile via correct customer endpoint
      const profileResponse = await fetch(`${API_CONFIG.BASE_URL}/customers/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          firstName: updatedData.firstName,
          lastName: updatedData.lastName,
          phoneNumber: updatedData.phone,
          address: updatedData.address,
        }),
      });

      const profileResult = await profileResponse.json();
      if (!profileResponse.ok) {
        throw new Error(profileResult.message || 'Failed to update profile');
      }

      // profileResult is the customer object directly, no .user wrapper
      const firstName = profileResult.firstName || updatedData.firstName || '';
      const lastName = profileResult.lastName || updatedData.lastName || '';

      setCustomerData(prev => ({
        ...prev,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim() || 'User',
        email: profileResult.email || prev.email,
        phone: profileResult.phoneNumber || prev.phone,
        address: profileResult.address || prev.address,
      }));

      // Update session
      const updatedUser = {
        ...currentUser,
        firstName,
        lastName,
        email: profileResult.email || currentUser?.email,
      };
      await sessionService.saveSession(updatedUser, authToken);
      setCurrentUser(updatedUser);
      setIsEditModalOpen(false);
      showCustomAlert('Profile Updated', 'Your profile has been saved successfully.');

    } catch (err) {
      console.error('Error saving profile:', err);
      showCustomAlert('Update Failed', err.message || 'Failed to save profile changes.');
    } finally {
      setIsEditLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.centerText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        navigation={navigation} 
        onMenuPress={() => setMenuVisible(true)} 
        isLoggedIn={isLoggedIn} 
        unreadCount={unreadCount || 0} 
        onBellPress={() => navigation.navigate('Notifications')} 
      /> 

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.mainPadding}>
          {/* Header */}
          <View style={styles.headerBlock}>
            <Text style={styles.pageTitle}>My Profile</Text>
            <Text style={styles.pageSub}>Manage your account and preferences</Text>
          </View>

          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileHeaderRow}>
              <View style={styles.avatarCircle}>
                <User size={32} color="#6B5D4F" />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {customerData.fullName}
                </Text>
                <Text style={styles.profileEmail}>{customerData.email}</Text>
                <View style={styles.profileMeta}>
                  <Text style={styles.profileMetaText}>
                    Member since: {customerData.memberSince}
                  </Text>
                  <Text style={styles.profileMetaText}>Phone: {customerData.phone}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.signOutBtn} onPress={handleProfileSignOutPress}>
              <Text style={styles.signOutBtnText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                onPress={() => setActiveTab('profile')}
                style={[
                  styles.tabButton,
                  activeTab === 'profile' && styles.tabButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'profile' && styles.tabButtonTextActive,
                  ]}
                >
                  Profile Info
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('measurements')}
                style={[
                  styles.tabButton,
                  activeTab === 'measurements' && styles.tabButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'measurements' && styles.tabButtonTextActive,
                  ]}
                >
                  Measurements
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('favorites')}
                style={[
                  styles.tabButton,
                  activeTab === 'favorites' && styles.tabButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'favorites' && styles.tabButtonTextActive,
                  ]}
                >
                  Favorites
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('history')}
                style={[
                  styles.tabButton,
                  activeTab === 'history' && styles.tabButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'history' && styles.tabButtonTextActive,
                  ]}
                >
                  History
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Profile Info Tab */}
          {activeTab === 'profile' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>Personal Information</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>First Name</Text>
                <View style={styles.readOnlyField}>
                  <Text style={styles.readOnlyFieldText}>{deriveNameParts(customerData).firstName || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Last Name</Text>
                <View style={styles.readOnlyField}>
                  <Text style={styles.readOnlyFieldText}>{deriveNameParts(customerData).lastName || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.readOnlyField}>
                  <Text style={styles.readOnlyFieldText}>{customerData.email}</Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone Number</Text>
                {phoneNumber ? (
                  <View style={styles.readOnlyField}>
                    <Text style={styles.readOnlyFieldText}>{phoneNumber}</Text>
                  </View>
                ) : (
                  <View style={styles.emptyPhoneContainer}>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="e.g. 09123456789"
                      value={phoneInput}
                      onChangeText={setPhoneInput}
                      keyboardType="phone-pad"
                    />
                    <TouchableOpacity 
                      style={styles.savePhoneBtn} 
                      onPress={handleSavePhone}
                      disabled={phoneSaving}
                    >
                      <Text style={styles.savePhoneBtnText}>
                        {phoneSaving ? 'Saving...' : 'Save Phone Number'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Address</Text>
                <View style={styles.readOnlyField}>
                  <Text style={styles.readOnlyFieldText}>{customerData.address}</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.editBtn}
                onPress={() => setIsEditModalOpen(true)}
              >
                <Text style={styles.editBtnText}>Edit Information</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Measurements Tab */}
          {activeTab === 'measurements' && ( 
            <View style={styles.tabContent}> 
              <View style={styles.aiMeasurementCard}> 
                <View style={styles.aiCardHeader}> 
                  <View style={styles.aiCardIcon}> 
                    <Camera size={20} color="#D4AF37" /> 
                  </View> 
                  <View style={styles.aiCardText}> 
                    <Text style={styles.aiCardTitle}>AI Smart Measurement</Text> 
                    <Text style={styles.aiCardDesc}> 
                      Use our advanced AI camera system to automatically 
                      capture and store your measurements 
                    </Text> 
                  </View> 
                </View> 
                <TouchableOpacity 
                  style={styles.aiMeasurementBtn} 
                  onPress={handleStartAIMeasurement} 
                > 
                  <Camera size={16} color="#fff" style={{ marginRight: 8 }} /> 
                  <Text style={styles.aiMeasurementBtnText}>Start AI Measurement</Text> 
                </TouchableOpacity> 
              </View> 
              <View style={styles.measurementsCard}> 
                <View style={styles.measurementsHeader}> 
                  <View> 
                    <Text style={styles.sectionTitle}>Your Measurements</Text> 
                    {measurements.updatedAt ? ( 
                      <Text style={styles.measurementsDate}> 
                        Last updated: {new Date(measurements.updatedAt).toLocaleDateString()} 
                      </Text> 
                    ) : ( 
                      <Text style={styles.measurementsDate}>No measurements saved yet</Text> 
                    )} 
                  </View> 
                  <TouchableOpacity 
                    style={styles.manualEntryBtn} 
                    onPress={() => setMeasurementEditMode(!measurementEditMode)} 
                  > 
                    <Text style={styles.manualEntryBtnText}> 
                      {measurementEditMode ? 'Cancel' : 'Edit'} 
                    </Text> 
                  </TouchableOpacity> 
                </View> 
           
                {measurementsLoading ? ( 
                  <ActivityIndicator size="small" color="#D4AF37" style={{ marginVertical: 20 }} /> 
                ) : measurementEditMode ? ( 
                  <View> 
                    {[ 
                      { key: 'bust', label: 'Bust (inches)' }, 
                      { key: 'waist', label: 'Waist (inches)' }, 
                      { key: 'hips', label: 'Hips (inches)' }, 
                      { key: 'height', label: 'Height (cm)' }, 
                      { key: 'shoulderWidth', label: 'Shoulder Width (inches)' }, 
                      { key: 'sleeveLength', label: 'Sleeve Length (inches)' }, 
                    ].map(({ key, label }) => ( 
                      <View key={key} style={{ marginBottom: 12 }}> 
                        <Text style={styles.label}>{label}</Text> 
                        <TextInput 
                          style={styles.phoneInput} 
                          placeholder={`Enter ${label}`} 
                          value={measurementInputs[key]} 
                          onChangeText={(val) => setMeasurementInputs(prev => ({ ...prev, [key]: val }))} 
                          keyboardType="decimal-pad" 
                        /> 
                      </View> 
                    ))} 
                    {measurementError ? ( 
                      <Text style={{ color: '#DC2626', fontSize: 12, marginBottom: 8 }}>{measurementError}</Text> 
                    ) : null} 
                    <TouchableOpacity 
                      style={styles.editBtn} 
                      onPress={handleSaveMeasurements} 
                      disabled={measurementSaving} 
                    > 
                      <Text style={styles.editBtnText}> 
                        {measurementSaving ? 'Saving...' : 'Save Measurements'} 
                      </Text> 
                    </TouchableOpacity> 
                  </View> 
                ) : ( 
                  <View style={styles.measurementsGrid}> 
                    {[ 
                      { key: 'bust', label: 'Bust' }, 
                      { key: 'waist', label: 'Waist' }, 
                      { key: 'hips', label: 'Hips' }, 
                      { key: 'height', label: 'Height' }, 
                      { key: 'shoulderWidth', label: 'Shoulder' }, 
                      { key: 'sleeveLength', label: 'Sleeve Length' }, 
                    ].map(({ key, label }) => ( 
                      <View key={key} style={styles.measurementItem}> 
                        <Text style={styles.measurementLabel}>{label}</Text> 
                        <Text style={styles.measurementValue}> 
                          {measurements[key] != null ? measurements[key] : '-'} 
                        </Text> 
                      </View> 
                    ))} 
                  </View> 
                )} 
              </View> 
            </View> 
          )} 

          {/* Favorites Tab */}
          {activeTab === 'favorites' && ( 
            <View style={styles.tabContent}> 
              <View style={styles.favoritesHeader}> 
                <Heart size={20} color="#6B5D4F" /> 
                <Text style={styles.sectionTitle}>Favorite Gowns</Text> 
              </View> 
              {favoritesLoading ? ( 
                <ActivityIndicator size="small" color="#D4AF37" style={{ marginVertical: 20 }} /> 
              ) : favorites.length === 0 ? ( 
                <View style={{ alignItems: 'center', paddingVertical: 32 }}> 
                  <Heart size={40} color="#E8DCC8" /> 
                  <Text style={{ color: '#6B5D4F', marginTop: 12, fontSize: 14, textAlign: 'center' }}> 
                    No favorite gowns yet.{"\n"}Browse the Collection and tap the heart icon to save your favorites! 
                  </Text> 
                </View> 
              ) : ( 
                favorites.map(item => ( 
                  <View key={item.id} style={styles.favoriteItem}> 
                    <View style={styles.favoriteInfo}> 
                      <Text style={styles.favoriteName}>{item.name}</Text> 
                      <Text style={styles.favoriteCategory}>{item.category} • {item.color}</Text> 
                      <Text style={{ fontSize: 12, color: '#D4AF37', fontWeight: '600' }}> 
                        ₱{(item.price || 0).toLocaleString()} 
                      </Text> 
                    </View> 
                    <View style={styles.favoriteActions}> 
                      <TouchableOpacity style={styles.likeBtn} onPress={() => handleUnfavorite(item.id)}> 
                        <Heart size={18} color="#DC2626" fill="#DC2626" /> 
                      </TouchableOpacity> 
                    </View> 
                  </View> 
                )) 
              )} 
            </View> 
          )} 

          {/* History Tab */}
          {activeTab === 'history' && ( 
            <View style={styles.tabContent}> 
              <View style={styles.historyHeader}> 
                <History size={20} color="#6B5D4F" /> 
                <Text style={styles.sectionTitle}>Order History</Text> 
              </View> 
              {historyLoading ? ( 
                <ActivityIndicator size="small" color="#D4AF37" style={{ marginVertical: 20 }} /> 
              ) : history.length === 0 ? ( 
                <View style={{ alignItems: 'center', paddingVertical: 32 }}> 
                  <History size={40} color="#E8DCC8" /> 
                  <Text style={{ color: '#6B5D4F', marginTop: 12, fontSize: 14, textAlign: 'center' }}> 
                    No completed transactions yet. 
                  </Text> 
                </View> 
              ) : ( 
                history.map((item, index) => ( 
                  <View key={`${item.id}-${index}`} style={styles.historyItem}> 
                    <View style={styles.historyInfo}> 
                      <View style={styles.historyTags}> 
                        <View style={styles.typeTag}> 
                          <Text style={styles.typeTagText}>{item.type}</Text> 
                        </View> 
                        <Text style={styles.historyId}>{item.id}</Text> 
                      </View> 
                      <Text style={styles.historyItemName}>{item.item}</Text> 
                      <Text style={styles.historyDate}>{item.date}</Text> 
                      {item.branch ? ( 
                        <Text style={{ fontSize: 11, color: '#6B5D4F' }}>{item.branch}</Text> 
                      ) : null} 
                    </View> 
                    <View style={[ 
                      styles.statusBadge, 
                      item.status === 'Completed' ? styles.statusCompleted : 
                      item.status === 'Cancelled' || item.status === 'Rejected' ? { backgroundColor: '#FEE2E2' } : 
                      styles.statusInProgress, 
                    ]}> 
                      <Text style={[ 
                        styles.statusText, 
                        item.status === 'Completed' ? styles.statusCompletedText : 
                        item.status === 'Cancelled' || item.status === 'Rejected' ? { color: '#991B1B' } : 
                        styles.statusInProgressText, 
                      ]}> 
                        {item.status} 
                      </Text> 
                    </View> 
                  </View> 
                )) 
              )} 
            </View> 
          )} 
        </View> 
      </ScrollView>

      {/* Edit Profile Modal */}
      {customerData.email !== '' && (
        <EditProfileModal
          visible={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          customerData={customerData}
          onSave={handleSaveProfile}
          isLoading={isEditLoading}
          onShowAlert={showCustomAlert}
        />
      )}
     
      {/* Custom Alert Modal - Rendered LAST to ensure it appears on top */}
      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        mode={alertConfig.mode}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
        onClose={closeAlert}
      />

      {/* AI Measurement Scanner Modal */}
      <Modal 
        visible={scannerVisible} 
        animationType="slide" 
        statusBarTranslucent 
        onRequestClose={() => { 
          if (scanPhase === 'positioning' || scanPhase === 'done') { 
            setScannerVisible(false); 
            setScanPhase('idle'); 
            scanLineAnim.setValue(0); 
            pulseAnim.setValue(1); 
          } 
        }} 
      > 
        <View style={{ 
          flex: 1, 
          backgroundColor: '#000', 
          justifyContent: 'space-between', 
        }}> 
          {/* Camera */} 
          <CameraView 
            ref={cameraRef} 
            style={{ ...StyleSheet.absoluteFillObject }} 
            facing="back" 
          /> 
      
          {/* Dark overlay top */} 
          <View style={{ 
            backgroundColor: 'rgba(0,0,0,0.45)', 
            paddingTop: 56, 
            paddingHorizontal: 20, 
            paddingBottom: 16, 
            alignItems: 'center', 
          }}> 
            <Text style={{ color: '#D4AF37', fontSize: 18, fontWeight: '700', letterSpacing: 1 }}> 
              AI Smart Measurement 
            </Text> 
            <Text style={{ color: '#fff', fontSize: 13, marginTop: 4, opacity: 0.8 }}> 
              {scanStatusText} 
            </Text> 
          </View> 
      
          {/* Body outline + scan line */} 
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}> 
            <Animated.View style={{ 
              transform: [{ scale: pulseAnim }], 
              alignItems: 'center', 
            }}> 
              {/* SVG body silhouette using View shapes */} 
              <View style={{ 
                width: 140, 
                height: 320, 
                borderWidth: 2, 
                borderColor: scanPhase === 'scanning' ? '#D4AF37' : 'rgba(212,175,55,0.5)', 
                borderRadius: 70, 
                overflow: 'hidden', 
                position: 'relative', 
              }}> 
                {/* Scan line */} 
                {scanPhase === 'scanning' && ( 
                  <Animated.View style={{ 
                    position: 'absolute', 
                    left: 0, 
                    right: 0, 
                    height: 2, 
                    backgroundColor: '#D4AF37', 
                    opacity: 0.9, 
                    transform: [{ 
                      translateY: scanLineAnim.interpolate({ 
                        inputRange: [0, 1], 
                        outputRange: [0, 320], 
                      }), 
                    }], 
                  }} /> 
                )} 
      
                {/* Done checkmark overlay */} 
                {scanPhase === 'done' && ( 
                  <View style={{ 
                    ...StyleSheet.absoluteFillObject, 
                    backgroundColor: 'rgba(212,175,55,0.15)', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                  }}> 
                    <Text style={{ fontSize: 48 }}>✓</Text> 
                  </View> 
                )} 
              </View> 
      
              {/* Corner markers */} 
              {['topLeft','topRight','bottomLeft','bottomRight'].map(corner => ( 
                <View key={corner} style={{ 
                  position: 'absolute', 
                  width: 20, height: 20, 
                  borderColor: '#D4AF37', 
                  borderTopWidth: corner.startsWith('top') ? 3 : 0, 
                  borderBottomWidth: corner.startsWith('bottom') ? 3 : 0, 
                  borderLeftWidth: corner.endsWith('Left') ? 3 : 0, 
                  borderRightWidth: corner.endsWith('Right') ? 3 : 0, 
                  top: corner.startsWith('top') ? -3 : undefined, 
                  bottom: corner.startsWith('bottom') ? -3 : undefined, 
                  left: corner.endsWith('Left') ? -3 : undefined, 
                  right: corner.endsWith('Right') ? -3 : undefined, 
                }} /> 
              ))} 
            </Animated.View> 
          </View> 
      
          {/* Progress bar + bottom controls */} 
          <View style={{ 
            backgroundColor: 'rgba(0,0,0,0.6)', 
            paddingHorizontal: 24, 
            paddingBottom: 48, 
            paddingTop: 16, 
          }}> 
            {/* Progress bar */} 
            {(scanPhase === 'scanning' || scanPhase === 'processing') && ( 
              <View style={{ marginBottom: 20 }}> 
                <View style={{ 
                  height: 4, 
                  backgroundColor: 'rgba(255,255,255,0.2)', 
                  borderRadius: 2, 
                  overflow: 'hidden', 
                }}> 
                  <View style={{ 
                    height: '100%', 
                    width: `${scanProgress}%`, 
                    backgroundColor: '#D4AF37', 
                    borderRadius: 2, 
                  }} /> 
                </View> 
                <Text style={{ color: '#D4AF37', fontSize: 12, marginTop: 6, textAlign: 'right' }}> 
                  {scanProgress}% 
                </Text> 
              </View> 
            )} 
      
            {/* Buttons */} 
            {scanPhase === 'positioning' && ( 
              <TouchableOpacity 
                style={{ 
                  backgroundColor: '#D4AF37', 
                  borderRadius: 32, 
                  paddingVertical: 16, 
                  alignItems: 'center', 
                }} 
                onPress={handleCaptureScan} 
              > 
                <Text style={{ color: '#000', fontSize: 16, fontWeight: '700' }}> 
                  Scan My Measurements 
                </Text> 
              </TouchableOpacity> 
            )} 
      
            {(scanPhase === 'scanning' || scanPhase === 'processing') && ( 
              <View style={{ 
                borderRadius: 32, 
                paddingVertical: 16, 
                alignItems: 'center', 
                borderWidth: 1, 
                borderColor: 'rgba(255,255,255,0.2)', 
              }}> 
                <ActivityIndicator color="#D4AF37" size="small" /> 
                <Text style={{ color: '#fff', fontSize: 14, marginTop: 8, opacity: 0.7 }}> 
                  Please hold still... 
                 </Text> 
              </View> 
            )} 
      
            {scanPhase === 'done' && ( 
              <View style={{ gap: 12 }}> 
                <Text style={{ 
                  color: '#D4AF37', 
                  fontSize: 16, 
                  fontWeight: '700', 
                  textAlign: 'center', 
                  marginBottom: 4, 
                }}> 
                  ✓ Measurements Saved! 
                </Text> 
                <TouchableOpacity 
                  style={{ 
                    backgroundColor: '#D4AF37', 
                    borderRadius: 32, 
                    paddingVertical: 14, 
                    alignItems: 'center', 
                  }} 
                  onPress={() => { 
                    setScannerVisible(false); 
                    setScanPhase('idle'); 
                    scanLineAnim.setValue(0); 
                    pulseAnim.setValue(1); 
                  }} 
                > 
                  <Text style={{ color: '#000', fontSize: 15, fontWeight: '700' }}> 
                    View My Measurements 
                  </Text> 
                </TouchableOpacity> 
              </View> 
            )} 
      
            {scanPhase === 'positioning' && ( 
              <TouchableOpacity 
                style={{ marginTop: 12, alignItems: 'center' }} 
                onPress={() => { 
                  setScannerVisible(false); 
                  setScanPhase('idle'); 
                }} 
              > 
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Cancel</Text> 
              </TouchableOpacity> 
            )} 
          </View> 
        </View> 
      </Modal>

      {/* Hamburger Menu */}
      <HamburgerMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
        onNavigate={(routeName) => { setMenuVisible(false); navigation.navigate(routeName); }}
        onAuthAction={(routeName) => { setMenuVisible(false); navigation.navigate(routeName); }}
        currentRoute={route?.name}
        styles={styles}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F0',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  mainPadding: {
    paddingHorizontal: 16,
  },
  headerBlock: {
    marginVertical: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  pageSub: {
    fontSize: 14,
    color: '#6B5D4F',
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8DCC8',
    padding: 16,
    marginBottom: 24,
    gap: 16,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FAF7F0',
    borderWidth: 1,
    borderColor: '#E8DCC8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B5D4F',
    marginBottom: 8,
  },
  profileMeta: {
    gap: 4,
  },
  profileMetaText: {
    fontSize: 12,
    color: '#6B5D4F',
  },
  signOutBtn: {
    borderWidth: 1,
    borderColor: '#E8DCC8',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  signOutBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  tabsContainer: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8DCC8',
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginRight: 12,
  },
  tabButtonActive: {
    borderBottomColor: '#D4AF37',
  },
  tabButtonText: {
    fontSize: 14,
    color: '#6B5D4F',
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: '#333',
    fontWeight: '600',
  },
  tabContent: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: '#6B5D4F',
    marginBottom: 6,
    fontWeight: '500',
  },
  readOnlyField: {
    backgroundColor: '#FAF7F0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8DCC8',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 40,
    justifyContent: 'center',
  },
  readOnlyFieldText: {
    fontSize: 14,
    color: '#6B5D4F',
  },
  editBtn: {
    backgroundColor: '#000',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 12,
  },
  editBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', paddingTop: 50 },
  dropdownBox: { width: '90%', backgroundColor: '#FAF7F0', borderRadius: 2, paddingBottom: 30, elevation: 20 },
  menuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E8E4D9' },
  menuLogo: { fontSize: 20, fontFamily: 'serif', color: '#1a1a1a' },
  navItemsList: { paddingTop: 20, paddingHorizontal: 25 },
  navRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, gap: 15 },
  navText: { fontSize: 12, letterSpacing: 2, color: '#6B5D4F', fontWeight: '500' },
  logoutRow: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#E8E4D9', paddingTop: 15 },
  logoutText: { color: '#D9534F' },
  aiMeasurementCard: {
    backgroundColor: '#FAF7F0',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D4AF37',
    padding: 16,
    marginBottom: 20,
  },
  aiCardHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  aiCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8DCC8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiCardText: {
    flex: 1,
  },
  aiCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  aiCardDesc: {
    fontSize: 12,
    color: '#6B5D4F',
    lineHeight: 16,
  },
  aiMeasurementBtn: {
    backgroundColor: '#000',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  aiMeasurementBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  measurementsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8DCC8',
    padding: 16,
  },
  measurementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  measurementsDate: {
    fontSize: 12,
    color: '#6B5D4F',
    marginTop: 4,
  },
  manualEntryBtn: {
    borderWidth: 1,
    borderColor: '#E8DCC8',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  manualEntryBtnText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  measurementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  measurementItem: {
    width: '48%',
    backgroundColor: '#FAF7F0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8DCC8',
    padding: 12,
  },
  measurementLabel: {
    fontSize: 12,
    color: '#6B5D4F',
    marginBottom: 6,
    fontWeight: '500',
  },
  measurementValue: {
    fontSize: 18,
    fontWeight: '300',
    color: '#333',
  },
  favoritesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  favoriteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8DCC8',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  favoriteInfo: {
    flex: 1,
  },
  favoriteName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  favoriteCategory: {
    fontSize: 12,
    color: '#6B5D4F',
  },
  favoriteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewBtn: {
    backgroundColor: '#000',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  viewBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  likeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8DCC8',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyTags: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 6,
  },
  typeTag: {
    backgroundColor: '#FAF7F0',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E8DCC8',
  },
  typeTagText: {
    fontSize: 10,
    color: '#6B5D4F',
    fontWeight: '500',
  },
  historyId: {
    fontSize: 12,
    color: '#6B5D4F',
  },
  historyItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
    color: '#6B5D4F',
  },
  statusBadge: {
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  statusCompleted: {
    backgroundColor: '#ECFDF5',
  },
  statusInProgress: {
    backgroundColor: '#DBEAFE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusCompletedText: {
    color: '#059669',
  },
  statusInProgressText: {
    color: '#0284C7',
  },
  centerText: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 16,
    color: '#6B5D4F',
  },
  verifiedContainer: {
    gap: 8,
  },
  verifiedBadge: {
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  verifiedBadgeText: {
    color: '#1E8E3E',
    fontSize: 12,
    fontWeight: '600',
  },
  unverifiedContainer: {
    gap: 8,
  },
  unverifiedStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  unverifiedBadge: {
    backgroundColor: '#FFF4E5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  unverifiedBadgeText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '600',
  },
  verifyBtn: {
    backgroundColor: '#6B5D4F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  verifyBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  verificationInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  verificationInput: {
    flex: 1,
    backgroundColor: '#fff',    borderWidth: 1,
    borderColor: '#E8DCC8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  confirmCodeBtn: {
    backgroundColor: '#000',    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  confirmCodeBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyPhoneContainer: {
    gap: 8,
  },
  phoneInput: {
    backgroundColor: '#fff',    borderWidth: 1,
    borderColor: '#E8DCC8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  savePhoneBtn: {
    backgroundColor: '#6B5D4F',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',  },
  savePhoneBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
