# Forgot Password Modal - Quick Reference Guide

## File Structure

```
mobcaps/
├── screens/
│   └── Home.jsx (Updated with separate modal)
├── services/
│   ├── passwordResetService.js (Password reset logic)
│   ├── emailService.js (EmailJS integration)
│   └── mongodbService.js (Database operations)
├── FORGOT_PASSWORD_MODAL_DESIGN.md (Complete design spec)
├── FORGOT_PASSWORD_MODAL_UX_IMPROVEMENTS.md (Before/after comparison)
├── FORGOT_PASSWORD_CODE_REFERENCE.md (API reference)
├── FORGOT_PASSWORD_SETUP.md (Setup guide)
└── EMAILJS_FORGOT_PASSWORD_CONFIG.md (EmailJS config guide)
```

---

## Code Quick Reference

### State Variables (Home.jsx)

```javascript
// Modal visibility
const [authMode, setAuthMode] = useState(null);                    // 'login' | 'signup' | 'verify'
const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

// Form data
const [forgotPasswordForm, setForgotPasswordForm] = useState({
  email: '',              // User's email address
  code: '',               // 6-digit verification code
  newPassword: '',        // New password
  confirmPassword: '',    // Confirm new password
  step: 'email'           // Current step: 'email' | 'code' | 'reset'
});

// Error messages
const [errors, setErrors] = useState({});  // { email: 'error message', ... }
```

---

## Core Functions (Home.jsx)

### Opening Forgot Password Modal

```javascript
<TouchableOpacity
  style={styles.forgotPasswordLink}
  onPress={() => {
    setAuthMode(null);                    // Close login modal
    setShowForgotPasswordModal(true);      // Open forgot password modal
    setForgotPasswordForm({                // Reset form
      email: '', code: '', newPassword: '', confirmPassword: '', step: 'email'
    });
    setErrors({});
  }}
>
  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
</TouchableOpacity>
```

### Closing Forgot Password Modal

```javascript
<TouchableOpacity
  style={styles.authClose}
  onPress={() => {
    setShowForgotPasswordModal(false);
    setForgotPasswordForm({                // Reset form
      email: '', code: '', newPassword: '', confirmPassword: '', step: 'email'
    });
    setErrors({});
    setAuthMessage('');
  }}
>
  <X color="#333" size={20} />
</TouchableOpacity>
```

### Step 1: Send Reset Code

```javascript
const handleForgotPasswordEmail = async () => {
  // 1. Validate email
  const emailError = resetValidators.email(forgotPasswordForm.email);
  if (emailError) {
    setErrors({ email: emailError });
    return;
  }

  // 2. Generate reset code
  const result = await passwordResetService.generateResetCode(forgotPasswordForm.email);
  
  if (result.success) {
    // 3. Send email with code
    await sendPasswordResetEmail(result.email, result.code);
    
    // 4. Move to next step
    setForgotPasswordForm(prev => ({ ...prev, step: 'code' }));
    setAuthMessage('CHECK YOUR EMAIL FOR THE RESET CODE');
  }
};
```

### Step 2: Verify Reset Code

```javascript
const handleForgotPasswordCode = async () => {
  // 1. Validate code format
  const codeError = resetValidators.resetCode(forgotPasswordForm.code);
  if (codeError) {
    setErrors({ code: codeError });
    return;
  }

  // 2. Verify code with backend
  const result = await passwordResetService.verifyResetCode(
    forgotPasswordForm.email,
    forgotPasswordForm.code
  );
  
  if (result.success) {
    // 3. Move to password reset step
    setForgotPasswordForm(prev => ({ ...prev, step: 'reset' }));
    setAuthMessage('CODE VERIFIED. ENTER YOUR NEW PASSWORD');
  } else {
    setErrors({ code: result.error });
  }
};
```

### Step 3: Reset Password

```javascript
const handleForgotPasswordReset = async () => {
  // 1. Validate passwords
  const passwordError = resetValidators.newPassword(forgotPasswordForm.newPassword);
  const confirmError = resetValidators.confirmPassword(
    forgotPasswordForm.confirmPassword,
    forgotPasswordForm.newPassword
  );
  
  if (passwordError || confirmError) {
    setErrors({ newPassword: passwordError, confirmPassword: confirmError });
    return;
  }

  // 2. Update password in database
  const result = await passwordResetService.resetPassword(
    forgotPasswordForm.email,
    forgotPasswordForm.newPassword
  );
  
  if (result.success) {
    // 3. Show success modal
    setSuccessModal(true);
    
    // 4. Auto-redirect to login after 3 seconds
    setTimeout(() => {
      setSuccessModal(false);
      setShowForgotPasswordModal(false);
      setAuthMode('login');
      setForgotPasswordForm({
        email: '', code: '', newPassword: '', confirmPassword: '', step: 'email'
      });
      setErrors({});
    }, 3000);
  } else {
    setErrors({ general: result.error });
  }
};
```

### Main Handler (Routes to correct step handler)

```javascript
const handleForgotPasswordAction = async () => {
  if (forgotPasswordForm.step === 'email') {
    await handleForgotPasswordEmail();
  } else if (forgotPasswordForm.step === 'code') {
    await handleForgotPasswordCode();
  } else if (forgotPasswordForm.step === 'reset') {
    await handleForgotPasswordReset();
  }
};
```

---

## Validators (resetValidators)

### Email Validation

```javascript
resetValidators.email(value)
// Rules: Gmail only, required
// Returns: Error message or empty string
// Example: resetValidators.email('user@gmail.com') → ''
//          resetValidators.email('user@yahoo.com') → 'Gmail only'
```

### Reset Code Validation

```javascript
resetValidators.resetCode(value)
// Rules: Exactly 6 digits, required
// Returns: Error message or empty string
// Example: resetValidators.resetCode('123456') → ''
//          resetValidators.resetCode('12345') → 'Code must be 6 digits'
```

### New Password Validation

```javascript
resetValidators.newPassword(value)
// Rules: 8+ chars, uppercase, lowercase, digit, special char
// Returns: Error message or empty string
// Example: resetValidators.newPassword('SecurePass123!') → ''
//          resetValidators.newPassword('pass123') → 'Password must contain...'
```

### Confirm Password Validation

```javascript
resetValidators.confirmPassword(confirmValue, newValue)
// Rules: Must match newPassword
// Returns: Error message or empty string
// Example: resetValidators.confirmPassword('SecurePass123!', 'SecurePass123!') → ''
//          resetValidators.confirmPassword('SecurePass123!', 'SecurePass123') → 'Passwords do not match'
```

---

## Service Functions

### generateResetCode(email)

**Location**: `services/passwordResetService.js`

```javascript
const result = await passwordResetService.generateResetCode('user@gmail.com');

// Returns:
// {
//   success: true,
//   email: 'user@gmail.com',
//   code: '123456',
//   message: 'Code generated'
// }
// or
// {
//   success: false,
//   error: 'User not found',
//   message: '...'
// }
```

### verifyResetCode(email, code)

**Location**: `services/passwordResetService.js`

```javascript
const result = await passwordResetService.verifyResetCode('user@gmail.com', '123456');

// Returns:
// { success: true, message: 'Code verified' }
// or
// { success: false, error: 'Invalid code' | 'Code expired' }
```

### resetPassword(email, newPassword)

**Location**: `services/passwordResetService.js`

```javascript
const result = await passwordResetService.resetPassword('user@gmail.com', 'NewPass123!');

// Returns:
// { success: true, message: 'Password updated' }
// or
// { success: false, error: 'Failed to update password' }
```

### sendPasswordResetEmail(email, code)

**Location**: `services/emailService.js`

```javascript
const sent = await sendPasswordResetEmail('user@gmail.com', '123456');

// Returns: true (success) or false (failure)

// In test mode: Logs to console
// ========================================
// 📧 PASSWORD RESET EMAIL (TEST MODE)
// ========================================
// To: user@gmail.com
// Code: 123456
// ========================================

// In production: Sends via EmailJS
```

### updatePassword(email, hashedPassword)

**Location**: `services/mongodbService.js`

```javascript
const hashedPassword = SHA256('NewPass123!').toString(Hex);
const result = await userDB.updatePassword('user@gmail.com', hashedPassword);

// Returns:
// { success: true, message: 'Password updated' }
// or
// { success: false, error: 'Database error' }

// ⚠️ NOTE: Password MUST be pre-hashed with SHA256 before sending
```

---

## Modal Rendering (Home.jsx)

### Forgot Password Modal

```jsx
<Modal visible={showForgotPasswordModal} animationType="fade" transparent={true}>
  <View style={styles.authOverlay}>
    <View style={styles.authCard}>
      {/* Close Button */}
      <TouchableOpacity style={styles.authClose} onPress={...}>
        <X color="#333" size={20} />
      </TouchableOpacity>

      {/* Title & Description (Changes per step) */}
      <Text style={styles.authTitle}>Forgot Password</Text>
      <Text style={styles.authSub}>
        {forgotPasswordForm.step === 'email' ? 'Enter your email...' : ...}
      </Text>

      {/* Step Indicator (3 dots) */}
      <View style={styles.stepIndicator}>
        <View style={[styles.stepDot, forgotPasswordForm.step === 'email' && styles.stepDotActive]} />
        <View style={[styles.stepDot, forgotPasswordForm.step === 'code' && styles.stepDotActive]} />
        <View style={[styles.stepDot, forgotPasswordForm.step === 'reset' && styles.stepDotActive]} />
      </View>

      {/* Form (Conditional per step) */}
      <View style={styles.authForm}>
        {/* STEP 1: EMAIL */}
        {forgotPasswordForm.step === 'email' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
            <TextInput ... />
            {errors.email && <Text style={styles.warningText}>{errors.email}</Text>}
          </View>
        )}

        {/* STEP 2: CODE */}
        {forgotPasswordForm.step === 'code' && (
          <View style={styles.inputGroup}>
            <Text style={styles.verifySub}>We sent a code to {forgotPasswordForm.email}</Text>
            <TextInput keyboardType="number-pad" maxLength={6} ... />
            {errors.code && <Text style={styles.warningText}>{errors.code}</Text>}
          </View>
        )}

        {/* STEP 3: PASSWORD */}
        {forgotPasswordForm.step === 'reset' && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NEW PASSWORD</Text>
              <TextInput secureTextEntry ... />
              {errors.newPassword && <Text style={styles.warningText}>{errors.newPassword}</Text>}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
              <TextInput secureTextEntry ... />
              {errors.confirmPassword && <Text style={styles.warningText}>{errors.confirmPassword}</Text>}
            </View>
          </>
        )}

        {/* Action Button */}
        <TouchableOpacity style={styles.authSubmitBtn} onPress={handleForgotPasswordAction}>
          <Text style={styles.authSubmitText}>
            {isLoading ? 'PLEASE WAIT...' :
             forgotPasswordForm.step === 'email' ? 'SEND CODE' :
             forgotPasswordForm.step === 'code' ? 'VERIFY CODE' :
             'RESET PASSWORD'}
          </Text>
        </TouchableOpacity>

        {/* Back Link */}
        <TouchableOpacity style={styles.toggleAuth} onPress={() => {
          setShowForgotPasswordModal(false);
          setAuthMode('login');
        }}>
          <Text style={styles.toggleText}>← Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
```

---

## Styling Reference

### Step Indicator Styles

```javascript
stepIndicator: {
  flexDirection: 'row',
  justifyContent: 'center',
  gap: 12,
  marginVertical: 20,
},
stepDot: {
  width: 10,
  height: 10,
  borderRadius: 5,
  backgroundColor: '#E8E4D9',      // Light inactive
  borderWidth: 2,
  borderColor: '#D9D4CA',
},
stepDotActive: {
  backgroundColor: '#6B5D4F',       // Dark active
  borderColor: '#6B5D4F',
},
```

### Form Styles (Reused from Login)

```javascript
authForm: { gap: 15 },
inputGroup: { marginVertical: 15 },
inputLabel: { fontSize: 11, fontWeight: '600', marginBottom: 8, color: '#333' },
authInput: {
  borderWidth: 1,
  borderColor: '#E8E4D9',
  padding: 12,
  borderRadius: 4,
  fontSize: 14,
  color: '#333',
  backgroundColor: '#FAFAFA',
},
inputErrorBorder: { borderColor: '#D9534F' },
warningText: { color: '#D9534F', fontSize: 10, marginTop: 5 },
```

---

## Testing Checklist

### Test Step 1: Email
- [ ] Modal opens when clicking "Forgot Password?"
- [ ] Step indicator shows first dot active
- [ ] Can enter email
- [ ] Error shows for invalid email
- [ ] Error clears while typing
- [ ] "SEND CODE" button works
- [ ] Moves to step 2 after sending

### Test Step 2: Code
- [ ] Step indicator shows second dot active
- [ ] "We sent a code to [email]" displays correctly
- [ ] Can only enter 6 digits
- [ ] Error shows for invalid code
- [ ] "VERIFY CODE" button works
- [ ] Moves to step 3 after verification

### Test Step 3: Password
- [ ] Step indicator shows third dot active
- [ ] Can enter new password
- [ ] Can enter confirm password
- [ ] Error shows for weak password
- [ ] Error shows if passwords don't match
- [ ] "RESET PASSWORD" button works
- [ ] Shows success modal after reset

### Navigation
- [ ] "← Back to Sign In" link works
- [ ] Close button (×) closes modal
- [ ] Clicking back brings up login modal
- [ ] Forms reset when reopening modal
- [ ] Can restart password reset flow

### Error Handling
- [ ] Invalid email shows error
- [ ] Expired code shows error
- [ ] Wrong code shows error
- [ ] Weak password shows error
- [ ] All errors display inline (no alerts)

---

## Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| Modal doesn't open | `showForgotPasswordModal` not set to true | Check button click handler |
| Steps don't advance | `step` not updating in state | Check `setForgotPasswordForm` calls |
| Errors display twice | Validator called twice | Check event handlers |
| Button doesn't respond | Handler function missing | Check `handleForgotPasswordAction` |
| Email not sending | EmailJS not configured | See EMAILJS_FORGOT_PASSWORD_CONFIG.md |
| Step indicator not visible | CSS missing | Add step indicator styles to stylesheet |
| Back link doesn't work | Modal state not updated | Check both `setShowForgotPasswordModal` and `setAuthMode` |

---

## Next Steps

1. **Test in browser/device** - Verify all functionality works
2. **Test with real EmailJS** - Configure credentials and test email sending
3. **Monitor backend** - Ensure `/api/users/reset-password` endpoint exists
4. **Gather feedback** - Get UX feedback from users
5. **Refine UI** - Make adjustments based on testing

---

## Resources

- [FORGOT_PASSWORD_MODAL_DESIGN.md](FORGOT_PASSWORD_MODAL_DESIGN.md) - Complete design specification
- [FORGOT_PASSWORD_MODAL_UX_IMPROVEMENTS.md](FORGOT_PASSWORD_MODAL_UX_IMPROVEMENTS.md) - Before/after comparison
- [FORGOT_PASSWORD_CODE_REFERENCE.md](FORGOT_PASSWORD_CODE_REFERENCE.md) - API reference
- [FORGOT_PASSWORD_SETUP.md](FORGOT_PASSWORD_SETUP.md) - Setup guide
- [EMAILJS_FORGOT_PASSWORD_CONFIG.md](EMAILJS_FORGOT_PASSWORD_CONFIG.md) - EmailJS configuration
