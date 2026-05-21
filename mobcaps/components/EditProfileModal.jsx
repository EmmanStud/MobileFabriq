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
import { passwordChecklist, sanitizeNameInput, validators } from '../services/authService';
import { API_CONFIG } from '../services/apiConfig';

/**
 * Edit Profile Modal
 * Allows user to update profile information (First Name, Last Name, Email, Phone, Address)
 * and change password with validation
 */
export default function EditProfileModal({
  visible,
  onClose,
  customerData,
  onSave,
  isLoading,
  onShowAlert,
}) {
  // Safe validator assignment with fallbacks
  const validateFirstName = validators?.firstName || (() => '');
  const validateLastName = validators?.lastName || (() => '');

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
  const [phoneFieldTouched, setPhoneFieldTouched] = useState(false); // Track if user has touched phone field
  const [oldPasswordCorrect, setOldPasswordCorrect] = useState(null); // null = not checked, true = correct, false = incorrect
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
      setPhoneFieldTouched(false); // Reset phone touched state when modal opens
    }
  }, [visible, customerData]);

  // Validate email format
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate phone (10 digits) - returns error message or empty string if valid
  const validatePhone = (phone) => {
    if (!phone.trim()) {
      return 'Phone is required';
    }
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      return `Phone must have at least 10 digits (${digits.length}/10)`;
    }
    if (digits.length > 15) {
      return 'Phone number is too long';
    }
    return ''; // Valid
  };

  // Check if phone is valid (for UI feedback)
  const isPhoneValid = phone.trim() && validatePhone(phone) === '';

  // Validate old password format (not correctness - that's checked on backend)
  const validateOldPasswordFormat = (pwd) => {
    const errors = [];
    if (!pwd || pwd.trim() === '') {
      errors.push('Old password is required');
    } else {
      // Check format requirements
      if (pwd.length < 8) errors.push('Must be at least 8 characters');
      if (!/[A-Z]/.test(pwd)) errors.push('Must contain uppercase letter');
      if (!/[a-z]/.test(pwd)) errors.push('Must contain lowercase letter');
      if (!/[0-9]/.test(pwd)) errors.push('Must contain a number');
      if (!/[!@#$%^&*()_+=\-\[\]{};':"\\|,.<>\/?]/.test(pwd))
        errors.push('Must contain special character');
    }
    return errors;
  };

  // Validate new password strength
  const validatePasswordStrength = (pwd) => {
    const errors = [];
    if (pwd.length < 8) errors.push('Must be at least 8 characters');
    if (!/[A-Z]/.test(pwd)) errors.push('Must contain an uppercase letter');
    if (!/[a-z]/.test(pwd)) errors.push('Must contain a lowercase letter');
    if (!/[0-9]/.test(pwd)) errors.push('Must contain a number');
    if (!/[!@#$%^&*()_+=\-\[\]{};':"\\|,.<>\/?]/.test(pwd))
      errors.push('Must contain a special character');
    return errors;
  };

  // Validate profile form
  const validateProfile = () => {
    const errors = {};

    const firstNameError = validateFirstName(firstName);
    if (firstNameError) {
      errors.firstName = firstNameError;
    }

    const lastNameError = validateLastName(lastName);
    if (lastNameError) {
      errors.lastName = lastNameError;
    }

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      errors.email = 'Invalid email format';
    }

    if (!phone.trim()) {
      errors.phone = 'Phone is required';
    } else {
      const phoneError = validatePhone(phone);
      if (phoneError) {
        errors.phone = phoneError;
      }
    }

    if (!address.trim()) {
      errors.address = 'Address is required';
    }

    setGeneralErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate password changes
  const validatePassword = () => {
    const errors = {};

    // Validate old password format
    if (!oldPassword.trim()) {
      errors.oldPassword = 'Old password is required';
    } else {
      const formatErrors = validateOldPasswordFormat(oldPassword);
      if (formatErrors.length > 0) {
        errors.oldPassword = formatErrors.join(', ');
      }
    }

    // Validate new password
    if (!newPassword.trim()) {
      errors.newPassword = 'New password is required';
    } else {
      const strengthErrors = validatePasswordStrength(newPassword);
      if (strengthErrors.length > 0) {
        errors.newPassword = strengthErrors.join(', ');
      }
    }

    // Validate confirm password
    if (!confirmPassword.trim()) {
      errors.confirmPassword = 'Confirm password is required';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Verify old password with backend (debounced)
  const verifyOldPassword = async (pwd) => {
    if (!pwd || pwd.length < 8) {
      setOldPasswordCorrect(null); // Don't verify if not enough characters
      return;
    }

    try {
      setVerifyingPassword(true);
      
      // Send plain password - backend uses bcrypt for verification
      const userEmail = encodeURIComponent(customerData?.email?.toLowerCase() || '');

      const response = await fetch(`${API_CONFIG.BASE_URL}/users/${userEmail}/verify-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: pwd,  // Send plain password, not hashed
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setOldPasswordCorrect(result.isCorrect);
        console.log('[DEBUG] Password verification:', result.isCorrect ? '✓ Correct' : '✗ Incorrect');
      } else {
        console.error('Password verification error:', result.error);
        setOldPasswordCorrect(null);
      }
    } catch (error) {
      console.error('Error verifying password:', error);
      setOldPasswordCorrect(null);
    } finally {
      setVerifyingPassword(false);
    }
  };

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
      fullName: `${firstName.trim()} ${lastName.trim()}`.trim(), // concatenate for backward compatibility
      email,
      phone,
      address,
    };

    // Add password if user is changing it - send plain passwords for bcrypt verification
    if (showPasswordSection && oldPassword && newPassword) {
      try {
        // Send plain passwords - backend will use bcrypt for verification and hashing
        updatedData.oldPassword = oldPassword;
        updatedData.newPassword = newPassword;
      } catch (err) {
        showCustomAlert('Error', 'Failed to process password');
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

  const handleClose = () => {
    // Reset all fields
    setFirstName(customerData?.firstName || '');
    setLastName(customerData?.lastName || '');
    setEmail(customerData?.email || '');
    setPhone(customerData?.phone || '');
    setAddress(customerData?.address || '');
    setShowPasswordSection(false);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordErrors({});
    setGeneralErrors({});
    setPhoneFieldTouched(false); // Reset phone field touched state
    onClose();
  };

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
                  // Sanitize input in real-time - allow only letters and spaces
                  const sanitized = sanitizeNameInput(val);
                  setFirstName(sanitized);
                }}
                editable={!isLoading}
              />
              {generalErrors.firstName && (
                <Text style={styles.errorText}>{generalErrors.firstName}</Text>
              )}
            </View>

            {/* Last Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={[styles.input, generalErrors.lastName && styles.inputError]}
                placeholder="Enter last name"
                value={lastName}
                onChangeText={(val) => {
                  // Sanitize input in real-time - allow only letters and spaces
                  const sanitized = sanitizeNameInput(val);
                  setLastName(sanitized);
                }}
                editable={!isLoading}
              />
              {generalErrors.lastName && (
                <Text style={styles.errorText}>{generalErrors.lastName}</Text>
              )}
            </View>

            {/* Email */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={[styles.input, generalErrors.email && styles.inputError]}
                placeholder="Enter email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                editable={!isLoading}
              />
              {generalErrors.email && (
                <Text style={styles.errorText}>{generalErrors.email}</Text>
              )}
            </View>

            {/* Phone */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={[styles.input, phoneFieldTouched && generalErrors.phone && styles.inputError]}
                placeholder="Enter phone number (e.g., +63 912 345 6789)"
                value={phone}
                onChangeText={(val) => {
                  // Only allow numbers and plus sign
                  const filtered = val.replace(/[^\d+]/g, '');
                  setPhone(filtered);
                  setPhoneFieldTouched(true); // Mark field as touched on first input
                  // Real-time validation - only show validation after user has typed
                  if (filtered.trim()) {
                    const phoneError = validatePhone(filtered);
                    if (phoneError) {
                      setGeneralErrors(prev => ({ ...prev, phone: phoneError }));
                    } else {
                      setGeneralErrors(prev => {
                        const updated = { ...prev };
                        delete updated.phone;
                        return updated;
                      });
                    }
                  } else {
                    // Clear validation feedback if field is empty (will check on submit)
                    setGeneralErrors(prev => {
                      const updated = { ...prev };
                      delete updated.phone;
                      return updated;
                    });
                  }
                }}
                keyboardType="phone-pad"
                editable={!isLoading}
              />
              {phoneFieldTouched && generalErrors.phone && (
                <Text style={styles.errorText}>{generalErrors.phone}</Text>
              )}
              {/* Valid phone indicator - only show if field has been touched and is valid */}
              {phoneFieldTouched && phone && !generalErrors.phone && (
                <View style={styles.validPhoneContainer}>
                  <Text style={styles.validPhoneText}>✓ Valid phone number</Text>
                </View>
              )}
            </View>

            {/* Address */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={[styles.input, styles.multilineInput, generalErrors.address && styles.inputError]}
                placeholder="Enter address"
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
                editable={!isLoading}
              />
              {generalErrors.address && (
                <Text style={styles.errorText}>{generalErrors.address}</Text>
              )}
            </View>

            {/* Change Password Section Toggle */}
            <TouchableOpacity
              style={styles.changePasswordToggle}
              onPress={() => setShowPasswordSection(!showPasswordSection)}
              disabled={isLoading}
            >
              <Text style={styles.changePasswordToggleText}>
                {showPasswordSection ? '✕ Change Password' : '+ Change Password'}
              </Text>
            </TouchableOpacity>

            {/* Password Section */}
            {showPasswordSection && (
              <View style={styles.passwordSection}>
                {/* Old Password */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Old Password</Text>
                  <View style={[styles.passwordInputContainer, passwordErrors.oldPassword && styles.inputError]}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Enter old password"
                      value={oldPassword}
                      onChangeText={(val) => {
                        setOldPassword(val);
                        
                        // Real-time validation of old password format
                        if (val) {
                          const formatErrors = validateOldPasswordFormat(val);
                          if (formatErrors.length > 0) {
                            setPasswordErrors(prev => ({ 
                              ...prev, 
                              oldPassword: formatErrors.join(', ') 
                            }));
                            setOldPasswordCorrect(null); // Clear correctness status if format is wrong
                          } else {
                            setPasswordErrors(prev => {
                              const updated = { ...prev };
                              delete updated.oldPassword;
                              return updated;
                            });
                            
                            // Debounced verification with backend
                            if (verifyPasswordTimeout) {
                              clearTimeout(verifyPasswordTimeout);
                            }
                            verifyPasswordTimeout = setTimeout(() => {
                              verifyOldPassword(val);
                            }, 500); // 500ms debounce
                          }
                        } else {
                          setPasswordErrors(prev => ({
                            ...prev,
                            oldPassword: 'Old password is required'
                          }));
                          setOldPasswordCorrect(null);
                        }
                      }}
                      secureTextEntry={!showOldPassword}
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowOldPassword(!showOldPassword)}
                      disabled={isLoading}
                    >
                      {showOldPassword ? (
                        <EyeOff size={18} color="#6B5D4F" />
                      ) : (
                        <Eye size={18} color="#6B5D4F" />
                      )}
                    </TouchableOpacity>
                  </View>
                  {passwordErrors.oldPassword && (
                    <Text style={styles.errorText}>{passwordErrors.oldPassword}</Text>
                  )}
                  {/* Password correctness status */}
                  {oldPassword && !passwordErrors.oldPassword && (
                    <View style={styles.passwordStatusContainer}>
                      {verifyingPassword && (
                        <Text style={styles.verifyingText}>Verifying...</Text>
                      )}
                      {!verifyingPassword && oldPasswordCorrect === true && (
                        <Text style={styles.correctPassword}>✓ Password is correct</Text>
                      )}
                      {!verifyingPassword && oldPasswordCorrect === false && (
                        <Text style={styles.incorrectPassword}>✗ Password is incorrect</Text>
                      )}
                    </View>
                  )}
                </View>

                {/* New Password */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>New Password</Text>
                  <View style={[styles.passwordInputContainer, passwordErrors.newPassword && styles.inputError]}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChangeText={(val) => {
                        setNewPassword(val);
                        // Real-time validation
                        if (val) {
                          const strengthErrors = validatePasswordStrength(val);
                          if (strengthErrors.length > 0) {
                            setPasswordErrors(prev => ({ ...prev, newPassword: strengthErrors.join(', ') }));
                          } else {
                            setPasswordErrors(prev => {
                              const updated = { ...prev };
                              delete updated.newPassword;
                              return updated;
                            });
                          }
                          // Also validate confirm password if it has a value
                          if (confirmPassword && val !== confirmPassword) {
                            setPasswordErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
                          } else if (confirmPassword && val === confirmPassword) {
                            setPasswordErrors(prev => {
                              const updated = { ...prev };
                              delete updated.confirmPassword;
                              return updated;
                            });
                          }
                        }
                      }}
                      secureTextEntry={!showNewPassword}
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      disabled={isLoading}
                    >
                      {showNewPassword ? (
                        <EyeOff size={18} color="#6B5D4F" />
                      ) : (
                        <Eye size={18} color="#6B5D4F" />
                      )}
                    </TouchableOpacity>
                  </View>
                  {/* Password checklist replaces single error message */}
                  <View style={styles.passwordChecklistContainer}>
                    <View style={styles.checklistItem}>
                      <Text style={newPasswordChecklist.length ? styles.checkPassed : styles.checkFailed}>{newPasswordChecklist.length ? '✓' : '✗'}</Text>
                      <Text style={styles.checklistText}>Minimum 8 characters</Text>
                    </View>
                    <View style={styles.checklistItem}>
                      <Text style={newPasswordChecklist.uppercase ? styles.checkPassed : styles.checkFailed}>{newPasswordChecklist.uppercase ? '✓' : '✗'}</Text>
                      <Text style={styles.checklistText}>At least one uppercase letter</Text>
                    </View>
                    <View style={styles.checklistItem}>
                      <Text style={newPasswordChecklist.lowercase ? styles.checkPassed : styles.checkFailed}>{newPasswordChecklist.lowercase ? '✓' : '✗'}</Text>
                      <Text style={styles.checklistText}>At least one lowercase letter</Text>
                    </View>
                    <View style={styles.checklistItem}>
                      <Text style={newPasswordChecklist.number ? styles.checkPassed : styles.checkFailed}>{newPasswordChecklist.number ? '✓' : '✗'}</Text>
                      <Text style={styles.checklistText}>At least one number</Text>
                    </View>
                    <View style={styles.checklistItem}>
                      <Text style={newPasswordChecklist.special ? styles.checkPassed : styles.checkFailed}>{newPasswordChecklist.special ? '✓' : '✗'}</Text>
                      <Text style={styles.checklistText}>At least one special character</Text>
                    </View>
                  </View>
                </View>

                {/* Confirm Password */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Confirm New Password</Text>
                  <View style={[styles.passwordInputContainer, passwordErrors.confirmPassword && styles.inputError]}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChangeText={(val) => {
                        setConfirmPassword(val);
                        // Real-time validation
                        if (val && newPassword && val !== newPassword) {
                          setPasswordErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
                        } else if (val && newPassword && val === newPassword) {
                          setPasswordErrors(prev => {
                            const updated = { ...prev };
                            delete updated.confirmPassword;
                            return updated;
                          });
                        }
                      }}
                      secureTextEntry={!showConfirmPassword}
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} color="#6B5D4F" />
                      ) : (
                        <Eye size={18} color="#6B5D4F" />
                      )}
                    </TouchableOpacity>
                  </View>
                  {passwordErrors.confirmPassword && (
                    <Text style={styles.errorText}>{passwordErrors.confirmPassword}</Text>
                  )}
                </View>
              </View>
            )}

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

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8DCC8',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  formContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B5D4F',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E8DCC8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#FAF7F0',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEE2E2',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
  },
  validPhoneContainer: {
    marginTop: 6,
    paddingHorizontal: 4,
  },
  validPhoneText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  passwordStatusContainer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  correctPassword: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  incorrectPassword: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  verifyingText: {
    fontSize: 12,
    color: '#6B5D4F',
    fontStyle: 'italic',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8DCC8',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FAF7F0',
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
  },
  passwordChecklistContainer: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#F8F8F8', borderRadius: 6 },
  checklistItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  checklistText: { fontSize: 12, color: '#444' },
  checkPassed: { color: '#10B981', fontWeight: '700', width: 20 },
  checkFailed: { color: '#DC2626', fontWeight: '700', width: 20 },
  changePasswordToggle: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E8DCC8',
  },
  changePasswordToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B5D4F',
  },
  passwordSection: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FAF7F0',
    borderWidth: 1,
    borderColor: '#E8DCC8',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingBottom: 20,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#E8DCC8',
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B5D4F',
  },
  saveButton: {
    backgroundColor: '#000',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
