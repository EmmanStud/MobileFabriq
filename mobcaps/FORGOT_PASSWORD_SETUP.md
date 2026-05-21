# Forgot Password Feature - Implementation Guide

## Overview
A complete forgot password flow using EmailJS with 3 steps:
1. Email verification
2. Code validation
3. Password reset

## Features Implemented

✅ **Email Verification**
- User enters email address
- Backend generates 6-digit verification code
- Code sent via EmailJS (or test mode)
- 15-minute expiration timer

✅ **Code Validation**
- User enters 6-digit code
- Real-time validation feedback
- Automatic transition to password reset on success

✅ **Password Reset**
- New password with strength requirements:
  - Minimum 8 characters
  - Uppercase letter (A-Z)
  - Lowercase letter (a-z)
  - Number (0-9)
  - Special character (!@#$%^&*)
- Confirm password matching
- Secure hashing before storage (SHA256)

✅ **UI/UX**
- Modal design matching login/signup
- Inline validation errors (no alert popups)
- "Forgot Password?" link in login screen
- Success modal on completion
- Back navigation between steps

## Files Created/Modified

### New Files
1. **services/passwordResetService.js**
   - `generateResetCode()` - Generate and store verification code
   - `verifyResetCode()` - Validate user-entered code
   - `resetPassword()` - Update password in database
   - `resetValidators` - Validation rules

### Modified Files
1. **screens/Home.jsx**
   - Added forgot password state management
   - Added forgot password handlers (3-step flow)
   - Added UI forms for each step
   - Added success modal
   - Added "Forgot Password?" link

2. **services/emailService.js**
   - Added `sendPasswordResetEmail()` function
   - Uses same EmailJS configuration as signup

3. **services/mongodbService.js**
   - Added `updatePassword()` method
   - API endpoint: `PUT /api/users/reset-password`

## EmailJS Setup (Optional but Recommended)

### Step 1: Create EmailJS Account
1. Go to https://www.emailjs.com/
2. Sign up (Free: 200 emails/month)
3. Verify your email

### Step 2: Set Up Email Service
1. Dashboard → "Email Services"
2. Add service (Gmail, Outlook, etc.)
3. Follow provider-specific steps to authorize

### Step 3: Create Email Template
1. Dashboard → "Email Templates"
2. Create template with variables:
   ```
   {{to_email}}
   {{verification_code}}
   {{from_name}}
   {{subject}}
   ```
3. Example template body:
   ```
   Hello,
   
   Your password reset code is: {{verification_code}}
   
   This code will expire in 15 minutes.
   
   If you didn't request this, please ignore.
   
   Best regards,
   {{from_name}}
   ```

### Step 4: Get Credentials
1. Account → General → Copy **Public Key**
2. Email Services → Your Service → Copy **Service ID**
3. Email Templates → Your Template → Copy **Template ID**

### Step 5: Update Configuration
In `services/emailService.js`, update:
```javascript
const EMAILJS_CONFIG = {
  PUBLIC_KEY: 'YOUR_PUBLIC_KEY_HERE',
  SERVICE_ID: 'YOUR_SERVICE_ID_HERE',
  TEMPLATE_ID: 'YOUR_TEMPLATE_ID_HERE',
  ENABLED: true, // ← Set to true when ready
};
```

## Backend API Setup (For Production)

If using MongoDB backend, ensure this endpoint exists:

```javascript
// PUT /api/users/reset-password
router.put('/reset-password', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Password already hashed from frontend
    user.password = password;
    await user.save();
    
    res.json({ success: true, message: 'Password updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Testing in Development

### Test Mode (Default)
- No external email service needed
- Reset codes printed to console
- Perfect for development/testing

Example console output:
```
========================================
📧 PASSWORD RESET EMAIL (TEST MODE)
========================================
To: user@gmail.com
Subject: Hannah Vanessa - Password Reset Code
Code: 123456
========================================
```

### Manual Testing Flow
1. Open app and click "Forgot Password?" link
2. Enter registered email (test mode will show code in console)
3. Copy code from console and enter in app
4. Set new password with valid requirements
5. Success modal appears
6. Auto-redirect to login with new password

## Flow Diagram

```
┌─────────────────────────┐
│   Forgot Password Link  │ (In Login Screen)
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Step 1: Email Input   │
│ - Validates email exists│
│ - Generates 6-digit code│
│ - Sends via EmailJS     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Step 2: Code Input    │
│ - Validates code format │
│ - Checks expiry (15min) │
│ - Verifies code match   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Step 3: Password Reset │
│ - Validates password    │
│ - Confirms match        │
│ - Hashes with SHA256    │
│ - Updates database      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Success Modal (3s)    │
│ - Auto-redirect to login│
└─────────────────────────┘
```

## Security Considerations

✅ **Implemented**
- 6-digit codes (1 million combinations)
- 15-minute expiration
- Code generated server-side
- Passwords hashed with SHA256
- No plaintext password storage

⚠️ **Consider for Production**
- Store reset codes in database with hashing
- Implement rate limiting (max attempts)
- Add IP-based suspicious activity detection
- Use HTTPS only
- Add audit logging
- Implement email confirmation link (optional)

## Validation Rules

### Email
- Gmail only (@gmail.com)
- Required field

### Reset Code
- Exactly 6 digits
- Numeric only
- Required field

### New Password
- Minimum 8 characters
- Must contain: uppercase, lowercase, number, special char
- Required field

### Confirm Password
- Must match new password exactly
- Required field

## Error Messages

| Scenario | Message |
|----------|---------|
| Email not found | EMAIL NOT FOUND IN OUR SYSTEM |
| Code expired | CODE EXPIRED. PLEASE REQUEST A NEW ONE |
| Invalid code | INVALID CODE. PLEASE TRY AGAIN |
| Code not found | NO RESET CODE FOUND. PLEASE REQUEST A NEW ONE |
| Password too weak | MINIMUM 8 CHARACTERS REQUIRED |
| Passwords don't match | PASSWORDS DO NOT MATCH |
| Reset failed | FAILED TO RESET PASSWORD |

## Success Flow

1. ✅ Validation passes
2. ✅ Password hashed and stored
3. ✅ Reset code cleared from memory
4. ✅ Success modal displays (3 seconds)
5. ✅ Auto-redirect to login screen
6. ✅ User can log in with new password

## Troubleshooting

### Emails Not Sending
1. Check TEST_MODE in emailService.js
2. Verify EmailJS credentials are correct
3. Check EmailJS dashboard for sending quota
4. Look for console errors

### Code Not Working
1. Verify code format (exactly 6 digits)
2. Check 15-minute expiration window
3. Check console for actual code in test mode

### Database Error
1. Ensure backend is running
2. Check MongoDB connection
3. Verify API endpoint exists
4. Check network requests in DevTools

## Future Enhancements

- [ ] Resend code option (rate limited)
- [ ] Password strength meter
- [ ] Email confirmation link (instead of code)
- [ ] Two-factor authentication
- [ ] Account recovery options
- [ ] Login history/suspicious activity alerts
