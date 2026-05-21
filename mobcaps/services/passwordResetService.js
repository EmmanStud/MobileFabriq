import { API_URL } from './apiConfig';

export const passwordResetService = {

  async generateResetCode(email) {
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await response.json();
      if (response.ok) {
        return { success: true, message: data.message };
      }
      return { success: false, error: data.message || 'FAILED TO SEND RESET CODE' };
    } catch (err) {
      return { success: false, error: 'CONNECTION FAILED' };
    }
  },

  async verifyResetCode(email, code) {
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() }),
      });
      const data = await response.json();
      if (response.ok) {
        return { success: true, verified: true };
      }
      return { success: false, error: data.message || 'INVALID OR EXPIRED CODE' };
    } catch (err) {
      return { success: false, error: 'CONNECTION FAILED' };
    }
  },

  async resetPassword(email, newPassword, code) {
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
          newPassword,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        return { success: true, message: 'PASSWORD RESET SUCCESSFULLY' };
      }
      return { success: false, error: data.message || 'FAILED TO RESET PASSWORD' };
    } catch (err) {
      return { success: false, error: 'CONNECTION FAILED' };
    }
  },
};

/**
 * Validators for password reset
 */
export const resetValidators = {
  email(value) {
    if (!value || value.trim() === '') {
      return 'THIS FIELD IS REQUIRED';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value.trim())) {
      return 'PLEASE ENTER A VALID EMAIL ADDRESS';
    }
    return '';
  },

  resetCode(value) {
    if (!value || value.trim() === '') {
      return 'PLEASE ENTER THE CODE';
    }
    if (!/^\d{6}$/.test(value.trim())) {
      return 'CODE MUST BE 6 DIGITS';
    }
    return '';
  },

  newPassword(value) {
    if (!value || value.trim() === '') {
      return 'THIS FIELD IS REQUIRED';
    }
    if (value.length < 8) {
      return 'MINIMUM 8 CHARACTERS REQUIRED';
    }
    if (!/[A-Z]/.test(value)) {
      return 'MUST INCLUDE UPPERCASE LETTER';
    }
    if (!/[a-z]/.test(value)) {
      return 'MUST INCLUDE LOWERCASE LETTER';
    }
    if (!/[0-9]/.test(value)) {
      return 'MUST INCLUDE A NUMBER';
    }
    if (!/[!@#$%^&*]/.test(value)) {
      return 'MUST INCLUDE A SPECIAL CHARACTER';
    }
    return '';
  },

  confirmPassword(value, newPassword) {
    if (!value || value.trim() === '') {
      return 'THIS FIELD IS REQUIRED';
    }
    if (value !== newPassword) {
      return 'PASSWORDS DO NOT MATCH';
    }
    return '';
  }
};
