import { API_URL, fetchAPI } from './apiConfig';

/**
 * Notification Service
 * Handles API interactions for user notifications
 */
export const notificationAPI = {
  /**
   * Fetch all notifications for the current user
   * @param {string} token - JWT authentication token
   * @returns {Promise<Array>} List of notification objects
   */
  getMyNotifications: async (token) => {
    try {
      const response = await fetchAPI('/notifications/mine', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch notifications');
      }

      return await response.json();
    } catch (error) {
      console.error('Error in getMyNotifications:', error.message);
      throw error;
    }
  },

  /**
   * Mark a specific notification as read
   * @param {string} token - JWT authentication token
   * @param {string} id - Notification ID
   * @returns {Promise<Object>} The updated notification object
   */
  markNotificationRead: async (token, id) => {
    try {
      const response = await fetchAPI(`/notifications/mine/${id}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to mark notification as read');
      }

      return await response.json();
    } catch (error) {
      console.error(`Error in markNotificationRead for ID ${id}:`, error.message);
      throw error;
    }
  },

  /**
   * Register device push token with the backend
   * @param {string} token - JWT authentication token
   * @param {string} pushToken - Expo push token
   * @returns {Promise<Object>} Response data
   */
  registerDeviceToken: async (token, pushToken) => {
    try {
      const response = await fetchAPI('/notifications/register-device', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ pushToken }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to register device token');
      }

      return await response.json();
    } catch (error) {
      console.error('Error in registerDeviceToken:', error.message);
      throw error;
    }
  },
};
