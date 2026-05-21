# Complete Updated Components - Implementation

## EditProfileModal.jsx (KEY SECTIONS)

This is the cleaned-up version with all changes applied.

### Function Signature:
```jsx
export default function EditProfileModal({
  visible,
  onClose,
  customerData,
  onSave,
  isLoading,
  onShowAlert,  // ← NEW PROP
}) {
  // Import validators from authService for firstName/lastName validation
  const { firstName: validateFirstName, lastName: validateLastName } = require('../services/authService').validators;
  const [firstName, setFirstName] = useState(customerData?.firstName || '');
  const [lastName, setLastName] = useState(customerData?.lastName || '');
  const [email, setEmail] = useState(customerData?.email || '');
  const [phone, setPhone] = useState(customerData?.phone || '');
  const [address, setAddress] = useState(customerData?.address || '');

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordErrors, setPasswordErrors] = useState({});
  const [generalErrors, setGeneralErrors] = useState({});
  const [phoneFieldTouched, setPhoneFieldTouched] = useState(false);
  const [oldPasswordCorrect, setOldPasswordCorrect] = useState(null);
  const [verifyingPassword, setVerifyingPassword] = useState(false);

  // Debounce timer for password verification
  let verifyPasswordTimeout = null;

  // New password checklist
  const newPasswordChecklist = passwordChecklist(newPassword);

  // Sync with customerData when modal opens
  useEffect(() => {
    if (visible && customerData) {
      setFirstName(customerData.firstName || '');
      setLastName(customerData.lastName || '');
      setEmail(customerData.email || '');
      setPhone(customerData.phone || '');
      setAddress(customerData.address || '');
      setPhoneFieldTouched(false);
    }
  }, [visible, customerData]);

  // ... rest of validation functions ...
```

### handleSave Method (UPDATED):
```jsx
  const handleSave = async () => {
    // Validate profile fields
    if (!validateProfile()) {
      return;
    }

    // If password section is shown, validate passwords too
    if (showPasswordSection && (oldPassword || newPassword || confirmPassword)) {
      if (!validatePassword()) {
        return;
      }
    }

    // Prepare data to save
    const updatedData = {
      firstName,
      lastName,
      fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
      email,
      phone,
      address,
    };

    // Add password if user is changing it
    if (showPasswordSection && oldPassword && newPassword) {
      try {
        const hashedOldPassword = SHA256(oldPassword).toString(Hex);
        const hashedNewPassword = SHA256(newPassword).toString(Hex);
        updatedData.oldPassword = hashedOldPassword;
        updatedData.newPassword = hashedNewPassword;
      } catch (err) {
        if (typeof onShowAlert === 'function') {
          onShowAlert('Error', 'Failed to process password');
        }
        return;
      }
    }

    try {
      await onSave(updatedData);
      if (typeof onShowAlert === 'function') {
        onShowAlert('Success', 'Profile updated successfully', () => onClose());
      }
      onClose();
    } catch (err) {
      if (typeof onShowAlert === 'function') {
        onShowAlert('Error', err.message || 'Failed to save profile');
      }
    }
  };
```

### Return Statement (UPDATED):
```jsx
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={handleClose} disabled={isLoading}>
              <X color="#333" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContainer}>
            {/* First Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={[styles.input, generalErrors.firstName && styles.inputError]}
                placeholder="Enter first name"
                value={firstName}
                onChangeText={(val) => {
                  const sanitized = sanitizeNameInput(val);
                  setFirstName(sanitized);
                }}
                editable={!isLoading}
              />
              {generalErrors.firstName && (
                <Text style={styles.errorText}>{generalErrors.firstName}</Text>
              )}
            </View>

            {/* ... Rest of form (unchanged) ... */}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton, isLoading && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={isLoading}
              >
                <Text style={styles.saveButtonText}>
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
```

---

## Profile.jsx (KEY SECTIONS)

### State Management (UNCHANGED):
```jsx
export default function Profile({ navigation, route }) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userEmail, setUserEmail] = useState(null);

  const [customerData, setCustomerData] = useState({
    firstName: 'Sarah',
    lastName: 'Johnson',
    fullName: 'Sarah Johnson',
    email: 'sarah.johnson@email.com',
    phone: '+63 912 345 6789',
    address: '123 Fashion Street, Taguig City, Metro Manila',
    memberSince: 'January 2025',
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);

  // Alert Configuration (UNCHANGED)
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    mode: 'alert',
    onConfirm: null,
    onCancel: null,
  });

  // Alert Functions (UNCHANGED)
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

  // ... other methods (unchanged) ...
```

### Modal Rendering (UPDATED - REORDERED):
```jsx
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.siteHeader}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={styles.logo}>Hannah Vanessa</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMenuVisible(true)}>
          <Menu color="#333" size={28} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ... Profile content ... */}
      </ScrollView>

      {/* Edit Profile Modal - RENDERED FIRST */}
      <EditProfileModal
        visible={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        customerData={customerData}
        onSave={handleSaveProfile}
        isLoading={isEditLoading}
        onShowAlert={openAlert}  {/* ← NEW PROP ADDED */}
      />

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
```

---

## CustomAlertModal.jsx (NO CHANGES - REFERENCE)

```jsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';

export default function CustomAlertModal({
  visible,
  title,
  message,
  mode = 'alert',
  onConfirm,
  onCancel,
  onClose,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}) {
  const handleClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (typeof onConfirm === 'function') {
      onConfirm();
    }
    handleClose();
  };

  const handleCancel = () => {
    if (typeof onCancel === 'function') {
      onCancel();
    }
    handleClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actionRow}>
            {mode === 'confirm' && (
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
                <Text style={[styles.buttonText, styles.cancelButtonText]}>{cancelText}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                mode === 'confirm' ? styles.confirmButton : styles.okButton,
              ]}
              onPress={handleConfirm}
            >
              <Text style={[styles.buttonText, mode === 'confirm' ? styles.confirmButtonText : styles.okButtonText]}>
                {mode === 'confirm' ? confirmText : 'OK'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'web' ? 40 : 50,
  },
  alertBox: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8E4D9',
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 20,
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  button: {
    minWidth: 90,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F2F2',
    borderWidth: 1,
    borderColor: '#D1D1D1',
  },
  confirmButton: {
    backgroundColor: '#D4AF37',
  },
  okButton: {
    backgroundColor: '#1A1A1A',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  cancelButtonText: {
    color: '#4A4A4A',
  },
  confirmButtonText: {
    color: '#fff',
  },
  okButtonText: {
    color: '#fff',
  },
});
```

---

## Import Statements (REFERENCE)

### EditProfileModal.jsx - CORRECT IMPORTS:
```jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { X, Eye, EyeOff } from 'lucide-react-native';
import SHA256 from 'crypto-js/sha256';
import Hex from 'crypto-js/enc-hex';
import { passwordChecklist, sanitizeNameInput } from '../services/authService';
// NO CUSTOMALERTMODAL IMPORT!
```

### Profile.jsx - CORRECT IMPORTS:
```jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { User, Ruler, History, Heart, Camera, Menu } from 'lucide-react-native';
import HamburgerMenu from '../components/HamburgerMenu';
import EditProfileModal from '../components/EditProfileModal';
import CustomAlertModal from '../components/CustomAlertModal';
import { sessionService } from '../services/sessionService';
```

---

## Summary

These are the three components involved:

1. **EditProfileModal.jsx** - Changed: Removed nested alert, uses prop function
2. **Profile.jsx** - Changed: Reordered modals, added prop
3. **CustomAlertModal.jsx** - Unchanged: Already correct

The key principle: **Alert Modal renders LAST in JSX = Always on top** ✓

---

**Implementation Status:** ✅ COMPLETE  
**Code Review Status:** ✅ READY FOR TESTING  
**Date Updated:** March 27, 2026  
