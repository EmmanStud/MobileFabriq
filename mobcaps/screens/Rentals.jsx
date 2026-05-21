import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Modal,
  Platform,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar, MapPin, ShoppingBag, ChevronRight, Star } from 'lucide-react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { sessionService } from '../services/sessionService';
import { mongodbService } from '../services/mongodbService';
import HamburgerMenu from '../components/HamburgerMenu';
import Header from '../components/Header';
import { showAlert } from '../services/platformService';

import RentalDetailsModal from '../components/RentalDetailsModal';

const branchOptions = [
  'Taguig Main - Cadena de Amor',
  'BGC Branch',
  'Makati Branch',
  'Quezon City',
];

export default function Rentals({ navigation, route, unreadCount = 0 }) {
  // --- Rental Details Modal State ---
  const [rentalModalVisible, setRentalModalVisible] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);
    // --- Modal Handlers ---
    const handleOpenRental = (rental) => {
      setSelectedRental(rental);
      setRentalModalVisible(true);
    };

    const handleCloseRental = () => {
      setRentalModalVisible(false);
      setSelectedRental(null);
    };

    // Callback after receipt upload to refresh rentals
    const handleReceiptUploaded = async () => {
      const session = await sessionService.getSession();
      if (session?.token) fetchUserRentals(session.token);
      if (selectedRental) setSelectedRental(prev => ({ ...prev, status: 'paid_for_confirmation' }));
    };

    const handleSubmitReview = async () => { 
      if (!selectedReviewRental || !authToken) return; 
      if (reviewScore === 0) { setReviewError('Please select a rating.'); return; } 
      if (!reviewComment.trim()) { setReviewError('Please write a comment.'); return; } 
      setReviewSubmitting(true); 
      setReviewError(''); 
      try { 
        const result = await mongodbService.submitRentalReview( 
          selectedReviewRental.id, 
          reviewScore, 
          reviewComment.trim(), 
          authToken 
        ); 
        if (result.success) { 
          setUserRentals(prev => 
            prev.map(r => 
              r.id === selectedReviewRental.id 
                ? { ...r, hasReview: true } 
                : r 
            ) 
          ); 
          setReviewSuccess(true); 
        } else if (result.alreadyReviewed) { 
          setReviewError('You have already submitted a review for this rental.'); 
        } else { 
          setReviewError(result.error || 'Failed to submit review.'); 
        } 
      } catch (e) { 
        setReviewError('Failed to submit review.'); 
      } finally { 
        setReviewSubmitting(false); 
      } 
    }; 
  const [activeTab, setActiveTab] = useState('new');
  const [reviewModalVisible, setReviewModalVisible] = useState(false); 
  const [selectedReviewRental, setSelectedReviewRental] = useState(null); 
  const [reviewScore, setReviewScore] = useState(0); 
  const [reviewComment, setReviewComment] = useState(''); 
  const [reviewSubmitting, setReviewSubmitting] = useState(false); 
  const [reviewError, setReviewError] = useState(''); 
  const [reviewSuccess, setReviewSuccess] = useState(false); 
  const [menuVisible, setMenuVisible] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRentals, setUserRentals] = useState([]);
  const [userEmail, setUserEmail] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [rentalsLoading, setRentalsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [webCalendarState, setWebCalendarState] = useState({
    active: null,
    display: null,
  });
  const [formStep, setFormStep] = useState(1);
  const [validationErrors, setValidationErrors] = useState({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [personalInfo, setPersonalInfo] = useState({
    fullName: '',
    email: '',
    contactNumber: '',
  });

  // Selected gown passed from Collection.jsx via route params
  const [selectedGown, setSelectedGown] = useState(null);

  // --- Date helpers ---
  const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseLocalDateString = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  };

  const today = new Date();
  const todayString = getLocalDateString(today);
  const todayAtMidnight = parseLocalDateString(todayString);
  const daysToAdd = today.getHours() >= 17 ? 2 : 1; 
  const tomorrow = new Date(today); 
  tomorrow.setDate(tomorrow.getDate() + daysToAdd); 
  const tomorrowString = getLocalDateString(tomorrow); 
  const tomorrowAtMidnight = parseLocalDateString(tomorrowString); 

  const [formData, setFormData] = useState({
    startDate: new Date(tomorrow),
    endDate: (() => { const d = new Date(tomorrow); d.setDate(d.getDate() + 1); return d; })(),
    startDateString: tomorrowString,
    endDateString: getLocalDateString((() => { const d = new Date(tomorrow); d.setDate(d.getDate() + 1); return d; })()),
    branch: 'Taguig Main - Cadena de Amor',
  });

  // --- Session + route params ---
  useEffect(() => {
    (async () => {
      const session = await sessionService.getSession();
      if (session?.isLoggedIn) {
        setIsLoggedIn(true);
        setAuthToken(session.token || null);
        const currentUser = await sessionService.getCurrentUser();
        const fullName = (currentUser?.name || `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || '').trim();
        setPersonalInfo(prev => ({
          ...prev,
          fullName,
          email: currentUser?.email || session.email || '',
          contactNumber: currentUser?.contactNumber || currentUser?.phoneNumber || currentUser?.phone || '',
        }));
        const email = (currentUser?.email || session.email || '').toLowerCase();
        if (email) {
          setUserEmail(email);
        }
        if (session.token) {
          fetchUserRentals(session.token);
        }
      }
    })();

    // Capture gown from Collection.jsx "Book Now"
    if (route?.params?.selectedGown) {
      const gown = route.params.selectedGown;
      setSelectedGown(gown);
      setActiveTab('new');
      console.log('📦 Gown received from Collection:', gown.name, '₱' + gown.price);
    } else {
      // Opened from menu without a gown — show My Rentals
      setActiveTab('existing');
    }

    if (route?.params?.selectedBranch) {
      setFormData(prev => ({ ...prev, branch: route.params.selectedBranch }));
    }
  }, [route]);

  // Refresh rentals when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const session = await sessionService.getSession();
        if (session?.token) fetchUserRentals(session.token);
      })();
    }, [])
  );

  // --- API calls ---
  const fetchUserRentals = async (token) => {
    setRentalsLoading(true);
    try {
      console.log('📡 Fetching rentals with token');
      const rentals = await mongodbService.getRentalsByUser(token);
      console.log('✅ Fetched', rentals?.length || 0, 'rentals');
      setUserRentals((rentals || []).map(r => ({ ...r, id: r._id || r.id })));
    } catch (err) {
      console.error('❌ Failed to fetch rentals:', err);
    } finally {
      setRentalsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const session = await sessionService.getSession();
    if (session?.token) {
      await fetchUserRentals(session.token);
    } else {
      setRefreshing(false);
    }
  };

  const fetchAvailability = async (token, gownId, startDate, endDate) => {
    if (!gownId || !token) return;
    setAvailabilityLoading(true);
    try {
      const result = await mongodbService.getRentalAvailability(gownId, startDate, endDate, token);
      setUnavailableDates(result.unavailableDates || []);
    } catch (err) {
      console.warn('Availability fetch failed:', err);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  // --- Date picker handlers ---
  const openStartDatePicker = () => {
    if (Platform.OS !== 'web') {
      setShowStartDatePicker(true);
      return;
    }
    setWebCalendarState({ active: 'start', display: new Date(formData.startDate) });
  };

  const openEndDatePicker = () => {
    if (!formData.startDateString) {
      showAlert('Select Start Date First', 'Please select a start date before choosing an end date.');
      return;
    }
    if (Platform.OS !== 'web') {
      setShowEndDatePicker(true);
      return;
    }
    setWebCalendarState({ active: 'end', display: new Date(formData.endDate) });
  };

  // --- Web calendar helpers ---
  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const handleWebCalendarDateSelect = (day) => {
    if (!webCalendarState.display || !webCalendarState.active) return;
    const sel = new Date(webCalendarState.display.getFullYear(), webCalendarState.display.getMonth(), day, 0, 0, 0, 0);
    const selStr = getLocalDateString(sel);

    if (webCalendarState.active === 'start') {
      if (sel < tomorrowAtMidnight) {
        showAlert('Invalid Date', `Earliest available start date is ${tomorrowString}.`);
        return;
      }
      setFormData(prev => ({ ...prev, startDate: sel, startDateString: selStr }));
      fetchAvailability(authToken, selectedGown?.id, selStr, formData.endDateString);
    } else {
      if (sel <= formData.startDate) { showAlert('Invalid Date', 'End date must be after start date'); return; }
      setFormData(prev => ({ ...prev, endDate: sel, endDateString: selStr }));
      fetchAvailability(authToken, selectedGown?.id, formData.startDateString, selStr);
    }
    setWebCalendarState({ active: null, display: null });
  };

  const handleWebCalendarMonthChange = (direction) => {
    if (!webCalendarState.display) return;
    const d = new Date(webCalendarState.display);
    d.setMonth(d.getMonth() + direction);
    setWebCalendarState(prev => ({ ...prev, display: d }));
  };

  // --- Pricing (uses selectedGown.price from backend) ---
  const calculateDuration = () => {
    const days = Math.ceil((formData.endDate - formData.startDate) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const calculateTotalPrice = () => calculateDuration() * (selectedGown?.price || 0);
  const calculateDownpayment = () => Math.floor(calculateTotalPrice() / 2);

  // --- Validation ---
  const validateStep = (step) => {
    const errors = {};
    if (step === 1 && !selectedGown) {
      errors.gown = 'Please select a gown from the catalog first';
    }
    if (step === 2) {
      if (!formData.startDateString) errors.startDate = 'Start date is required';
      if (!formData.endDateString) errors.endDate = 'End date is required';
      if (formData.endDate <= formData.startDate) errors.endDate = 'End date must be after start date';
    }
    if (step === 3 && !personalInfo.contactNumber.trim()) {
      errors.contactNumber = 'Contact number is required';
    }
    if (Object.keys(errors).length > 0) { setValidationErrors(errors); return false; }
    setValidationErrors({});
    return true;
  };

  const goToNextStep = () => { 
    if (validateStep(formStep)) {
      if (formStep === 1) {
        fetchAvailability(authToken, selectedGown?.id, formData.startDateString, formData.endDateString);
      }
      setFormStep(prev => Math.min(prev + 1, 4)); 
    }
  };
  const goToPreviousStep = () => setFormStep(prev => Math.max(prev - 1, 1));

  // --- Submit rental ---
  const handleSubmit = async () => {
    if (!selectedGown || !userEmail) {
      showAlert('Error', !userEmail ? 'Please log in first.' : 'No gown selected.');
      return;
    }

    // Refresh session token at submit-time so Authorization header never uses stale/null value.
    const session = await sessionService.getSession();
    const token = session?.token || authToken;
    console.log('TOKEN:', token);
    if (!token) {
      showAlert('Error', 'Authorization token required. Please sign in again.');
      return;
    }

    const rental = {
      gownId: selectedGown.id,
      startDate: formData.startDateString,
      endDate: formData.endDateString,
      branch: formData.branch,
      eventType: selectedGown?.category || 'Rental',
    };

    if (unavailableDates.length > 0) { 
      showAlert('Dates Unavailable', 'One or more selected dates are already booked for this gown. Please choose different dates.'); 
      return; 
    }

    console.log('📡 Creating rental:', JSON.stringify(rental));
    setSubmitting(true);
    try {
      const res = await mongodbService.createRental(rental, token);
      console.log('📡 Create rental response:', JSON.stringify(res));
      if (res.success) {
        console.log('✅ Rental created successfully');
        await fetchUserRentals(token);
        setShowSuccessModal(true);
      } else {
        console.warn('⚠️ Create rental failed:', res.error);
        // Handle specific backend error messages
        if (res.error?.toLowerCase().includes('phone number')) {
          showAlert(
            'Phone Number Required',
            'Please add and verify your phone number in Profile Settings before making a rental.'
          );
        } else if (res.error?.toLowerCase().includes('verify your phone')) {
          showAlert(
            'Phone Not Verified',
            'Please verify your phone number in Profile Settings before making a rental.'
          );
        } else if (res.error?.toLowerCase().includes('unavailable')) {
          showAlert('Gown Unavailable', res.error || 'This gown is not available for the selected dates.');
        } else {
          showAlert('Error', res.error || 'Failed to create rental.');
        }
      }
    } catch (err) {
      console.error('❌ Error creating rental:', err);
      showAlert('Error', 'Connection failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setFormStep(1);
    setFormData({
      startDate: new Date(today),
      endDate: new Date(tomorrow),
      startDateString: todayString,
      endDateString: tomorrowString,
      branch: formData.branch,
    });
    setActiveTab('existing');
  };

  // --- Navigation helpers ---
  const handleLogout = async () => {
    await sessionService.clearSession();
    setIsLoggedIn(false);
    setMenuVisible(false);
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  const handleAuthAction = (target) => {
    if (!isLoggedIn) {
      setMenuVisible(false);
      navigation.navigate('Home', { openAuth: true });
    } else {
      setMenuVisible(false);
      navigation.navigate(target);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':               return '#3b82f6'; // blue 
      case 'for_payment':           return '#f59e0b'; // amber 
      case 'paid_for_confirmation': return '#8b5cf6'; // purple 
      case 'for_pickup':            return '#06b6d4'; // cyan 
      case 'active':                return '#10b981'; // green 
      case 'completed':             return '#6b7280'; // grey 
      case 'cancelled':             return '#ef4444'; // red 
      default:                      return '#6B5D4F'; 
    }
  };

  const getStatusBgColor = (status) => {
    switch (status) {
      case 'pending':               return '#dbeafe'; 
      case 'for_payment':           return '#fef3c7'; 
      case 'paid_for_confirmation': return '#ede9fe'; 
      case 'for_pickup':            return '#cffafe'; 
      case 'active':                return '#d1fae5'; 
      case 'completed':             return '#f3f4f6'; 
      case 'cancelled':             return '#fee2e2'; 
      default:                      return '#F5EFE6'; 
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':               return 'Pending'; 
      case 'for_payment':           return 'For Payment'; 
      case 'paid_for_confirmation': return 'Paid - Confirming'; 
      case 'for_pickup':            return 'For Pickup'; 
      case 'active':                return 'Active'; 
      case 'completed':             return 'Completed'; 
      case 'cancelled':             return 'Cancelled'; 
      default: return (status || '').charAt(0).toUpperCase() + (status || '').slice(1); 
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        navigation={navigation} 
        onMenuPress={() => setMenuVisible(true)} 
        isLoggedIn={isLoggedIn} 
        unreadCount={unreadCount || 0} 
        onBellPress={() => navigation.navigate('Notifications')} 
      /> 

      {/* PAGE HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Rentals</Text>
          <Text style={styles.headerSub}>Manage your gown rentals</Text>
        </View>
      </View>

      {/* TABS */}
      <View style={styles.tabsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={{ flexDirection: 'row', paddingHorizontal: 16 }}
        >
          <TouchableOpacity
            style={[styles.tab, activeTab === 'new' && styles.tabActive]}
            onPress={() => setActiveTab('new')}
          >
            <Text style={[styles.tabText, activeTab === 'new' && styles.tabTextActive]}>
              New Rental
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'existing' && styles.tabActive]}
            onPress={() => setActiveTab('existing')}
          >
            <Text style={[styles.tabText, activeTab === 'existing' && styles.tabTextActive]}>
              My Rentals
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'reviews' && styles.tabActive]} 
            onPress={() => setActiveTab('reviews')} 
          > 
            <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}> 
              Reviews 
            </Text> 
          </TouchableOpacity> 
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'history' && styles.tabActive]} 
            onPress={() => setActiveTab('history')} 
          > 
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}> 
              Rental History 
            </Text> 
          </TouchableOpacity> 
        </ScrollView>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'new' ? (
          <View style={styles.mainPadding}>
            {!selectedGown ? (
              /* No gown selected — prompt user to browse catalog */
              <View style={styles.emptyState}>
                <ShoppingBag size={48} color="#E8DCC8" />
                <Text style={styles.emptyTitle}>No gown selected</Text>
                <Text style={styles.emptyText}>Browse our catalog and tap "Book Now" on a gown to start a rental.</Text>
                <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('Collection')}>
                  <Text style={styles.emptyButtonText}>Browse Catalog</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Book a Rental</Text>

                {/* Progress Bar — 4 steps */}
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBackground}>
                    <View style={[styles.progressBarFill, { width: `${Math.round((formStep / 4) * 100)}%` }]} />
                  </View>
                </View>

                {/* STEP 1: Gown Summary */}
                {formStep === 1 && (
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Selected Gown</Text>
                    <View style={styles.gownSummaryCard}>
                      {selectedGown.hasImage ? (
                        <Image source={selectedGown.image} style={styles.gownSummaryImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.gownSummaryImage, { backgroundColor: selectedGown.placeholderColor || '#BDC3C7', justifyContent: 'center', alignItems: 'center' }]}>
                          <ShoppingBag size={32} color="rgba(255,255,255,0.6)" />
                        </View>
                      )}
                      <View style={styles.gownSummaryInfo}>
                        <Text style={styles.gownSummaryName}>{selectedGown.name}</Text>
                        <Text style={styles.gownSummaryMeta}>{selectedGown.category} • {selectedGown.color}</Text>
                        <Text style={styles.gownSummaryPrice}>₱{(selectedGown.price || 0).toLocaleString()} / day</Text>
                        <Text style={styles.gownSummaryBranch}>{selectedGown.branch}</Text>
                      </View>
                    </View>
                    {validationErrors.gown && (
                      <Text style={styles.errorMessage}>{validationErrors.gown}</Text>
                    )}
                  </View>
                )}

                {/* STEP 2: Dates + Branch */}
                {formStep === 2 && (
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Rental Details</Text>

                    {/* Dates */}
                    <View style={styles.dateRowContainer}>
                      <View style={[styles.inputGroup, styles.flexHalf]}>
                        <Text style={styles.label}>Start Date *</Text>
                        <TouchableOpacity
                          style={[styles.input, validationErrors.startDate && styles.inputError]}
                          onPress={openStartDatePicker}
                        >
                          <View style={styles.dateInputContent}>
                            <Calendar size={18} color="#6B5D4F" />
                            <Text style={styles.dateInputText}>{formData.startDateString}</Text>
                          </View>
                        </TouchableOpacity>
                        {validationErrors.startDate && <Text style={styles.errorMessage}>{validationErrors.startDate}</Text>}
                        {Platform.OS !== 'web' && (
                          <DateTimePickerModal
                            isVisible={showStartDatePicker}
                            mode="date"
                            date={formData.startDate}
                            minimumDate={today}
                            onConfirm={(date) => {
                              const dateStr = getLocalDateString(date);
                              setFormData(prev => ({ ...prev, startDate: date, startDateString: dateStr }));
                              fetchAvailability(authToken, selectedGown?.id, dateStr, formData.endDateString);
                              setShowStartDatePicker(false);
                            }}
                            onCancel={() => setShowStartDatePicker(false)}
                          />
                        )}
                      </View>

                      <View style={[styles.inputGroup, styles.flexHalf]}>
                        <Text style={styles.label}>End Date *</Text>
                        <TouchableOpacity
                          style={[styles.input, !formData.startDateString && styles.inputDisabled, validationErrors.endDate && styles.inputError]}
                          onPress={openEndDatePicker}
                          disabled={!formData.startDateString}
                        >
                          <View style={styles.dateInputContent}>
                            <Calendar size={18} color="#6B5D4F" />
                            <Text style={styles.dateInputText}>{formData.endDateString}</Text>
                          </View>
                        </TouchableOpacity>
                        {validationErrors.endDate && <Text style={styles.errorMessage}>{validationErrors.endDate}</Text>}
                        {Platform.OS !== 'web' && (
                          <DateTimePickerModal
                            isVisible={showEndDatePicker}
                            mode="date"
                            date={formData.endDate}
                            minimumDate={formData.startDate ? new Date(formData.startDate.getTime() + 24 * 60 * 60 * 1000) : tomorrow}
                            onConfirm={(date) => {
                              if (date > formData.startDate) {
                                const dateStr = getLocalDateString(date);
                                setFormData(prev => ({ ...prev, endDate: date, endDateString: dateStr }));
                                fetchAvailability(authToken, selectedGown?.id, formData.startDateString, dateStr);
                                setShowEndDatePicker(false);
                              } else {
                                showAlert('Invalid Date', 'End date must be after start date');
                                setShowEndDatePicker(false);
                              }
                            }}
                            onCancel={() => setShowEndDatePicker(false)}
                          />
                        )}
                      </View>
                    </View>

                    {availabilityLoading && ( 
                      <Text style={{ color: '#6B5D4F', fontSize: 12, marginTop: 4 }}>Checking availability...</Text> 
                    )} 
                    {!availabilityLoading && unavailableDates.length > 0 && ( 
                      <View style={{ backgroundColor: '#fee2e2', borderRadius: 8, padding: 10, marginTop: 8 }}> 
                        <Text style={{ color: '#dc2626', fontWeight: '600', fontSize: 13 }}> 
                          ⚠️ Some dates in your range are unavailable for this gown. 
                        </Text> 
                        <Text style={{ color: '#991b1b', fontSize: 12, marginTop: 4 }}> 
                          Unavailable: {unavailableDates.join(', ')} 
                        </Text> 
                      </View> 
                    )} 
                    {!availabilityLoading && unavailableDates.length === 0 && formData.startDateString && ( 
                      <Text style={{ color: '#16a34a', fontSize: 12, marginTop: 4, fontWeight: '600' }}> 
                        ✓ Dates are available 
                      </Text> 
                    )}

                    {/* Web Calendar Modal */}
                    {Platform.OS === 'web' && (
                      <Modal visible={webCalendarState.active !== null} transparent animationType="fade" onRequestClose={() => setWebCalendarState({ active: null, display: null })}>
                        <View style={styles.calendarModalOverlay}>
                          <View style={styles.calendarModal}>
                            <View style={styles.calendarHeader}>
                              <TouchableOpacity onPress={() => handleWebCalendarMonthChange(-1)} style={styles.calendarNavBtn}>
                                <Text style={styles.calendarNavText}>← Prev</Text>
                              </TouchableOpacity>
                              <Text style={styles.calendarHeaderText}>
                                {webCalendarState.display ? webCalendarState.display.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''}
                              </Text>
                              <TouchableOpacity onPress={() => handleWebCalendarMonthChange(1)} style={styles.calendarNavBtn}>
                                <Text style={styles.calendarNavText}>Next →</Text>
                              </TouchableOpacity>
                            </View>
                            {webCalendarState.display && (
                              <View style={styles.calendarGrid}>
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                                  <Text key={d} style={styles.calendarDayHeader}>{d}</Text>
                                ))}
                                {(() => {
                                  const firstDay = getFirstDayOfMonth(webCalendarState.display);
                                  const daysInMonth = getDaysInMonth(webCalendarState.display);
                                  const cells = [];
                                  for (let i = 0; i < firstDay; i++) cells.push(<View key={`e-${i}`} style={styles.calendarDayEmpty} />);
                                  for (let day = 1; day <= daysInMonth; day++) {
                                    const cellDate = new Date(
                                      webCalendarState.display.getFullYear(),
                                      webCalendarState.display.getMonth(),
                                      day, 0, 0, 0, 0
                                    );
                                    const cellStr = getLocalDateString(cellDate);
                                    
                                    const isPast = cellStr < tomorrowString;

                                    // For start date picker: disable if past OR in unavailableDates
                                    // For end date picker: disable if before day-after-start OR in unavailableDates
                                    //   OR on/after the first unavailable date after start
                                    let isUnavailable = false;
                                    if (webCalendarState.active === 'start') {
                                      isUnavailable = isPast || unavailableDates.includes(cellStr);
                                    } else {
                                      // Simpler version — just use string comparison:
                                      const dayAfterStart = (() => {
                                        if (!formData.startDateString) return tomorrowString;
                                        const d = parseLocalDateString(formData.startDateString);
                                        d.setDate(d.getDate() + 1);
                                        return getLocalDateString(d);
                                      })();

                                      // First unavailable date at or after dayAfterStart
                                      const firstBlocker = unavailableDates
                                        .filter(u => u >= dayAfterStart)
                                        .sort()[0] || null;

                                      isUnavailable =
                                        cellStr < dayAfterStart ||
                                        unavailableDates.includes(cellStr) ||
                                        (firstBlocker ? cellStr >= firstBlocker : false);
                                    }

                                    const isSelected =
                                      (webCalendarState.active === 'start' && cellStr === formData.startDateString) ||
                                      (webCalendarState.active === 'end' && cellStr === formData.endDateString);

                                    cells.push(
                                      <TouchableOpacity
                                        key={day}
                                        style={[
                                          styles.calendarDay,
                                          isSelected && styles.calendarDaySelected,
                                          isUnavailable && styles.calendarDayDisabled,
                                        ]}
                                        onPress={() => { if (!isUnavailable) handleWebCalendarDateSelect(day); }}
                                        disabled={isUnavailable}
                                      >
                                        <Text style={[
                                          styles.calendarDayText,
                                          isSelected && styles.calendarDaySelectedText,
                                          isUnavailable && styles.calendarDayDisabledText,
                                        ]}>
                                          {day}
                                        </Text>
                                        {unavailableDates.includes(cellStr) && !isPast && (
                                          <View style={{
                                            width: 4, height: 4, borderRadius: 2,
                                            backgroundColor: '#ef4444',
                                            position: 'absolute', bottom: 2, alignSelf: 'center',
                                          }} />
                                        )}
                                      </TouchableOpacity>
                                    );
                                  }
                                  return cells;
                                })()}
                              </View>
                            )}
                            <View style={styles.calendarFooter}>
                              <TouchableOpacity style={styles.calendarCloseBtn} onPress={() => setWebCalendarState({ active: null, display: null })}>
                                <Text style={styles.calendarCloseBtnText}>Close</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      </Modal>
                    )}

                    {/* Branch */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Pickup Branch *</Text>
                      <View style={styles.selectContainer}>
                        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={styles.branchList}>
                          {branchOptions.map((branch, idx) => (
                            <TouchableOpacity
                              key={idx}
                              style={[styles.branchOption, formData.branch === branch && styles.branchOptionSelected]}
                              onPress={() => setFormData(prev => ({ ...prev, branch }))}
                            >
                              <Text style={[styles.branchOptionText, formData.branch === branch && styles.branchOptionTextSelected]}>
                                {branch}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                  </View>
                )}

                {/* STEP 3: Personal Information */}
                {formStep === 3 && (
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Personal Information</Text>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Full Name</Text>
                      <TextInput
                        style={[styles.input, styles.readOnlyInput]}
                        value={personalInfo.fullName}
                        editable={false}
                        placeholder="Not available"
                        placeholderTextColor="#6B5D4F"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Email</Text>
                      <TextInput
                        style={[styles.input, styles.readOnlyInput]}
                        value={personalInfo.email}
                        editable={false}
                        autoCapitalize="none"
                        placeholder="Not available"
                        placeholderTextColor="#6B5D4F"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Contact Number *</Text>
                      <TextInput
                        style={[ 
                          styles.input, 
                          { backgroundColor: '#F5F5F0', color: '#6B5D4F' } 
                        ]} 
                        value={personalInfo.contactNumber}
                        editable={false}
                        keyboardType="phone-pad"
                        placeholder="Enter your contact number"
                        placeholderTextColor="#6B5D4F"
                      />
                      {validationErrors.contactNumber && <Text style={styles.errorMessage}>{validationErrors.contactNumber}</Text>}
                    </View>
                  </View>
                )}

                {/* STEP 4: Review & Confirm */}
                {formStep === 4 && (
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Review Your Booking</Text>
                    <View style={styles.summaryCard}>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Gown</Text>
                        <Text style={styles.summaryValue}>{selectedGown.name}</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Duration</Text>
                        <Text style={styles.summaryValue}>{calculateDuration()} day/s</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Dates</Text>
                        <Text style={styles.summaryValue}>{formData.startDateString} → {formData.endDateString}</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Branch</Text>
                        <Text style={styles.summaryValue}>{formData.branch}</Text>
                      </View>
                      <View style={styles.summaryDivider} />
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Daily Rate</Text>
                        <Text style={styles.summaryValue}>₱{(selectedGown.price || 0).toLocaleString()}</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Total Amount</Text>
                        <Text style={styles.summaryTotal}>₱{calculateTotalPrice().toLocaleString()}</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Downpayment (50%)</Text>
                        <Text style={styles.summaryTotal}>₱{calculateDownpayment().toLocaleString()}</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Navigation Buttons */}
                <View style={styles.wizardFooter}>
                  {formStep > 1 && (
                    <TouchableOpacity style={[styles.navButton, styles.navButtonSecondary]} onPress={goToPreviousStep}>
                      <Text style={[styles.navButtonText, styles.navButtonTextSecondary]}>← Back</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.submitBtn, formStep < 4 && styles.nextStepBtn, submitting && { opacity: 0.6 }]}
                    onPress={formStep === 4 ? handleSubmit : goToNextStep}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.submitBtnText}>
                          {formStep === 4 ? 'Confirm Booking' : 'Continue'}
                        </Text>
                        {formStep < 4 && <ChevronRight color="#fff" size={18} />}
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ) : activeTab === 'reviews' ? (
          <View style={styles.mainPadding}> 
            {rentalsLoading ? ( 
              <View style={styles.loadingContainer}> 
                <ActivityIndicator size="large" color="#1a1a1a" /> 
                <Text style={styles.loadingText}>Loading reviews...</Text> 
              </View> 
            ) : ( 
              <> 
                {/* REVIEW SUBMIT MODAL */} 
                <Modal 
                  visible={reviewModalVisible} 
                  transparent 
                  animationType="slide" 
                  onRequestClose={() => { 
                    if (!reviewSubmitting) { 
                      setReviewModalVisible(false); 
                      setReviewSuccess(false); 
                      setReviewError(''); 
                    } 
                  }} 
                > 
                  <View style={styles.successModalOverlay}> 
                    <View style={[styles.successModalContent, { alignItems: 'flex-start' }]}> 
                      {reviewSuccess ? ( 
                        <> 
                          <Text style={[styles.successTitle, { fontSize: 20 }]}>Review Submitted!</Text> 
                          <Text style={styles.successSubMessage}> 
                            Thank you for your feedback on {selectedReviewRental?.gownName}. 
                          </Text> 
                          <TouchableOpacity 
                            style={[styles.successButton, { marginTop: 16 }]} 
                            onPress={() => { 
                              setReviewModalVisible(false); 
                              setReviewSuccess(false); 
                              setReviewError(''); 
                              setReviewScore(0); 
                              setReviewComment(''); 
                            }} 
                          > 
                            <Text style={styles.successButtonText}>Done</Text> 
                          </TouchableOpacity> 
                        </> 
                      ) : ( 
                        <> 
                          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 }}> 
                            Leave a Review 
                          </Text> 
                          <Text style={{ fontSize: 13, color: '#6B5D4F', marginBottom: 16 }}> 
                            {selectedReviewRental?.gownName} 
                          </Text> 
          
                          {/* Star Rating */} 
                          <Text style={{ fontSize: 13, color: '#6B5D4F', marginBottom: 8 }}>Your Rating *</Text> 
                          <View style={{ flexDirection: 'row', marginBottom: 16, gap: 8 }}> 
                            {[1, 2, 3, 4, 5].map(star => ( 
                              <TouchableOpacity key={star} onPress={() => setReviewScore(star)}> 
                                <Text style={{ fontSize: 32, color: star <= reviewScore ? '#f59e0b' : '#d1d5db' }}>★</Text> 
                              </TouchableOpacity> 
                            ))} 
                          </View> 
          
                          {/* Comment */} 
                          <Text style={{ fontSize: 13, color: '#6B5D4F', marginBottom: 8 }}>Your Review *</Text> 
                          <TextInput 
                            style={{ 
                              width: '100%', 
                              borderWidth: 1, 
                              borderColor: '#E8DCC8', 
                              borderRadius: 8, 
                              padding: 12, 
                              fontSize: 13, 
                              color: '#1a1a1a', 
                              minHeight: 100, 
                              textAlignVertical: 'top', 
                              marginBottom: 8, 
                            }} 
                            multiline 
                            maxLength={500} 
                            placeholder="Tell us about your experience with the gown..." 
                            placeholderTextColor="#9CA3AF" 
                            value={reviewComment} 
                            onChangeText={setReviewComment} 
                          /> 
                          <Text style={{ fontSize: 11, color: '#6B5D4F', alignSelf: 'flex-end', marginBottom: 12 }}> 
                            {reviewComment.length}/500 
                          </Text> 
          
                          {reviewError ? ( 
                            <Text style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{reviewError}</Text> 
                          ) : null} 
          
                          {/* Buttons */} 
                          <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}> 
                            <TouchableOpacity 
                              style={[styles.navButton, { flex: 1 }]} 
                              onPress={() => { 
                                setReviewModalVisible(false); 
                                setReviewError(''); 
                              }} 
                              disabled={reviewSubmitting} 
                            > 
                              <Text style={styles.navButtonText}>Cancel</Text> 
                            </TouchableOpacity> 
                            <TouchableOpacity 
                              style={[styles.submitBtn, { flex: 1, opacity: reviewSubmitting ? 0.6 : 1 }]} 
                              onPress={handleSubmitReview} 
                              disabled={reviewSubmitting} 
                            > 
                              {reviewSubmitting ? ( 
                                <ActivityIndicator size="small" color="#fff" /> 
                              ) : ( 
                                <Text style={styles.submitBtnText}>Submit</Text> 
                              )} 
                            </TouchableOpacity> 
                          </View> 
                        </> 
                      )} 
                    </View> 
                  </View> 
                </Modal> 
          
                {/* COMPLETED RENTALS LIST */} 
                <View style={styles.rentalsList}> 
                  {userRentals.filter(r => r.status === 'completed').length > 0 ? ( 
                    userRentals 
                      .filter(r => r.status === 'completed') 
                      .map(rental => ( 
                        <View key={rental.id || rental._id} style={styles.rentalCard}> 
                          <View style={styles.rentalHeader}> 
                            <Text style={styles.rentalTitle}>{rental.gownName}</Text> 
                          </View> 
                          <View style={styles.rentalDetails}> 
                            <View style={styles.detailRow}> 
                              <Calendar size={16} color="#6B5D4F" /> 
                              <Text style={styles.detailText}> 
                                {rental.startDate} → {rental.endDate} 
                              </Text> 
                            </View> 
                            <View style={styles.detailRow}> 
                              <MapPin size={16} color="#6B5D4F" /> 
                              <Text style={styles.detailText}>{rental.branch || '—'}</Text> 
                            </View> 
                            <Text style={{ fontSize: 12, color: '#6B5D4F' }}> 
                              Reference ID: {rental.referenceId || rental.id} 
                            </Text> 
                          </View> 
                          <TouchableOpacity 
                            style={{ 
                              flexDirection: 'row', 
                              alignItems: 'center', 
                              gap: 8, 
                              borderWidth: 1, 
                              borderColor: '#E8DCC8', 
                              borderRadius: 20, 
                              paddingVertical: 8, 
                              paddingHorizontal: 16, 
                              alignSelf: 'flex-end', 
                              backgroundColor: '#FAF7F0', 
                              opacity: rental.hasReview ? 0.5 : 1, 
                            }} 
                            disabled={Boolean(rental.hasReview)} 
                            onPress={() => { 
                              setSelectedReviewRental(rental); 
                              setReviewScore(0); 
                              setReviewComment(''); 
                              setReviewError(''); 
                              setReviewSuccess(false); 
                              setReviewModalVisible(true); 
                            }} 
                          > 
                            <Star size={16} color="#D4AF37" fill="#D4AF37" /> 
                            <Text style={{ fontSize: 13, color: '#6B5D4F', fontWeight: '500' }}> 
                              {rental.hasReview ? 'Reviewed' : 'Leave a Review'} 
                            </Text> 
                          </TouchableOpacity> 
                        </View> 
                      )) 
                  ) : ( 
                    <View style={styles.emptyState}> 
                      <Star size={48} color="#E8DCC8" /> 
                      <Text style={styles.emptyTitle}>No completed rentals</Text> 
                      <Text style={styles.emptyText}> 
                        Completed rentals will appear here for you to review. 
                      </Text> 
                    </View> 
                  )} 
                </View> 
              </> 
            )} 
          </View>
        ) : activeTab === 'history' ? (
          <View style={styles.mainPadding}> 
            {rentalsLoading ? ( 
              <View style={styles.loadingContainer}> 
                <ActivityIndicator size="large" color="#1a1a1a" /> 
                <Text style={styles.loadingText}>Loading history...</Text> 
              </View> 
            ) : (() => { 
              const historyRentals = userRentals.filter(r => 
                ['completed','returned','cancelled'].includes(r.status) 
              ); 
              return historyRentals.length > 0 ? ( 
                <View style={styles.rentalsList}> 
                  {historyRentals.map(rental => ( 
                    <TouchableOpacity 
                      key={rental.id || rental._id} 
                      style={[styles.rentalCard, { opacity: 0.92 }]} 
                      activeOpacity={0.85} 
                      onPress={() => handleOpenRental(rental)} 
                    > 
                      <View style={styles.rentalHeader}> 
                        <Text style={styles.rentalTitle}>{rental.gownName}</Text> 
                        <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(rental.status) }]}> 
                          <Text style={[styles.statusText, { color: getStatusColor(rental.status) }]}> 
                            {getStatusLabel(rental.status)} 
                          </Text> 
                        </View> 
                      </View> 
                      <View style={styles.rentalDetails}> 
                        <View style={styles.detailRow}> 
                          <Calendar size={16} color="#6B5D4F" /> 
                          <Text style={styles.detailText}>{rental.startDate} → {rental.endDate}</Text> 
                        </View> 
                        <View style={styles.detailRow}> 
                          <MapPin size={16} color="#6B5D4F" /> 
                          <Text style={styles.detailText}>{rental.branch || '—'}</Text> 
                        </View> 
                      </View> 
                      <View style={styles.rentalFooter}> 
                        <View> 
                          <Text style={styles.rentalPriceLabel}>Total</Text> 
                          <Text style={styles.rentalPrice}>₱{(rental.totalPrice || 0).toLocaleString()}</Text> 
                        </View> 
                        {rental.status === 'cancelled' && rental.cancellationReason ? ( 
                          <Text style={{ fontSize: 11, color: '#991B1B', maxWidth: 160, textAlign: 'right' }}> 
                            Cancelled: {rental.cancellationReason} 
                          </Text> 
                        ) : null} 
                      </View> 
                    </TouchableOpacity> 
                  ))} 
                </View> 
              ) : ( 
                <View style={styles.emptyState}> 
                  <ShoppingBag size={48} color="#E8DCC8" /> 
                  <Text style={styles.emptyTitle}>No rental history yet</Text> 
                  <Text style={styles.emptyText}> 
                    Your completed and cancelled rentals will appear here. 
                  </Text> 
                </View> 
              ); 
            })()} 
          </View>
        ) : (
          /* MY RENTALS TAB */
          <View style={styles.mainPadding}>
            {rentalsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1a1a1a" />
                <Text style={styles.loadingText}>Loading your rentals...</Text>
              </View>
            ) : (
              <>
                {/* RENTAL DETAILS MODAL (always mounted in My Rentals tab) */}
                <RentalDetailsModal
                  visible={rentalModalVisible}
                  rental={selectedRental}
                  onClose={handleCloseRental}
                  onReceiptUploaded={handleReceiptUploaded}
                  authToken={authToken}
                />
                <View style={styles.rentalsList}>
                  {userRentals.filter(r => !['completed','returned','cancelled'].includes(r.status)).length > 0 ? (
                    userRentals
                      .filter(r => !['completed','returned','cancelled'].includes(r.status))
                      .map((rental) => (
                      <TouchableOpacity
                        key={rental.id || rental._id}
                        style={styles.rentalCard}
                        activeOpacity={0.85}
                        onPress={() => handleOpenRental(rental)}
                      >
                        <View style={styles.rentalHeader}>
                          <Text style={styles.rentalTitle}>{rental.gownName}</Text>
                          <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(rental.status) }]}> 
                            <Text style={[styles.statusText, { color: getStatusColor(rental.status) }]}> 
                              {getStatusLabel(rental.status)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.rentalDetails}>
                          <View style={styles.detailRow}>
                            <Calendar size={16} color="#6B5D4F" />
                            <Text style={styles.detailText}>{rental.startDate} → {rental.endDate}</Text>
                          </View>
                          {rental.pickupScheduleDate && rental.pickupScheduleTime && (
                            <View style={styles.detailRow}>
                              <MapPin size={16} color="#06b6d4" />
                              <Text style={[styles.detailText, { color: '#06b6d4', fontWeight: '600' }]}>
                                Pickup: {rental.pickupScheduleDate} at {rental.pickupScheduleTime}
                              </Text>
                            </View>
                          )}
                          <View style={styles.detailRow}>
                            <MapPin size={16} color="#6B5D4F" />
                            <Text style={styles.detailText}>{rental.branch || '—'}</Text>
                          </View>
                        </View>
                        <View style={styles.rentalFooter}>
                          <View>
                            <Text style={styles.rentalPriceLabel}>Total</Text>
                            <Text style={styles.rentalPrice}>₱{(rental.totalPrice || 0).toLocaleString()}</Text>
                          </View>
                          <Text style={styles.paidText}>Downpayment: ₱{(rental.downpayment || 0).toLocaleString()}</Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <Calendar size={48} color="#E8DCC8" />
                      <Text style={styles.emptyTitle}>No active rentals</Text>
                      <Text style={styles.emptyText}>Completed and cancelled rentals appear in Rental History.</Text>
                      <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('Collection')}>
                        <Text style={styles.emptyButtonText}>Browse Catalog</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* HAMBURGER MENU */}
      <HamburgerMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
        onNavigate={(routeName) => navigation.navigate(routeName)}
        onAuthAction={handleAuthAction}
        currentRoute={route?.name}
        styles={styles}
      />

      {/* SUCCESS MODAL */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <Text style={styles.successTitle}>✓ Booking Confirmed!</Text>
            <Text style={styles.successMessage}>Your rental has been submitted successfully.</Text>
            <Text style={styles.successSubMessage}>Status: Pending</Text>
            <TouchableOpacity style={styles.successButton} onPress={handleSuccessModalClose}>
              <Text style={styles.successButtonText}>View My Rentals</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F0' },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E8E4D9' },
  headerTitle: { fontSize: 28, fontFamily: 'serif', fontWeight: 'bold', marginBottom: 4, color: '#1a1a1a' },
  headerSub: { fontSize: 13, color: '#6B5D4F' },
  tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E8DCC8', backgroundColor: '#fff' },
  tab: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#1a1a1a' },
  tabText: { fontSize: 13, color: '#6B5D4F', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  tabTextActive: { color: '#1a1a1a', fontWeight: '600' },
  scrollContent: { flexGrow: 1, paddingBottom: 100 },
  mainPadding: { padding: 16 },
  loadingContainer: { paddingVertical: 60, alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B5D4F' },

  calendarDayDisabled: { 
    opacity: 0.3, 
    backgroundColor: '#f3f4f6', 
  }, 
  calendarDayDisabledText: { 
    color: '#9ca3af', 
    textDecorationLine: 'line-through', 
  }, 

  // Form
  formCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#E8DCC8' },
  formTitle: { fontSize: 22, fontFamily: 'serif', marginBottom: 20, color: '#1a1a1a', fontWeight: 'bold' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, color: '#6B5D4F', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E8DCC8', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: '#1a1a1a', backgroundColor: '#fff' },
  readOnlyInput: { backgroundColor: '#f8f5ef', color: '#6B5D4F' },
  inputError: { borderColor: '#dc2626', backgroundColor: '#fef2f2' },
  inputDisabled: { opacity: 0.5, backgroundColor: '#f5f5f5', borderColor: '#ccc' },
  errorMessage: { fontSize: 11, color: '#dc2626', marginTop: 4, fontWeight: '500' },

  // Dates
  dateInputContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateInputText: { fontSize: 14, color: '#1a1a1a', fontWeight: '500' },
  dateRowContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  flexHalf: { flex: 1 },

  // Branch
  selectContainer: { borderWidth: 1, borderColor: '#E8DCC8', borderRadius: 8, overflow: 'hidden', maxHeight: 150 },
  branchList: { paddingVertical: 4 },
  branchOption: { paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E8DCC8' },
  branchOptionSelected: { backgroundColor: '#1a1a1a' },
  branchOptionText: { fontSize: 13, color: '#1a1a1a' },
  branchOptionTextSelected: { color: '#fff', fontWeight: '600' },

  // Gown summary (Step 1)
  gownSummaryCard: { backgroundColor: '#F5F1E8', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E8DCC8' },
  gownSummaryImage: { width: '100%', height: 220, resizeMode: 'cover' },
  gownSummaryInfo: { padding: 16 },
  gownSummaryName: { fontSize: 20, fontFamily: 'serif', fontWeight: 'bold', color: '#1a1a1a', marginBottom: 6 },
  gownSummaryMeta: { fontSize: 13, color: '#6B5D4F', marginBottom: 8 },
  gownSummaryPrice: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  gownSummaryBranch: { fontSize: 12, color: '#6B5D4F' },

  // Summary/Review
  summaryCard: { backgroundColor: '#F5EFE6', borderRadius: 8, padding: 16, marginTop: 16, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 12, color: '#6B5D4F' },
  summaryValue: { fontSize: 13, color: '#1a1a1a', fontWeight: '500', flexShrink: 1, textAlign: 'right', maxWidth: '60%' },
  summaryDivider: { height: 1, backgroundColor: '#E8DCC8', marginVertical: 8 },
  summaryTotal: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },

  // Progress
  progressBarContainer: { marginBottom: 24 },
  progressBarBackground: { height: 8, backgroundColor: '#E8E4D9', borderRadius: 999, overflow: 'hidden' },
  progressBarFill: { height: 8, backgroundColor: '#1a1a1a', borderRadius: 999 },
  stepContent: { marginBottom: 24 },
  stepTitle: { fontSize: 16, fontFamily: 'serif', fontWeight: '600', color: '#1a1a1a', marginBottom: 18 },

  // Wizard footer
  wizardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 24 },
  navButton: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 8, borderWidth: 1, borderColor: '#1a1a1a', backgroundColor: '#fff', minWidth: 100, alignItems: 'center' },
  navButtonSecondary: { backgroundColor: '#F5F1E8' },
  navButtonText: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  navButtonTextSecondary: { color: '#1a1a1a' },
  nextStepBtn: { flex: 1 },
  submitBtn: { backgroundColor: '#1a1a1a', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minWidth: 140 },
  submitBtnText: { color: '#fff', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Rental cards (My Rentals)
  rentalsList: { gap: 12 },
  rentalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E8DCC8' },
  rentalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  rentalTitle: { fontSize: 16, fontFamily: 'serif', fontWeight: '600', color: '#1a1a1a', flexShrink: 1 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  rentalDetails: { gap: 8, marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E8DCC8' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 12, color: '#6B5D4F' },
  rentalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  rentalPriceLabel: { fontSize: 11, color: '#6B5D4F', fontWeight: '500' },
  rentalPrice: { fontSize: 18, fontFamily: 'serif', fontWeight: 'bold', color: '#1a1a1a' },
  paidText: { fontSize: 12, color: '#6B5D4F' },

  // Empty state
  emptyState: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E8DCC8', paddingVertical: 40, paddingHorizontal: 20, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontFamily: 'serif', fontWeight: '600', color: '#1a1a1a', marginTop: 12, marginBottom: 8 },
  emptyText: { fontSize: 13, color: '#6B5D4F', marginBottom: 16, textAlign: 'center' },
  emptyButton: { backgroundColor: '#1a1a1a', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, marginTop: 12 },
  emptyButtonText: { color: '#fff', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },

  // Success modal
  successModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' },
  successModalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', width: '85%', maxWidth: 400 },
  successTitle: { fontSize: 24, fontWeight: 'bold', color: '#10b981', marginBottom: 12, textAlign: 'center' },
  successMessage: { fontSize: 16, color: '#1a1a1a', marginBottom: 8, textAlign: 'center', fontWeight: '500' },
  successSubMessage: { fontSize: 12, color: '#6B5D4F', marginBottom: 24, textAlign: 'center' },
  successButton: { backgroundColor: '#1a1a1a', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 8, width: '100%' },
  successButtonText: { color: '#fff', fontSize: 14, fontWeight: '600', textTransform: 'uppercase', textAlign: 'center', letterSpacing: 0.5 },

  // Calendar (web)
  calendarModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  calendarModal: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 500 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  calendarHeaderText: { fontSize: 18, fontFamily: 'serif', fontWeight: 'bold', color: '#1a1a1a', textAlign: 'center', flex: 1 },
  calendarNavBtn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#F5F1E8', borderRadius: 6 },
  calendarNavText: { fontSize: 12, color: '#6B5D4F', fontWeight: '600' },
  calendarGrid: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  calendarDayHeader: { fontSize: 12, fontWeight: '600', color: '#6B5D4F', textAlign: 'center', width: '14.28%', paddingVertical: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  calendarDay: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#E8DCC8', backgroundColor: '#fff' },
  calendarDayEmpty: { width: '14.28%', aspectRatio: 1 },
  calendarDayText: { fontSize: 13, color: '#1a1a1a', fontWeight: '500' },
  calendarDaySelected: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  calendarDaySelectedText: { color: '#fff', fontWeight: 'bold' },
  calendarDayDisabled: { opacity: 0.4, backgroundColor: '#f5f5f5' },
  calendarDayDisabledText: { color: '#999' },
  calendarFooter: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  calendarCloseBtn: { backgroundColor: '#1a1a1a', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8 },
  calendarCloseBtnText: { color: '#fff', fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Hamburger Menu Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', paddingTop: 50 },
  dropdownBox: { width: '90%', backgroundColor: '#FAF7F0', borderRadius: 2, paddingBottom: 30, elevation: 20 },
  menuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E8E4D9' },
  menuLogo: { fontSize: 20, fontFamily: 'serif', color: '#1a1a1a' },
  navItemsList: { paddingTop: 20, paddingHorizontal: 25 },
  navRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, gap: 15 },
  navText: { fontSize: 12, letterSpacing: 2, color: '#6B5D4F', fontWeight: '500' },
  logoutRow: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#E8E4D9', paddingTop: 15 },
  logoutText: { color: '#D9534F' },
});
