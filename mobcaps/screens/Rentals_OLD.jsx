import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  TextInput,
  Platform,
  Image,
  FlatList,
} from 'react-native';
import { Calendar, MapPin, Menu, X, ShoppingBag, Ruler, User, ChevronRight, ArrowRight, Heart, Instagram, Facebook, Mail } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { sessionService } from '../services/sessionService';

const mockRentals = [
  {
    id: 'R001',
    gownName: 'Midnight Elegance',
    startDate: '2026-02-01',
    endDate: '2026-02-03',
    status: 'active',
    totalPrice: 10500,
    downpayment: 5250,
    branch: 'Taguig Main'
  },
  {
    id: 'R002',
    gownName: 'Pearl Romance',
    startDate: '2026-03-15',
    endDate: '2026-03-16',
    status: 'pending',
    totalPrice: 8000,
    downpayment: 4000,
    branch: 'BGC Branch'
  }
];

const gownOptions = [
  { id: '1', name: 'Midnight Elegance', price: 3500 },
  { id: '2', name: 'Pearl Romance', price: 8000 },
  { id: '4', name: 'Golden Hour', price: 4200 },
  { id: '5', name: 'Crimson Dreams', price: 5500 },
];

const branchOptions = [
  'Taguig Main - Cadena de Amor',
  'BGC Branch',
  'Makati Branch',
  'Quezon City'
];

export default function Rentals({ navigation, route }) {
  const [activeTab, setActiveTab] = useState('new');
  const [menuVisible, setMenuVisible] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRentals, setUserRentals] = useState(mockRentals);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [userData, setUserData] = useState(null);

  const today = new Date();
  
  const [formData, setFormData] = useState({
    gownId: '',
    gownName: '',
    startDate: new Date(today),
    endDate: new Date(today),
    startDateString: today.toISOString().split('T')[0],
    endDateString: today.toISOString().split('T')[0],
    branch: 'Taguig Main - Cadena de Amor',
    customerName: '',
    contactNumber: '',
    eventType: '',
  });

  useEffect(() => {
    const checkSession = async () => {
      const session = await sessionService.getSession();
      if (session && session.isLoggedIn) {
        setIsLoggedIn(true);
        setUserData(session.user);
        if (session.user && session.user.name) {
          setFormData(prev => ({ ...prev, customerName: session.user.name }));
        }
      }
    };
    checkSession();

    // Handle route params from Collection page
    if (route?.params?.selectedGown) {
      const gown = route.params.selectedGown;
      setFormData(prev => ({
        ...prev,
        gownId: gown.id,
        gownName: gown.name,
      }));
    }

    if (route?.params?.selectedBranch) {
      setFormData(prev => ({
        ...prev,
        branch: route.params.selectedBranch,
      }));
    }
  }, [route]);

  const handleLogout = async () => {
    await sessionService.clearSession();
    setIsLoggedIn(false);
    setMenuVisible(false);
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

  const calculateDuration = () => {
    const start = formData.startDate;
    const end = formData.endDate;
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const getSelectedGownPrice = () => {
    const gown = gownOptions.find(g => g.id === formData.gownId);
    return gown ? gown.price : 0;
  };

  const calculateDownpayment = () => {
    const duration = calculateDuration();
    const price = getSelectedGownPrice();
    return Math.floor((duration * price) / 2);
  };

  const handleContactNumberChange = (value) => {
    // Remove non-digits
    const digitsOnly = value.replace(/\D/g, '');
    // Keep only the first 10 digits after +63 (or any country code)
    const limitedDigits = digitsOnly.slice(0, 10);
    setFormData({ ...formData, contactNumber: '+63 ' + limitedDigits });
  };

  const handleStartDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
    }
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        startDate: selectedDate,
        startDateString: selectedDate.toISOString().split('T')[0],
      }));
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
    }
    if (selectedDate && selectedDate >= formData.startDate) {
      setFormData(prev => ({
        ...prev,
        endDate: selectedDate,
        endDateString: selectedDate.toISOString().split('T')[0],
      }));
    } else if (selectedDate) {
      alert('End date must be after or equal to start date');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      default:
        return '#6B5D4F';
    }
  };

  const getStatusBgColor = (status) => {
    switch (status) {
      case 'active':
        return '#ecfdf5';
      case 'pending':
        return '#fef3c7';
      default:
        return '#F5EFE6';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Rentals</Text>
          <Text style={styles.headerSub}>Manage your gown rentals and reservations</Text>
        </View>
        <TouchableOpacity onPress={() => setMenuVisible(true)}>
          <Menu color="#333" size={28} />
        </TouchableOpacity>
      </View>

      {/* TABS */}
      <View style={styles.tabsContainer}>
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
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'new' ? (
          // NEW RENTAL FORM
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Book a Rental</Text>

            {/* Customer Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Customer Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor="#999"
                value={formData.customerName}
                onChangeText={(val) => setFormData({ ...formData, customerName: val })}
              />
            </View>

            {/* Contact Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="+1 (555) 000-0000"
                placeholderTextColor="#999"
                value={formData.contactNumber}
                onChangeText={(val) => setFormData({ ...formData, contactNumber: val })}
                keyboardType="phone-pad"
              />
            </View>

            {/* Gown Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gown Selection *</Text>
              <View style={styles.selectContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gownsList}>
                  {gownOptions.map((gown) => (
                    <TouchableOpacity
                      key={gown.id}
                      style={[
                        styles.gownOption,
                        formData.gownId === gown.id && styles.gownOptionSelected
                      ]}
                      onPress={() => setFormData({ ...formData, gownId: gown.id, gownName: gown.name })}
                    >
                      <Text style={[
                        styles.gownOptionText,
                        formData.gownId === gown.id && styles.gownOptionTextSelected
                      ]}>
                        {gown.name}
                      </Text>
                      <Text style={[
                        styles.gownPrice,
                        formData.gownId === gown.id && styles.gownPriceSelected
                      ]}>
                        ₱{gown.price}/day
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Start & End Date */}
            <View style={styles.twoColumnRow}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>Start Date *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#999"
                  value={formData.startDate}
                  onChangeText={(val) => setFormData({ ...formData, startDate: val })}
                />
              </View>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>End Date *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#999"
                  value={formData.endDate}
                  onChangeText={(val) => setFormData({ ...formData, endDate: val })}
                />
              </View>
            </View>

            {/* Branch & Event Type */}
            <View style={styles.twoColumnRow}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>Branch Location *</Text>
                <View style={styles.selectContainer}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={styles.branchList}>
                    {branchOptions.map((branch, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.branchOption,
                          formData.branch === branch && styles.branchOptionSelected
                        ]}
                        onPress={() => setFormData({ ...formData, branch })}
                      >
                        <Text style={[
                          styles.branchOptionText,
                          formData.branch === branch && styles.branchOptionTextSelected
                        ]}>
                          {branch}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>Event Type</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Wedding, Gala, Prom"
                  placeholderTextColor="#999"
                  value={formData.eventType}
                  onChangeText={(val) => setFormData({ ...formData, eventType: val })}
                />
              </View>
            </View>

            {/* Rental Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Rental Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Rental Duration</Text>
                <Text style={styles.summaryValue}>{calculateDuration()} days</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Daily Rate</Text>
                <Text style={styles.summaryValue}>₱{getSelectedGownPrice().toLocaleString()}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotal}>Downpayment (50%)</Text>
                <Text style={styles.summaryTotal}>₱{calculateDownpayment().toLocaleString()}</Text>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitBtnText}>Submit Rental Request</Text>
              <ChevronRight color="#fff" size={18} />
            </TouchableOpacity>
          </View>
        ) : (
          // EXISTING RENTALS
          <View style={styles.rentalsList}>
            {userRentals.length > 0 ? (
              userRentals.map((rental) => (
                <View key={rental.id} style={styles.rentalCard}>
                  <View style={styles.rentalHeader}>
                    <Text style={styles.rentalTitle}>{rental.gownName}</Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusBgColor(rental.status) }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: getStatusColor(rental.status) }
                      ]}>
                        {rental.status.charAt(0).toUpperCase() + rental.status.slice(1)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.rentalDetails}>
                    <View style={styles.detailRow}>
                      <Calendar size={16} color="#6B5D4F" />
                      <Text style={styles.detailText}>{rental.startDate} - {rental.endDate}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <MapPin size={16} color="#6B5D4F" />
                      <Text style={styles.detailText}>{rental.branch}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>ID:</Text>
                      <Text style={styles.detailText}>{rental.id}</Text>
                    </View>
                  </View>

                  <View style={styles.rentalFooter}>
                    <View>
                      <Text style={styles.rentalPriceLabel}>Total</Text>
                      <Text style={styles.rentalPrice}>₱{rental.totalPrice.toLocaleString()}</Text>
                    </View>
                    <Text style={styles.paidText}>Paid: ₱{rental.downpayment.toLocaleString()}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Calendar size={48} color="#E8DCC8" />
                <Text style={styles.emptyTitle}>No rentals yet</Text>
                <Text style={styles.emptyText}>Start browsing our catalog to make your first rental</Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => setActiveTab('new')}
                >
                  <Text style={styles.emptyButtonText}>Create New Rental</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* HAMBURGER MENU */}
      <Modal visible={menuVisible} animationType="slide" transparent={true}>
        <View style={styles.menuOverlay}>
          <View style={styles.dropdownBox}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuLogo}>Hannah Vanessa</Text>
              <TouchableOpacity onPress={() => setMenuVisible(false)}>
                <X color="#333" size={24} />
              </TouchableOpacity>
            </View>
            <View style={styles.navItemsList}>
              <TouchableOpacity 
                style={styles.navRow} 
                onPress={() => {setMenuVisible(false); navigation.navigate('Home')}}
              >
                <ShoppingBag size={18} color="#6B5D4F" />
                <Text style={styles.navText}>HOME</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.navRow} 
                onPress={() => {setMenuVisible(false); navigation.navigate('Collection')}}
              >
                <ShoppingBag size={18} color="#6B5D4F" />
                <Text style={styles.navText}>COLLECTIONS</Text>
              </TouchableOpacity>

              {/* Hide if on Rentals page */}
              {route?.name !== 'Rentals' && (
                <TouchableOpacity 
                  style={styles.navRow} 
                  onPress={() => handleAuthAction('Rentals')}
                >
                  <Calendar size={18} color="#6B5D4F" />
                  <Text style={styles.navText}>RENTALS</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={styles.navRow} 
                onPress={() => handleAuthAction('Bespoke')}
              >
                <Ruler size={18} color="#6B5D4F" />
                <Text style={styles.navText}>BESPOKE</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.navRow} 
                onPress={() => handleAuthAction('Appointments')}
              >
                <Calendar size={18} color="#6B5D4F" />
                <Text style={styles.navText}>BOOK APPOINTMENT</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.navRow} 
                onPress={() => handleAuthAction('Profile')}
              >
                <User size={18} color="#6B5D4F" />
                <Text style={styles.navText}>PROFILE</Text>
              </TouchableOpacity>

              {isLoggedIn && (
                <TouchableOpacity 
                  style={[styles.navRow, styles.logoutBtn]} 
                  onPress={handleLogout}
                >
                  <Text style={styles.logoutText}>LOGOUT</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F0' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E8E4D9' },
  headerTitle: { fontSize: 28, fontFamily: 'serif', fontWeight: 'bold', marginBottom: 4, color: '#1a1a1a' },
  headerSub: { fontSize: 13, color: '#6B5D4F' },
  tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E8DCC8', backgroundColor: '#fff' },
  tab: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#1a1a1a' },
  tabText: { fontSize: 13, color: '#6B5D4F', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  tabTextActive: { color: '#1a1a1a', fontWeight: '600' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  formCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#E8DCC8' },
  formTitle: { fontSize: 22, fontFamily: 'serif', marginBottom: 20, color: '#1a1a1a', fontWeight: 'bold' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, color: '#6B5D4F', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E8DCC8', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: '#1a1a1a', backgroundColor: '#fff' },
  selectContainer: { borderWidth: 1, borderColor: '#E8DCC8', borderRadius: 8, overflow: 'hidden', maxHeight: 150 },
  gownsList: { paddingVertical: 8 },
  gownOption: { marginHorizontal: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 6, backgroundColor: '#F5F1E8', borderWidth: 1, borderColor: '#E8DCC8', marginVertical: 8 },
  gownOptionSelected: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  gownOptionText: { fontSize: 13, color: '#1a1a1a', fontWeight: '500', marginBottom: 4 },
  gownOptionTextSelected: { color: '#fff' },
  gownPrice: { fontSize: 11, color: '#6B5D4F', fontWeight: '500' },
  gownPriceSelected: { color: '#D4AF37' },
  branchList: { paddingVertical: 4 },
  branchOption: { paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E8DCC8' },
  branchOptionSelected: { backgroundColor: '#1a1a1a' },
  branchOptionText: { fontSize: 13, color: '#1a1a1a' },
  branchOptionTextSelected: { color: '#fff', fontWeight: '600' },
  twoColumnRow: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  summaryCard: { backgroundColor: '#F5EFE6', borderRadius: 8, padding: 16, marginTop: 16, marginBottom: 16 },
  summaryTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 12, color: '#6B5D4F' },
  summaryValue: { fontSize: 13, color: '#1a1a1a', fontWeight: '500' },
  summaryDivider: { height: 1, backgroundColor: '#E8DCC8', marginVertical: 8 },
  summaryTotal: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  submitBtn: { backgroundColor: '#1a1a1a', paddingVertical: 16, paddingHorizontal: 16, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
  submitBtnText: { color: '#fff', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  rentalsList: { gap: 12 },
  rentalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E8DCC8' },
  rentalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  rentalTitle: { fontSize: 16, fontFamily: 'serif', fontWeight: '600', color: '#1a1a1a' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  rentalDetails: { gap: 8, marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E8DCC8' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailLabel: { fontSize: 12, color: '#6B5D4F', fontWeight: '600' },
  detailText: { fontSize: 12, color: '#6B5D4F' },
  rentalFooter: { alignItems: 'flex-end' },
  rentalPriceLabel: { fontSize: 11, color: '#6B5D4F', fontWeight: '500' },
  rentalPrice: { fontSize: 18, fontFamily: 'serif', fontWeight: 'bold', color: '#1a1a1a' },
  paidText: { fontSize: 12, color: '#6B5D4F', marginTop: 4 },
  emptyState: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E8DCC8', paddingVertical: 40, paddingHorizontal: 20, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontFamily: 'serif', fontWeight: '600', color: '#1a1a1a', marginTop: 12, marginBottom: 8 },
  emptyText: { fontSize: 13, color: '#6B5D4F', marginBottom: 16 },
  emptyButton: { backgroundColor: '#1a1a1a', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, marginTop: 12 },
  emptyButtonText: { color: '#fff', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  dropdownBox: { backgroundColor: '#fff', marginTop: 0, paddingTop: 20, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxHeight: '60%' },
  menuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#E8E4D9' },
  menuLogo: { fontSize: 20, fontFamily: 'serif', color: '#1a1a1a' },
  navItemsList: { paddingVertical: 10 },
  navRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F5F1E8' },
  navText: { marginLeft: 16, fontSize: 14, color: '#1a1a1a', fontWeight: '500' },
  logoutBtn: { marginTop: 10, backgroundColor: '#f5f5f5' },
  logoutText: { fontSize: 14, color: '#e11d48', fontWeight: '600', marginLeft: 16 },
});