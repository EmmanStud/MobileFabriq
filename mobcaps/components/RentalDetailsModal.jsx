import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, Image, StyleSheet,
  ActivityIndicator, ScrollView, TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../services/apiConfig';

export default function RentalDetailsModal({ visible, rental, onClose, onReceiptUploaded, authToken }) {

  // ── State ────────────────────────────────────────────────────────────────
  const [uploading, setUploading] = useState(false);
  const [receiptImage, setReceiptImage] = useState(null);
  const [referenceId, setReferenceId] = useState('');
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  // Schedule Pickup state
  const [showPickupSchedule, setShowPickupSchedule] = useState(false);
  const [pickupTime, setPickupTime] = useState('');
  const [schedulingPickup, setSchedulingPickup] = useState(false);
  const [pickupSuccess, setPickupSuccess] = useState(false);

  if (!rental) return null;

  const receiptUrl = rental.paymentReceiptUrl || receiptImage;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatStatus = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'pending':               return 'Pending';
      case 'for_payment':           return 'For Payment';
      case 'paid_for_confirmation': return 'Paid - Awaiting Confirmation';
      case 'for_pickup':            return 'For Pickup';
      case 'active':                return 'Active';
      case 'completed':             return 'Completed';
      case 'cancelled':             return 'Cancelled';
      default:
        return (status || '').charAt(0).toUpperCase() + (status || '').slice(1);
    }
  };

  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'pending':               return '#3b82f6';
      case 'for_payment':           return '#f59e0b';
      case 'paid_for_confirmation': return '#8b5cf6';
      case 'for_pickup':            return '#06b6d4';
      case 'active':                return '#10b981';
      case 'completed':             return '#6b7280';
      case 'cancelled':             return '#ef4444';
      default:                      return '#6B5D4F';
    }
  };

  // ── Payment handlers ──────────────────────────────────────────────────────
  const handlePickImage = async () => {
    setError('');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { setError('Permission to access gallery is required.'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        setReceiptImage({
          uri: asset.uri,
          name: asset.fileName || asset.uri.split('/').pop() || 'receipt.jpg',
          type: asset.mimeType || 'image/jpeg',
        });
      }
    } catch (err) {
      setError('Failed to open gallery.');
    }
  };

  const handleUploadReceipt = async () => {
    if (!receiptImage || !referenceId) {
      setError('Please select an image and enter a reference ID.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('receipt', {
        uri: receiptImage.uri,
        name: receiptImage.name || 'receipt.jpg',
        type: receiptImage.type || 'image/jpeg',
      });
      formData.append('referenceId', referenceId);

      const fullUrl = `${API_URL}/rentals/${rental.id || rental._id}/payment`;
      const res = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData,
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('Server returned invalid response'); }
      if (!res.ok) throw new Error(data?.error || data?.message || `Server error: ${res.status}`);

      if (data.success || data.rental) {
        if (onReceiptUploaded) onReceiptUploaded();
        setShowPayment(false);
      } else {
        setError(data.error || 'Upload failed.');
      }
    } catch (err) {
      setError(err.message || 'Upload failed. Check your network.');
    } finally {
      setUploading(false);
    }
  };

  // ── Schedule Pickup handler ───────────────────────────────────────────────
  const handleSchedulePickup = async () => {
    if (!pickupTime) { setError('Please select a pickup time.'); return; }
    setSchedulingPickup(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/rentals/${rental.id || rental._id}/pickup-schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ pickupTime }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('Invalid server response'); }
      if (!res.ok) throw new Error(data?.message || `Error ${res.status}`);
      setPickupSuccess(true);
      setShowPickupSchedule(false);
      setPickupTime('');
      if (onReceiptUploaded) onReceiptUploaded(); // refresh rentals list
    } catch (err) {
      setError(err.message || 'Failed to schedule pickup.');
    } finally {
      setSchedulingPickup(false);
    }
  };


  const pickupTimeSlots = [
    '08:00','09:00','10:00','11:00','12:00',
    '13:00','14:00','15:00','16:00','17:00',
  ];

  const showSchedulePickupBtn =
    (rental.status === 'paid_for_confirmation' || rental.status === 'for_pickup') &&
    !pickupSuccess;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Main Rental Details Modal ────────────────────────────────────── */}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={styles.title}>Rental Details</Text>

              {/* Gown image from Cloudinary */}
              {rental.gownImage ? (
                <Image
                  source={{ uri: rental.gownImage }}
                  style={styles.gownImage}
                  resizeMode="cover"
                />
              ) : null}

              {/* Details box */}
              <View style={styles.detailsBox}>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Gown</Text>
                  <Text style={styles.value}>{rental.gownName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>SKU</Text>
                  <Text style={styles.value}>{rental.sku || '-'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Status</Text>
                  <Text style={[styles.value, { color: getStatusColor(rental.status), fontWeight: '700' }]}>
                    {formatStatus(rental.status)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Schedule</Text>
                  <Text style={[styles.value, { fontWeight: 'bold' }]}>
                    {rental.startDate} to {rental.endDate}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Branch</Text>
                  <Text style={styles.value}>{rental.branch}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Event Type</Text>
                  <Text style={styles.value}>{rental.eventType}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.label}>Total Price</Text>
                  <Text style={styles.value}>₱{(rental.totalPrice || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Downpayment</Text>
                  <Text style={styles.value}>₱{(rental.downpayment || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Reference ID</Text>
                  <Text style={styles.value}>{rental.referenceId || rental.id || rental._id}</Text>
                </View>

                {/* Pickup schedule info */}
                {(rental.pickupScheduleDate || rental.pickupScheduleTime) && (
                  <View style={styles.detailRow}>
                    <Text style={styles.label}>Pickup Schedule</Text>
                    <Text style={[styles.value, { color: '#06b6d4', fontWeight: '700' }]}>
                      {rental.pickupScheduleDate} at {rental.pickupScheduleTime}
                    </Text>
                  </View>
                )}

                {/* Pickup success confirmation */}
                {pickupSuccess && (
                  <View style={styles.successBox}>
                    <Text style={styles.successText}>✓ Pickup scheduled successfully!</Text>
                  </View>
                )}

                {/* Rejection reason */}
                {rental.status === 'cancelled' && rental.rejectionReason && (
                  <View style={styles.detailRow}>
                    <Text style={styles.label}>Rejection Reason</Text>
                    <Text style={[styles.value, { color: '#dc2626', fontWeight: '600' }]}>
                      {rental.rejectionReason}
                    </Text>
                  </View>
                )}
              </View>

              {/* Pay Now button */}
              {rental.status === 'for_payment' && !uploading && (
                <TouchableOpacity style={styles.payNowBtn} onPress={() => setShowConfirm(true)}>
                  <Text style={styles.payNowBtnText}>Pay Now</Text>
                </TouchableOpacity>
              )}



              {/* Schedule Pickup button */}
              {showSchedulePickupBtn && (
                <TouchableOpacity
                  style={[styles.payNowBtn, { backgroundColor: '#06b6d4', borderColor: '#06b6d4', marginTop: 10 }]}
                  onPress={() => { setError(''); setShowPickupSchedule(true); }}
                >
                  <Text style={[styles.payNowBtnText, { color: '#fff' }]}>
                    📅 {rental.pickupScheduleTime ? 'Update Pickup Time' : 'Schedule Pickup'}
                  </Text>
                </TouchableOpacity>
              )}

              {uploading && (
                <View style={{ marginTop: 24, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#1a1a1a" />
                  <Text style={{ marginTop: 8 }}>Uploading...</Text>
                </View>
              )}
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </ScrollView>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Confirm Payment Modal ─────────────────────────────────────────── */}
      <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>Confirm Payment</Text>
            <Text style={{ color: '#6B5D4F', marginBottom: 18, textAlign: 'center' }}>
              Are you sure you want to proceed to payment instructions for this rental?
            </Text>
            <View style={styles.detailsBox}>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Gown</Text>
                <Text style={styles.value}>{rental.gownName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Balance Due</Text>
                <Text style={styles.value}>₱{(rental.downpayment || 0).toLocaleString()}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
              <TouchableOpacity
                style={[styles.closeBtn, { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8DCC8' }]}
                onPress={() => setShowConfirm(false)}
              >
                <Text style={[styles.closeBtnText, { color: '#1a1a1a' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.payNowBtn, { flex: 1, backgroundColor: '#1a1a1a' }]}
                onPress={() => { setShowConfirm(false); setShowPayment(true); }}
              >
                <Text style={[styles.payNowBtnText, { color: '#fff' }]}>Yes, Proceed</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Payment Instructions Modal ────────────────────────────────────── */}
      <Modal visible={showPayment} transparent animationType="fade" onRequestClose={() => setShowPayment(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={styles.title}>Payment Instructions</Text>
              <View style={styles.detailsBox}>
                <Text style={[styles.label, { marginBottom: 8 }]}>Pay to any of the following:</Text>
                <Text style={styles.value}>Gcash: 09123123123</Text>
                <Text style={styles.value}>BDO Account: 1234 5678 9123 1234</Text>
                <Text style={styles.value}>BPI Account: 1234 1234 1234 1234</Text>
              </View>
              <Text style={[styles.label, { marginTop: 12 }]}>Reference ID *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter reference ID from your payment"
                value={referenceId}
                onChangeText={setReferenceId}
                autoCapitalize="none"
              />
              <Text style={[styles.label, { marginTop: 12 }]}>Upload Payment Receipt *</Text>
              <TouchableOpacity style={[styles.uploadBtn, { marginTop: 6 }]} onPress={handlePickImage}>
                <Text style={styles.uploadBtnText}>Choose File</Text>
              </TouchableOpacity>
              {receiptImage && (
                <Image source={{ uri: receiptImage.uri }} style={styles.receiptImage} />
              )}
              <TouchableOpacity
                style={[styles.payNowBtn, { backgroundColor: '#1a1a1a', marginTop: 18 }]}
                onPress={handleUploadReceipt}
                disabled={uploading || !referenceId || !receiptImage}
              >
                <Text style={[styles.payNowBtnText, { color: '#fff' }]}>Submit Payment</Text>
              </TouchableOpacity>
              {uploading && (
                <View style={{ marginTop: 12, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#1a1a1a" />
                  <Text style={{ marginTop: 8 }}>Uploading...</Text>
                </View>
              )}
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowPayment(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Schedule Pickup Modal ─────────────────────────────────────────── */}
      <Modal visible={showPickupSchedule} transparent animationType="fade" onRequestClose={() => setShowPickupSchedule(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={styles.title}>Schedule Pickup</Text>
              <Text style={{ color: '#6B5D4F', marginBottom: 16, textAlign: 'center', fontSize: 13 }}>
                Your pickup date is fixed to your rental start date:{' '}
                <Text style={{ fontWeight: '700', color: '#1a1a1a' }}>{rental.startDate}</Text>
              </Text>
              <Text style={[styles.label, { marginBottom: 10 }]}>Select Pickup Time *</Text>
              <View style={{ gap: 8 }}>
                {pickupTimeSlots.map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.timeSlot,
                      pickupTime === time && styles.timeSlotSelected,
                    ]}
                    onPress={() => setPickupTime(time)}
                  >
                    <Text style={[
                      styles.timeSlotText,
                      pickupTime === time && styles.timeSlotTextSelected,
                    ]}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[
                  styles.payNowBtn,
                  { backgroundColor: pickupTime ? '#06b6d4' : '#ccc', borderColor: pickupTime ? '#06b6d4' : '#ccc', marginTop: 20 },
                ]}
                onPress={handleSchedulePickup}
                disabled={schedulingPickup || !pickupTime}
              >
                {schedulingPickup
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={[styles.payNowBtnText, { color: '#fff' }]}>Confirm Pickup Time</Text>
                }
              </TouchableOpacity>
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowPickupSchedule(false)}>
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24,
    width: '90%', maxWidth: 400, maxHeight: '90%',
  },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 18, color: '#1a1a1a', textAlign: 'center' },
  gownImage: { width: '100%', height: 200, borderRadius: 10, marginBottom: 16 },
  detailsBox: {
    backgroundColor: '#FAF7F0', borderRadius: 8,
    borderWidth: 1, borderColor: '#E8DCC8', padding: 18, marginBottom: 18,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 13, color: '#6B5D4F', fontWeight: '600' },
  value: { fontSize: 13, color: '#1a1a1a', fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#E8DCC8', marginVertical: 10 },
  successBox: {
    backgroundColor: '#d1fae5', borderRadius: 8,
    padding: 12, marginTop: 8,
  },
  successText: { color: '#065f46', fontWeight: '600', textAlign: 'center' },
  receiptImage: {
    width: 220, height: 220, borderRadius: 12,
    marginTop: 8, borderWidth: 1, borderColor: '#E8DCC8',
  },
  payNowBtn: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8DCC8',
    paddingVertical: 14, borderRadius: 8, marginTop: 10, alignItems: 'center',
  },
  payNowBtnText: { color: '#1a1a1a', fontWeight: '600', fontSize: 16 },
  closeBtn: {
    backgroundColor: '#F5F1E8', paddingVertical: 12,
    borderRadius: 8, marginTop: 18, alignItems: 'center',
  },
  closeBtnText: { color: '#1a1a1a', fontWeight: '600', fontSize: 14 },
  input: {
    borderWidth: 1, borderColor: '#E8DCC8', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    color: '#1a1a1a', backgroundColor: '#fff', marginTop: 8,
  },
  uploadBtn: {
    backgroundColor: '#F5F1E8', borderWidth: 1, borderColor: '#E8DCC8',
    paddingVertical: 12, borderRadius: 8, alignItems: 'center',
  },
  uploadBtnText: { color: '#1a1a1a', fontWeight: '600', fontSize: 14 },
  error: { color: '#dc2626', marginTop: 12, textAlign: 'center', fontWeight: '500' },
  timeSlot: {
    paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 8, borderWidth: 1, borderColor: '#E8DCC8',
    backgroundColor: '#fff',
  },
  timeSlotSelected: { borderColor: '#06b6d4', backgroundColor: '#cffafe' },
  timeSlotText: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  timeSlotTextSelected: { color: '#0e7490' },
});