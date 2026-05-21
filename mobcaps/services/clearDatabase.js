/**
 * Utility to clear all local database data
 * Run this once to clear AsyncStorage before switching to MongoDB
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const USERS_KEY = '@mobcaps_users';
const SESSION_KEY = '@mobcaps_session';
const USER_KEY = '@mobcaps_current_user';

const removeKey = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.localStorage) {
      throw error;
    }
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(key);
  }
};

/**
 * Clear all local database data
 * This will delete:
 * - All user accounts stored in AsyncStorage
 * - Current session data
 * - Logged in user data
 */
export const clearAllLocalData = async () => {
  try {
    console.log('🗑️ Clearing all local database data...');
    
    // Clear users
    await removeKey(USERS_KEY);
    console.log('✅ Cleared user accounts');
    
    // Clear session
    await removeKey(SESSION_KEY);
    console.log('✅ Cleared session data');
    
    // Clear current user
    await removeKey(USER_KEY);
    console.log('✅ Cleared current user data');
    
    console.log('✅ All local data cleared successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error clearing local data:', error);
    return false;
  }
};

/**
 * Clear only user accounts (keep session)
 */
export const clearUserAccounts = async () => {
  try {
    await removeKey(USERS_KEY);
    console.log('✅ User accounts cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing user accounts:', error);
    return false;
  }
};

