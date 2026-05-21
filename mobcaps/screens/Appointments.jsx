import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Calendar, Clock, MapPin, ChevronRight, Menu } from 'lucide-react-native';
import HamburgerMenu from '../components/HamburgerMenu';
import Header from '../components/Header';
import { sessionService } from '../services/sessionService';
import { mongodbService } from '../services/mongodbService';
import { showAlert } from '../services/platformService';
import { API_URL } from '../services/apiConfig';

export default function Appointments({ navigation, route, unreadCount = 0 }) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [webCalendarState, setWebCalendarState] = useState({ active: null, display: null });
  const [activeTab, setActiveTab] = useState('new');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [formData, setFormData] = useState({
    customerName: '',
    contactNumber: '',
    email: '',
    appointmentType: '',
    date: '', // yyyy-mm-dd string
    time: '',
    branch: 'Taguig Main',
    notes: ''
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [userAppointments, setUserAppointments] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [takenTimes, setTakenTimes] = useState([]);
  const [authToken, setAuthToken] = useState(null);
  const [phoneVerified, setPhoneVerified] = useState(false);

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleAppointmentId, setRescheduleAppointmentId] = useState(null);
  const [rescheduleData, setRescheduleData] = useState({ date: '', time: '', branch: 'Taguig Main', reason: '' });
  const [rescheduleErrors, setRescheduleErrors] = useState({});
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleTakenTimes, setRescheduleTakenTimes] = useState([]);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelAppointmentId, setCancelAppointmentId] = useState(null);

  const [availableGowns, setAvailableGowns] = useState([]);
  const [showGownModal, setShowGownModal] = useState(false);
  const [selectedGownId, setSelectedGownId] = useState('');
  const [selectedGownName, setSelectedGownName] = useState('');

  const appointmentTypes = [
    { value: 'consultation', label: 'Design Consultation', icon: '💭' },
    { value: 'measurement', label: 'Measurement Session', icon: '📏' },
    { value: 'fitting', label: 'Fitting Appointment', icon: '👗' },
    { value: 'pickup', label: 'Pickup/Return', icon: '📦' }
  ];

  const timeSlots = [
    '09:00','10:00','11:00','12:00',
    '13:00','14:00','15:00','16:00','17:00','18:00'
  ];

  // Helper: Get today's date as YYYY-MM-DD string in local timezone
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

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const branches = ['Taguig Main', 'BGC Branch', 'Makati Branch', 'Quezon City'];

  const getMinAppointmentDate = () => { 
    const now = new Date(); 
    const daysToAdd = now.getHours() >= 17 ? 2 : 1; 
    const min = new Date(now); 
    min.setDate(min.getDate() + daysToAdd); 
    return getLocalDateString(min); 
  }; 

  const fetchGowns = async () => {
    try {
      const res = await fetch(`${API_URL}/inventory/public`);
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data.items || []);
        setAvailableGowns(items.filter(g => g.status === 'available'));
      }
    } catch (err) {
      console.warn('Failed to fetch gowns:', err);
    }
  };

  const handleReschedule = async () => {
    const errors = {};
    if (!rescheduleData.date) errors.date = 'Please select a date';
    if (!rescheduleData.time) errors.time = 'Please select a time';
    if (!rescheduleData.reason.trim()) errors.reason = 'A reason is required for rescheduling';
    if (Object.keys(errors).length > 0) { setRescheduleErrors(errors); return; }

    setRescheduling(true);
    setRescheduleErrors({});
    try {
      const session = await sessionService.getSession();
      const token = session?.token || authToken;
      const res = await mongodbService.rescheduleAppointment(
        rescheduleAppointmentId,
        rescheduleData,
        token
      );
      if (res.success) {
        setShowRescheduleModal(false);
        await fetchUserAppointments(userEmail);
        showAlert('Success', 'Appointment rescheduled successfully!');
      } else {
        if (res.status === 409) {
          setRescheduleErrors({ time: 'This slot is already taken. Pick another time.' });
        } else {
          setRescheduleErrors({ reason: res.error || 'Failed to reschedule.' });
        }
      }
    } catch (err) {
      setRescheduleErrors({ reason: err.message || 'Failed to reschedule.' });
    } finally {
      setRescheduling(false);
    }
  };

  const getAppointmentTypeLabel = (type) => {
    const found = appointmentTypes.find(at => at.value === type);
    return found ? found.label : type;
  };

  const handleDateConfirm = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    setFormData(prev => ({ ...prev, date: dateStr }));
    setShowDatePicker(false);
  };

  const handleDatePickerOpen = () => {
    if (Platform.OS !== 'web') {
      setShowDatePicker(true);
      return;
    }

    setWebCalendarState({
      active: 'date',
      display: formData.date ? parseLocalDateString(formData.date) : new Date(),
    });
  };

  const handleWebCalendarMonthChange = (direction) => {
    if (!webCalendarState.display) return;
    const newDisplay = new Date(webCalendarState.display);
    newDisplay.setMonth(newDisplay.getMonth() + direction);
    setWebCalendarState((prev) => ({ ...prev, display: newDisplay }));
  };

  const handleWebCalendarDateSelect = (day) => {
    if (!webCalendarState.display || !webCalendarState.active) return;

    const selectedDate = new Date(
      webCalendarState.display.getFullYear(),
      webCalendarState.display.getMonth(),
      day,
      0, 0, 0, 0
    );

    const selectedDateStr = getLocalDateString(selectedDate);
    const now = new Date(); 
    const daysToAdd = now.getHours() >= 17 ? 2 : 1; 
    const minDate = new Date(now); 
    minDate.setDate(minDate.getDate() + daysToAdd); 
    minDate.setHours(0, 0, 0, 0); 
  
    if (selectedDate < minDate) { 
      const minStr = getLocalDateString(minDate); 
      showAlert('Invalid Date', `Earliest available date is ${minStr}.`); 
      return; 
    }

    setFormData((prev) => ({
      ...prev,
      date: selectedDateStr,
    }));
    setWebCalendarState({ active: null, display: null });
  };


  // Populate name/email from session and fetch appointments (same pattern as Rentals)
  React.useEffect(() => {
    const checkSession = async () => {
      const session = await sessionService.getSession();
      if (session && session.isLoggedIn) {
        setIsLoggedIn(true);
        if (session.token) setAuthToken(session.token);
        const current = await sessionService.getCurrentUser();
        setCurrentUser(current || null);
        if (current && current.email) {
          setUserEmail(current.email.toLowerCase());
          // Fetch user appointments from DB
          await fetchUserAppointments(current.email.toLowerCase());
        }
        const nameFromSession = session.name;
        const nameFromUser = current && (current.name || (current.firstName ? `${current.firstName} ${current.lastName || ''}`.trim() : ''));
        const fullName = nameFromUser || nameFromSession || '';

        const phone = current?.phoneNumber 
          || current?.phone 
          || current?.contactNumber 
          || ''; 
        const digits = phone.replace(/^\+63/, '').replace(/^0/, ''); 
        const normalized = digits.startsWith('9') && digits.length === 10 
          ? digits 
          : ''; 

        setFormData(prev => ({ 
          ...prev, 
          customerName: fullName || prev.customerName, 
          email: current?.email || prev.email, 
          contactNumber: normalized, 
        })); 
        setPhoneVerified(Boolean(current?.phoneVerified));
      }
    };
    checkSession();
  }, []);

  // Fetch availability when date/type/branch changes
  useEffect(() => {
    if (formData.date) {
      fetchAvailability(formData.date, formData.appointmentType, formData.branch);
    } else {
      setTakenTimes([]);
    }
  }, [formData.date, formData.appointmentType, formData.branch]);

  const fetchAvailability = async (date, appointmentType, branch) => {
    if (!date) return;
    try {
      const resp = await mongodbService.getAvailability(date, appointmentType, branch);
      // Web backend returns bookedTimes array of strings directly
      if (resp && Array.isArray(resp.bookedTimes)) {
        setTakenTimes(resp.bookedTimes);
      } else {
        setTakenTimes([]);
      }
    } catch (err) {
      console.warn('Failed to fetch availability', err);
      setTakenTimes([]);
    }
  };

  // Contact number handler same as Rentals
  const handleContactNumberChange = (value) => {
    const digits = (value || '').replace(/\D/g, '').slice(0, 10);
    setFormData(prev => ({ ...prev, contactNumber: digits }));

    if (digits.length === 0) {
      setValidationErrors(prev => ({ ...prev, contactNumber: 'Contact number is required' }));
    } else if (digits.length < 10) {
      setValidationErrors(prev => ({ ...prev, contactNumber: `${10 - digits.length} more digit(s) needed` }));
    } else {
      setValidationErrors(prev => {
        const newErr = { ...prev };
        delete newErr.contactNumber;
        return newErr;
      });
    }
  };

  // Fetch user appointments from MongoDB
  const fetchUserAppointments = async (email) => {
    try {
      const session = await sessionService.getSession();
      const token = session?.token || authToken;
      const appointments = await mongodbService.getAppointmentsByUser(email, token);
      if (Array.isArray(appointments)) {
        // Normalize _id to id and map database field names to display field names
        const normalized = appointments.map(apt => ({
          ...apt,
          id: apt._id || apt.id,
          // Web backend uses 'type' not 'appointmentType' for display
          type: apt.type || apt.appointmentType,
          // Web backend uses 'date' and 'time' directly (already correct field names)
          date: apt.date || apt.appointmentDate,
          time: apt.time || apt.appointmentTime,
        }));
        setUserAppointments(normalized);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setUserAppointments([]);
    }
  };

  const handleSubmit = async () => {
    // Phone verification gate — same pattern as Rentals 
    if (!phoneVerified) { 
      showAlert( 
        'Phone Number Not Verified', 
        'You need to verify your phone number in Profile Settings before booking an appointment. This helps us confirm your booking.', 
        () => navigation.navigate('Profile') 
      ); 
      return; 
    }

    const newErrors = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Please enter your name';
    }

    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = 'Contact number is required';
    } else {
      const phoneRegex = /^(\+63|0)?9\d{9}$/;
      if (!phoneRegex.test(formData.contactNumber.replace(/\s|-/g, ''))) {
        newErrors.contactNumber = 'Please enter a valid Philippine mobile number (09xx xxx xxxx)';
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Please enter your email address';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (!formData.appointmentType) {
      newErrors.appointmentType = 'Please select an appointment type';
    }

    if (formData.appointmentType === 'fitting' && !selectedGownId) {
      newErrors.selectedGown = 'Please select a gown for fitting';
    }

    if (!formData.date) {
      newErrors.date = 'Please select a date';
    }

    if (!formData.time) {
      newErrors.time = 'Please select a time slot';
    }

    if (Object.keys(newErrors).length > 0) {
      setValidationErrors(newErrors);
      return;
    }

    setValidationErrors({});
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setValidationErrors({ date: 'Please select a future date' });
      return;
    }

    const session = await sessionService.getSession();
    const token = session?.token || authToken;

    if (!token) {
      showAlert('Session Expired', 'Please log in again to book an appointment.');
      return;
    }

    // IMPORTANT: Web backend pulls customerName, email, contact from JWT token.
    // Only send these fields:
    const newAppointment = {
      appointmentType: formData.appointmentType,
      date: formData.date,
      time: formData.time,
      branch: formData.branch,
      notes: formData.notes || '',
      ...(formData.appointmentType === 'fitting' && selectedGownId
        ? { selectedGown: selectedGownId }
        : {}),
    };

    try {
      const res = await mongodbService.createAppointment(newAppointment, token);
      if (res.success && res.appointment) {
        console.log('✅ Appointment created, refreshing...');
        const freshAppointments = await mongodbService.getAppointmentsByUser(userEmail, token);
        const normalized = (Array.isArray(freshAppointments) ? freshAppointments : []).map(apt => ({
          ...apt,
          id: apt._id || apt.id,
          type: apt.type || apt.appointmentType,
          date: apt.date,
          time: apt.time,
        }));
        setUserAppointments(normalized);
      } else {
        if (res.status === 409) {
          showAlert('Time slot unavailable', 'The selected time slot is already taken. Please pick another time.');
          await fetchAvailability(formData.date, formData.appointmentType, formData.branch);
          return;
        }
        if (res.status === 400 && res.error?.includes('phone number')) {
          showAlert('Profile Incomplete', 'Please add your phone number in your profile settings before booking.');
          return;
        }
        showAlert('Error', res.error || 'Failed to book appointment. Please try again.');
        return;
      }
    } catch (err) {
      console.error('Error creating appointment:', err);
      showAlert('Error', 'Failed to book appointment. Please check your connection.');
      return;
    }

    setShowSuccessModal(true);
    setTimeout(() => {
      setShowSuccessModal(false);
      setActiveTab('existing');
    }, 2000);

    setFormData({
      customerName: formData.customerName,
      contactNumber: '',
      email: formData.email,
      appointmentType: '',
      date: '',
      time: '',
      branch: 'Taguig Main',
      notes: ''
    });
    setSelectedGownId('');
    setSelectedGownName('');
    setValidationErrors({});
  };

  // Logout helper (used by HamburgerMenu)
  const handleLogout = async () => {
    try {
      await sessionService.clearSession();
    } catch (err) {
      console.warn('Logout error', err);
    }
    setIsLoggedIn(false);
    setCurrentUser(null);
    setMenuVisible(false);
    // Redirect to home
    navigation.navigate('Home');
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.mainPadding}>
          <View style={styles.headerBlock}>
            <Text style={styles.pageTitle}>Appointments</Text>
            <Text style={styles.pageSub}>Schedule fittings, consultations, and measurements</Text>
          </View>

          {/* Tabs */}
          <View style={styles.tabsRow}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={{ flexDirection: 'row' }}
            >
              <TouchableOpacity
                onPress={() => setActiveTab('new')}
                style={[styles.tabBtn, activeTab === 'new' && styles.tabActive]}
              >
                <Text style={[styles.tabText, activeTab === 'new' && styles.tabTextActive]}>Book Appointment</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('existing')}
                style={[styles.tabBtn, activeTab === 'existing' && styles.tabActive]}
              >
                <Text style={[styles.tabText, activeTab === 'existing' && styles.tabTextActive]}>My Appointments</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('history')}
                style={[styles.tabBtn, activeTab === 'history' && styles.tabActive]}
              >
                <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>Appointment History</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {activeTab === 'new' && (
            <View style={{ gap: 16 }}>
              {/* Appointment types */}
              <View style={styles.typesGrid}>
                {appointmentTypes.map(type => (
                  <TouchableOpacity
                    key={type.value}
                    onPress={() => {
                      setFormData(prev => ({ ...prev, appointmentType: type.value }));
                      if (type.value === 'fitting') fetchGowns();
                      if (type.value !== 'fitting') {
                        setSelectedGownId('');
                        setSelectedGownName('');
                      }
                    }}
                    style={[styles.typeCard, formData.appointmentType === type.value ? styles.typeCardActive : null]}
                  >
                    <Text style={styles.typeIcon}>{type.icon}</Text>
                    <Text style={styles.typeLabel}>{type.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Form Card */}
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Appointment Details</Text>

                <View style={styles.formGrid}>
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Full Name *</Text>
                    <TextInput
                      value={formData.customerName}
                      onChangeText={(val) => setFormData(prev => ({ ...prev, customerName: val }))}
                      placeholder="Enter your name"
                      style={styles.input}
                      editable={false}
                    />
                  </View>

                  <View style={styles.formCol}>
                    <Text style={styles.label}>Contact Number *</Text>
                    <Text style={styles.helperText}>Country code shown; enter 10-digit mobile number</Text>
                    <View style={styles.contactRow}>
                      <View style={styles.countryCodeContainer}>
                        <Text style={styles.countryCodeText}>+63</Text>
                      </View>
                      <TextInput
                        style={[ 
                          styles.input, 
                          styles.contactInput, 
                          { backgroundColor: '#F5F5F0', color: '#6B5D4F' }, 
                          validationErrors.contactNumber && styles.inputError, 
                        ]} 
                        placeholder="9xxxxxxxxx"
                        placeholderTextColor="#999"
                        value={formData.contactNumber}
                        editable={false} 
                        keyboardType={Platform.OS === 'web' ? 'default' : 'number-pad'}
                        inputMode={Platform.OS === 'web' ? 'numeric' : undefined}
                        maxLength={10}
                      />
                    </View>
                    {validationErrors.contactNumber && (
                      <Text style={styles.errorMessage}>{validationErrors.contactNumber}</Text>
                    )}
                    {!phoneVerified && formData.contactNumber.length === 10 && ( 
                      <View style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        backgroundColor: '#FFF7ED', 
                        borderWidth: 1, 
                        borderColor: '#FED7AA', 
                        borderRadius: 8, 
                        padding: 10, 
                        marginTop: 6, 
                        gap: 8, 
                      }}> 
                        <Text style={{ fontSize: 14 }}>⚠️</Text> 
                        <View style={{ flex: 1 }}> 
                          <Text style={{ fontSize: 12, color: '#92400E', fontWeight: '600' }}> 
                            Phone number not verified 
                          </Text> 
                          <Text style={{ fontSize: 11, color: '#92400E', marginTop: 2 }}> 
                            Please verify your number in Profile Settings to proceed. 
                          </Text> 
                        </View> 
                        <TouchableOpacity onPress={() => navigation.navigate('Profile')}> 
                          <Text style={{ fontSize: 11, color: '#D97706', fontWeight: '700' }}> 
                            Verify → 
                          </Text> 
                        </TouchableOpacity> 
                      </View> 
                    )}
                  </View>

                  <View style={[styles.formCol, { width: '100%' }]}> 
                    <Text style={styles.label}>Email Address *</Text>
                    <TextInput
                      value={formData.email}
                      onChangeText={(val) => setFormData(prev => ({ ...prev, email: val }))}
                      placeholder="your@email.com"
                      style={styles.input}
                      keyboardType='email-address'
                      autoCapitalize='none'
                      editable={false}
                    />
                  </View>

                  {formData.appointmentType === 'fitting' && (
                    <View style={[styles.formCol, { width: '100%' }]}>
                      <Text style={styles.label}>Select Gown for Fitting *</Text>
                      <TouchableOpacity style={styles.input} onPress={() => setShowGownModal(true)}>
                        <Text style={{ color: selectedGownName ? '#1a1a1a' : '#999' }}>
                          {selectedGownName || 'Tap to select a gown'}
                        </Text>
                      </TouchableOpacity>
                      {validationErrors.selectedGown ? (
                        <Text style={styles.errorMessage}>{validationErrors.selectedGown}</Text>
                      ) : null}
                    </View>
                  )}

                  {/* Date / Time / Branch */}
                  <View style={styles.formCol}>
                    <Text style={styles.label}>Date *</Text>
                    <TouchableOpacity style={styles.input} onPress={handleDatePickerOpen}>
                      <View>
                        <Text style={{ color: formData.date ? '#1a1a1a' : '#999' }}>{formData.date || 'Select date'}</Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.formCol}>
                    <Text style={styles.label}>Time *</Text>
                    <TouchableOpacity style={styles.input} onPress={() => setShowTimeModal(true)}>
                      <Text style={{ color: formData.time ? '#1a1a1a' : '#999' }}>{formData.time || 'Select time'}</Text>
                    </TouchableOpacity>
                    {validationErrors.time && (
                      <Text style={styles.errorMessage}>{validationErrors.time}</Text>
                    )}
                  </View>

                  <View style={styles.formCol}>
                    <Text style={styles.label}>Branch *</Text>
                    <TouchableOpacity style={styles.input} onPress={() => setShowBranchModal(true)}>
                      <Text style={{ color: '#1a1a1a' }}>{formData.branch}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.formCol, { width: '100%' }]}> 
                    <Text style={styles.label}>Additional Notes</Text>
                    <TextInput
                      value={formData.notes}
                      onChangeText={(val) => setFormData(prev => ({ ...prev, notes: val }))}
                      placeholder="Any specific requests or information we should know..."
                      style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                      multiline
                    />
                  </View>

                  <TouchableOpacity style={styles.confirmBtn} onPress={handleSubmit}>
                    <Text style={styles.confirmBtnText}>Confirm Appointment</Text>
                    <ChevronRight color="#fff" size={18} />
                  </TouchableOpacity>
                </View>

              </View>
            </View>
          )}

          {activeTab === 'existing' && (
            <View style={{ gap: 12 }}>
              {userAppointments.filter(a => !['completed','cancelled'].includes(a.status)).length > 0 ? (
                userAppointments
                  .filter(a => !['completed','cancelled'].includes(a.status))
                  .map(appointment => (
                <View key={appointment.id} style={styles.appCard}>
                  <View style={styles.appHeader}>
                    <View>
                      <Text style={styles.appTitle}>{getAppointmentTypeLabel(appointment.type)}</Text>
                      {appointment.referenceId ? (
                        <Text style={{ fontSize: 12, color: '#6B5D4F', marginTop: 2 }}>
                          Ref: {appointment.referenceId}
                        </Text>
                      ) : null}
                      {appointment.selectedGownName ? (
                        <Text style={{ fontSize: 12, color: '#6B5D4F', marginTop: 4 }}>
                          👗 Gown: {appointment.selectedGownName}
                        </Text>
                      ) : null}
                    </View>
                    <View style={[styles.statusBadge, {
                      backgroundColor: 
                        appointment.status === 'pending'   ? '#FEF3C7' : 
                        appointment.status === 'scheduled' ? '#DBEAFE' : 
                        appointment.status === 'completed' ? '#ECFDF5' : 
                        appointment.status === 'cancelled' ? '#FEE2E2' : 
                        '#F3F4F6'
                    }]}>
                      <Text style={[styles.statusText, {
                        color: 
                          appointment.status === 'pending'   ? '#92400E' : 
                          appointment.status === 'scheduled' ? '#1D4ED8' : 
                          appointment.status === 'completed' ? '#065F46' : 
                          appointment.status === 'cancelled' ? '#991B1B' : 
                          '#374151'
                      }]}>
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.appDetailsRow}>
                    <View style={styles.appDetailItem}><Calendar size={14} color="#6B5D4F" /><Text style={styles.appDetailText}>{appointment.date}</Text></View>
                    <View style={styles.appDetailItem}><Clock size={14} color="#6B5D4F" /><Text style={styles.appDetailText}>{appointment.time}</Text></View>
                    <View style={styles.appDetailItem}><MapPin size={14} color="#6B5D4F" /><Text style={styles.appDetailText}>{appointment.branch}</Text></View>
                  </View>

                  {appointment.notes ? <Text style={styles.notesText}>{appointment.notes}</Text> : null}

                  {appointment.cancellationReason ? (
                    <View style={{ backgroundColor: '#FEE2E2', borderRadius: 6, padding: 8, marginTop: 6 }}>
                      <Text style={{ color: '#991B1B', fontSize: 12, fontWeight: '600' }}>
                        Cancelled: {appointment.cancellationReason}
                      </Text>
                    </View>
                  ) : null}

                  {appointment.status === 'scheduled' && (
                    <View style={styles.appActionsRow}>
                      <TouchableOpacity 
                        style={styles.actionBtn}
                        onPress={() => {
                          setRescheduleAppointmentId(appointment.id);
                          setRescheduleData({ date: '', time: '', branch: appointment.branch || 'Taguig Main', reason: '' });
                          setRescheduleErrors({});
                          setRescheduleTakenTimes([]);
                          setShowRescheduleModal(true);
                        }}
                      >
                        <Text>Reschedule</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionBtn, { borderColor: '#FCA5A5' }]}
                        onPress={() => {
                          setCancelAppointmentId(appointment.id);
                          setShowCancelConfirm(true);
                        }}
                      >
                        <Text style={{ color: '#DC2626' }}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))) : (
                <View style={styles.noAppointmentsBox}>
                  <Calendar size={36} color="#E8DCC8" />
                  <Text style={styles.noApptTitle}>No upcoming appointments</Text>
                  <Text style={styles.noApptSub}>Past appointments appear in Appointment History.</Text>
                  <TouchableOpacity style={styles.bookBtn} onPress={() => setActiveTab('new')}>
                    <Text style={styles.bookBtnText}>Book Appointment</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {activeTab === 'history' && ( 
            <View style={{ gap: 12 }}> 
              {(() => { 
                const historyAppts = userAppointments.filter(a => 
                  ['completed','cancelled'].includes(a.status) 
                ); 
                return historyAppts.length > 0 ? ( 
                  historyAppts.map(appointment => ( 
                    <View key={appointment.id} style={styles.appCard}> 
                      <View style={styles.appHeader}> 
                        <View> 
                          <Text style={styles.appTitle}> 
                            {getAppointmentTypeLabel(appointment.type)} 
                          </Text> 
                          {appointment.referenceId ? ( 
                            <Text style={{ fontSize: 12, color: '#6B5D4F', marginTop: 2 }}> 
                              Ref: {appointment.referenceId} 
                            </Text> 
                          ) : null} 
                          {appointment.selectedGownName ? ( 
                            <Text style={{ fontSize: 12, color: '#6B5D4F', marginTop: 4 }}> 
                              👗 {appointment.selectedGownName} 
                            </Text> 
                          ) : null} 
                        </View> 
                        <View style={[styles.statusBadge, { 
                          backgroundColor: 
                            appointment.status === 'completed' ? '#ECFDF5' : 
                            appointment.status === 'cancelled'  ? '#FEE2E2' : '#F3F4F6' 
                        }]}> 
                          <Text style={[styles.statusText, { 
                            color: 
                              appointment.status === 'completed' ? '#065F46' : 
                              appointment.status === 'cancelled'  ? '#991B1B' : '#374151' 
                          }]}> 
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)} 
                          </Text> 
                        </View> 
                      </View> 
      
                      <View style={styles.appDetailsRow}> 
                        <View style={styles.appDetailItem}> 
                          <Calendar size={14} color="#6B5D4F" /> 
                          <Text style={styles.appDetailText}>{appointment.date}</Text> 
                        </View> 
                        <View style={styles.appDetailItem}> 
                          <Clock size={14} color="#6B5D4F" /> 
                          <Text style={styles.appDetailText}>{appointment.time}</Text> 
                        </View> 
                        <View style={styles.appDetailItem}> 
                          <MapPin size={14} color="#6B5D4F" /> 
                          <Text style={styles.appDetailText}>{appointment.branch}</Text> 
                        </View> 
                      </View> 
      
                      {appointment.cancellationReason ? ( 
                        <View style={{ backgroundColor: '#FEE2E2', borderRadius: 6, padding: 8, marginTop: 6 }}> 
                          <Text style={{ color: '#991B1B', fontSize: 12, fontWeight: '600' }}> 
                            Cancelled: {appointment.cancellationReason} 
                          </Text> 
                        </View> 
                      ) : null} 
      
                      {appointment.notes ? ( 
                        <Text style={styles.notesText}>{appointment.notes}</Text> 
                      ) : null} 
                    </View> 
                  )) 
                ) : ( 
                  <View style={styles.emptyState}> 
                    <Calendar size={48} color="#E8DCC8" /> 
                    <Text style={styles.emptyTitle}>No appointment history yet</Text> 
                    <Text style={styles.emptyText}> 
                      Your completed and cancelled appointments will appear here. 
                    </Text> 
                  </View> 
                ); 
              })()} 
            </View> 
          )}

        </View>
      </ScrollView>

      {/* Branch Picker Modal */}
      <Modal visible={showBranchModal} transparent animationType="fade">
        <View style={styles.modalOverlayCentered}>
          <View style={styles.branchModalCard}>
            <Text style={styles.branchModalTitle}>Select Branch</Text>
            {branches.map(b => (
              <TouchableOpacity key={b} style={styles.branchItem} onPress={() => { setFormData(prev => ({ ...prev, branch: b })); setShowBranchModal(false); }}>
                <Text style={styles.branchText}>{b}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.branchCancel} onPress={() => setShowBranchModal(false)}>
              <Text style={{ color: '#6B5D4F' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal - Grid Layout */}
      <Modal visible={showTimeModal} transparent animationType="fade">
        <View style={styles.modalOverlayCentered}>
          <View style={styles.timePickerModal}>
            <View style={styles.timePickerHeader}>
              <Text style={styles.timePickerTitle}>Select Time Slot</Text>
              <TouchableOpacity onPress={() => setShowTimeModal(false)}>
                <Text style={styles.timePickerClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.timeGridContainer}>
              {timeSlots.map((ts) => {
                const disabled = takenTimes.includes(ts);
                const isSelected = formData.time === ts;
                return (
                  <TouchableOpacity
                    key={ts}
                    style={[
                      styles.timeSlotButton,
                      isSelected && styles.timeSlotSelected,
                      disabled && styles.timeSlotDisabled,
                    ]}
                    disabled={disabled}
                    onPress={() => {
                      if (disabled) return;
                      setFormData(prev => ({ ...prev, time: ts }));
                      setShowTimeModal(false);
                      setValidationErrors(prev => { const n = { ...prev }; delete n.time; return n; });
                    }}
                  >
                    <Text
                      style={[
                        styles.timeSlotText,
                        isSelected && styles.timeSlotSelectedText,
                        disabled && styles.timeSlotDisabledText,
                      ]}
                    >
                      {ts}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.timePickerFooter}>
              <Text style={styles.timePickerHint}>
                {formData.time ? `Selected: ${formData.time}` : 'Choose an available time'}
              </Text>
              <TouchableOpacity style={styles.timePickerDone} onPress={() => setShowTimeModal(false)}>
                <Text style={styles.timePickerDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date picker for native platforms */}
      {Platform.OS !== 'web' && (
        <DateTimePickerModal
          isVisible={showDatePicker}
          mode="date"
          onConfirm={handleDateConfirm}
          onCancel={() => setShowDatePicker(false)}
          minimumDate={new Date()}
        />
      )}

      {/* Date picker web calendar modal (Rentals style) */}
      {Platform.OS === 'web' && (
        <Modal
          visible={webCalendarState.active !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setWebCalendarState({ active: null, display: null })}
        >
          <View style={styles.calendarModalOverlay}>
            <View style={styles.calendarModal}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity
                  onPress={() => handleWebCalendarMonthChange(-1)}
                  style={styles.calendarNavBtn}
                >
                  <Text style={styles.calendarNavText}>← Prev</Text>
                </TouchableOpacity>
                <Text style={styles.calendarHeaderText}>
                  {webCalendarState.display ?
                    webCalendarState.display.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    : ''
                  }
                </Text>
                <TouchableOpacity
                  onPress={() => handleWebCalendarMonthChange(1)}
                  style={styles.calendarNavBtn}
                >
                  <Text style={styles.calendarNavText}>Next →</Text>
                </TouchableOpacity>
              </View>

              {webCalendarState.display && (
                <View style={styles.calendarGrid}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <Text key={day} style={styles.calendarDayHeader}>{day}</Text>
                  ))}

                  {(() => {
                    const firstDay = getFirstDayOfMonth(webCalendarState.display);
                    const daysInMonth = getDaysInMonth(webCalendarState.display);
                    const days = [];

                    for (let i = 0; i < firstDay; i++) {
                      days.push(<View key={`empty-${i}`} style={styles.calendarDayEmpty} />);
                    }

                    for (let day = 1; day <= daysInMonth; day++) {
                      const date = new Date(
                        webCalendarState.display.getFullYear(),
                        webCalendarState.display.getMonth(),
                        day
                      );
                      const dateStr = getLocalDateString(date);
                      const isSelected = dateStr === formData.date;
                      const isPast = date < new Date(new Date().setHours(0,0,0,0));

                      days.push(
                        <TouchableOpacity
                          key={day}
                          style={[
                            styles.calendarDay,
                            isSelected && styles.calendarDaySelected,
                            isPast && styles.calendarDayDisabled,
                          ]}
                          onPress={() => {
                            if (!isPast) handleWebCalendarDateSelect(day);
                          }}
                          disabled={isPast}
                        >
                          <Text style={[
                            styles.calendarDayText,
                            isSelected && styles.calendarDaySelectedText,
                            isPast && styles.calendarDayDisabledText,
                          ]}>
                            {day}
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                    return days;
                  })()}
                </View>
              )}

              <View style={styles.calendarFooter}>
                <TouchableOpacity
                  style={styles.calendarCloseBtn}
                  onPress={() => setWebCalendarState({ active: null, display: null })}
                >
                  <Text style={styles.calendarCloseBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* STANDARDIZED HAMBURGER MENU */}
      <HamburgerMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
        onNavigate={(routeName) => { setMenuVisible(false); navigation.navigate(routeName); }}
        onAuthAction={(routeName) => { setMenuVisible(false); /* reuse existing protected navigation logic */ navigation.navigate(routeName); }}
        currentRoute={route?.name || 'Appointments'}
        styles={styles}
      />

      {/* SUCCESS MODAL - Shows after confirming appointment */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconCircle}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
            <Text style={styles.successTitle}>Appointment Confirmed!</Text>
            <Text style={styles.successMessage}>Your appointment has been successfully scheduled. You will receive a confirmation via SMS and email within the next hour.</Text>
            <Text style={styles.redirectText}>Redirecting to My Appointments...</Text>
          </View>
        </View>
      </Modal>

      {/* Reschedule Modal */}
      <Modal visible={showRescheduleModal} transparent animationType="fade" onRequestClose={() => setShowRescheduleModal(false)}>
        <View style={styles.modalOverlayCentered}>
          <View style={[styles.branchModalCard, { maxHeight: '85%' }]}>
            <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
              <Text style={styles.branchModalTitle}>Reschedule Appointment</Text>

              <Text style={[styles.label, { marginTop: 8 }]}>New Date * (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={rescheduleData.date}
                onChangeText={(val) => {
                  setRescheduleData(prev => ({ ...prev, date: val }));
                  if (val.length === 10) {
                    mongodbService.getAvailability(val, '', rescheduleData.branch)
                      .then(resp => setRescheduleTakenTimes(resp?.bookedTimes || []));
                  }
                }}
                keyboardType="numbers-and-punctuation"
              />
              {rescheduleErrors.date ? <Text style={styles.errorMessage}>{rescheduleErrors.date}</Text> : null}

              <Text style={[styles.label, { marginTop: 8 }]}>New Time *</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {timeSlots.map(ts => {
                  const taken = rescheduleTakenTimes.includes(ts);
                  const selected = rescheduleData.time === ts;
                  return (
                    <TouchableOpacity
                      key={ts}
                      disabled={taken}
                      onPress={() => setRescheduleData(prev => ({ ...prev, time: ts }))}
                      style={[{
                        paddingVertical: 8, paddingHorizontal: 12,
                        borderRadius: 8, borderWidth: 1,
                        borderColor: selected ? '#1a1a1a' : taken ? '#eee' : '#E8DCC8',
                        backgroundColor: selected ? '#1a1a1a' : taken ? '#f5f5f5' : '#fff',
                      }]}
                    >
                      <Text style={{ color: selected ? '#fff' : taken ? '#ccc' : '#1a1a1a', fontSize: 13, fontWeight: '600' }}>{ts}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {rescheduleErrors.time ? <Text style={styles.errorMessage}>{rescheduleErrors.time}</Text> : null}

              <Text style={[styles.label, { marginTop: 8 }]}>Branch</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowBranchModal(true)}
              >
                <Text style={{ color: '#1a1a1a' }}>{rescheduleData.branch}</Text>
              </TouchableOpacity>

              <Text style={[styles.label, { marginTop: 8 }]}>Reason for Rescheduling *</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Please explain why you need to reschedule"
                value={rescheduleData.reason}
                onChangeText={(val) => setRescheduleData(prev => ({ ...prev, reason: val }))}
                multiline
              />
              {rescheduleErrors.reason ? <Text style={styles.errorMessage}>{rescheduleErrors.reason}</Text> : null}

              <TouchableOpacity
                style={[styles.confirmBtn, { marginTop: 16 }, rescheduling && { opacity: 0.6 }]}
                onPress={handleReschedule}
                disabled={rescheduling}
              >
                {rescheduling
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.confirmBtnText}>Confirm Reschedule</Text>
                }
              </TouchableOpacity>
            </ScrollView>
            <TouchableOpacity style={styles.branchCancel} onPress={() => setShowRescheduleModal(false)}>
              <Text style={{ color: '#6B5D4F' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Cancel Info Modal */}
      <Modal visible={showCancelConfirm} transparent animationType="fade" onRequestClose={() => setShowCancelConfirm(false)}>
        <View style={styles.modalOverlayCentered}>
          <View style={styles.branchModalCard}>
            <Text style={styles.branchModalTitle}>Cancel Appointment</Text>
            <Text style={{ color: '#6B5D4F', textAlign: 'center', marginBottom: 16, fontSize: 14 }}>
              To cancel your appointment, please contact us directly:{"\n\n"}
              📞 +63 912 345 6789{"\n"}
              📧 hello@hannahvanessa.com{"\n\n"}
              Our team will process your cancellation request.
            </Text>
            <TouchableOpacity style={styles.confirmBtn} onPress={() => setShowCancelConfirm(false)}>
              <Text style={styles.confirmBtnText}>OK, Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Gown Picker Modal */}
      <Modal visible={showGownModal} transparent animationType="fade" onRequestClose={() => setShowGownModal(false)}>
        <View style={styles.modalOverlayCentered}>
          <View style={[styles.branchModalCard, { maxHeight: '80%' }]}>
            <Text style={styles.branchModalTitle}>Select Gown for Fitting</Text>
            <ScrollView>
              {availableGowns.length === 0 ? (
                <Text style={{ color: '#6B5D4F', textAlign: 'center', padding: 16 }}>
                  No available gowns found.
                </Text>
              ) : (
                availableGowns.map(gown => (
                  <TouchableOpacity
                    key={gown._id || gown.id}
                    style={[
                      styles.branchItem,
                      selectedGownId === (gown._id || gown.id) && { backgroundColor: '#F5EFE6' }
                    ]}
                    onPress={() => {
                      setSelectedGownId(gown._id || gown.id);
                      setSelectedGownName(gown.name);
                      setShowGownModal(false);
                      setValidationErrors(prev => {
                        const n = { ...prev };
                        delete n.selectedGown;
                        return n;
                      });
                    }}
                  >
                    <Text style={styles.branchText}>{gown.name}</Text>
                    <Text style={{ fontSize: 11, color: '#6B5D4F' }}>
                      {gown.color} • {gown.branch}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={styles.branchCancel} onPress={() => setShowGownModal(false)}>
              <Text style={{ color: '#6B5D4F' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F0' },
  scrollContent: { paddingBottom: 40 },
  mainPadding: { padding: 16 },
  headerBlock: { marginBottom: 12 },
  pageTitle: { fontSize: 32, fontFamily: 'serif', marginBottom: 6 },
  pageSub: { color: '#6B5D4F' },
  tabsRow: { flexDirection: 'row', gap: 8, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E8DCC8' },
  tabBtn: { paddingVertical: 10, paddingHorizontal: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#D4AF37' },
  tabText: { color: '#6B5D4F', textTransform: 'uppercase', letterSpacing: 0.5 },
  tabTextActive: { color: '#1a1a1a', fontWeight: '600' },
  typesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  typeCard: { width: '48%', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E8DCC8', backgroundColor: '#fff' },
  typeCardActive: { borderColor: '#D4AF37', backgroundColor: '#fff' },
  typeIcon: { fontSize: 28, marginBottom: 8 },
  typeLabel: { fontSize: 16, fontWeight: '500' },
  formCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E8DCC8', padding: 16 },
  formTitle: { fontSize: 20, marginBottom: 12 },
  formGrid: { gap: 12 },
  formCol: { width: '48%' },
  label: { fontSize: 12, color: '#6B5D4F', marginBottom: 6 },
  input: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E8DCC8', backgroundColor: '#fff' },
  helperText: { fontSize: 11, color: '#6B5D4F', marginBottom: 6 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countryCodeContainer: { paddingVertical: 12, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#F3F1ED', borderWidth: 1, borderColor: '#E8DCC8' },
  countryCodeText: { color: '#1a1a1a', fontWeight: '600' },
  contactInput: { flex: 1, paddingLeft: 12 },
  inputError: { borderColor: '#DC2626' },
  errorMessage: { fontSize: 11, color: '#dc2626', marginTop: 4, fontWeight: '500' },
  timeSlotsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeSlot: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#E8DCC8', backgroundColor: '#fff' },
  timeSlotActive: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  timeSlotText: { fontSize: 13 },
  confirmBtn: { marginTop: 12, backgroundColor: '#1a1a1a', paddingVertical: 14, borderRadius: 999, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  confirmBtnText: { color: '#fff', fontWeight: '600' },
  appCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E8DCC8', padding: 16 },
  appHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  appTitle: { fontSize: 18, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12 },
  appDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  appDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appDetailText: { color: '#6B5D4F' },
  notesText: { fontStyle: 'italic', color: '#6B5D4F' },
  appActionsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#E8DCC8', borderRadius: 999 },
  calendarModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  calendarModal: { width: '90%', maxHeight: '70%', backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E8DCC8' },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calendarNavBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  calendarNavText: { color: '#6B5D4F', fontSize: 13, fontWeight: '600' },
  calendarHeaderText: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  calendarDayHeader: { width: '14.28%', textAlign: 'center', fontSize: 12, fontWeight: '600', marginBottom: 4, color: '#6B5D4F' },
  calendarDay: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginVertical: 2, borderRadius: 6 },
  calendarDayText: { color: '#1a1a1a' },
  calendarDaySelected: { backgroundColor: '#1a1a1a' },
  calendarDaySelectedText: { color: '#fff', fontWeight: '700' },
  calendarDayDisabled: { backgroundColor: '#f5f5f5' },
  calendarDayDisabledText: { color: '#b5b5b5' },
  calendarFooter: { marginTop: 12, alignItems: 'flex-end' },
  calendarCloseBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  calendarCloseBtnText: { color: '#6B5D4F', fontWeight: '600' },
  noAppointmentsBox: { alignItems: 'center', padding: 20, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E8DCC8' },
  noApptTitle: { fontSize: 18, marginTop: 8 },
  noApptSub: { color: '#6B5D4F', marginBottom: 8 },
  bookBtn: { backgroundColor: '#1a1a1a', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  bookBtnText: { color: '#fff' },
  modalOverlayCentered: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  branchModalCard: { width: '90%', backgroundColor: '#fff', padding: 16, borderRadius: 8 },
  branchModalTitle: { fontSize: 16, marginBottom: 12 },
  timePickerModal: { width: '95%', maxHeight: '80%', backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E8DCC8' },
  timePickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  timePickerTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  timePickerClose: { fontSize: 24, color: '#6B5D4F', fontWeight: '600' },
  timeGridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  timeSlotButton: { flex: 0, width: '22%', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1.5, borderColor: '#E8DCC8', backgroundColor: '#fff', alignItems: 'center' },
  timeSlotSelected: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  timeSlotDisabled: { backgroundColor: '#f5f5f5', borderColor: '#ddd' },
  timeSlotText: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  timeSlotSelectedText: { color: '#fff' },
  timeSlotDisabledText: { color: '#aaa' },
  timePickerFooter: { borderTopWidth: 1, borderTopColor: '#E8DCC8', paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timePickerHint: { fontSize: 12, color: '#6B5D4F', fontStyle: 'italic' },
  timePickerDone: { backgroundColor: '#1a1a1a', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginLeft: 12 },
  timePickerDoneText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  /* Hamburger / menu styles (copied from Home.jsx for consistency) */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', paddingTop: 50 },
  dropdownBox: { width: '90%', backgroundColor: '#FAF7F0', borderRadius: 2, paddingBottom: 30, elevation: 20 },
  menuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E8E4D9' },
  menuLogo: { fontSize: 20, fontFamily: 'serif', color: '#1a1a1a' },
  navItemsList: { paddingTop: 20, paddingHorizontal: 25 },
  navRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, gap: 15 },
  navText: { fontSize: 12, letterSpacing: 2, color: '#6B5D4F', fontWeight: '500' },
  logoutRow: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#E8E4D9', paddingTop: 15 },
  logoutText: { color: '#D9534F' },
  branchItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F1E8' },
  branchText: { color: '#1a1a1a' },
  branchCancel: { marginTop: 12, alignItems: 'center' },
  /* Success modal styles */
  successModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' },
  successModalCard: { width: '80%', backgroundColor: '#fff', borderRadius: 16, padding: 30, alignItems: 'center', elevation: 10 },
  successIconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  successIcon: { fontSize: 40, color: '#10B981', fontWeight: 'bold' },
  successTitle: { fontSize: 22, fontFamily: 'serif', color: '#1a1a1a', marginBottom: 12, fontWeight: '600' },
  successMessage: { fontSize: 14, color: '#6B5D4F', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  redirectText: { fontSize: 12, color: '#D4AF37', fontWeight: '500', fontStyle: 'italic' }
});
