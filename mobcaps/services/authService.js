import { mongodbService } from './mongodbService';
import { hashPassword, verifyPassword } from './securityService';

// Check if MongoDB backend API is configured
const isMongoDBConfigured = () => {
  // Check if mongodbService has a valid API URL
  // Import the API URL from mongodbService to check
  try {
    // We'll check if the API URL is set in mongodbService
    // For now, we'll use MongoDB by default if backend is running
    return true; // Use MongoDB - make sure backend is running!
  } catch (e) {
    return false;
  }
};

/**
 * Database abstraction layer for the web backend auth API
 */
export const userDB = {
  // Get all users
  async getAll() {
    try {
      return await mongodbService.getAll();
    } catch (err) {
      console.error('Error reading users:', err);
      return [];
    }
  },

  // Find user by email
  async findByEmail(email) {
    try {
      return await mongodbService.findByEmail(email);
    } catch (err) {
      console.error('Error finding user:', err);
      return null;
    }
  },

  // Create new user
  async create(user) {
    try {
      // Password is plain text from the frontend
      // Backend bcrypt-hashes it before storing
      return await mongodbService.create({
        ...user,
      });
    } catch (err) {
      console.error('Error creating user:', err);
      return { success: false, error: err.message || 'Failed to create user' };
    }
  },

  // Verify user credentials
  async verifyCredentials(email, password) {
    try {
      // Password is plain text from the frontend
      // Backend will compare using bcrypt
      return await mongodbService.verifyCredentials(email, password);
    } catch (err) {
      console.error('Error verifying credentials:', err);
      return { success: false, error: 'Authentication failed' };
    }
  }
};

/**
 * Sanitize name input - allow only letters and spaces
 */
export const sanitizeNameInput = (value = '') => {
  // Remove any character that is not a letter (a-z, A-Z) or space
  return value.replace(/[^a-zA-Z\s]/g, '');
};

/**
 * Backward compatibility - sanitizeFullName is now sanitizeNameInput
 */
export const sanitizeFullName = sanitizeNameInput;

/**
 * Validation utilities
 */
export const validators = {
  // Email validation - accepts any valid email provider
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

  // Password validation
  password(value, isSignup = false) {
    if (!value || value.trim() === '') {
      return 'THIS FIELD IS REQUIRED';
    }
    
    if (isSignup) {
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
    }
    
    return '';
  },

  // Confirm password validation
  confirmPassword(value, originalPassword) {
    if (!value || value.trim() === '') {
      return 'THIS FIELD IS REQUIRED';
    }
    if (value !== originalPassword) {
      return 'PASSWORDS DO NOT MATCH';
    }
    return '';
  },

  // Name validation
  name(value) {
    if (!value || value.trim() === '') {
      return 'THIS FIELD IS REQUIRED';
    }
    if (value.trim().length < 2) {
      return 'NAME MUST BE AT LEAST 2 CHARACTERS';
    }
    // Verify input is letters and spaces only
    if (!/^[a-zA-Z\s]+$/.test(value.trim())) {
      return 'NAME CAN ONLY CONTAIN LETTERS AND SPACES';
    }
    return '';
  },

  // First Name validation
  firstName(value) {
    if (!value || value.trim() === '') {
      return 'FIRST NAME IS REQUIRED';
    }
    if (value.trim().length < 2) {
      return 'FIRST NAME MUST BE AT LEAST 2 CHARACTERS';
    }
    if (!/^[a-zA-Z\s]+$/.test(value.trim())) {
      return 'FIRST NAME CAN ONLY CONTAIN LETTERS AND SPACES';
    }
    return '';
  },

  // Last Name validation
  lastName(value) {
    if (!value || value.trim() === '') {
      return 'LAST NAME IS REQUIRED';
    }
    if (value.trim().length < 2) {
      return 'LAST NAME MUST BE AT LEAST 2 CHARACTERS';
    }
    if (!/^[a-zA-Z\s]+$/.test(value.trim())) {
      return 'LAST NAME CAN ONLY CONTAIN LETTERS AND SPACES';
    }
    return '';
  },

  // Phone number validation
  phoneNumber(value) {
    if (!value || value.trim() === '') {
      return 'PHONE NUMBER IS REQUIRED';
    }
    const digits = value.replace(/\D/g, '');
    if (digits.length < 10) {
      return 'PHONE NUMBER MUST HAVE AT LEAST 10 DIGITS';
    }
    if (digits.length > 15) {
      return 'PHONE NUMBER IS TOO LONG';
    }
    return '';
  },

  // Verification code validation
  verificationCode(value) {
    if (!value || value.trim() === '') {
      return 'PLEASE ENTER THE VERIFICATION CODE';
    }
    if (!/^\d{6}$/.test(value.trim())) {
      return 'CODE MUST BE 6 DIGITS';
    }
    return '';
  },
};

/**
 * Generate 6-digit verification code
 */
export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Password checklist helper
 * Returns object with booleans for each requirement so UI can render a checklist
 */
export const passwordChecklist = (pwd = '') => {
  const value = pwd || '';
  return {
    length: value.length >= 8,
    uppercase: /[A-Z]/.test(value),
    lowercase: /[a-z]/.test(value),
    number: /[0-9]/.test(value),
    special: /[!@#$%^&*]/.test(value),
  };
};