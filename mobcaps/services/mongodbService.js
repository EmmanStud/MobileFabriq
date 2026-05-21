/**
 * MongoDB Database Service
 * Alternative database option using MongoDB Atlas
 * 
 * SETUP OPTIONS:
 * 
 * Option 1: MongoDB Atlas + Backend API (Recommended)
 * - MongoDB Atlas for database
 * - Node.js/Express backend API
 * - React Native app calls API endpoints
 * 
 * Option 2: MongoDB Realm SDK (Direct connection)
 * - MongoDB Realm SDK for React Native
 * - Direct connection from app
 * 
 * This file provides Option 1 (API-based) structure.
 * For Option 2, see MongoDB Realm documentation.
 */

import { Platform } from 'react-native';
import { API_URL } from './apiConfig';

// ============================================
// MongoDB Database Service
// ============================================
// API URL is now loaded from apiConfig.js
// Update the LOCAL_IP in apiConfig.js to match your machine's IP
const MONGODB_API_URL = API_URL;

/**
 * MongoDB Database implementation via API
 * Replace userDB in authService.js with this when ready
 */
export const mongodbService = {
  // Get all users (if needed)
  async getAll() {
    try {
      if (!MONGODB_API_URL) {
        console.warn('MongoDB API URL not configured');
        return [];
      }
      
      const response = await fetch(`${MONGODB_API_URL}/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.users || [];
      }
      
      return [];
    } catch (err) {
      console.error('Error reading users:', err);
      return [];
    }
  },

  // Find user by email
  async findByEmail(email) {
    try {
      if (!MONGODB_API_URL) {
        console.warn('MongoDB API URL not configured');
        return null;
      }
      
      const url = `${MONGODB_API_URL}/users/email/${encodeURIComponent(email)}`;
      console.log(`📡 Finding user by email: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ User found:`, data.user);
        return data.user || null;
      }
      
      if (response.status === 404) {
        console.log(`ℹ️  User not found (404)`);
        return null;
      }
      
      const errorText = await response.text();
      console.warn(`❌ Server error (${response.status}):`, errorText);
      return null;
    } catch (err) {
      console.error('❌ Error finding user:', err.message);
      console.error('📍 URL attempted:', `${MONGODB_API_URL}/users/email/${encodeURIComponent(email)}`);
      console.error('💡 Tip: Check if backend is running. Try: curl http://192.168.1.6:5000/api/health');
      return null;
    }
  },

  // Create new user using the web backend user creation endpoint
  async create(user) {
    try {
      if (!MONGODB_API_URL) {
        return { success: false, error: 'API URL not configured' };
      }
      
      console.log('📝 Registering user:', { firstName: user.firstName, lastName: user.lastName, email: user.email });
      
      const url = `${MONGODB_API_URL}/users`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${user.firstName.trim()} ${user.lastName.trim()}`.trim(),
          email: user.email,
          phone: user.phoneNumber,
          password: user.password,
        }),
      });
      
      const contentType = response.headers.get('content-type');
      if (response.ok && contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('✅ Signup successful:', data);
        return { success: true, user: data.user };
      }
      
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ Signup error:', error);
      return { success: false, error: error.error || error.message || 'Failed to create account' };
    } catch (err) {
      console.error('❌ Error creating user:', err.message);
      console.error('📍 Ensure backend is reachable at', MONGODB_API_URL);
      return { success: false, error: `Connection failed: ${err.message}` };
    }
  },

  // Verify user credentials against the web backend auth endpoint
  async verifyCredentials(email, password) {
    try {
      console.log('🔐 LOGIN REQUEST DEBUG:');
      console.log('📧 Email:', email);
      console.log('🔑 Password length:', password.length);
      console.log('🌐 URL:', `${MONGODB_API_URL}/auth/login`);
      console.log('📡 Method: POST');
      console.log('📋 Headers:', { 'Content-Type': 'application/json' });
      console.log('📦 Body:', JSON.stringify({ email, password }));

      const url = `${MONGODB_API_URL}/auth/login`;
      console.log(`📡 API call: POST ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      console.log('📡 RESPONSE DEBUG:');
      console.log('📊 Status code:', response.status);
      console.log('📊 Status text:', response.statusText);

      const contentType = response.headers.get('content-type');
      console.log('📊 Content-Type:', contentType);

      if (response.ok && contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('✅ SUCCESS RESPONSE JSON:', data);
        console.log('🎫 Token received:', data.token ? 'YES (' + data.token.substring(0, 20) + '...)' : 'NO TOKEN (backend doesn\'t provide JWT)');
        console.log('👤 User data:', data.user);
        return { success: true, user: data.user, token: data.token || null };
      }

      // Handle specific error codes
      let errorMessage = 'Login failed';
      let errorDetails = '';

      try {
        const errorData = await response.json();
        errorDetails = errorData.error || errorData.message || 'Unknown error';
        console.log('❌ ERROR RESPONSE JSON:', errorData);
      } catch (parseError) {
        const errorText = await response.text();
        errorDetails = errorText || 'No error details';
        console.log('❌ ERROR RESPONSE TEXT:', errorText);
      }

      // Map status codes to user-friendly messages
      switch (response.status) {
        case 400:
          errorMessage = 'MISSING REQUIRED FIELDS';
          console.log('🚫 400 Bad Request - Missing required fields');
          break;
        case 401:
          errorMessage = 'INVALID EMAIL OR PASSWORD';
          console.log('🚫 401 Unauthorized - Invalid credentials');
          break;
        case 403:
          errorMessage = errorDetails; // 'Please verify your email first'
          console.log('🚫 403 Forbidden -', errorDetails);
          break;
        case 404:
          errorMessage = 'ACCOUNT NOT REGISTERED';
          console.log('🚫 404 Not Found - Account not registered');
          break;
        case 429:
          errorMessage = 'TOO MANY ATTEMPTS. PLEASE WAIT';
          console.log('🚫 429 Too Many Requests - Rate limited');
          break;
        case 500:
          errorMessage = 'SERVER ERROR. PLEASE TRY AGAIN';
          console.log('🚫 500 Internal Server Error');
          break;
        default:
          errorMessage = `LOGIN FAILED (${response.status})`;
          console.log(`🚫 ${response.status} - ${errorDetails}`);
      }

      console.log('📋 Final error message for UI:', errorMessage);
      return { success: false, error: errorMessage };

    } catch (err) {
      console.log('❌ CONNECTION ERROR DEBUG:');
      console.error('🔌 Error type:', err.name);
      console.error('📝 Error message:', err.message);
      console.error('📍 Target URL:', `${MONGODB_API_URL}/auth/login`);
      console.error('💡 Check: Is backend running? Network connection? IP address correct?');

      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        return { success: false, error: 'CANNOT CONNECT TO SERVER. CHECK NETWORK' };
      }

      return { success: false, error: `CONNECTION FAILED: ${err.message}` };
    }
  },

  // Update password by email
  async updatePassword(email, newPassword, confirmPassword) {
    try {
      if (!MONGODB_API_URL) {
        console.warn('MongoDB API URL not configured');
        return { success: false, error: 'API not configured' };
      }

      const response = await fetch(`${MONGODB_API_URL}/auth/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword, confirmPassword }),
      });

      console.log('📡 Response status:', response.status);

      const contentType = response.headers.get("content-type");
      if (response.ok && contentType && contentType.includes("application/json")) {
        const data = await response.json();
        console.log('✅ Password updated successfully:', data);
        return { success: true, message: 'Password updated' };
      }

      const errorText = await response.text();
      console.warn('❌ Server Error Response:', { status: response.status, body: errorText });
      return { success: false, error: "Failed to update password" };

    } catch (err) {
      console.error('❌ Connection error:', err);
      return { success: false, error: "Connection failed. Is the backend running?" };
    }
  },

  // Helper to build API URL and handle emulator host mapping
  _buildUrl(path) {
    let base = MONGODB_API_URL || '';
    if (Platform.OS === 'android' && base.includes('localhost')) {
      base = base.replace('localhost', '10.0.2.2');
    }
    return `${base}${path}`;
  },

  // Create a new rental associated with a user
  async createRental(rental, token = null) {
    try {
      if (!MONGODB_API_URL) return { success: false, error: 'API URL not configured' };
      if (!token) return { success: false, error: 'Authorization token required. Please sign in again.' };

      const url = this._buildUrl('/rentals');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(rental),
      });

      const status = response.status;
      let body = null;
      try { body = await response.json(); } catch { body = null; }

      if (response.ok) {
        return { success: true, rental: body?.rental || body || null, status };
      }
      // Web backend errors come in body.message not body.error 
      return {
        success: false,
        error: body?.message || body?.error || 'Failed to create rental',
        status,
      };
    } catch (err) {
      return { success: false, error: err.message || 'Connection failed', status: null };
    }
  },

  // Get rentals for a user
  async getRentalsByUser(token) {
    try {
      if (!MONGODB_API_URL || !token) {
        return [];
      }
      const url = this._buildUrl('/rentals/mine');
      console.log('📡 getRentalsByUser ->', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.rentals || [];
      }

      // If failed and original URL used localhost, try android emulator host
      const content = await response.text();
      console.warn('getRentalsByUser server response:', response.status, content);
      return [];
    } catch (err) {
      console.error('❌ getRentalsByUser error:', err);
      return [];
    }
  },

  async getRentalAvailability(gownId, startDate, endDate, token) {
    try {
      if (!MONGODB_API_URL || !token) return { unavailableDates: [] };
      const params = new URLSearchParams();
      params.append('gownId', gownId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const url = this._buildUrl(`/rentals/availability?${params.toString()}`);
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        return data; // { unavailableDates: ['YYYY-MM-DD', ...], startDate, endDate } 
      }
      return { unavailableDates: [] };
    } catch (err) {
      console.warn('getRentalAvailability error:', err);
      return { unavailableDates: [] };
    }
  },

  // Create a new custom order associated with a user
  async createCustomOrder(order, token) {
    try {
      if (!MONGODB_API_URL) {
        return { success: false, error: 'MongoDB API URL not configured' };
      }

      if (!token) {
        return { success: false, error: 'Authorization token required. Please sign in again.' };
      }

      const url = this._buildUrl('/custom-orders');
      console.log('📡 createCustomOrder ->', url, order);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(order),
      });

      const status = response.status;
      const contentType = response.headers.get('content-type');
      let body = null;
      if (contentType && contentType.includes('application/json')) {
        try { body = await response.json(); } catch { body = null; }
      } else {
        try { const text = await response.text(); body = { error: text }; } catch { body = null; }
      }

      if (response.ok) {
        return { success: true, customOrder: body || null, order: body || null, status };
      }

      return { success: false, error: (body && (body.error || body.message)) || 'Server error', status };
    } catch (err) {
      console.error('❌ createCustomOrder error:', err);
      return { success: false, error: err.message || 'Connection failed', status: null };
    }
  },

  // Get custom orders for a user
  async getCustomOrdersByUser(token) {
    try {
      if (!MONGODB_API_URL || !token) {
        return [];
      }
      const url = this._buildUrl('/custom-orders/my-orders');
      console.log('📡 getCustomOrdersByUser ->', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : (Array.isArray(data.orders) ? data.orders : (Array.isArray(data.customOrders) ? data.customOrders : []));
      }

      return [];
    } catch (err) {
      console.warn('getCustomOrdersByUser error:', err);
      return [];
    }
  },

  // Create a new appointment associated with a user
  async createAppointment(appointment, token) {
    try {
      if (!MONGODB_API_URL) return { success: false, error: 'API URL not configured' };

      const url = this._buildUrl('/appointments');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(appointment),
      });

      const status = response.status;
      const contentType = response.headers.get('content-type');
      let body = null;
      if (contentType && contentType.includes('application/json')) {
        try { body = await response.json(); } catch { body = null; }
      }

      if (response.ok) {
        return { success: true, appointment: body?.appointment || body || null, status };
      }
      return { success: false, error: body?.message || body?.error || 'Server error', status };
    } catch (err) {
      return { success: false, error: err.message || 'Connection failed', status: null };
    }
  },

  // Get appointments for a user
  async getAppointmentsByUser(email, token) {
    try {
      if (!MONGODB_API_URL) return [];
      const url = this._buildUrl('/appointments/mine');

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        // Web backend returns array directly
        return Array.isArray(data) ? data : (Array.isArray(data.appointments) ? data.appointments : []);
      }
      return [];
    } catch (err) {
      console.warn('getAppointmentsByUser error:', err);
      return [];
    }
  },

  // Get availability for a given date (and optional appointmentType and branch)
  async getAvailability(date, appointmentType, branch) {
    try {
      if (!MONGODB_API_URL) return { date, bookedTimes: [] };
      const params = new URLSearchParams();
      params.append('date', date);
      params.append('branch', branch || 'Taguig Main'); // branch is required
      if (appointmentType) params.append('appointmentType', appointmentType);
      const url = this._buildUrl(`/appointments/availability?${params.toString()}`);

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        return data; // Returns { bookedTimes: [...] }
      }
      return { date, bookedTimes: [] };
    } catch (err) {
      console.warn('getAvailability error:', err);
      return { date, bookedTimes: [] };
    }
  },

  async rescheduleAppointment(appointmentId, data, token) {
    try {
      if (!MONGODB_API_URL || !token) return { success: false, error: 'Not authenticated' };
      const url = this._buildUrl(`/appointments/${appointmentId}/reschedule`);
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: data.date,
          time: data.time,
          branch: data.branch,
          reason: data.reason,
        }),
      });
      const status = response.status;
      let body = null;
      try { body = await response.json(); } catch { body = null; }
      if (response.ok) return { success: true, appointment: body?.appointment || body || null, status };
      return { success: false, error: body?.message || body?.error || 'Failed to reschedule', status };
    } catch (err) {
      return { success: false, error: err.message || 'Connection failed', status: null };
    }
  },

  // Schedule consultation for a custom order
  async scheduleConsultation(orderId, body, token) {
    try {
      if (!MONGODB_API_URL || !token) return { success: false, error: 'Not authenticated' };
      const url = this._buildUrl(`/custom-orders/${orderId}/consultation-schedule`);
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const status = response.status;
      let data = null;
      try { data = await response.json(); } catch { data = null; }
      if (response.ok) return { success: true, order: data?.order || data || null, status };
      return { success: false, error: data?.message || data?.error || 'Failed to schedule consultation', status };
    } catch (err) {
      return { success: false, error: err.message || 'Connection failed', status: null };
    }
  },

  async scheduleFitting(orderId, body, token) {
    try {
      if (!MONGODB_API_URL || !token) return { success: false, error: 'Not authenticated' };
      const url = this._buildUrl(`/custom-orders/${orderId}/fitting-schedule`);
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const status = response.status;
      let data = null;
      try { data = await response.json(); } catch { data = null; }
      if (response.ok) return { success: true, order: data?.order || data || null, status };
      return { success: false, error: data?.message || data?.error || 'Failed to schedule fitting', status };
    } catch (err) {
      return { success: false, error: err.message || 'Connection failed', status: null };
    }
  },

  // Get measurements from backend 
  async getMeasurements(token) {
    try {
      if (!MONGODB_API_URL || !token) return null;
      const url = this._buildUrl('/customers/measurements');
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      return null;
    } catch (err) {
      console.warn('getMeasurements error:', err);
      return null;
    }
  },

  // Save measurements to backend 
  async updateMeasurements(measurements, token) {
    try {
      if (!MONGODB_API_URL || !token) return { success: false, error: 'Not authenticated' };
      const url = this._buildUrl('/customers/measurements');
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(measurements),
      });
      const data = await response.json();
      if (response.ok) return { success: true, measurements: data.measurements || data };
      return { success: false, error: data.message || 'Failed to save measurements' };
    } catch (err) {
      return { success: false, error: err.message || 'Connection failed' };
    }
  },

  // Update favorites on backend — sends full array 
  async updateFavorites(favoriteGowns, token) {
    try {
      if (!MONGODB_API_URL || !token) return { success: false, error: 'Not authenticated' };
      const url = this._buildUrl('/customers/favorites');
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ favoriteGowns }),
      });
      const data = await response.json();
      if (response.ok) return { success: true, favoriteGowns: data.favoriteGowns || [] };
      return { success: false, error: data.message || 'Failed to update favorites' };
    } catch (err) {
      return { success: false, error: err.message || 'Connection failed' };
    }
  },

  // Get favorites from customer profile 
  async getFavorites(token) {
    try {
      if (!MONGODB_API_URL || !token) return [];
      const url = this._buildUrl('/customers/profile');
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data.favoriteGowns) ? data.favoriteGowns : [];
      }
      return [];
    } catch (err) {
      console.warn('getFavorites error:', err);
      return [];
    }
  },

  async submitRentalReview(rentalId, score, comment, token) {
    try {
      if (!MONGODB_API_URL || !token) return { success: false, error: 'Not authenticated' };
      const url = this._buildUrl(`/rentals/${rentalId}/review`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ score, comment }),
      });
      let body = null;
      try { body = await response.json(); } catch { body = null; }
      if (response.ok) return { success: true };
      if (response.status === 409) return { success: false, alreadyReviewed: true, error: body?.message || 'Already reviewed.' };
      return { success: false, error: body?.message || 'Failed to submit review.' };
    } catch (err) {
      return { success: false, error: err.message || 'Connection failed' };
    }
  },

  async getMyNotifications(token) { 
    try { 
      if (!MONGODB_API_URL || !token) return []; 
      const url = this._buildUrl('/notifications/mine'); 
      const response = await fetch(url, { 
        headers: { 'Authorization': `Bearer ${token}` }, 
      }); 
      if (response.ok) { 
        const data = await response.json(); 
        return Array.isArray(data.notifications) ? data.notifications : []; 
      } 
      return []; 
    } catch (err) { 
      console.warn('getMyNotifications error:', err); 
      return []; 
    } 
  }, 
   
  async markNotificationRead(notificationId, token) { 
    try { 
      if (!MONGODB_API_URL || !token) return null; 
      const url = this._buildUrl(`/notifications/mine/${notificationId}/read`); 
      const response = await fetch(url, { 
        method: 'PATCH', 
        headers: { 'Authorization': `Bearer ${token}` }, 
      }); 
      if (response.ok) { 
        const data = await response.json(); 
        return data.notification || null; 
      } 
      return null; 
    } catch (err) { 
      console.warn('markNotificationRead error:', err); 
      return null; 
    } 
  }, 
  
  // Clear all rental records (debug/admin function)
  async clearAllRentals() {
    try {
      if (!MONGODB_API_URL) {
        console.error('❌ MONGODB_API_URL not configured');
        return false;
      }

      const response = await fetch(`${MONGODB_API_URL}/debug/clear-rentals`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (response.ok) {
        console.log(`✅ Cleared rentals. Deleted: ${data.deletedCount}`);
        return true;
      } else {
        console.error('❌ Failed to clear rentals:', data);
        return false;
      }
    } catch (err) {
      console.error('❌ clearAllRentals error:', err);
      return false;
    }
  },
};

// ============================================
// OPTION 2: MongoDB Realm SDK (Alternative)
// ============================================
// Uncomment and configure if using MongoDB Realm SDK directly
// 
// import Realm from 'realm';
// 
// const UserSchema = {
//   name: 'User',
//   properties: {
//     _id: 'objectId',
//     name: 'string',
//     email: 'string',
//     password: 'string',
//     createdAt: 'date',
//   },
//   primaryKey: '_id',
// };
// 
// const realmConfig = {
//   schema: [UserSchema],
//   sync: {
//     user: app.currentUser,
//     partitionValue: 'your-partition-value',
//   },
// };
// 
// export const mongodbRealmService = {
//   // Implementation using Realm SDK
//   // See MongoDB Realm documentation for details
// };

