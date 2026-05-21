# Authentication Setup Inventory - Complete Analysis

A comprehensive breakdown of all files, modules, dependencies, and environment variables used for signup, login, and forgot password functionality with EmailJS integration.

---

## 📋 Table of Contents
1. [Frontend Files](#frontend-files)
2. [Backend Files](#backend-files)
3. [Service Modules](#service-modules)
4. [NPM Dependencies](#npm-dependencies)
5. [Environment Variables](#environment-variables)
6. [Email Templates](#email-templates)
7. [Data Structures](#data-structures)

---

## 🎨 Frontend Files

### `mobcaps/screens/Home.jsx`
**Purpose:** Main authentication UI component with signup, login, and password reset forms

**State Management:**
- `authMode`: 'login', 'signup', 'verify', 'forgot-password'
- `loginForm`: { email, password }
- `signupForm`: { firstName, lastName, email, password, confirmPassword, code }
- `forgotPasswordForm`: { email, code, newPassword, confirmPassword, step }
- `errors`: Form validation errors
- `isLoading`: Loading state
- `verificationCode`: Generated code for signup
- `isLoggedIn`: Authentication state
- `showForgotPasswordModal`: Modal visibility

**Key Functions:**
- `handleLogin()`: Validates and processes login
- `handleSignup()`: Validates and initiates signup with email verification
- `handleVerification()`: Verifies signup code and creates user account
- `handleForgotPasswordEmail()`: Requests password reset code
- `handleForgotPasswordCode()`: Verifies password reset code
- `handleForgotPasswordReset()`: Updates password with new one
- `handleResendSignupCode()`: Resends verification code
- `handleResendForgotCode()`: Resends password reset code

**Hooks Used:**
- `useState()`: Form state, errors, loading
- `useEffect()`: Session checking, carousel auto-rotation
- `useResendTimer()`: 60-second countdown for code resend

**Password Requirements Enforced:**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (!@#$%^&*)

---

## 🔧 Backend Files

### `mobcaps/backend-example/server.js`
**Purpose:** Express.js server with MongoDB connection and API routes

**MongoDB Collections:**
1. **User Schema**
   ```javascript
   {
     name: String (required),
     email: String (required, unique, lowercase),
     password: String (required, SHA-256 hash),
     phone: String,
     address: String,
     createdAt: Date
   }
   ```

2. **Rental Schema**
   ```javascript
   {
     userEmail: String,
     gownName: String,
     startDate: String (YYYY-MM-DD),
     endDate: String,
     status: String,
     totalPrice: Number,
     downpayment: Number,
     branch: String,
     createdAt: Date
   }
   ```

3. **Custom Order Schema**
   ```javascript
   {
     userEmail: String,
     gownType: String,
     customerName: String,
     email: String,
     contact: String,
     description: String,
     appointmentDate: String,
     appointmentTime: String,
     status: String,
     createdAt: Date
   }
   ```

4. **Appointment Schema**
   ```javascript
   {
     userEmail: String,
     appointmentType: String,
     customerName: String,
     email: String,
     contact: String,
     appointmentDate: String,
     appointmentTime: String,
     branch: String,
     status: String,
     createdAt: Date
   }
   ```

**Key Routes:**
- `GET /api/health` - Health check endpoint
- `GET /api/users/email/:email` - Get user by email (no password)
- `POST /api/users` - Create new user (signup)
- `POST /api/auth/login` - Login with email and password
- `PUT /api/users/reset-password` - Update password
- `GET /api/rentals/user/:email` - Get user rentals
- `POST /api/rentals` - Create rental
- `GET /api/appointments/user/:email` - Get user appointments
- `POST /api/appointments` - Create appointment

**Configuration:**
```javascript
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mobcaps';

app.listen(PORT, '0.0.0.0', ...); // Listens on all network interfaces
```

**CORS Configuration:**
```javascript
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## 🛠️ Service Modules

### `mobcaps/services/authService.js`
**Purpose:** Authentication logic layer with database abstraction

**Exported Functions:**
- `userDB.getAll()` - Get all users
- `userDB.findByEmail(email)` - Find user by email
- `userDB.create(user)` - Create new user
- `userDB.verifyCredentials(email, password)` - Verify login credentials
- `sanitizeNameInput(value)` - Remove non-letter characters
- `validators.email(value)` - Email validation
- `validators.password(value, isSignup)` - Password validation
- `validators.confirmPassword(value, original)` - Confirm password
- `validators.name(value)` - Name validation

**Password Validation Rules:**
- Email: Valid format with @ and domain
- Password: 6+ chars for login, 8+ with uppercase, lowercase, number, special char for signup
- Name: 2+ chars, letters and spaces only

**Database Strategy:**
- Uses `mongodbService` as the data layer
- Delegates all DB operations to MongoDB backend API

---

### `mobcaps/services/emailService.js`
**Purpose:** Email sending via EmailJS

**Exported Functions:**
- `sendEmail(email, code, templateKey)` - Send email with template

**Template Support:**
- `SIGNUP_VERIFICATION` - Verification email for signup
- `PASSWORD_RESET` - Password reset code email

**Configuration:**
- Uses `EMAILJS_CONFIG` from `emailConfig.js`
- Supports TEST_MODE (logs to console instead of sending)
- Falls back to backend API if configured
- Production uses EmailJS client SDK

**Features:**
- Template variable substitution
- Automatic from_name and subject
- Test mode for development
- Error handling and logging

---

### `mobcaps/services/emailConfig.js`
**Purpose:** Centralized EmailJS configuration and template registry

**Exported Variables:**
```javascript
EMAILJS_CONFIG = {
  PUBLIC_KEY: 'Jjn03sX_4VJbULO-Y',
  SERVICE_ID: 'service_mg7qfxd',
  ENABLED: true,
  TEST_MODE: false,
  DEFAULT_FROM_NAME: 'Hannah Vanessa Boutique',
  TEMPLATES: {
    SIGNUP_VERIFICATION: {
      ID: 'template_67j9i2m',
      NAME: 'Signup Verification',
      VARIABLES: {
        TO_EMAIL: 'to_email',
        CODE: 'verification_code',
        FROM_NAME: 'from_name',
        SUBJECT: 'subject'
      }
    },
    PASSWORD_RESET: {
      ID: 'template_q2v5s8a',
      NAME: 'Password Reset Verification',
      VARIABLES: {
        TO_EMAIL: 'to_email',
        CODE: 'reset_code',
        FROM_NAME: 'from_name',
        SUBJECT: 'subject'
      }
    }
  }
}
```

**Exported Functions:**
- `getTemplateConfig(templateKey)` - Get template by key
- `validateEmailJSConfig()` - Validate config completeness

---

### `mobcaps/services/passwordResetService.js`
**Purpose:** Password reset workflow (forgot password)

**State Management:**
- `resetCodes` - In-memory store of reset codes with 15-minute expiry

**Exported Functions:**
- `generateResetCode(email)` - Generate and store reset code, send email
- `verifyResetCode(email, inputCode)` - Verify submitted code
- `resetPassword(email, newPassword)` - Update password in MongoDB

**Password Reset Flow:**
1. User requests reset with email
2. System generates 6-digit code (expires in 15 minutes)
3. Email is sent with code
4. User enters code to verify
5. User enters new password (same validation as signup)
6. Password is updated in MongoDB

**Exported Validators:**
- `resetValidators.email(value)` - Email validation
- `resetValidators.resetCode(value)` - Code validation
- `resetValidators.newPassword(value)` - New password validation
- `resetValidators.confirmPassword(value, original)` - Confirm password

---

### `mobcaps/services/mongodbService.js`
**Purpose:** MongoDB backend API integration

**Exported Functions:**
- `mongodbService.getAll()` - GET /api/users
- `mongodbService.findByEmail(email)` - GET /api/users/email/:email
- `mongodbService.create(user)` - POST /api/users
- `mongodbService.verifyCredentials(email, password)` - POST /api/auth/login
- `mongodbService.updatePassword(email, hashedPassword)` - PUT /api/users/reset-password
- `mongodbService.createRental(rental)` - POST /api/rentals
- `mongodbService.getRentalsByUser(email)` - GET /api/rentals/user/:email
- `mongodbService.createCustomOrder(order)` - POST /api/custom-orders
- `mongodbService.getCustomOrdersByUser(email)` - GET /api/custom-orders/user/:email
- `mongodbService.createAppointment(appointment)` - POST /api/appointments
- `mongodbService.getAppointmentsByUser(email)` - GET /api/appointments/user/:email

**Base URL:**
```javascript
const MONGODB_API_URL = API_URL; // From apiConfig.js
```

**Network Handling:**
- Android emulator host mapping (localhost → 10.0.2.2)
- 15-second request timeout
- Error handling and retry logic

---

### `mobcaps/services/apiConfig.js`
**Purpose:** Centralized API configuration for all backend calls

**Exported Variables:**
```javascript
LOCAL_IP: '192.168.1.6' // Your machine's local IP
PORT: 5000
API_URL: 'http://192.168.1.6:5000/api'
API_CONFIG: {
  BASE_URL: API_URL,
  TIMEOUT: 15000,
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 1000
}
```

**Exported Functions:**
- `validateAPIConfig()` - Test backend connectivity
- `fetchAPI(endpoint, options)` - Make API calls with timeout and error handling

**Features:**
- AbortController for request timeout (React Native compatible)
- Standardized headers (Content-Type, Authorization)
- Detailed error logging
- Network environment detection

---

### `mobcaps/services/securityService.js`
**Purpose:** Password hashing and security utilities

**Exported Functions:**
- `hashPassword(password)` - Hash password using SHA-256 (expo-crypto)
- `verifyPassword(password, hash)` - Compare password to hash
- `generateToken(length)` - Generate secure random token

**Hashing Algorithm:**
- SHA-256 via expo-crypto (brave hardware acceleration on mobile)
- No salt (potential improvement: add bcrypt backend)

---

### `mobcaps/services/sessionService.js`
**Purpose:** User session management

**Exported Functions:**
- `sessionService.saveSession(user)` - Save logged-in user to AsyncStorage
- `sessionService.getSession()` - Retrieve user session
- `sessionService.clearSession()` - Clear session on logout

---

### `mobcaps/hooks/useResendTimer.js`
**Purpose:** 60-second countdown timer for code resend

**Exported Hook:**
- `useResendTimer(duration)` - Returns timer state and startTimer function

---

## 📦 NPM Dependencies

### Frontend Dependencies (package.json)

**Email & Communication:**
- `@emailjs/browser@^4.4.1` - EmailJS client library for sending emails

**Cryptography:**
- `crypto-js@^4.2.0` - SHA-256 hashing for passwords
- `expo-crypto@~15.0.8` - Secure hashing and token generation

**React & Navigation:**
- `react@^19.1.0` - React library
- `react-native@0.81.5` - React Native framework
- `expo@~54.0.33` - Expo framework/CLI
- `@react-navigation/native@^7.1.28` - Navigation
- `@react-navigation/native-stack@^7.11.0` - Stack navigation

**Storage:**
- `@react-native-async-storage/async-storage@^2.2.0` - Local storage for session

**Date/Time:**
- `react-native-modal-datetime-picker@^18.0.0` - Date/time picker
- `@react-native-community/datetimepicker@^8.4.4` - Native date picker

**UI Components:**
- `lucide-react-native@^0.563.0` - Icon library
- `react-native-svg@15.12.1` - SVG support

**Other:**
- `react-native-safe-area-context@~5.6.0` - Safe area handling
- `react-native-screens@~4.16.0` - Native screen handling

### Backend Dependencies (mobcaps/backend-example)

```json
{
  "express": "^4.x.x",          // Web framework
  "mongoose": "^7.x.x",         // MongoDB ODM
  "bcryptjs": "^2.x.x",         // Password hashing (if needed)
  "jsonwebtoken": "^9.x.x",     // JWT tokens (if needed)
  "cors": "^2.x.x",             // CORS middleware
  "dotenv": "^16.x.x",          // Environment variables
  "emailjs-com": "^3.x.x"       // EmailJS for Node.js (if using backend)
}
```

---

## 🔐 Environment Variables

### Frontend (.env)
```env
# MongoDB Backend
MONGODB_URI=mongodb://localhost:27017/mobcaps
PORT=5000
```

### Backend (.env.example or actual .env)
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mobcaps?retryWrites=true&w=majority

# EmailJS Configuration
EMAILJS_PUBLIC_KEY=your_public_key
EMAILJS_SERVICE_ID=service_mg7qfxd
EMAILJS_TEMPLATE_ID=template_67j9i2m
EMAILJS_RESET_TEMPLATE_ID=template_q2v5s8a
EMAILJS_USER_ID=your_user_id

# JWT Secret (if using backend auth)
JWT_SECRET=your-super-secret-jwt-key

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000
```

---

## 📧 Email Templates

### Template 1: Signup Verification Email
**EmailJS Template ID:** `template_67j9i2m`

**Variables:**
- `{{to_email}}` - Recipient email
- `{{verification_code}}` - 6-digit code
- `{{from_name}}` - "Hannah Vanessa Boutique"
- `{{subject}}` - "Verify Your Email - MobileFabriQ"

**Email Body Example:**
```
Hi {{to_email}},

Welcome to MobileFabriQ! Your verification code is:

{{verification_code}}

This code expires in 24 hours.
```

### Template 2: Password Reset Email
**EmailJS Template ID:** `template_q2v5s8a`

**Variables:**
- `{{to_email}}` - Recipient email
- `{{reset_code}}` - 6-digit code
- `{{from_name}}` - "Hannah Vanessa Boutique"
- `{{subject}}` - "Reset Your Password - MobileFabriQ"

**Email Body Example:**
```
Hi {{to_email}},

Your password reset code is:

{{reset_code}}

This code expires in 15 minutes.
```

---

## 💾 Data Structures

### Authentication Flow Data

**Signup Process:**
```javascript
{
  firstName: string,
  lastName: string,
  email: string,
  password: string (plain, client-side hashed to SHA-256),
  confirmPassword: string,
  code: string (6-digit verification code)
}
```

**Login Process:**
```javascript
{
  email: string,
  password: string (plain, client-side hashed to SHA-256)
}
```

**Password Reset Process:**
```javascript
{
  email: string,
  code: string (6-digit reset code),
  newPassword: string,
  confirmPassword: string,
  step: 'email' | 'code' | 'reset'
}
```

**Reset Code Storage (In-Memory):**
```javascript
resetCodes = {
  'user@example.com': {
    code: '123456',
    timestamp: 1680000000000,
    expiresIn: 900000 // 15 minutes in milliseconds
  }
}
```

**User Object (Database):**
```javascript
{
  _id: ObjectId,
  name: string,
  email: string (lowercase, unique),
  password: string (SHA-256 hash),
  phone: string,
  address: string,
  createdAt: Date
}
```

---

## 🔄 Authentication Flow Diagram

### Signup Flow
```
User fills signup form
     ↓
Validate inputs (name, email, password, confirm)
     ↓
Check if user exists (MongoDB)
     ↓
Generate 6-digit code
     ↓
Send email with code (EmailJS)
     ↓
User enters verification code
     ↓
Hash password with SHA-256
     ↓
Create user in MongoDB
     ↓
Save session (AsyncStorage)
     ↓
Navigate to home screen
```

### Login Flow
```
User enters email & password
     ↓
Validate inputs
     ↓
Hash password with SHA-256
     ↓
Query MongoDB for user
     ↓
Compare hashes
     ↓
If match → Save session (AsyncStorage) → Navigate home
     ↓
If no match → Show error
```

### Password Reset Flow
```
User enters email
     ↓
Check if user exists (MongoDB)
     ↓
Generate code, store in memory
     ↓
Send email with code (EmailJS)
     ↓
User enters code
     ↓
Verify code against stored value & expiry
     ↓
User enters new password
     ↓
Hash password with SHA-256
     ↓
Update in MongoDB (PUT /api/users/reset-password)
     ↓
Clear reset code from memory
     ↓
Navigate to login
```

---

## 🔗 API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/users/email/:email` | Find user by email |
| `POST` | `/api/users` | Create user (signup) |
| `POST` | `/api/auth/login` | Login with credentials |
| `PUT` | `/api/users/reset-password` | Update password |
| `GET` | `/api/debug/all-rentals` | Debug endpoint |
| `GET` | `/api/debug/all-appointments` | Debug endpoint |
| `GET` | `/api/debug/emails` | Debug endpoint |

---

## 📊 Key Integration Points

| Component | Sends Data To | Receives Data From |
|-----------|--------------|------------------|
| Home.jsx (signup) | emailService.sendVerificationEmail → EmailJS | ✓ Verification email sent |
| Home.jsx (signup) | userDB.create → MongoDB | ✓ User document created |
| Home.jsx (login) | userDB.verifyCredentials → MongoDB | ✓ User found, password verified |
| Home.jsx (forgot) | passwordResetService.generateResetCode → EmailJS | ✓ Reset code emailed |
| Home.jsx (forgot) | passwordResetService.resetPassword → MongoDB | ✓ Password updated |
| apiConfig.js | fetch to backend | ✓ Response data |
| securityService.js | hashPassword (expo-crypto) | ✓ SHA-256 hash |

---

## 🚀 How to Replicate in Another Project

### Minimum Files Needed:
1. **Frontend:**
   - `services/authService.js`
   - `services/emailService.js`
   - `services/emailConfig.js`
   - `services/passwordResetService.js`
   - `services/mongodbService.js`
   - `services/apiConfig.js`
   - `services/securityService.js`
   - `services/sessionService.js`
   - `hooks/useResendTimer.js`

2. **Backend:**
   - `server.js` with user routes
   - `.env` file with configuration

3. **Package Dependencies:**
   ```bash
   npm install @emailjs/browser crypto-js expo-crypto
   ```

### Setup Checklist:
- [ ] Update `apiConfig.js` with your machine's IP
- [ ] Create EmailJS account and templates
- [ ] Add EmailJS credentials to `emailConfig.js`
- [ ] Set up MongoDB (local or Atlas)
- [ ] Update `.env` with MongoDB URI
- [ ] Update backend CORS settings
- [ ] Test health endpoint: `/api/health`
- [ ] Test signup email sending (test mode first)
- [ ] Test password reset flow

---

## 📝 Summary

**Total Files:** 9 frontend services + 1 backend server
**Total Dependencies:** 18 npm packages
**Email Templates:** 2 (signup verification, password reset)
**Environment Variables:** 5+ configuration keys
**Authentication Methods:** Email verification + password hashing
**Storage:** MongoDB (backend) + AsyncStorage (session)
**Password Security:** SHA-256 hashing (frontend + backend)