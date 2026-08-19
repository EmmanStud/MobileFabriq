import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { User, History, Heart, Camera } from 'lucide-react-native';
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
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneEditMode, setPhoneEditMode] = useState(false);
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [verifyMode, setVerifyMode] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifySending, setVerifySending] = useState(false);
  const [verifySubmitting, setVerifySubmitting] = useState(false);

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

  const [measurements, setMeasurements] = useState({ measuredAt: null });
  const [measurementsLoading, setMeasurementsLoading] = useState(false);

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
        setPhoneVerified(Boolean(data.phoneVerified));
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
            phoneVerified: Boolean(data.phoneVerified),
          };
          await sessionService.saveSession(updatedUser, token);
          setCurrentUser(updatedUser);
        }

        // Fetch real measurements, favorites, and history
        await fetchMeasurements();
        await fetchFavorites(token);
        await fetchHistory(token);

      } catch (err) {
        console.error('Error loading profile from backend:', err);
      }
    };

    checkSession();
  }, [navigation]);

  useFocusEffect(
    React.useCallback(() => {
      if (authToken) {
        fetchMeasurements();
      }
    }, [authToken])
  );

  const fetchMeasurements = async () => {
    setMeasurementsLoading(true); 
    try { 
      const session = await sessionService.getSession();
      const customerId = session?.userId;
      const data = await mongodbService.getBodyMeasurements(customerId);
      if (data) { 
        setMeasurements(data);
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
  
      const terminalRentalStatuses = ['completed', 'cancelled', 'item_lost'];

      // Build unified history using the backend rental-status enum.
      const historyItems = [ 
        ...rentals 
          .filter(r => terminalRentalStatuses.includes(r.status)) 
          .map(r => ({ 
            id: r.referenceId || r.id, 
            type: 'Rental', 
            item: r.gownName || 'Gown Rental', 
            date: r.startDate || r.createdAt || '', 
            status: r.status === 'item_lost' ? 'Item Lost' : r.status.charAt(0).toUpperCase() + r.status.slice(1), 
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

  const handleSendVerification = async () => {
    setVerifySending(true);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/customers/phone-verification/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (response.ok) {
        setVerifyMode(true);
        showCustomAlert('Code Sent', 'Please check your SMS for the verification code.');
      } else {
        showCustomAlert('Failed to Send', data.message || 'Could not send verification code.');
      }
    } catch (error) {
      console.error('Error sending verification:', error);
      showCustomAlert('Connection Error', 'Could not connect to the server.');
    } finally {
      setVerifySending(false);
    }
  };

  const handleConfirmVerification = async () => {
    if (!verifyCode.trim()) {
      showCustomAlert('Invalid Code', 'Please enter the verification code.');
      return;
    }

    setVerifySubmitting(true);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/customers/phone-verification/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: verifyCode.trim() }),
      });

      const data = await response.json();
      if (response.ok) {
        setPhoneVerified(true);
        setVerifyMode(false);
        setVerifyCode('');
        
        // Update session
        if (currentUser) {
          const updatedUser = { ...currentUser, phoneVerified: true };
          await sessionService.saveSession(updatedUser, authToken);
          setCurrentUser(updatedUser);
        }
        
        showCustomAlert('Phone number verified!', 'You can now create rentals.');
      } else {
        showCustomAlert('Verification Failed', data.message || 'The verification code is incorrect.');
      }
    } catch (error) {
      console.error('Error verifying phone:', error);
      showCustomAlert('Connection Error', 'Could not connect to the server.');
    } finally {
      setVerifySubmitting(false);
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
                {phoneVerified ? (
                  <View style={styles.verifiedContainer}>
                    <View style={styles.readOnlyField}>
                      <Text style={styles.readOnlyFieldText}>{phoneNumber}</Text>
                    </View>
                    <View style={styles.verifiedBadge}>
                      <Text style={styles.verifiedBadgeText}>✓ Verified</Text>
                    </View>
                  </View>
                ) : phoneNumber ? (
                  <View style={styles.unverifiedContainer}>
                    <View style={styles.readOnlyField}>
                      <Text style={styles.readOnlyFieldText}>{phoneNumber}</Text>
                    </View>
                    <View style={styles.unverifiedStatusRow}>
                      <View style={styles.unverifiedBadge}>
                        <Text style={styles.unverifiedBadgeText}>! Not verified</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.verifyBtn} 
                        onPress={handleSendVerification}
                        disabled={verifySending}
                      >
                        <Text style={styles.verifyBtnText}>
                          {verifySending ? 'Sending...' : 'Verify Phone Number'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    
                    {verifyMode && (
                      <View style={styles.verificationInputRow}>
                        <TextInput
                          style={styles.verificationInput}
                          placeholder="6-digit code"
                          value={verifyCode}
                          onChangeText={setVerifyCode}
                          keyboardType="numeric"
                          maxLength={6}
                        />
                        <TouchableOpacity 
                          style={styles.confirmCodeBtn} 
                          onPress={handleConfirmVerification}
                          disabled={verifySubmitting}
                        >
                          <Text style={styles.confirmCodeBtnText}>
                            {verifySubmitting ? '...' : 'Confirm'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
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
                  onPress={() => navigation.navigate('MeasurementHeightInput')}
                > 
                  <Camera size={16} color="#fff" style={{ marginRight: 8 }} /> 
                  <Text style={styles.aiMeasurementBtnText}>Start Digital Measurement</Text>
                </TouchableOpacity> 
              </View> 
              <View style={styles.measurementsCard}> 
                <View style={styles.measurementsHeader}> 
                  <View> 
                    <Text style={styles.sectionTitle}>Your Measurements</Text> 
                    {measurements.measuredAt ? (
                      <Text style={styles.measurementsDate}> 
                        Last updated: {new Date(measurements.measuredAt).toLocaleDateString()}
                      </Text> 
                    ) : ( 
                      <Text style={styles.measurementsDate}>No measurements saved yet</Text> 
                    )} 
                  </View> 
                </View> 
           
                {measurementsLoading ? ( 
                  <ActivityIndicator size="small" color="#D4AF37" style={{ marginVertical: 20 }} /> 
                ) : ( 
                  <View style={styles.measurementsGrid}> 
                    {[ 
                      { key: 'shoulderWidth', label: 'Shoulder Width' },
                      { key: 'chest', label: 'Chest' },
                      { key: 'waist', label: 'Waist' }, 
                      { key: 'hips', label: 'Hips' }, 
                      { key: 'armLength', label: 'Arm Length' },
                      { key: 'inseam', label: 'Inseam' },
                      { key: 'torsoLength', label: 'Torso Length' },
                      { key: 'neck', label: 'Neck' },
                      { key: 'height', label: 'Height' }, 
                    ].map(({ key, label }) => ( 
                      <View key={key} style={styles.measurementItem}> 
                        <Text style={styles.measurementLabel}>{label}</Text> 
                        <Text style={styles.measurementValue}> 
                          {typeof measurements[key] === 'number' && Number.isFinite(measurements[key]) ? `${measurements[key]} cm` : 'Unavailable'}
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
                      <TouchableOpacity
                        style={styles.viewBtn}
                        onPress={() => navigation.navigate('Collection', { selectedGownId: item.id })}
                      >
                        <Text style={styles.viewBtnText}>View</Text>
                      </TouchableOpacity>
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
