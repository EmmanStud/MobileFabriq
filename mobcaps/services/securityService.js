import * as Crypto from 'expo-crypto';

/**
 * Security Service
 * Handles password hashing and security operations
 */

/**
 * Hash a password using SHA-256
 * For production, consider using bcrypt with salt rounds
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
export const hashPassword = async (password) => {
  try {
    // Using SHA-256 for hashing
    // Note: For production, consider using bcrypt with salt rounds for better security
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password
    );
    return hash;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
};

/**
 * Verify a password against a hash
 * @param {string} password - Plain text password to verify
 * @param {string} hash - Stored hash to compare against
 * @returns {Promise<boolean>} - True if password matches
 */
export const verifyPassword = async (password, hash) => {
  try {
    const passwordHash = await hashPassword(password);
    return passwordHash === hash;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
};

/**
 * Generate a secure random token
 * @param {number} length - Length of token (default: 32)
 * @returns {Promise<string>} - Random token
 */
export const generateToken = async (length = 32) => {
  try {
    const randomBytes = await Crypto.getRandomBytesAsync(length);
    return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('Error generating token:', error);
    throw new Error('Failed to generate token');
  }
};

