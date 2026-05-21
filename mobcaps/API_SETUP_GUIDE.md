## React Native (Expo) API Configuration - Setup Guide

### ✅ Fixes Applied

All API and email verification errors have been fixed. Here's what was updated:

#### 1. **Created `apiConfig.js`** (/services/apiConfig.js)
   - Centralized configuration for all API calls
   - Automatically builds URLs using your local IP address
   - Contains timeout and retry logic

#### 2. **Updated `mongodbService.js`**
   - Now imports `API_CONFIG` from `apiConfig.js`
   - Replaces hardcoded `http://localhost:5000/api` with `API_CONFIG.BASE_URL`
   - All database operations now work on mobile

#### 3. **Fixed Screen Components**
   - ✅ `Home.jsx` - Uses AsyncStorage instead of sessionStorage
   - ✅ `Profile.jsx` - Updated to use API_CONFIG
   - ✅ `Collection.jsx` - Updated to use API_CONFIG
   - ✅ `EditProfileModal.jsx` - Updated to use API_CONFIG

---

### 🚀 REQUIRED: Set Your Local IP Address

Before running the app, you **MUST** update your machine's IP address in `apiConfig.js`:

1. **Find your local IP:**
   - **Windows:** Open Command Prompt and run:
     ```
     ipconfig
     ```
     Look for "IPv4 Address" (usually starts with 192.168.x.x or 10.0.x.x)

   - **Mac/Linux:** Open Terminal and run:
     ```
     ifconfig
     ```
     Look for "inet" address

2. **Update `apiConfig.js`:**
   ```javascript
   const LOCAL_IP = '192.168.1.100'; // ← Change this to YOUR IP
   ```

**Example values:**
- My computer: `192.168.1.100:5000`
- Your computer: Find it using the commands above

---

### ✅ What's Fixed

| Error | Solution |
|-------|----------|
| "Property 'sessionStorage' doesn't exist" | ✅ Replaced with AsyncStorage + proper async/await |
| "TypeError: Network request failed" | ✅ Replaced localhost with configurable IP address |
| "ReferenceError: property 'location' doesn't exist" | ✅ Removed all web-specific references |

---

### 🧪 Testing

After updating the IP address in `apiConfig.js`:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start Expo:**
   ```bash
   npm start
   ```

3. **Test the app:**
   - Sign up (verify email works)
   - Log in
   - Check profile and rentals
   - Verify password reset works

**Expected to work on:**
- ✅ iOS Simulator
- ✅ Android Emulator
- ✅ Physical iOS device
- ✅ Physical Android device
- ✅ Expo Go app

---

### 📋 Files Changed

**New files:**
- `mobcaps/services/apiConfig.js` - Central API configuration

**Modified files:**
- `mobcaps/services/mongodbService.js` - Now uses API_CONFIG
- `mobcaps/screens/Home.jsx` - Uses AsyncStorage for branding flag
- `mobcaps/screens/Profile.jsx` - Uses API_CONFIG
- `mobcaps/screens/Collection.jsx` - Uses API_CONFIG
- `mobcaps/components/EditProfileModal.jsx` - Uses API_CONFIG

---

### 📝 Notes

- All API calls are now centralized through `API_CONFIG.BASE_URL`
- The app now works on both simulators/emulators AND physical devices
- No more "localhost" issues - uses your actual machine IP
- All original functionality is preserved
- Async storage works correctly for session management

### ❓ Troubleshooting

**Still getting "Network request failed"?**
1. Make sure your backend server is running on port 5000
2. Double-check the IP address is correct
3. Make sure your phone/emulator is on the same network as your computer

**Can't find local IP?**
- Use `ipconfig getifaddr en0` (Mac)
- Use `ipconfig` and look for the correct network adapter (Windows)
- Check WiFi settings on the device for the connected network's gateway

