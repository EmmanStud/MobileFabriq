import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SESSION_KEY = '@mobcaps_session';
const USER_KEY = '@mobcaps_current_user';

const canUseWebStorage = () =>
  Platform.OS === 'web' && typeof window !== 'undefined' && !!window.localStorage;

const storage = {
  async setItem(key, value) {
    try {
      await AsyncStorage.setItem(key, value);
      return;
    } catch (error) {
      if (canUseWebStorage()) {
        window.localStorage.setItem(key, value);
        return;
      }
      throw error;
    }
  },

  async getItem(key) {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value != null) {
        return value;
      }
    } catch (error) {
      if (!canUseWebStorage()) {
        throw error;
      }
    }

    if (canUseWebStorage()) {
      return window.localStorage.getItem(key);
    }

    return null;
  },

  async removeItem(key) {
    let asyncStorageError = null;
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      asyncStorageError = error;
    }

    if (canUseWebStorage()) {
      window.localStorage.removeItem(key);
      return;
    }

    if (asyncStorageError) {
      throw asyncStorageError;
    }
  },
};

/**
 * Session Service
 * Handles user session persistence
 */

export const sessionService = {
  /**
   * Save user session
   * @param {object} user - User object
   * @returns {Promise<boolean>} - Success status
   */
  async saveSession(user, token = null) {
    try {
      const userId = user.id || user._id || user.userId || null;
      const sessionData = {
        isLoggedIn: true,
        userId,
        email: user.email,
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        token,
        loggedInAt: new Date().toISOString(),
      };
      
      await storage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      await storage.setItem(USER_KEY, JSON.stringify(user));
      return true;
    } catch (error) {
      console.error('Error saving session:', error);
      return false;
    }
  },

  /**
   * Get current session
   * @returns {Promise<object|null>} - Session data or null
   */
  async getSession() {
    try {
      const sessionData = await storage.getItem(SESSION_KEY);
      if (!sessionData) return null;
      
      const session = JSON.parse(sessionData);
      
      // Optional: Check if session is expired (e.g., 30 days)
      const loggedInAt = new Date(session.loggedInAt);
      const daysSinceLogin = (Date.now() - loggedInAt.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceLogin > 30) {
        // Session expired, clear it
        await this.clearSession();
        return null;
      }
      
      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  },

  /**
   * Get current user
   * @returns {Promise<object|null>} - User object or null
   */
  async getCurrentUser() {
    try {
      const userData = await storage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  /**
   * Check if user is logged in
   * @returns {Promise<boolean>} - True if logged in
   */
  async isLoggedIn() {
    const session = await this.getSession();
    return session !== null && session.isLoggedIn === true;
  },

  /**
   * Clear session (logout)
   * @returns {Promise<boolean>} - Success status
   */
  async clearSession() {
    try {
      await storage.removeItem(SESSION_KEY);
      await storage.removeItem(USER_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing session:', error);
      return false;
    }
  },
};

