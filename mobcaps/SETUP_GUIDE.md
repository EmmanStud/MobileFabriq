# Setup Guide - Production Features

This guide will help you set up all the production-ready features.

## ✅ What's Already Set Up

1. **Password Hashing** ✅ - Using SHA-256 (expo-crypto)
2. **Session Persistence** ✅ - Login state persists across app restarts
3. **Logout Functionality** ✅ - Added to menu

## 📧 Setting Up Real Email (EmailJS)

### Step 1: Install EmailJS
```bash
npm install @emailjs/browser
```

### Step 2: Create EmailJS Account
1. Go to https://www.emailjs.com/
2. Sign up for free account (200 emails/month free)
3. Verify your email

### Step 3: Set Up Email Service
1. In EmailJS dashboard, go to **Email Services**
2. Click **Add New Service**
3. Choose your email provider (Gmail recommended)
4. Follow the setup instructions
5. Note your **Service ID**

### Step 4: Create Email Template
1. Go to **Email Templates** in dashboard
2. Click **Create New Template**
3. Use this template:
   ```
   Subject: Hannah Vanessa - Verification Code
   
   Hello,
   
   Your verification code is: {{verification_code}}
   
   This code will expire in 10 minutes.
   
   If you didn't request this, please ignore this email.
   
   Best regards,
   Hannah Vanessa Boutique
   ```
4. Note your **Template ID**

### Step 5: Get Public Key
1. Go to **Account** > **General**
2. Copy your **Public Key**

### Step 6: Update Code
1. Open `mobcaps/services/emailService.js`
2. Uncomment the import line: `import emailjs from '@emailjs/browser';`
3. Fill in your credentials:
   ```javascript
   const EMAILJS_CONFIG = {
     PUBLIC_KEY: 'your_public_key_here',
     SERVICE_ID: 'your_service_id_here',
     TEMPLATE_ID: 'your_template_id_here',
     ENABLED: true, // Change to true
   };
   ```
4. Uncomment the EmailJS code in `sendVerificationEmail` function

### Step 7: Test
1. Restart your app
2. Try signing up
3. Check the email inbox for verification code

---

## 🗄️ Setting Up Cloud Database

### Option A: MongoDB Atlas (Recommended for MongoDB)

#### Step 1: Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for free account (512MB free tier)
3. Verify your email

#### Step 2: Create Cluster
1. Click **Build a Database**
2. Choose **FREE** (M0) tier
3. Select your cloud provider and region
4. Click **Create**

#### Step 3: Create Database User
1. Go to **Database Access** > **Add New Database User**
2. Choose **Password** authentication
3. Create username and password (save these!)
4. Set privileges to **Read and write to any database**
5. Click **Add User**

#### Step 4: Get Connection String
1. Go to **Database** > **Connect**
2. Choose **Connect your application**
3. Copy the connection string
4. Replace `<password>` with your database user password
5. Replace `<dbname>` with `mobcaps` (or your preferred name)

Example:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/mobcaps?retryWrites=true&w=majority
```

#### Step 5: Set Up Backend API
1. Create a new folder for your backend (e.g., `backend`)
2. Copy files from `backend-example/` folder
3. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
4. Create `.env` file:
   ```env
   MONGODB_URI=your_connection_string_here
   PORT=3000
   ```
5. Start server:
   ```bash
   npm start
   ```

#### Step 6: Update React Native App
1. Open `mobcaps/services/mongodbService.js`
2. Set your API URL:
   ```javascript
   const MONGODB_API_URL = 'http://localhost:3000/api'; // For local testing
   // Or: 'https://your-api.com/api' // For production
   ```
3. Update `mobcaps/services/authService.js`:
   ```javascript
   // Change from:
   import AsyncStorage from '@react-native-async-storage/async-storage';
   
   // To:
   import { mongodbService as userDB } from './mongodbService';
   ```
4. Remove the AsyncStorage userDB object

#### Step 7: Network Access (Important!)
1. Go to **Network Access** in MongoDB Atlas
2. Click **Add IP Address**
3. For development: Click **Allow Access from Anywhere** (0.0.0.0/0)
4. For production: Add your server's IP address only

#### Step 8: Test Connection
1. Start your backend server
2. Test endpoint: `http://localhost:3000/api/health`
3. Should return: `{ status: 'OK', message: 'MongoDB API is running' }`

---

### Option B: Firebase Firestore

### Option 1: Firebase Firestore (Recommended)

#### Step 1: Install Firebase
```bash
npm install firebase
```

#### Step 2: Create Firebase Project
1. Go to https://console.firebase.google.com/
2. Click **Add Project**
3. Follow the setup wizard
4. Enable **Firestore Database** (Start in test mode for now)

#### Step 3: Get Configuration
1. Go to Project Settings (gear icon)
2. Scroll to **Your apps**
3. Click **Web** icon (`</>`)
4. Register app and copy the config

#### Step 4: Update Code
1. Open `mobcaps/services/firebaseService.js`
2. Uncomment all the Firebase code
3. Paste your config:
   ```javascript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     // ... rest of config
   };
   ```

#### Step 5: Replace Database in authService.js
1. Open `mobcaps/services/authService.js`
2. Replace the import:
   ```javascript
   // Change from:
   import AsyncStorage from '@react-native-async-storage/async-storage';
   
   // To:
   import { firebaseDB as userDB } from './firebaseService';
   ```
3. Remove the AsyncStorage userDB object

#### Step 6: Set Firestore Rules (Security)
In Firebase Console > Firestore Database > Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 🔒 Security Improvements

### Current Security Features:
- ✅ Passwords are hashed (SHA-256)
- ✅ Session management
- ✅ Input validation

### Additional Recommendations:
1. **Use HTTPS** for all API calls
2. **Add rate limiting** for login attempts
3. **Implement 2FA** for sensitive operations
4. **Use environment variables** for API keys (never commit secrets)
5. **Consider bcrypt** instead of SHA-256 for better security

---

## 🧪 Testing Checklist

After setup, test:
- [ ] Sign up with new email
- [ ] Receive verification email (check inbox)
- [ ] Verify code works
- [ ] Login with credentials
- [ ] Session persists after app restart
- [ ] Logout works
- [ ] Protected routes require login

---

## 📝 Notes

- **EmailJS Free Tier**: 200 emails/month
- **Firebase Free Tier**: Generous free tier for Firestore
- **Password Hashing**: Currently SHA-256, consider bcrypt for production
- **Session Expiry**: Currently 30 days (configurable in `sessionService.js`)

---

## 🆘 Troubleshooting

### Email not sending?
- Check EmailJS dashboard for errors
- Verify template variables match: `{{to_email}}` and `{{verification_code}}`
- Check email service is connected properly

### Firebase connection issues?
- Verify config is correct
- Check Firestore is enabled
- Ensure rules allow read/write

### Session not persisting?
- Check AsyncStorage permissions
- Verify sessionService is being called
- Check console for errors

---

**Need help?** Check the service files for detailed comments and examples.

