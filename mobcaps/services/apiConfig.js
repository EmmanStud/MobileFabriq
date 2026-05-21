/**
 * API Configuration
 * Centralizes backend API URL for all services
 */

// ============================================
// PRODUCTION API URL - Live deployed backend
// ============================================
const PRODUCTION_URL = 'https://api.hannahvanessa.com/api';

/**
 * Get the API base URL based on environment
 */
const getAPIBaseURL = () => {
  return PRODUCTION_URL;
};

// ============================================
// MAIN API URL CONSTANT - USE THIS EVERYWHERE
// ============================================
export const API_URL = getAPIBaseURL();

export const API_CONFIG = {
  BASE_URL: API_URL,
  TIMEOUT: 15000,
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 1000,
};

/**
 * Validate API configuration on app startup
 * Call this from App.js useEffect to check connectivity
 */
export const validateAPIConfig = async () => {
  console.log('\n🔍 === API Configuration Validation ===');
  console.log(`📍 API Base URL: ${API_URL}`);
  console.log(`⏱️  Timeout: ${API_CONFIG.TIMEOUT}ms`);
  console.log(`🔄 Retry Attempts: ${API_CONFIG.RETRY_ATTEMPTS}`);

  try {
    console.log('📡 Testing API connection...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend API is reachable!', data);
      return { success: true, backend: true };
    } else {
      console.warn('⚠️  Backend returned error:', response.status);
      return { success: false, backend: false, status: response.status };
    }
  } catch (error) {
    console.error('❌ Cannot reach backend API:', error.message);
    return { success: false, backend: false, error: error.message };
  }
};

/**
 * Helper function to make API calls with error handling
 */
export const fetchAPI = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  const timeoutMs = options.timeout ?? API_CONFIG.TIMEOUT;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);
    console.log(`✅ API Response: ${response.status} ${response.statusText}`);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`❌ API Error: ${error.message}`, { url, endpoint, timeout: timeoutMs });
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout (${timeoutMs}ms)`);
    }
    throw error;
  }
};

/**
 * Run network diagnostics — call from any screen to debug connectivity
 */
export const networkDiagnostics = async () => {
  console.log('\n🩺 === NETWORK DIAGNOSTICS ===');
  console.log(`📍 Target API: ${API_URL}`);
  console.log(`📱 Platform: ${require('react-native').Platform.OS}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const start = Date.now();
    const res = await fetch(`${API_URL}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    const latency = Date.now() - start;
    const body = await res.json().catch(() => null);
    console.log(`✅ /api/health responded in ${latency}ms — status ${res.status}`, body);
  } catch (err) {
    console.error(`❌ /api/health FAILED: ${err.message}`);
  }
  console.log('🩺 === END DIAGNOSTICS ===\n');
};